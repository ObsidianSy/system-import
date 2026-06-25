import { TRPCError } from "@trpc/server";
import { decodeJwt } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "../_core/env";

/**
 * Integração com o auth.owlflow (login centralizado do ecossistema Opus Owl).
 *
 * Fluxo (proxy no backend — o client_secret NUNCA vai ao browser):
 *   1. Valida a credencial no owlflow (POST /auth/login OU /auth/google).
 *   2. Lê o accessToken retornado (JWT do owlflow, HS256).
 *   3. Resolve o usuário LOCAL por authId → email (auto-link) — ou NEGA.
 *
 * Allowlist: NÃO cria usuário. Se o email autenticado não existe localmente,
 * o acesso é negado (o admin precisa cadastrar o usuário no import primeiro).
 */

type OwlflowAccessPayload = {
  userId: string; // ID do usuário no owlflow → vira authId local
  email: string;
  appId?: string;
  role?: string;
};

function owlflowHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-client-id": ENV.authOwlflow.clientId,
    "x-client-secret": ENV.authOwlflow.clientSecret,
  };
}

function ensureConfigured(): void {
  if (!ENV.authOwlflow.url || !ENV.authOwlflow.clientId || !ENV.authOwlflow.clientSecret) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Autenticação não configurada (AUTH_OWLFLOW_*).",
    });
  }
}

function extractOwlflowPayload(accessToken: string): OwlflowAccessPayload {
  // O accessToken vem DIRETO da resposta autenticada (x-client-secret + HTTPS)
  // do owlflow para o nosso backend — fonte confiável. Não verificamos a
  // assinatura aqui de propósito: não temos (nem precisamos do) JWT_SECRET de
  // produção do owlflow. A sessão local é assinada com o NOSSO próprio secret.
  const payload = decodeJwt(accessToken);

  if (typeof payload.userId !== "string" || typeof payload.email !== "string") {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Token de autenticação inválido" });
  }

  return {
    userId: payload.userId,
    email: payload.email,
    appId: typeof payload.appId === "string" ? payload.appId : undefined,
    role: typeof payload.role === "string" ? payload.role : undefined,
  };
}

/**
 * Passos 2 + 3, comuns a TODOS os métodos do owlflow (senha ou Google):
 * verifica o accessToken e resolve o usuário LOCAL por authId → email
 * (auto-link no 1º login) → ou nega via allowlist. NÃO cria usuário.
 */
async function resolveLocalUser(owlflowAccessToken: string): Promise<User> {
  const payload = extractOwlflowPayload(owlflowAccessToken);

  let user = await db.getUserByAuthId(payload.userId);

  if (!user) {
    // 1º login (ou usuário recriado no owlflow): linka pelo email
    const byEmail = await db.getUserByEmailInsensitive(payload.email);
    if (byEmail) {
      user = await db.updateUser(byEmail.id, { authId: payload.userId });
    }
  }

  if (!user) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Seu email não está cadastrado no sistema. Peça ao administrador para criar sua conta.",
    });
  }

  if (!user.isActive) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Usuário inativo. Contate o administrador." });
  }

  return user;
}

export async function authenticateViaOwlflow(email: string, password: string): Promise<User> {
  ensureConfigured();

  // 1. Valida credenciais no owlflow
  let status: number;
  let data: { tokens?: { accessToken?: string }; error?: string };
  try {
    const response = await fetch(`${ENV.authOwlflow.url}/auth/login`, {
      method: "POST",
      headers: owlflowHeaders(),
      body: JSON.stringify({ email, password }),
    });
    status = response.status;
    data = (await response.json().catch(() => ({}))) as typeof data;
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Serviço de autenticação indisponível. Tente novamente em instantes.",
    });
  }

  if (status === 401) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha inválidos" });
  }

  const accessToken = data?.tokens?.accessToken;
  if (status < 200 || status >= 300 || !accessToken) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Falha ao autenticar no serviço de autenticação.",
    });
  }

  // 2 + 3. Verifica o token e resolve o usuário local (allowlist)
  return resolveLocalUser(accessToken);
}

/**
 * Login social via Google. O browser obtém um access_token do Google
 * (Google Identity Services) e o backend faz o proxy para o owlflow
 * (POST /auth/google), que valida o token no Google e devolve o mesmo
 * formato do /auth/login. A resolução do usuário local é idêntica.
 */
export async function authenticateViaOwlflowGoogle(googleAccessToken: string): Promise<User> {
  ensureConfigured();

  // 1. Troca o access_token do Google por um accessToken do owlflow
  let status: number;
  let data: { tokens?: { accessToken?: string }; error?: string; code?: string };
  try {
    const response = await fetch(`${ENV.authOwlflow.url}/auth/google`, {
      method: "POST",
      headers: owlflowHeaders(),
      body: JSON.stringify({ access_token: googleAccessToken }),
    });
    status = response.status;
    data = (await response.json().catch(() => ({}))) as typeof data;
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Serviço de autenticação indisponível. Tente novamente em instantes.",
    });
  }

  if (status === 401) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sessão do Google inválida ou expirada. Tente novamente.",
    });
  }

  if (status === 403) {
    // owlflow: USER_NOT_AUTHORIZED (email não cadastrado no owlflow)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: data?.error || "Seu email não está autorizado. Contate o administrador.",
    });
  }

  if (status === 409) {
    // owlflow: ACCOUNT_EXISTS_DIFFERENT_PROVIDER (conta com senha, Google não vinculado)
    throw new TRPCError({
      code: "CONFLICT",
      message:
        data?.error ||
        "Já existe uma conta com este email. Entre com email e senha primeiro para vincular o Google.",
    });
  }

  const owlflowAccessToken = data?.tokens?.accessToken;
  if (status < 200 || status >= 300 || !owlflowAccessToken) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Falha ao autenticar no serviço de autenticação.",
    });
  }

  // 2 + 3. Verifica o token e resolve o usuário local (mesma allowlist)
  return resolveLocalUser(owlflowAccessToken);
}
