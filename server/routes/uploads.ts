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
    fileSize: 50 * 1024 * 1024, // 50MB limit
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
      process.env.R2_BUCKET_NAME!
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

// Delete file endpoint
router.delete("/delete/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename to prevent path traversal
    if (!filename || filename.includes("..") || filename.includes("/")) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    const filePath = path.join(uploadsDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // Delete the file
    await fsPromises.unlink(filePath);
    
    res.json({ success: true, message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Delete failed" });
  }
});

// Get file info endpoint
router.get("/info/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename
    if (!filename || filename.includes("..") || filename.includes("/")) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    const filePath = path.join(uploadsDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const stats = await fsPromises.stat(filePath);
    
    res.json({
      filename: filename,
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime
    });
  } catch (error) {
    console.error("File info error:", error);
    res.status(500).json({ error: "Failed to get file info" });
  }
});

export default router;