import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { ENV } from "../_core/env";
import { logInfo, logError, logWarn } from "../_core/logger";

export const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),
  
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        logInfo('[Auth] Login attempt', { email: input.email });
        
        const user = await db.getUserByEmail(input.email);
        
        if (!user || !user.password) {
          logWarn('[Auth] Login failed: Invalid credentials', { email: input.email });
          throw new Error("Credenciais inválidas");
        }
        
        if (!user.isActive) {
          logWarn('[Auth] Login failed: User inactive', { email: input.email });
          throw new Error("Usuário inativo");
        }
        
        const validPassword = await bcrypt.compare(input.password, user.password);
        
        if (!validPassword) {
          logWarn('[Auth] Login failed: Invalid password', { email: input.email });
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
        
        logInfo('[Auth] Login successful', { 
          userId: user.id, 
          email: user.email,
          cookieSet: true,
        });
        
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
        logError('[Auth] Login error', error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    }),
  
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    logInfo('[Auth] User logged out');
    return {
      success: true,
    } as const;
  }),
});
