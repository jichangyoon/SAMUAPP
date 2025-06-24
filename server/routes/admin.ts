import { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertContestSchema, type Contest } from "@shared/schema";

const createContestSchema = insertContestSchema.extend({
  title: z.string().min(1, "Contest title is required"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

// Get current active contest
export async function getCurrentContest(req: Request, res: Response) {
  try {
    const contest = await storage.getCurrentContest();
    res.json({ contest });
  } catch (error) {
    console.error("Error getting current contest:", error);
    res.status(500).json({ error: "Failed to get current contest" });
  }
}

// Get all contests
export async function getAllContests(req: Request, res: Response) {
  try {
    const contests = await storage.getAllContests();
    res.json({ contests });
  } catch (error) {
    console.error("Error getting contests:", error);
    res.status(500).json({ error: "Failed to get contests" });
  }
}

// Create new contest
export async function createContest(req: Request, res: Response) {
  try {
    const validatedData = createContestSchema.parse(req.body);
    
    // Check if user is admin
    const userWallet = req.body.createdBy;
    const isAdmin = await storage.isUserAdmin(userWallet);
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const contest = await storage.createContest({
      ...validatedData,
      startDate: new Date(validatedData.startDate),
      endDate: new Date(validatedData.endDate),
    });

    res.json({ contest });
  } catch (error) {
    console.error("Error creating contest:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid contest data", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to create contest" });
    }
  }
}

// Start contest
export async function startContest(req: Request, res: Response) {
  try {
    const { contestId, userWallet } = req.body;
    
    const isAdmin = await storage.isUserAdmin(userWallet);
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const contest = await storage.startContest(contestId);
    res.json({ contest });
  } catch (error) {
    console.error("Error starting contest:", error);
    res.status(500).json({ error: "Failed to start contest" });
  }
}

// End contest and archive memes
export async function endContest(req: Request, res: Response) {
  try {
    const { contestId, userWallet } = req.body;
    
    const isAdmin = await storage.isUserAdmin(userWallet);
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const result = await storage.endContestAndArchive(contestId);
    res.json({ 
      contest: result.contest,
      archivedCount: result.archivedMemes.length 
    });
  } catch (error) {
    console.error("Error ending contest:", error);
    res.status(500).json({ error: "Failed to end contest" });
  }
}

// Check if user is admin
export async function checkAdminStatus(req: Request, res: Response) {
  try {
    const { walletAddress } = req.params;
    const isAdmin = await storage.isUserAdmin(walletAddress);
    res.json({ isAdmin });
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ error: "Failed to check admin status" });
  }
}