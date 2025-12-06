import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { sql } from "drizzle-orm";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { apiLimiter } from "./middleware/rateLimiter";
import { logger, logError, logInfo } from "./logger";

// Catch uncaught errors and log them
process.on('uncaughtException', (error) => {
  logError('💥 UNCAUGHT EXCEPTION', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError('💥 UNHANDLED REJECTION', reason instanceof Error ? reason : new Error(String(reason)), { promise: String(promise) });
  process.exit(1);
});

logInfo('🚀 Starting application', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  HAS_DATABASE_URL: !!process.env.DATABASE_URL,
  HAS_JWT_SECRET: !!process.env.JWT_SECRET,
});

// Note: we avoid a static import of `./vite` because that module
// imports `vite` at top-level (dev-only). In ESM static imports are
// resolved during module linking, causing runtime failures in
// production where `vite` is not installed. We dynamically import the
// dev helper only when running in development.

async function startServer() {
  logInfo('🔧 Initializing server');
  const app = express();
  const server = createServer(app);
  
  logInfo('📦 Configuring middleware');
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Apply general API rate limiting
  app.use('/api', apiLimiter);
  
  logInfo('🔌 Setting up tRPC');
  
  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      // Tentar conectar ao banco
      const { getDb } = await import('../db');
      const db = await getDb();
      
      // Query simples para testar conexão
      await db.execute(sql`SELECT 1`);
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        database: 'connected'
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Serve uploads directory
  const uploadsPath = (await import("path")).join(process.cwd(), "uploads");
  app.use("/uploads", (await import("express")).default.static(uploadsPath));
  
  logInfo('🌐 Configuring static files');
  
  const port = parseInt(process.env.PORT || "3000");
  
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    logInfo('🔨 Development mode: loading Vite');
    const mod = await import("./vite");
    if (mod.setupVite) {
      await mod.setupVite(app, server);
    }
    logInfo('✅ Vite setup complete');
    
    logInfo(`🎯 Starting development server on port ${port}`);
    server.listen(port, "0.0.0.0", () => {
      logInfo(`✅ Server running on http://localhost:${port}/`);
      logInfo(`✅ Server is ready and accepting connections`);
    });
  } else {
    logInfo('📁 Production mode: serving static files');
    // Inline lightweight static-serving implementation to avoid
    // importing the dev-only `./vite` module (which imports `vite`).
    // This mirrors the behavior of `serveStatic` from `vite.ts`.
    const fs = await import("fs");
    const path = await import("path");

    // Determine the correct path to built client assets.
    // In production Docker: /app/dist/public (client) and /app/dist/server/_core/index.js (this file)
    // From /app/dist/server/_core we go up 2 levels to /app/dist, then into public
    const distPath = path.resolve(import.meta.dirname, "..", "..", "public");

    logInfo(`📂 Looking for static files at: ${distPath}`);

    if (!fs.existsSync(distPath)) {
      logError(
        `[Static] Could not find client build directory: ${distPath}. ` +
          `If running in production ensure 'vite build' ran and dist/public was copied. ` +
          `Serving a minimal fallback page.`,
        new Error('Static files not found'),
        { distPath }
      );
      app.get("*", (_req, res) => {
        res
          .status(200)
          .setHeader("Content-Type", "text/html; charset=utf-8")
          .end(
            "<html><head><title>Import Manager</title></head><body><h1>Import Manager API</h1><p>Client build not found.</p></body></html>"
          );
      });
      server.listen(port, "0.0.0.0", () => {
        logInfo(`⚠️  Server running (no static) on http://0.0.0.0:${port}/`);
        logInfo(`✅ Server is ready (fallback mode)`);
      });
      return; // Skip static middleware setup
    }

    logInfo(`✅ Static files found at: ${distPath}`);
    app.use((await import("express")).default.static(distPath));

    // fall through to index.html if the file doesn't exist
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });

    logInfo(`🎯 Starting server on port ${port}`);
    
    server.listen(port, "0.0.0.0", () => {
      logInfo(`✅ Server running on http://0.0.0.0:${port}/`);
      logInfo(`✅ Server is ready and accepting connections`);
    });
  }
}

logInfo('🏁 Calling startServer()');
startServer()
  .then(() => {
    logInfo('✅ startServer() completed successfully');
  })
  .catch((error) => {
    logError('💥 FATAL ERROR in startServer()', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  });
