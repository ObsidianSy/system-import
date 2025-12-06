import rateLimit from 'express-rate-limit';
import { logWarn } from '../logger';

/**
 * Rate limiter para endpoints de autenticação
 * Previne ataques de brute-force em login
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas por janela
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    retryAfter: 15 * 60, // segundos
  },
  standardHeaders: true, // Return rate limit info no RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req, res) => {
    logWarn('Rate limit exceeded for auth', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
      retryAfter: 15 * 60,
    });
  },
});

/**
 * Rate limiter geral para API
 * Previne abuso de endpoints públicos
 */
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // 100 requests por minuto
  message: {
    error: 'Muitas requisições. Tente novamente em breve.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip para endpoints autenticados (já protegidos por auth)
    return req.path.includes('/api/trpc') && !req.path.includes('auth.login');
  },
  handler: (req, res) => {
    logWarn('API rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      error: 'Muitas requisições. Tente novamente em breve.',
    });
  },
});

/**
 * Rate limiter estrito para criação de recursos
 * Previne spam de criação de registros
 */
export const createLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // 20 criações por 5 minutos
  message: {
    error: 'Limite de criação atingido. Aguarde alguns minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logWarn('Create rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      error: 'Limite de criação atingido. Aguarde alguns minutos.',
    });
  },
});
