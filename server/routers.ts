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
import { productsRouter } from "./routers/products.router";
import { ordersRouter } from "./routers/orders.router";
import { importationsRouter } from "./routers/importations.router";
import { stockRouter } from "./routers/stock.router";
import { dashboardRouter } from "./routers/dashboard.router";

const generateId = () => randomBytes(16).toString("hex");
const decimalToCents = (decimal: number) => Math.round(decimal * 100);

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
        try {
          console.log(`[Auth] Login attempt for email: ${input.email}`);
          
          const user = await db.getUserByEmail(input.email);
          console.log(`[Auth] User found:`, !!user);
          
          if (!user || !user.password) {
            console.log(`[Auth] Login failed: Invalid credentials`);
            throw new Error("Credenciais inválidas");
          }
          
          if (!user.isActive) {
            console.log(`[Auth] Login failed: User inactive`);
            throw new Error("Usuário inativo");
          }
          
          const validPassword = await bcrypt.compare(input.password, user.password);
          console.log(`[Auth] Password valid:`, validPassword);
          
          if (!validPassword) {
            console.log(`[Auth] Login failed: Invalid password`);
            throw new Error("Credenciais inválidas");
          }
          
          // Atualizar último login
          await db.updateUser(user.id, { lastSignedIn: new Date() });
          
          // Criar JWT token
          const secret = new TextEncoder().encode(ENV.cookieSecret);
          const token = await new SignJWT({ 
            userId: user.id,
            email: user.email,
            name: user.name,
          })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("7d")
            .sign(secret);
          
          // Definir cookie
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
          
          console.log(`[Auth] Cookie set: ${COOKIE_NAME}, options:`, cookieOptions);
          console.log(`[Auth] Login successful for user: ${user.email}`);
          
          return {
            success: true,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            },
          };
        } catch (error) {
          console.error(`[Auth] Login error:`, error);
          throw error;
        }
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
        }

        // Verificar se email já existe
        const existing = await db.getUserByEmail(input.email);
        if (existing) {
          throw new Error("Email já cadastrado");
        }

        const hashedPassword = await bcrypt.hash(input.password, 10);

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
          email: input.email,
          password: hashedPassword,
          role: input.role,
          loginMethod: "password",
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

