import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { execSync } from "child_process";
import os from "os";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { uploadToR2 } from "../r2-storage";
import { logger } from "./logger";

// Prefer system ffmpeg; fall back to the bundled installer
function resolveFfmpegPath(): string {
  try {
    const systemPath = execSync("which ffmpeg", { encoding: "utf-8" }).trim();
    if (systemPath) return systemPath;
  } catch {}
  return ffmpegInstaller.path;
}

ffmpeg.setFfmpegPath(resolveFfmpegPath());

/**
 * Given a video buffer, generate an animated WebP thumbnail (first 4 seconds)
 * and upload it to R2. Returns the public URL on success, or null on failure.
 */
export async function generateAnimatedWebPThumbnail(
  videoBuffer: Buffer,
  originalName: string
): Promise<string | null> {
  const tmpDir = os.tmpdir();
  const id = crypto.randomUUID();
  const inputPath = path.join(tmpDir, `${id}-input${path.extname(originalName)}`);
  const outputPath = path.join(tmpDir, `${id}-thumb.webp`);

  try {
    fs.writeFileSync(inputPath, videoBuffer);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          "-t", "4",
          "-vf", "fps=12,scale=480:-1:flags=lanczos",
          "-loop", "0",
          "-quality", "75",
          "-compression_level", "6",
          "-preset", "photo",
          "-an",
        ])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });

    const webpBuffer = fs.readFileSync(outputPath);
    const result = await uploadToR2(webpBuffer, "animated-thumbnail.webp", "thumbnails/animated");

    if (!result.success || !result.url) {
      logger.warn("[VideoThumbnail] R2 upload failed:", result.error);
      return null;
    }

    return result.url;
  } catch (error) {
    logger.warn("[VideoThumbnail] Thumbnail generation failed:", error);
    return null;
  } finally {
    try { fs.unlinkSync(inputPath); } catch {}
    try { fs.unlinkSync(outputPath); } catch {}
  }
}

export function isVideoMimeType(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}
