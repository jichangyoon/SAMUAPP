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
import usersRouter from "./routes/users";
import adminRouter from "./routes/admin";
import { actionsRouter } from "./routes/actions";
import revenueRouter from "./routes/revenue";
import goodsRouter from "./routes/goods";
import rewardsDashboardRouter from "./routes/rewards-dashboard";

export async function registerRoutes(app: Express): Promise<Server> {
  const assetsPath = path.resolve(import.meta.dirname, "..", "attached_assets");
  app.use("/assets", express.static(assetsPath));

  const uploadsPath = path.resolve(import.meta.dirname, "..", "uploads");
  app.use("/uploads", express.static(uploadsPath));

  app.use("/api/memes", memesRouter);
  app.use("/api/memes", votesRouter);
  app.use("/api/nfts", nftsRouter);
  app.use("/api/partners", partnersRouter);
  app.use("/api/uploads", uploadsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api", walletRouter);
  app.use("/api/actions", actionsRouter);
  app.use("/api/revenue", revenueRouter);
  app.use("/api/goods", goodsRouter);
  app.use("/api/rewards", rewardsDashboardRouter);

  const httpServer = createServer(app);
  return httpServer;
}
