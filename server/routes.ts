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
import { votingPowerManager } from "./voting-power";

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve attached_assets as static files under /assets
  const assetsPath = path.resolve(import.meta.dirname, "..", "attached_assets");
  app.use("/assets", express.static(assetsPath));

  // Serve uploaded files as static files under /uploads
  const uploadsPath = path.resolve(import.meta.dirname, "..", "uploads");
  app.use("/uploads", express.static(uploadsPath));

  // Register modular routes
  app.use("/api/memes", memesRouter);
  app.use("/api/memes", votesRouter);
  app.use("/api/nfts", nftsRouter);
  app.use("/api/partners", partnersRouter);
  app.use("/api/uploads", uploadsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api", walletRouter);

  // Voting power endpoint
  app.get("/api/voting-power/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      // Get or initialize voting power
      let votingPower = await votingPowerManager.getVotingPower(walletAddress);
      
      if (!votingPower) {
        // If not found, get SAMU balance and initialize
        const samuRes = await fetch(`http://localhost:5000/api/samu-balance/${walletAddress}`);
        const samuData = await samuRes.json();
        votingPower = await votingPowerManager.initializeVotingPower(walletAddress, samuData.balance || 0);
      }
      
      res.json(votingPower);
    } catch (error) {
      console.error('Error fetching voting power:', error);
      res.status(500).json({ error: 'Failed to fetch voting power' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}