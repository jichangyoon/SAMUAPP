import { generateAnimatedWebPThumbnail } from "../server/utils/video-thumbnail";
import { getDatabase } from "../server/db";
import { memes } from "../shared/schema";
import { eq } from "drizzle-orm";

const MEME_ID = parseInt(process.argv[2] || "302");

async function main() {
  const db = getDatabase();
  if (!db) throw new Error("DB not initialized");

  const rows = await db.select().from(memes).where(eq(memes.id, MEME_ID)).limit(1);
  const meme = rows[0];
  if (!meme) { console.log("Meme not found:", MEME_ID); process.exit(1); }

  console.log(`Meme #${meme.id}: ${meme.title}`);
  console.log("Video URL:", meme.imageUrl);
  console.log("Current animatedThumbnailUrl:", meme.animatedThumbnailUrl || "(none)");

  if (!meme.imageUrl.match(/\.(mp4|mov|avi|webm)$/i)) {
    console.log("Not a video meme, skipping.");
    process.exit(0);
  }

  console.log("\nFetching video from R2...");
  const res = await fetch(meme.imageUrl);
  if (!res.ok) { console.log("Fetch failed:", res.status, res.statusText); process.exit(1); }
  const buffer = Buffer.from(await res.arrayBuffer());
  console.log("Video size:", Math.round(buffer.length / 1024), "KB");

  console.log("Generating animated WebP (first 4s)...");
  const url = await generateAnimatedWebPThumbnail(buffer, "test.mp4");

  if (!url) {
    console.log("\nFAILED — thumbnail generation returned null");
    process.exit(1);
  }

  console.log("\nSUCCESS!");
  console.log("Thumbnail URL:", url);

  await db.update(memes).set({ animatedThumbnailUrl: url }).where(eq(memes.id, MEME_ID));
  console.log("DB updated.");
  process.exit(0);
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });
