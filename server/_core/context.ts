import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getUser } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Auto-login em desenvolvimento (exceto na rota de login)
  const isLoginRoute = opts.req.url?.includes("/auth.login") || opts.req.url?.includes("/auth.logout");
  
  if (!user && !isLoginRoute && process.env.DEV_AUTO_LOGIN === "true" && process.env.NODE_ENV === "development") {
    const devEmail = process.env.DEV_USER_EMAIL;
    if (devEmail) {
      const db = await import("../db").then(m => m.getDb());
      if (db) {
        const { users } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const result = await db.select().from(users).where(eq(users.email, devEmail)).limit(1);
        if (result.length > 0) {
          user = result[0];
        }
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
