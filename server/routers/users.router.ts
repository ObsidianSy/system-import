import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { randomBytes } from "crypto";
import * as db from "../db";
import bcrypt from "bcryptjs";
import { logWarn } from "../_core/logger";

const generateId = () => randomBytes(16).toString("hex");

export const usersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new Error("Apenas administradores podem listar usuários");
    }
    return db.listUsers();
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin" && ctx.user?.id !== input.id) {
        throw new Error("Sem permissão");
      }
      return db.getUser(input.id);
    }),

  create: publicProcedure // Changed to public to allow bootstrapping
    .input(z.object({
      name: z.string(),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(["user", "admin"]).default("user"),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if any user exists
      const usersList = await db.listUsers();
      const isFirstUser = usersList.length === 0;

      if (!isFirstUser) {
        // If not first user, require admin authentication
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new Error("Apenas administradores podem criar usuários");
        }
      } else {
        // First user is always admin
        input.role = "admin";
        logWarn('[Users] First user created as admin', { email: input.email });
      }

      // Verificar se email já existe
      const existing = await db.getUserByEmail(input.email);
      if (existing) {
        throw new Error("Email já cadastrado");
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      return db.createUser({
        id: generateId(),
        name: input.name,
        email: input.email,
        password: hashedPassword,
        role: input.role,
        loginMethod: "password",
        isActive: true,
        // Permissões padrão baseadas no role
        canViewCostUSD: input.role === "admin",
        canViewCostBRL: input.role === "admin",
        canViewImportTaxes: input.role === "admin",
        canEditProducts: input.role === "admin",
        canEditImportations: input.role === "admin",
        canManageUsers: input.role === "admin",
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      password: z.string().min(6).optional(),
      role: z.enum(["user", "admin"]).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin" && ctx.user?.id !== input.id) {
        throw new Error("Sem permissão");
      }

      const { id, password, ...data } = input;
      const updateData: Record<string, unknown> = { ...data };

      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      return db.updateUser(id, updateData);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Apenas administradores podem excluir usuários");
      }

      if (ctx.user.id === input.id) {
        throw new Error("Não pode excluir seu próprio usuário");
      }

      await db.deleteUser(input.id);
      return { success: true };
    }),

  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new Error("Não autenticado");
      }

      const user = await db.getUser(ctx.user.id);
      if (!user || !user.password) {
        throw new Error("Usuário não encontrado");
      }

      const validPassword = await bcrypt.compare(input.currentPassword, user.password);
      if (!validPassword) {
        throw new Error("Senha atual incorreta");
      }

      const hashedPassword = await bcrypt.hash(input.newPassword, 10);
      await db.updateUser(ctx.user.id, { password: hashedPassword });

      return { success: true };
    }),

  // Atualizar permissões de usuário
  updatePermissions: protectedProcedure
    .input(z.object({
      userId: z.string(),
      permissions: z.object({
        canViewCostUSD: z.boolean().optional(),
        canViewCostBRL: z.boolean().optional(),
        canViewImportTaxes: z.boolean().optional(),
        canEditProducts: z.boolean().optional(),
        canEditImportations: z.boolean().optional(),
        canManageUsers: z.boolean().optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Apenas administradores podem alterar permissões");
      }

      return db.updateUser(input.userId, {
        ...input.permissions,
        updatedAt: new Date(),
      });
    }),
});
