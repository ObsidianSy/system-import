import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
// Note: we avoid a static import of `./vite` because that module
// imports `vite` at top-level (dev-only). In ESM static imports are
// resolved during module linking, causing runtime failures in
// production where `vite` is not installed. We dynamically import the
// dev helper only when running in development.

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    const mod = await import("./vite");
    if (mod.setupVite) {
      await mod.setupVite(app, server);
    }
  } else {
    // Inline lightweight static-serving implementation to avoid
    // importing the dev-only `./vite` module (which imports `vite`).
    // This mirrors the behavior of `serveStatic` from `vite.ts`.
    const fs = await import("fs");
    const path = await import("path");

    // Determine the correct path to built client assets.
    // In production Docker: /app/dist/public (client) and /app/dist/server/_core/index.js (this file)
    // From /app/dist/server/_core we go up 2 levels to /app/dist, then into public
    const distPath = path.resolve(import.meta.dirname, "..", "..", "public");
    const port = parseInt(process.env.PORT || "3000");

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
        console.log(`Server running (no static) on http://0.0.0.0:${port}/`);
      });
      return; // Skip static middleware setup
    }

    app.use((await import("express")).default.static(distPath));

    // fall through to index.html if the file doesn't exist
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });

    server.listen(port, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${port}/`);
    });
  }
}

startServer().catch(console.error);
