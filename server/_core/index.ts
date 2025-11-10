import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";

// Catch uncaught errors and log them
process.on('uncaughtException', (error) => {
  console.error('💥 UNCAUGHT EXCEPTION:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('🚀 Starting application...');
console.log('📋 Environment:', {
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
  console.log('🔧 Initializing server...');
  const app = express();
  const server = createServer(app);
  
  console.log('📦 Configuring middleware...');
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  console.log('🔌 Setting up tRPC...');
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  
  console.log('🌐 Configuring static files...');
  
  const port = parseInt(process.env.PORT || "3000");
  
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    console.log('🔨 Development mode: loading Vite...');
    const mod = await import("./vite");
    if (mod.setupVite) {
      await mod.setupVite(app, server);
    }
    console.log('✅ Vite setup complete');
    
    console.log(`🎯 Starting development server on port ${port}...`);
    server.listen(port, "0.0.0.0", () => {
      console.log(`✅ Server running on http://localhost:${port}/`);
      console.log(`✅ Server is ready and accepting connections`);
    });
  } else {
    console.log('📁 Production mode: serving static files...');
    // Inline lightweight static-serving implementation to avoid
    // importing the dev-only `./vite` module (which imports `vite`).
    // This mirrors the behavior of `serveStatic` from `vite.ts`.
    const fs = await import("fs");
    const path = await import("path");

    // Determine the correct path to built client assets.
    // In production Docker: /app/dist/public (client) and /app/dist/server/_core/index.js (this file)
    // From /app/dist/server/_core we go up 2 levels to /app/dist, then into public
    const distPath = path.resolve(import.meta.dirname, "..", "..", "public");

    console.log(`📂 Looking for static files at: ${distPath}`);

    if (!fs.existsSync(distPath)) {
      console.error(
        `[Static] Could not find client build directory: ${distPath}. ` +
          `If running in production ensure 'vite build' ran and dist/public was copied. ` +
          `Serving a minimal fallback page.`
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
        console.log(`⚠️  Server running (no static) on http://0.0.0.0:${port}/`);
        console.log(`✅ Server is ready (fallback mode)`);
      });
      return; // Skip static middleware setup
    }

    console.log(`✅ Static files found at: ${distPath}`);
    app.use((await import("express")).default.static(distPath));

    // fall through to index.html if the file doesn't exist
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });

    console.log(`🎯 Starting server on port ${port}...`);
    
    server.listen(port, "0.0.0.0", () => {
      console.log(`✅ Server running on http://0.0.0.0:${port}/`);
      console.log(`✅ Server is ready and accepting connections`);
    });
  }
}

console.log('🏁 Calling startServer()...');
startServer()
  .then(() => {
    console.log('✅ startServer() completed successfully');
  })
  .catch((error) => {
    console.error('💥 FATAL ERROR in startServer():', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  });
