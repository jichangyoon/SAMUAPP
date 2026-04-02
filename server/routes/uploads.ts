import { Router } from "express";
import multer from "multer";
import { uploadToR2, deleteFromR2, extractKeyFromUrl } from "../r2-storage";
import { logger } from "../utils/logger";
import { requireAdminMiddleware } from "../utils/admin-auth";
import { generateAnimatedWebPThumbnail, isVideoMimeType } from "../utils/video-thumbnail";

const router = Router();

// Configure multer for memory storage (files will be uploaded to R2)
const storage = multer.memoryStorage();

// File filter to accept only images, GIFs, and videos
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime', // for .mov files
    'video/x-msvideo', // for .avi files
    'video/webm'
  ];
  
  const allowedExtensions = /\.(jpeg|jpg|png|gif|webp|mp4|mov|avi|webm)$/i;
  const extname = allowedExtensions.test(file.originalname);
  const mimetype = allowedMimeTypes.includes(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images (JPEG, PNG, GIF, WebP) and videos (MP4, MOV, AVI, WebM) are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (videos up to 50MB)
  },
  fileFilter: fileFilter
});

// Upload single file endpoint
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Upload to Cloudflare R2
    const uploadResult = await uploadToR2(
      req.file.buffer,
      req.file.originalname,
      'uploads'
    );

    if (!uploadResult.success) {
      logger.error('R2 upload failed:', uploadResult.error);
      return res.status(500).json({ 
        error: "Upload failed", 
        details: uploadResult.error 
      });
    }
    
    let animatedThumbnailUrl: string | null = null;
    if (isVideoMimeType(req.file.mimetype)) {
      animatedThumbnailUrl = await generateAnimatedWebPThumbnail(req.file.buffer, req.file.originalname);
    }

    const response: Record<string, unknown> = {
      success: true,
      fileUrl: uploadResult.url!,
      key: uploadResult.key!,
      originalName: req.file.originalname,
      size: req.file.size,
    };

    if (animatedThumbnailUrl) {
      response.animatedThumbnailUrl = animatedThumbnailUrl;
    }

    res.json(response);
  } catch (error: any) {
    logger.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed", details: error?.message || 'Unknown error' });
  }
});

// Delete file endpoint (now supports R2 URLs)
router.delete("/delete", async (req, res) => {
  try {
    const { fileUrl } = req.body;
    
    if (!fileUrl) {
      return res.status(400).json({ error: "File URL required" });
    }

    // Extract key from R2 URL
    const key = extractKeyFromUrl(fileUrl);
    if (!key) {
      return res.status(400).json({ error: "Invalid R2 file URL" });
    }

    // Delete from R2
    const success = await deleteFromR2(key, process.env.R2_BUCKET_NAME!);
    
    if (!success) {
      return res.status(500).json({ error: "Failed to delete file from R2" });
    }
    
    res.json({ success: true, message: "File deleted successfully" });
  } catch (error) {
    logger.error("Delete error:", error);
    res.status(500).json({ error: "Delete failed" });
  }
});

// Health check endpoint for R2 connectivity
router.get("/health", async (req, res) => {
  try {
    // Simple check to verify R2 configuration
    const hasRequiredEnvs = process.env.R2_ACCESS_KEY_ID && 
                           process.env.R2_SECRET_ACCESS_KEY && 
                           process.env.R2_ACCOUNT_ID && 
                           process.env.R2_BUCKET_NAME && 
                           process.env.R2_PUBLIC_URL;
    
    if (!hasRequiredEnvs) {
      return res.status(500).json({ 
        error: "R2 configuration incomplete",
        configured: false 
      });
    }
    
    res.json({
      status: "ok",
      storage: "cloudflare-r2",
      configured: true
    });
  } catch (error) {
    logger.error("R2 health check error:", error);
    res.status(500).json({ error: "R2 health check failed" });
  }
});

router.post("/thumbnail", requireAdminMiddleware, async (req, res) => {
  try {

    const { base64 } = req.body;

    if (!base64 || typeof base64 !== 'string') {
      return res.status(400).json({ error: "base64 image data is required" });
    }

    const buffer = Buffer.from(base64, "base64");

    if (buffer.length < 100) {
      return res.status(400).json({ error: "Image data too small or empty" });
    }
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: "Thumbnail too large (max 10MB)" });
    }

    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8;
    if (!isPng && !isJpeg) {
      return res.status(400).json({ error: "Invalid image format (PNG or JPEG required)" });
    }

    const ext = isPng ? "png" : "jpg";
    const uploadResult = await uploadToR2(buffer, `thumbnail.${ext}`, "thumbnails");

    if (!uploadResult.success) {
      logger.error("R2 thumbnail upload failed:", uploadResult.error);
      return res.status(500).json({ error: "Thumbnail upload failed" });
    }

    res.json({
      success: true,
      imageUrl: uploadResult.url,
      key: uploadResult.key,
    });
  } catch (error: any) {
    logger.error("Thumbnail upload error:", error);
    res.status(500).json({ error: "Thumbnail upload failed" });
  }
});

