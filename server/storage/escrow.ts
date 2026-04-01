import { getDatabase } from "../db";
import { eq, and, desc, isNull, or, sql, inArray } from "drizzle-orm";
import { logger } from "../utils/logger";
import {
  voterRewardPool, escrowDeposits, creatorRewardDistributions, memes, votes,
  type VoterRewardPool, type EscrowDeposit, type InsertEscrowDeposit,
  type CreatorRewardDistribution
} from "@shared/schema";

export class EscrowStorage {
  private db = getDatabase();
  async getAllVoterRewardPools(): Promise<VoterRewardPool[]> {
    if (!this.db) throw new Error("Database not available");
    return this.db.select().from(voterRewardPool);
  }

  async createEscrowDeposit(data: InsertEscrowDeposit): Promise<EscrowDeposit> {
    if (!this.db) throw new Error("Database not available");
    const [deposit] = await this.db.insert(escrowDeposits).values(data).returning();
    return deposit;
  }

  async getAllEscrowDeposits(): Promise<EscrowDeposit[]> {
    if (!this.db) throw new Error("Database not available");
    return this.db.select().from(escrowDeposits);
  }

  async getEscrowDepositsByContestId(contestId: number): Promise<EscrowDeposit[]> {
    if (!this.db) throw new Error("Database not available");
    return this.db.select().from(escrowDeposits)
      .where(eq(escrowDeposits.contestId, contestId))
      .orderBy(desc(escrowDeposits.createdAt));
  }

  async getEscrowDepositByOrderId(orderId: number): Promise<EscrowDeposit | undefined> {
    if (!this.db) throw new Error("Database not available");
    const [deposit] = await this.db.select().from(escrowDeposits)
      .where(eq(escrowDeposits.orderId, orderId));
    return deposit;
  }

  async updateEscrowStatus(id: number, status: string, distributedAt?: Date): Promise<EscrowDeposit> {
    if (!this.db) throw new Error("Database not available");
    const updates: any = { status };
    if (distributedAt) updates.distributedAt = distributedAt;
    const [updated] = await this.db.update(escrowDeposits)
      .set(updates)
      .where(eq(escrowDeposits.id, id))
      .returning();
    return updated;
  }

  async getLockedEscrowDeposits(): Promise<EscrowDeposit[]> {
    if (!this.db) throw new Error("Database not available");
    return this.db.select().from(escrowDeposits)
      .where(eq(escrowDeposits.status, "locked"));
  }

  async getMemeVoteSummary(contestId: number): Promise<{memeId: number, authorWallet: string, totalSamuReceived: number}[]> {
    if (!this.db) throw new Error("Database not available");
    const contestMemes = await this.db.select({ id: memes.id, authorWallet: memes.authorWallet })
      .from(memes).where(eq(memes.contestId, contestId));
    if (contestMemes.length === 0) return [];
    
    const memeIds = contestMemes.map(m => m.id);
    const voteResults = await this.db
      .select({
        memeId: votes.memeId,
        totalSamu: sql<number>`COALESCE(SUM(${votes.samuAmount}), 0)`,
      })
      .from(votes)
      .where(inArray(votes.memeId, memeIds))
      .groupBy(votes.memeId);

    return contestMemes.map(m => {
      const voteData = voteResults.find(v => v.memeId === m.id);
      return {
        memeId: m.id,
        authorWallet: m.authorWallet,
        totalSamuReceived: voteData ? Number(voteData.totalSamu) : 0,
      };
    }).filter(m => m.totalSamuReceived > 0);
  }
}
