import { getDatabase } from "../db";
import { eq, and, desc, isNull, or, sql, inArray } from "drizzle-orm";
import { logger } from "../utils/logger";
import {
  revenues, revenueShares, memes, votes,
  type Revenue, type InsertRevenue, type RevenueShare, type InsertRevenueShare
} from "@shared/schema";

export class RevenueStorage {
  private db = getDatabase();
  async createRevenue(insertRevenue: InsertRevenue): Promise<Revenue> {
    if (!this.db) throw new Error("Database not available");
    const [revenue] = await this.db.insert(revenues).values(insertRevenue).returning();
    return revenue;
  }

  async getRevenuesByContestId(contestId: number): Promise<Revenue[]> {
    if (!this.db) throw new Error("Database not available");
    return await this.db.select().from(revenues).where(eq(revenues.contestId, contestId)).orderBy(desc(revenues.createdAt));
  }

  async getRevenueById(id: number): Promise<Revenue | undefined> {
    if (!this.db) throw new Error("Database not available");
    const [revenue] = await this.db.select().from(revenues).where(eq(revenues.id, id));
    return revenue;
  }

  async updateRevenueStatus(id: number, status: string, distributedAt?: Date): Promise<Revenue> {
    if (!this.db) throw new Error("Database not available");
    const updateData: any = { status };
    if (distributedAt) updateData.distributedAt = distributedAt;
    const [revenue] = await this.db.update(revenues).set(updateData).where(eq(revenues.id, id)).returning();
    return revenue;
  }

  async createRevenueShare(insertShare: InsertRevenueShare): Promise<RevenueShare> {
    if (!this.db) throw new Error("Database not available");
    const [share] = await this.db.insert(revenueShares).values(insertShare).returning();
    return share;
  }

  async createRevenueShares(insertShares: InsertRevenueShare[]): Promise<RevenueShare[]> {
    if (!this.db) throw new Error("Database not available");
    if (insertShares.length === 0) return [];
    return await this.db.insert(revenueShares).values(insertShares).returning();
  }

  async getRevenueSharesByRevenueId(revenueId: number): Promise<RevenueShare[]> {
    if (!this.db) throw new Error("Database not available");
    return await this.db.select().from(revenueShares).where(eq(revenueShares.revenueId, revenueId));
  }

  async getRevenueSharesByWallet(walletAddress: string): Promise<RevenueShare[]> {
    if (!this.db) throw new Error("Database not available");
    return await this.db.select().from(revenueShares).where(eq(revenueShares.walletAddress, walletAddress)).orderBy(desc(revenueShares.createdAt));
  }

  async getRevenueSharesByContestId(contestId: number): Promise<RevenueShare[]> {
    if (!this.db) throw new Error("Database not available");
    return await this.db.select().from(revenueShares).where(eq(revenueShares.contestId, contestId));
  }

  async getContestVoteSummary(contestId: number): Promise<{voterWallet: string, totalSamuAmount: number}[]> {
    if (!this.db) throw new Error("Database not available");
    const contestMemes = await this.db.select({ id: memes.id }).from(memes).where(eq(memes.contestId, contestId));
    if (contestMemes.length === 0) return [];
    
    const memeIds = contestMemes.map(m => m.id);
    const allVotes = await this.db.select().from(votes).where(inArray(votes.memeId, memeIds));
    
    const summary = new Map<string, number>();
    for (const vote of allVotes) {
      const current = summary.get(vote.voterWallet) || 0;
      summary.set(vote.voterWallet, current + (vote.samuAmount || 0));
    }
    
    return Array.from(summary.entries()).map(([voterWallet, totalSamuAmount]) => ({ voterWallet, totalSamuAmount }));
  }
}