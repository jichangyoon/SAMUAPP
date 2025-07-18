import { Router } from "express";
import multer from "multer";
import { uploadToR2, deleteFromR2, extractKeyFromUrl } from "../r2-storage";

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

  console.log('File upload attempt:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    extname,
    mimetypeValid: mimetype
  });

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images (JPEG, PNG, GIF, WebP) and videos (MP4, MOV, AVI, WebM) are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter
});

// Upload single file endpoint
router.post("/upload", (req, res, next) => {
  console.log('Upload request received:', {
    method: req.method,
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length']
  });
  next();
}, upload.single("file"), async (req, res) => {
  try {
    console.log('File upload processing:', {
      file: req.file ? {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : 'No file received'
    });

    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Upload to Cloudflare R2
    const uploadResult = await uploadToR2(
      req.file.buffer,
      req.file.originalname,
      'uploads'
    );

    if (!uploadResult.success) {
      console.error('R2 upload failed:', uploadResult.error);
      return res.status(500).json({ 
        error: "Upload failed", 
        details: uploadResult.error 
      });
    }
    
    const response = {
      success: true,
      fileUrl: uploadResult.url!,
      key: uploadResult.key!,
      originalName: req.file.originalname,
      size: req.file.size
    };

    console.log('R2 upload successful:', response);
    res.json(response);
  } catch (error: any) {
    console.error("Upload error:", error);
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
    console.error("Delete error:", error);
    res.status(500).json({ error: "Delete failed" });
  }
});

// Remove this duplicate - already handled below

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
    console.error("R2 health check error:", error);
    res.status(500).json({ error: "R2 health check failed" });
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
    console.error('Delete R2 file error:', error);
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
      console.error('R2 profile upload failed:', uploadResult.error);
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
    console.error('Profile upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during profile upload'
    });
  }
});

export { router as uploadsRouter };
export default router;