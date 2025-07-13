
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

// Get all memes with pagination - optimized with database-level sorting
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 7;
    const sortBy = req.query.sortBy as string || 'votes';
    const contestId = req.query.contestId as string;
    
    // Set cache headers for better performance
    res.set('Cache-Control', 'public, max-age=60'); // 1분 브라우저 캐시
    
    let allMemes;
    if (contestId) {
      // Get memes for specific contest (archived)
      allMemes = await storage.getMemesByContestId(parseInt(contestId));
    } else {
      // Get current memes (not archived) - these are memes with contest_id = null
      allMemes = await storage.getMemes();
    }
    
    // Sort memes on database level would be better, but for now optimize client-side sorting
    let sortedMemes = [...allMemes];
    if (sortBy === 'votes') {
      sortedMemes.sort((a, b) => b.votes - a.votes);
    } else if (sortBy === 'latest') {
      sortedMemes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    // Calculate pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMemes = sortedMemes.slice(startIndex, endIndex);
    
    const totalMemes = sortedMemes.length;
    const hasMore = endIndex < totalMemes;
    
    // Return optimized response
    res.json({
      memes: paginatedMemes,
      pagination: {
        page,
        limit,
        total: totalMemes,
        hasMore,
        totalPages: Math.ceil(totalMemes / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch memes" });
  }
});

// Get ALL memes (current + archived) for profile page vote matching
router.get("/all", async (req, res) => {
  try {
    // Set cache headers for better performance
    res.set('Cache-Control', 'public, max-age=60'); // 1분 브라우저 캐시
    
    // Get all memes from database (both current and archived)
    const allMemes = await storage.getAllMemes();
    
    res.json({
      memes: allMemes,
      total: allMemes.length
    });
  } catch (error) {
    console.error("Error fetching all memes:", error);
    res.status(500).json({ message: "Failed to fetch all memes" });
  }
});

// Create a new meme
router.post("/", async (req, res) => {
  try {
    const memeData = insertMemeSchema.parse(req.body);

    // Get user profile information to populate author details
    if (memeData.authorWallet) {
      const user = await storage.getUserByWallet(memeData.authorWallet);
      if (user) {
        // Update meme data with current user profile information
        memeData.authorUsername = user.displayName || user.username;
        memeData.authorAvatarUrl = user.avatarUrl || undefined;
      }
    }

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

    // Delete associated file from R2 or local storage
    if (meme.imageUrl.includes('r2.dev') || meme.imageUrl.includes('r2.cloudflarestorage.com')) {
      // R2 cloud file - use direct deletion
      try {
        const { deleteFromR2, extractKeyFromUrl } = await import('../r2-storage');
        const r2Key = extractKeyFromUrl(meme.imageUrl);
        
        if (r2Key) {
          const deleteResult = await deleteFromR2(r2Key);
          if (!deleteResult.success) {
            console.warn('Failed to delete R2 file:', deleteResult.error);
          } else {
            console.log('Successfully deleted R2 file:', r2Key);
          }
        } else {
          console.warn('Could not extract R2 key from URL:', meme.imageUrl);
        }
      } catch (error) {
        console.error('Failed to delete R2 file:', error);
      }
    } else if (meme.imageUrl.startsWith('/uploads/')) {
      // Local file
      const filename = meme.imageUrl.split('/').pop();
      if (filename) {
        try {
          await fetch(`/api/uploads/delete/${filename}`, { method: 'DELETE' });
        } catch (error) {
          console.warn('Failed to delete local file:', error);
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