// Delete file from R2 by key
router.delete('/delete-r2', async (req, res) => {
  try {
    const { key } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: 'File key is required' });
    }

    const result = await deleteFromR2(key, process.env.R2_BUCKET_NAME!);
    
    if (result) {
      res.json({ message: 'File deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete file' });
    }
  } catch (error) {
    logger.error('Delete R2 file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Profile image upload endpoint - uploads to profiles/ folder (MAIN ENDPOINT)
router.post('/profile', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file provided' 
      });
    }

    const { walletAddress } = req.body;
    // Get existing user profile to find old image for cleanup
    let oldImageUrl = null;
    if (walletAddress) {
      try {
        const { storage } = await import('../storage');
        const existingUser = await storage.getUserByWallet(walletAddress);
        if (existingUser?.avatarUrl) {
          oldImageUrl = existingUser.avatarUrl;
        }
      } catch (error) {
        // Silently handle - not critical for upload
      }
    }

    // Upload to R2 in profiles/ folder with size limit
    const uploadResult = await uploadToR2(
      req.file.buffer,
      req.file.originalname,
      'profiles',
      10 * 1024 * 1024 // 10MB limit for profile images
    );

    if (!uploadResult.success) {
      logger.error('R2 profile upload failed:', uploadResult.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload profile image to cloud storage'
      });
    }

    // Delete old image if it exists and upload was successful
    if (oldImageUrl) {
      try {
        const oldKey = extractKeyFromUrl(oldImageUrl);
        if (oldKey) {
          await deleteFromR2(oldKey);
        }
      } catch (error) {
        // Silently handle cleanup errors - not critical
      }
    }

    res.json({
      success: true,
      profileUrl: uploadResult.url,
      key: uploadResult.key,
      originalName: req.file.originalname,
      size: req.file.size
    });

  } catch (error) {
    logger.error('Profile upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during profile upload'
    });
  }
});

// Thumbnail test/regeneration endpoint — admin only
router.post("/thumbnail-test/:memeId", requireAdminMiddleware, async (req, res) => {
  try {
    const memeId = parseInt(req.params.memeId);
    if (isNaN(memeId)) {
      return res.status(400).json({ error: "Invalid meme ID" });
    }

    const { storage } = await import("../storage");
    const meme = await storage.getMemeById(memeId);
    if (!meme) {
      return res.status(404).json({ error: "Meme not found" });
    }

    const videoUrl = meme.imageUrl;
    const isVideo = /\.(mp4|mov|avi|webm)$/i.test(videoUrl);

    if (!isVideo) {
      return res.json({
        memeId,
        message: "Not a video meme — using imageUrl as-is",
        animatedThumbnailUrl: null,
        imageUrl: meme.imageUrl,
        fallback: true,
      });
    }

    // Fetch video from R2 and re-generate thumbnail
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      return res.status(502).json({ error: "Failed to fetch video from storage", videoUrl });
    }

    const arrayBuffer = await videoResponse.arrayBuffer();
    const videoBuffer = Buffer.from(arrayBuffer);

    const ext = videoUrl.split("?")[0].split(".").pop() || "mp4";
    const thumbnailUrl = await generateAnimatedWebPThumbnail(videoBuffer, `video.${ext}`);

    if (!thumbnailUrl) {
      return res.json({
        memeId,
        message: "Thumbnail generation failed — fallback to imageUrl",
        animatedThumbnailUrl: null,
        imageUrl: meme.imageUrl,
        fallback: true,
      });
    }

    // Update the meme record with new thumbnail URL
    await storage.updateMemeAnimatedThumbnail(memeId, thumbnailUrl);

    return res.json({
      memeId,
      message: "Thumbnail generated and saved",
      animatedThumbnailUrl: thumbnailUrl,
      imageUrl: meme.imageUrl,
      fallback: false,
    });
  } catch (error: any) {
    logger.error("[ThumbnailTest] Error:", error);
    res.status(500).json({ error: "Thumbnail test failed", details: error?.message });
  }
});

export { router as uploadsRouter };
export default router;