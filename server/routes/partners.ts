import { Router } from "express";
import { storage } from "../storage";
import { insertMemeSchema, insertVoteSchema } from "../../shared/schema";
import { z } from "zod";

const router = Router();

// Get partner memes
router.get("/:partnerId/memes", async (req, res) => {
  try {
    const { partnerId } = req.params;
    const memes = await storage.getPartnerMemes(partnerId);
    res.json(memes);
  } catch (error) {
    console.error("Error fetching partner memes:", error);
    res.status(500).json({ error: "Failed to fetch partner memes" });
  }
});

// Create partner meme
router.post("/:partnerId/memes", async (req, res) => {
  try {
    const { partnerId } = req.params;
    const validatedData = insertMemeSchema.parse(req.body);
    
    // Get user profile information to populate author details
    if (validatedData.authorWallet) {
      const user = await storage.getUserByWallet(validatedData.authorWallet);
      if (user) {
        // Update meme data with current user profile information
        validatedData.authorUsername = user.displayName || user.username;
        validatedData.authorAvatarUrl = user.avatarUrl || undefined;
      }
    }
    
    const meme = await storage.createPartnerMeme(validatedData, partnerId);
    res.status(201).json(meme);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid meme data", details: error.errors });
    } else {
      console.error("Error creating partner meme:", error);
      res.status(500).json({ error: "Failed to create partner meme" });
    }
  }
});

// Vote on partner meme
router.post("/:partnerId/memes/:id/vote", async (req, res) => {
  try {
    const { partnerId, id } = req.params;
    const memeId = parseInt(id);
    
    if (isNaN(memeId)) {
      return res.status(400).json({ error: "Invalid meme ID" });
    }

    const validatedVote = insertVoteSchema.parse(req.body);
    
    // Check if user already voted
    const hasVoted = await storage.hasUserVotedPartner(partnerId, memeId, validatedVote.voterWallet);
    if (hasVoted) {
      return res.status(400).json({ error: "User has already voted on this meme" });
    }

    const vote = await storage.createPartnerVote(validatedVote, partnerId);
    await storage.updatePartnerMemeVoteCount(partnerId, memeId);
    
    res.status(201).json(vote);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid vote data", details: error.errors });
    } else {
      console.error("Error creating partner vote:", error);
      res.status(500).json({ error: "Failed to create partner vote" });
    }
  }
});

// Check if user has voted on partner meme
router.get("/:partnerId/memes/:id/vote-status/:wallet", async (req, res) => {
  try {
    const { partnerId, id, wallet } = req.params;
    const memeId = parseInt(id);
    
    if (isNaN(memeId)) {
      return res.status(400).json({ error: "Invalid meme ID" });
    }

    const hasVoted = await storage.hasUserVotedPartner(partnerId, memeId, wallet);
    res.json({ hasVoted });
  } catch (error) {
    console.error("Error checking partner vote status:", error);
    res.status(500).json({ error: "Failed to check vote status" });
  }
});

export default router;