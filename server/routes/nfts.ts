import { Router } from "express";
import { storage } from "../storage";
import { insertNftCommentSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Get all NFTs - with cache headers
router.get("/", async (_req, res) => {
  try {
    // Set cache headers for better performance
    res.set('Cache-Control', 'public, max-age=300'); // 5분 브라우저 캐시 (NFT 데이터는 자주 바뀌지 않음)
    
    const nfts = await storage.getNfts();
    res.json(nfts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch NFTs" });
  }
});

// Get NFT by ID
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const nft = await storage.getNftById(id);
    
    if (!nft) {
      return res.status(404).json({ error: "NFT not found" });
    }
    
    res.json(nft);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch NFT" });
  }
});

// Get comments for an NFT
router.get("/:id/comments", async (req, res) => {
  try {
    const nftId = parseInt(req.params.id);
    const comments = await storage.getNftComments(nftId);
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// Create a new comment for an NFT
router.post("/:id/comments", async (req, res) => {
  try {
    const nftId = parseInt(req.params.id);
    
    // Validate the request body
    const validatedData = insertNftCommentSchema.parse({
      ...req.body,
      nftId
    });
    
    const comment = await storage.createNftComment(validatedData);
    res.status(201).json(comment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request data", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to create comment" });
    }
  }
});

export default router;