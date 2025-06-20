
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
router.post("/", upload.single('image'), async (req, res) => {
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

export { router as memesRouter };
