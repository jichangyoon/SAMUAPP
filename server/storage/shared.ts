import { getDatabase } from "../db";
import { inArray } from "drizzle-orm";
import { users, memes, type Meme } from "@shared/schema";

const db = getDatabase();

export async function enrichMemesWithProfiles<T extends Meme | null>(memeList: T[]): Promise<T[]> {
  if (!db) return memeList;
  const validMemes = memeList.filter((m): m is Meme & T => m !== null);
  if (validMemes.length === 0) return memeList;

  const wallets = Array.from(new Set(validMemes.map(m => m.authorWallet)));
  const userRows = await db
    .select()
    .from(users)
    .where(inArray(users.walletAddress, wallets));

  const userMap = new Map(userRows.map(u => [u.walletAddress, u]));

  return memeList.map(meme => {
    if (!meme) return meme;
    const user = userMap.get(meme.authorWallet);
    if (user) {
      return {
        ...meme,
        authorUsername: user.displayName || user.username || meme.authorUsername,
        authorAvatarUrl: user.avatarUrl || meme.authorAvatarUrl,
      } as T;
    }
    return meme;
  }) as T[];
}
