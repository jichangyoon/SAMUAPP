import type { Express } from "express";
import { createServer, type Server } from "http";
import { memesRouter } from "./routes/memes";
import { votesRouter } from "./routes/votes";
import { walletRouter } from "./routes/wallet";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register modular routes
  app.use("/api/memes", memesRouter);
  app.use("/api/memes", votesRouter);
  app.use("/api", walletRouter);

  const httpServer = createServer(app);
  return httpServer;
}