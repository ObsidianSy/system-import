import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { randomBytes } from "crypto";
import * as db from "./db";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { ENV } from "./_core/env";
import { externalSalesService } from "./services/externalSales";
import { authenticateViaOwlflow, authenticateViaOwlflowGoogle } from "./services/owlflowAuth";
import { productsRouter } from "./routers/products.router";
import { ordersRouter } from "./routers/orders.router";
import { importationsRouter } from "./routers/importations.router";
import { stockRouter } from "./routers/stock.router";
import { dashboardRouter } from "./routers/dashboard.router";

import { decimalToCents } from "../shared/utils/currency";
import type { Request, Response } from "express";
import type { User } from "../drizzle/schema";

const generateId = () => randomBytes(16).toString("hex");

/**
 * Emite o cookie de sessão httpOnly próprio (jose HS256, 7d). Usado tanto pelo
 * login por senha quanto pelo login via Google — ambos passam pelo owlflow e
 * resolvem o mesmo usuário local. name garantido como string: o SDK exige name
 * no payload para validar o cookie nas próximas requisições.
 */
async function issueSessionCookie(req: Request, res: Response, user: User): Promise<void> {
  const secret = new TextEncoder().encode(ENV.cookieSecret);
  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    name: user.name ?? user.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  res.cookie(COOKIE_NAME, token, getSessionCookieOptions(req));
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
          // Autentica no auth.owlflow (proxy) e resolve o usuário local pela
          // allowlist. Lança TRPCError (UNAUTHORIZED / FORBIDDEN / 500) conforme o caso.
          const user = await authenticateViaOwlflow(input.email, input.password);

          await db.updateUser(user.id, { lastSignedIn: new Date() });

          // Emite o cookie de sessão PRÓPRIO (mantém o modelo httpOnly atual; o
          // owlflow só valida credenciais).
          await issueSessionCookie(ctx.req, ctx.res, user);

          return {
            success: true,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            },
          };
      }),

    loginWithGoogle: publicProcedure
      .input(z.object({
        accessToken: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
          // Troca o access_token do Google pelo accessToken do owlflow (proxy) e
          // resolve o usuário local pela MESMA allowlist do login por senha.
          const user = await authenticateViaOwlflowGoogle(input.accessToken);

          await db.updateUser(user.id, { lastSignedIn: new Date() });

          await issueSessionCookie(ctx.req, ctx.res, user);

          return {
            success: true,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            },
          };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ========== User Management ==========
  users: router({
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
        password: z.string().min(6).optional(),
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
        }

        // Verificar se email já existe (case-insensitive)
        const email = input.email.toLowerCase().trim();
        const existing = await db.getUserByEmailInsensitive(email);
        if (existing) {
          throw new Error("Email já cadastrado");
        }

        // Senha opcional: usuários da allowlist autenticam pelo auth.owlflow.
        // Só gera hash local se uma senha for informada (ex.: bootstrap legado).
        const hashedPassword = input.password ? await bcrypt.hash(input.password, 12) : null;

        // Set permissions based on role
        const permissions = input.role === "admin" ? {
          canViewCostUSD: true,
          canViewCostBRL: true,
          canViewImportTaxes: true,
          canEditProducts: true,
          canEditImportations: true,
          canManageUsers: true,
        } : {
          canViewCostUSD: false,
          canViewCostBRL: false,
          canViewImportTaxes: false,
          canEditProducts: false,
          canEditImportations: false,
          canManageUsers: false,
        };

        return db.createUser({
          id: generateId(),
          name: input.name,
          email,
          password: hashedPassword,
          role: input.role,
          loginMethod: hashedPassword ? "password" : "owlflow",
          isActive: true,
          ...permissions,
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
        const updateData: any = { ...data };

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

    updatePermissions: protectedProcedure
      .input(z.object({
        userId: z.string(),
        permissions: z.object({
          canViewCostUSD: z.boolean(),
          canViewCostBRL: z.boolean(),
          canViewImportTaxes: z.boolean(),
          canEditProducts: z.boolean(),
          canEditImportations: z.boolean(),
          canManageUsers: z.boolean(),
        }),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new Error("Apenas administradores podem alterar permissões");
        }

        const updatedUser = await db.updateUser(input.userId, input.permissions);
        
        // Return user without password
        const { password, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
      }),

    toggleActive: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new Error("Apenas administradores podem ativar/desativar usuários");
        }

        const user = await db.getUser(input.id);
        if (!user) {
          throw new Error("Usuário não encontrado");
        }

        return db.updateUser(input.id, { isActive: !user.isActive });
      }),
  }),

  // ========== Suppliers ==========
  suppliers: router({
    list: protectedProcedure.query(async () => {
      return db.listSuppliers();
    }),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return db.getSupplier(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        companyName: z.string().optional(),
        address: z.string().optional(),
        country: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional().refine((val) => !val || val === '' || z.string().email().safeParse(val).success, { message: 'Invalid email address' }),
        whatsapp: z.string().optional(),
        contactPerson: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createSupplier({
          id: generateId(),
          ...input,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().optional(),
        companyName: z.string().optional(),
        address: z.string().optional(),
        country: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional().refine((val) => !val || val === '' || z.string().email().safeParse(val).success, { message: 'Invalid email address' }),
        whatsapp: z.string().optional(),
        contactPerson: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateSupplier(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await db.deleteSupplier(input.id);
        return { success: true };
      }),
  }),

  // ========== Products ==========
  products: productsRouter,

  orders: ordersRouter,

  // ========== Importations ==========
  importations: importationsRouter,

  // ========== Stock ==========
  stock: stockRouter,

  // ========== Tax Config ==========
  taxConfig: router({
    list: protectedProcedure.query(async () => {
      const configs = await db.listTaxConfigs();
      return configs.map(config => ({
        ...config,
        importTaxRate: config.importTaxRate / 100, // Convert basis points to percentage
        icmsRate: config.icmsRate / 100,
      }));
    }),

    getActive: protectedProcedure.query(async () => {
      const config = await db.getActiveTaxConfig();
      if (!config) return null;
      
      return {
        ...config,
        importTaxRate: config.importTaxRate / 100,
        icmsRate: config.icmsRate / 100,
      };
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        importTaxRate: z.number(), // Percentage
        icmsRate: z.number(), // Percentage
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        // If setting as active, deactivate others
        if (input.isActive) {
          const configs = await db.listTaxConfigs();
          for (const config of configs) {
            if (config.isActive) {
              await db.updateTaxConfig(config.id, { isActive: false });
            }
          }
        }
        
        return db.createTaxConfig({
          id: generateId(),
          name: input.name,
          importTaxRate: Math.round(input.importTaxRate * 100), // Convert to basis points
          icmsRate: Math.round(input.icmsRate * 100),
          isActive: input.isActive,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().optional(),
        importTaxRate: z.number().optional(),
        icmsRate: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        
        // If setting as active, deactivate others
        if (data.isActive) {
          const configs = await db.listTaxConfigs();
          for (const config of configs) {
            if (config.isActive && config.id !== id) {
              await db.updateTaxConfig(config.id, { isActive: false });
            }
          }
        }
        
        const updateData: any = {};
        if (data.name) updateData.name = data.name;
        if (data.importTaxRate !== undefined) updateData.importTaxRate = Math.round(data.importTaxRate * 100);
        if (data.icmsRate !== undefined) updateData.icmsRate = Math.round(data.icmsRate * 100);
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        
        return db.updateTaxConfig(id, updateData);
      }),
  }),

  // ========== Dashboard Stats ==========
  dashboard: dashboardRouter,

  // ========== External Sales System ==========
  external: router({
    getStock: protectedProcedure
      .input(z.object({ sku: z.string() }))
      .query(async ({ input }) => {
        return externalSalesService.getStock(input.sku);
      }),

    getSkuData: protectedProcedure
      .input(z.object({ sku: z.string() }))
      .query(async ({ input }) => {
        return externalSalesService.getSkuData(input.sku);
      }),

    getMultipleSkusStock: protectedProcedure
      .input(z.object({ skus: z.array(z.string()) }))
      .query(async ({ input }) => {
        return externalSalesService.getMultipleSkusStock(input.skus);
      }),

    getMultipleSkusData: protectedProcedure
      .input(z.object({ skus: z.array(z.string()) }))
      .query(async ({ input }) => {
        return externalSalesService.getMultipleSkusData(input.skus);
      }),
  }),
});

export type AppRouter = typeof appRouter;

