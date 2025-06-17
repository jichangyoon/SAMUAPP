import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMemeSchema, insertVoteSchema } from "@shared/schema";
import multer from "multer";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all memes
  app.get("/api/memes", async (req, res) => {
    try {
      const memes = await storage.getMemes();
      res.json(memes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch memes" });
    }
  });

  // Create a new meme
  app.post("/api/memes", upload.single('image'), async (req, res) => {
    try {
      const { title, description, authorWallet, authorUsername } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ message: "Image file is required" });
      }

      // Convert file to base64 data URL for storage
      const imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

      const memeData = insertMemeSchema.parse({
        title: title || "Untitled Meme",
        description: description || "",
        imageUrl,
        authorWallet,
        authorUsername
      });

      const meme = await storage.createMeme(memeData);
      res.status(201).json(meme);
    } catch (error) {
      console.error('Error creating meme:', error);
      res.status(400).json({ message: "Failed to create meme" });
    }
  });

  // Vote on a meme
  app.post("/api/memes/:id/vote", async (req, res) => {
    try {
      const memeId = parseInt(req.params.id);
      const { voterWallet, votingPower } = req.body;

      const voteData = insertVoteSchema.parse({
        memeId,
        voterWallet,
        votingPower
      });

      // Check if user already voted
      const hasVoted = await storage.hasUserVoted(memeId, voterWallet);
      if (hasVoted) {
        return res.status(400).json({ message: "You have already voted on this meme" });
      }

      const vote = await storage.createVote(voteData);
      const updatedMeme = await storage.getMemeById(memeId);
      
      res.json({ vote, meme: updatedMeme });
    } catch (error) {
      console.error('Error voting:', error);
      res.status(400).json({ message: "Failed to vote" });
    }
  });

  // Check if user has voted on a meme
  app.get("/api/memes/:id/voted/:wallet", async (req, res) => {
    try {
      const memeId = parseInt(req.params.id);
      const voterWallet = req.params.wallet;
      
      const hasVoted = await storage.hasUserVoted(memeId, voterWallet);
      res.json({ hasVoted });
    } catch (error) {
      res.status(500).json({ message: "Failed to check vote status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
