import { getDatabase } from "../db";
import { eq, and, desc, isNull, or, sql, inArray } from "drizzle-orm";
import { logger } from "../utils/logger";
import {
  memes, votes, contests,
  type Meme, type InsertMeme, type Vote, type InsertVote
} from "@shared/schema";
import { enrichMemesWithProfiles } from "./shared";

export class MemeStorage {
  private db = getDatabase();
  async createMeme(insertMeme: InsertMeme): Promise<Meme> {
    if (!this.db) throw new Error("Database not available");
    
    const [meme] = await this.db
      .insert(memes)
      .values(insertMeme)
      .returning();
    return meme;
  }

  async getMemes(): Promise<Meme[]> {
    if (!this.db) throw new Error("Database not available");
    
    // Get current active contest to determine which memes to show
    const [currentContest] = await this.db
      .select()
      .from(contests)
      .where(eq(contests.status, "active"))
      .limit(1);
    
    let result;
    if (currentContest) {
      // If there's an active contest, show memes from that contest
      result = await this.db
        .select()
        .from(memes)
        .where(eq(memes.contestId, currentContest.id))
        .orderBy(desc(memes.createdAt))
        .limit(100);
    } else {
      // If no active contest, show memes that are not archived (contestId IS NULL)
      result = await this.db
        .select()
        .from(memes)
        .where(isNull(memes.contestId))
        .orderBy(desc(memes.createdAt))
        .limit(100);
    }
    
    return result;
  }

  async getAllMemes(): Promise<Meme[]> {
    if (!this.db) throw new Error("Database not available");
    return this.db.select().from(memes).orderBy(desc(memes.createdAt));
  }

  async getMemeById(id: number): Promise<Meme | undefined> {
    if (!this.db) throw new Error("Database not available");
    
    const [meme] = await this.db
      .select()
      .from(memes)
      .where(eq(memes.id, id));
    return meme;
  }

  async getMemesByContestId(contestId: number): Promise<Meme[]> {
    if (!this.db) throw new Error("Database not available");
    
    const contestMemes = await this.db
      .select()
      .from(memes)
      .where(eq(memes.contestId, contestId))
      .orderBy(desc(memes.votes));

    return enrichMemesWithProfiles(contestMemes);
  }

  async deleteMeme(id: number): Promise<void> {
    if (!this.db) throw new Error("Database not available");
    
    // Delete associated votes first
    await this.db
      .delete(votes)
      .where(eq(votes.memeId, id));
    
    // Delete the meme
    await this.db
      .delete(memes)
      .where(eq(memes.id, id));
  }

  async getAllVotes(): Promise<Vote[]> {
    if (!this.db) throw new Error("Database not available");
    return await this.db.select().from(votes);
  }

  async createVote(insertVote: InsertVote): Promise<Vote> {
    if (!this.db) throw new Error("Database not available");

    return await this.db.transaction(async (tx) => {
      const [vote] = await tx
        .insert(votes)
        .values(insertVote)
        .returning();

      await tx
        .update(memes)
        .set({ votes: sql<number>`(SELECT COALESCE(SUM(samu_amount), 0) FROM votes WHERE meme_id = ${insertVote.memeId})` })
        .where(eq(memes.id, insertVote.memeId));

      return vote;
    });
  }

  async getVotesByMemeId(memeId: number): Promise<Vote[]> {
    if (!this.db) throw new Error("Database not available");
    return await this.db.select().from(votes).where(eq(votes.memeId, memeId));
  }

  async getVotesByMemeIds(memeIds: number[]): Promise<Vote[]> {
    if (!this.db) throw new Error("Database not available");
    if (memeIds.length === 0) return [];
    return await this.db.select().from(votes).where(inArray(votes.memeId, memeIds));
  }

  async getVoteByTxSignature(txSignature: string): Promise<Vote | undefined> {
    if (!this.db) throw new Error("Database not available");
    const [vote] = await this.db
      .select()
      .from(votes)
      .where(eq(votes.txSignature, txSignature))
      .limit(1);
    return vote;
  }

  async hasUserVoted(memeId: number, voterWallet: string): Promise<boolean> {
    if (!this.db) throw new Error("Database not available");
    
    const [vote] = await this.db
      .select()
      .from(votes)
      .where(and(eq(votes.memeId, memeId), eq(votes.voterWallet, voterWallet)));
    
    return !!vote;
  }

  async updateMemeVoteCount(memeId: number): Promise<void> {
    if (!this.db) throw new Error("Database not available");
    // 원자적 서브쿼리 방식 — SELECT+UPDATE 분리로 인한 race condition 제거
    await this.db
      .update(memes)
      .set({ votes: sql<number>`(SELECT COALESCE(SUM(samu_amount), 0) FROM votes WHERE meme_id = ${memeId})` })
      .where(eq(memes.id, memeId));
  }

  async updateMemeAnimatedThumbnail(memeId: number, animatedThumbnailUrl: string): Promise<void> {
    if (!this.db) throw new Error("Database not available");
    await this.db
      .update(memes)
      .set({ animatedThumbnailUrl })
      .where(eq(memes.id, memeId));
  }


}