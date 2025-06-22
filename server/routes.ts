import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import path from "path";
import { memesRouter } from "./routes/memes";
import { votesRouter } from "./routes/votes";
import { walletRouter } from "./routes/wallet";
import nftsRouter from "./routes/nfts";
import partnersRouter from "./routes/partners";
import uploadsRouter from "./routes/uploads";

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve attached_assets as static files under /assets
  const assetsPath = path.resolve(import.meta.dirname, "..", "attached_assets");
  app.use("/assets", express.static(assetsPath));

  // Register modular routes
  app.use("/api/memes", memesRouter);
  app.use("/api/memes", votesRouter);
  app.use("/api/nfts", nftsRouter);
  app.use("/api/partners", partnersRouter);
  app.use("/api", walletRouter);

  const httpServer = createServer(app);
  return httpServer;
}