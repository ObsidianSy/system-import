import { TRPCError } from "@trpc/server";
import { jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "../_core/env";

/**
 * Integração com o auth.owlflow (login centralizado do ecossistema Opus Owl).
 *
 * Fluxo (proxy no backend — o client_secret NUNCA vai ao browser):
 *   1. Valida email/senha no owlflow (POST /auth/login).
 *   2. Verifica o accessToken retornado (mesmo JWT_SECRET do owlflow, HS256).
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

async function verifyOwlflowToken(accessToken: string): Promise<OwlflowAccessPayload> {
  const secret = new TextEncoder().encode(ENV.cookieSecret);
  const { payload } = await jwtVerify(accessToken, secret);

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

export async function authenticateViaOwlflow(email: string, password: string): Promise<User> {
  if (!ENV.authOwlflow.url || !ENV.authOwlflow.clientId || !ENV.authOwlflow.clientSecret) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Autenticação não configurada (AUTH_OWLFLOW_*).",
    });
  }

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

  // 2. Verifica o token (mesmo JWT_SECRET do owlflow)
  let payload: OwlflowAccessPayload;
  try {
    payload = await verifyOwlflowToken(accessToken);
  } catch {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Token de autenticação inválido" });
  }

  // 3. Resolve usuário local — allowlist (NÃO cria)
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
