import { Router } from "express";
import { storage } from "../storage";
import { insertCommentSchema } from "@shared/schema";

export const nftsRouter = Router();

// Get all NFTs
nftsRouter.get("/", async (req, res) => {
  try {
    const nfts = await storage.getNfts();
    res.json(nfts);
  } catch (error) {
    console.error("Error fetching NFTs:", error);
    res.status(500).json({ error: "Failed to fetch NFTs" });
  }
});

// Get NFT by ID
nftsRouter.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid NFT ID" });
    }

    const nft = await storage.getNftById(id);
    if (!nft) {
      return res.status(404).json({ error: "NFT not found" });
    }

    res.json(nft);
  } catch (error) {
    console.error("Error fetching NFT:", error);
    res.status(500).json({ error: "Failed to fetch NFT" });
  }
});

// Get comments for an NFT
nftsRouter.get("/:id/comments", async (req, res) => {
  try {
    const nftId = parseInt(req.params.id);
    if (isNaN(nftId)) {
      return res.status(400).json({ error: "Invalid NFT ID" });
    }

    const comments = await storage.getCommentsByNftId(nftId);
    res.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// Create a comment for an NFT
nftsRouter.post("/:id/comments", async (req, res) => {
  try {
    const nftId = parseInt(req.params.id);
    if (isNaN(nftId)) {
      return res.status(400).json({ error: "Invalid NFT ID" });
    }

    // Check if NFT exists
    const nft = await storage.getNftById(nftId);
    if (!nft) {
      return res.status(404).json({ error: "NFT not found" });
    }

    // Validate comment data
    const commentData = insertCommentSchema.parse({
      ...req.body,
      nftId,
    });

    const comment = await storage.createComment(commentData);
    res.status(201).json(comment);
  } catch (error) {
    console.error("Error creating comment:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid comment data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create comment" });
  }
});