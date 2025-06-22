
import { Router } from "express";
import { storage } from "../storage";
import { insertMemeSchema } from "@shared/schema";
import multer from "multer";

const router = Router();

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

// Get all memes
router.get("/", async (req, res) => {
  try {
    const memes = await storage.getMemes();
    res.json(memes);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch memes" });
  }
});

// Create a new meme
router.post("/", async (req, res) => {
  try {
    const memeData = insertMemeSchema.parse(req.body);

    const meme = await storage.createMeme(memeData);
    res.status(201).json(meme);
  } catch (error) {
    console.error('Error creating meme:', error);
    res.status(400).json({ message: "Failed to create meme" });
  }
});

// Delete a meme (only by author)
router.delete("/:id", async (req, res) => {
  try {
    const memeId = parseInt(req.params.id);
    const { authorWallet } = req.body;
    
    if (!authorWallet) {
      return res.status(400).json({ message: "Author wallet is required" });
    }

    const meme = await storage.getMemeById(memeId);
    if (!meme) {
      return res.status(404).json({ message: "Meme not found" });
    }

    // Check if the requester is the author
    if (meme.authorWallet !== authorWallet) {
      return res.status(403).json({ message: "Only the author can delete this meme" });
    }

    // Delete associated file if it's a local upload
    if (meme.imageUrl.startsWith('/uploads/')) {
      const filename = meme.imageUrl.split('/').pop();
      if (filename) {
        try {
          await fetch(`/api/uploads/delete/${filename}`, { method: 'DELETE' });
        } catch (error) {
          console.warn('Failed to delete file:', error);
        }
      }
    }

    await storage.deleteMeme(memeId);
    res.json({ message: "Meme deleted successfully" });
  } catch (error) {
    console.error('Error deleting meme:', error);
    res.status(500).json({ message: "Failed to delete meme" });
  }
});

export { router as memesRouter };
