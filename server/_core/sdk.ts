import { COOKIE_NAME } from '@shared/const';
import { ForbiddenError } from '@shared/_core/errors';
import { parse as parseCookieHeader } from 'cookie';
import type { Request } from 'express';
import { SignJWT, jwtVerify } from 'jose';
import type { User } from '../../drizzle/schema';
import * as db from '../db';
import { ENV } from './env';

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
};

class SDKServer {
  async createSessionToken(
    userId: string,
    payload: { email: string; name: string; expiresInMs?: number }
  ): Promise<string> {
    const secret = new TextEncoder().encode(ENV.cookieSecret);
    const expiresInMs = payload.expiresInMs || 30 * 24 * 60 * 60 * 1000;

    const token = await new SignJWT({
      userId,
      email: payload.email,
      name: payload.name,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(Date.now() + expiresInMs)
      .sign(secret);

    return token;
  }

  private async verifySessionToken(token: string): Promise<SessionPayload | null> {
    try {
      const secret = new TextEncoder().encode(ENV.cookieSecret);
      const { payload } = await jwtVerify(token, secret);

      if (
        typeof payload.userId === 'string' &&
        typeof payload.email === 'string' &&
        typeof payload.name === 'string'
      ) {
        return {
          userId: payload.userId,
          email: payload.email,
          name: payload.name,
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<User | null> {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      return null;
    }

    const cookies = parseCookieHeader(cookieHeader);
    const sessionToken = cookies[COOKIE_NAME];

    if (!sessionToken) {
      return null;
    }

    const payload = await this.verifySessionToken(sessionToken);
    if (!payload) {
      return null;
    }

    const user = await db.getUser(payload.userId);
    return user ?? null;
  }

  async requireAuth(req: Request): Promise<User> {
    const user = await this.authenticateRequest(req);
    if (!user) {
      throw ForbiddenError('Authentication required');
    }
    return user;
  }
}

export const sdk = new SDKServer();

