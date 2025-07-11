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
    const { comment, userWallet, username } = req.body;
    
    // Get user profile information from database
    let userProfile = null;
    try {
      userProfile = await storage.getUserByWallet(userWallet);
    } catch (error) {
      // User not found in database, creating comment with basic info
    }
    
    // Prepare comment data with user profile information
    const commentData = {
      nftId,
      userWallet,
      username,
      displayName: userProfile?.displayName || username,
      avatarUrl: userProfile?.avatarUrl || null,
      comment: comment.trim()
    };
    
    // Validate the request body
    const validatedData = insertNftCommentSchema.parse(commentData);
    
    const createdComment = await storage.createNftComment(validatedData);
    res.status(201).json(createdComment);
  } catch (error) {
    console.error("Error creating NFT comment:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request data", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to create comment" });
    }
  }
});

// Delete NFT comment
router.delete("/:id/comments/:commentId", async (req, res) => {
  try {
    const nftId = parseInt(req.params.id);
    const commentId = parseInt(req.params.commentId);
    const { userWallet } = req.body;

    if (!userWallet) {
      return res.status(400).json({ error: "User wallet address required" });
    }

    // Get the comment to verify ownership
    const comment = await storage.getNftCommentById(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if user owns the comment
    if (comment.userWallet !== userWallet) {
      return res.status(403).json({ error: "You can only delete your own comments" });
    }

    // Delete the comment
    await storage.deleteNftComment(commentId);

    res.json({ success: true, message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting NFT comment:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

export default router;