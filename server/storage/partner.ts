import { getDatabase } from "../db";
import { eq, and, desc, isNull, or, sql, inArray } from "drizzle-orm";
import { logger } from "../utils/logger";
import {
  memes, votes, partnerMemes, partnerVotes,
  type Meme, type InsertMeme, type Vote, type InsertVote
} from "@shared/schema";

export class PartnerStorage {
  private db = getDatabase();
  async createPartnerMeme(insertMeme: InsertMeme, partnerId: string): Promise<Meme> {
    if (!this.db) throw new Error("Database not available");
    
    const [meme] = await this.db
      .insert(partnerMemes)
      .values({ ...insertMeme, partnerId })
      .returning();
    
    // Convert PartnerMeme to Meme format for compatibility
    return {
      id: meme.id,
      contestId: null,
      title: meme.title,
      description: meme.description,
      imageUrl: meme.imageUrl,
      authorWallet: meme.authorWallet,
      authorUsername: meme.authorUsername,
      authorAvatarUrl: null,
      additionalImages: null,
      votes: meme.votes,
      createdAt: meme.createdAt
    };
  }

  async getPartnerMemes(partnerId: string): Promise<Meme[]> {
    if (!this.db) throw new Error("Database not available");
    
    const partnerMemesList = await this.db
      .select()
      .from(partnerMemes)
      .where(eq(partnerMemes.partnerId, partnerId))
      .orderBy(desc(partnerMemes.createdAt));
    
    // Convert PartnerMeme to Meme format for compatibility
    return partnerMemesList.map(meme => ({
      id: meme.id,
      contestId: null,
      title: meme.title,
      description: meme.description,
      imageUrl: meme.imageUrl,
      authorWallet: meme.authorWallet,
      authorUsername: meme.authorUsername,
      authorAvatarUrl: null,
      additionalImages: null,
      votes: meme.votes,
      createdAt: meme.createdAt
    }));
  }

  async getPartnerMemeById(partnerId: string, id: number): Promise<Meme | undefined> {
    if (!this.db) throw new Error("Database not available");
    
    const [meme] = await this.db
      .select()
      .from(partnerMemes)
      .where(and(eq(partnerMemes.partnerId, partnerId), eq(partnerMemes.id, id)));
    
    if (!meme) return undefined;
    
    // Convert PartnerMeme to Meme format for compatibility
    return {
      id: meme.id,
      contestId: null,
      title: meme.title,
      description: meme.description,
      imageUrl: meme.imageUrl,
      authorWallet: meme.authorWallet,
      authorUsername: meme.authorUsername,
      authorAvatarUrl: null,
      additionalImages: null,
      votes: meme.votes,
      createdAt: meme.createdAt
    };
  }

  async createPartnerVote(insertVote: InsertVote, partnerId: string): Promise<Vote> {
    if (!this.db) throw new Error("Database not available");

    return await this.db.transaction(async (tx) => {
      const [vote] = await tx
        .insert(partnerVotes)
        .values({ ...insertVote, partnerId })
        .returning();

      await tx
        .update(partnerMemes)
        .set({ votes: sql<number>`(SELECT COALESCE(SUM(samu_amount), 0) FROM partner_votes WHERE partner_id = ${partnerId} AND meme_id = ${insertVote.memeId})` })
        .where(and(eq(partnerMemes.partnerId, partnerId), eq(partnerMemes.id, insertVote.memeId)));

      return {
        id: vote.id,
        memeId: vote.memeId,
        voterWallet: vote.voterWallet,
        samuAmount: vote.samuAmount,
        txSignature: vote.txSignature,
        createdAt: vote.createdAt
      };
    });
  }

  async hasUserVotedPartner(partnerId: string, memeId: number, voterWallet: string): Promise<boolean> {
    if (!this.db) throw new Error("Database not available");
    
    const [vote] = await this.db
      .select()
      .from(partnerVotes)
      .where(and(
        eq(partnerVotes.partnerId, partnerId),
        eq(partnerVotes.memeId, memeId),
        eq(partnerVotes.voterWallet, voterWallet)
      ));
    
    return !!vote;
  }

  async updatePartnerMemeVoteCount(partnerId: string, memeId: number): Promise<void> {
    if (!this.db) throw new Error("Database not available");
    
    const partnerVotesList = await this.db
      .select()
      .from(partnerVotes)
      .where(and(eq(partnerVotes.partnerId, partnerId), eq(partnerVotes.memeId, memeId)));
    
    const totalSamu = partnerVotesList.reduce((sum, vote) => sum + vote.samuAmount, 0);
    
    await this.db
      .update(partnerMemes)
      .set({ votes: totalSamu })
      .where(and(eq(partnerMemes.partnerId, partnerId), eq(partnerMemes.id, memeId)));
  }

}