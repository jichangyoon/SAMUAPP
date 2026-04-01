import { getDatabase } from "../db";
import { eq, and, desc, isNull, or, sql, inArray } from "drizzle-orm";
import { logger } from "../utils/logger";
import {
  voterRewardPool, voterClaimRecords, votes, memes, creatorRewardDistributions, voterRewardDistributions,
  type VoterRewardPool, type InsertVoterRewardPool, type VoterClaimRecord, type InsertVoterClaimRecord,
  type CreatorRewardDistribution, type InsertCreatorRewardDistribution,
  type VoterRewardDistribution, type InsertVoterRewardDistribution
} from "@shared/schema";

export class VoterRewardStorage {
  private db = getDatabase();

  private async getContestVoteSummaryInternal(contestId: number): Promise<{voterWallet: string, totalSamuAmount: number}[]> {
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

  async getOrCreateVoterRewardPool(contestId: number, totalShares: number = 100): Promise<VoterRewardPool> {
    if (!this.db) throw new Error("Database not available");
    // onConflictDoNothing: unique index on contestId가 있어 동시 요청 시 race condition 없이 안전하게 처리
    await this.db.insert(voterRewardPool).values({
      contestId,
      rewardPerShare: 0,
      totalDeposited: 0,
      totalClaimed: 0,
      totalShares: 100,
    }).onConflictDoNothing();
    const [pool] = await this.db.select().from(voterRewardPool)
      .where(eq(voterRewardPool.contestId, contestId)).limit(1);
    return pool!;
  }

  async updateVoterRewardPool(contestId: number, depositAmount: number): Promise<VoterRewardPool> {
    if (!this.db) throw new Error("Database not available");
    let pool = await this.getVoterRewardPool(contestId);
    if (!pool) {
      logger.info(`Voter reward pool not found for contest ${contestId}, creating one automatically`);
      const [newPool] = await this.db.insert(voterRewardPool)
        .values({
          contestId,
          totalShares: 100,
          rewardPerShare: 0,
          totalDeposited: 0,
        })
        .returning();
      pool = newPool;
    }
    if (pool.totalShares <= 0) {
      logger.info(`Voter reward pool for contest ${contestId} had totalShares=0. Fixing to 100 and computing rewardPerShare.`);
      const addedRewardPerShare = depositAmount / 100;
      const [updated] = await this.db.update(voterRewardPool)
        .set({
          totalShares: 100,
          rewardPerShare: pool.rewardPerShare + addedRewardPerShare,
          totalDeposited: pool.totalDeposited + depositAmount,
          updatedAt: new Date(),
        })
        .where(eq(voterRewardPool.contestId, contestId))
        .returning();
      return updated;
    }
    const addedRewardPerShare = depositAmount / pool.totalShares;
    const [updated] = await this.db.update(voterRewardPool)
      .set({
        rewardPerShare: pool.rewardPerShare + addedRewardPerShare,
        totalDeposited: pool.totalDeposited + depositAmount,
        updatedAt: new Date(),
      })
      .where(eq(voterRewardPool.contestId, contestId))
      .returning();
    return updated;
  }

  async getVoterRewardPool(contestId: number): Promise<VoterRewardPool | undefined> {
    if (!this.db) throw new Error("Database not available");
    const [pool] = await this.db.select().from(voterRewardPool)
      .where(eq(voterRewardPool.contestId, contestId)).limit(1);
    return pool;
  }

  async getOrCreateVoterClaimRecord(contestId: number, voterWallet: string, sharePercent: number): Promise<VoterClaimRecord> {
    if (!this.db) throw new Error("Database not available");
    const [existing] = await this.db.select().from(voterClaimRecords)
      .where(and(eq(voterClaimRecords.contestId, contestId), eq(voterClaimRecords.voterWallet, voterWallet)))
      .limit(1);
    if (existing) return existing;
    const [record] = await this.db.insert(voterClaimRecords).values({
      contestId,
      voterWallet,
      sharePercent,
      lastClaimedRewardPerShare: 0,
      totalClaimed: 0,
    }).returning();
    return record;
  }

  async getClaimableAmount(contestId: number, voterWallet: string): Promise<{ claimable: number; totalClaimed: number; sharePercent: number }> {
    if (!this.db) throw new Error("Database not available");
    const pool = await this.getVoterRewardPool(contestId);
    if (!pool) return { claimable: 0, totalClaimed: 0, sharePercent: 0 };
    const [claimRecord] = await this.db.select().from(voterClaimRecords)
      .where(and(eq(voterClaimRecords.contestId, contestId), eq(voterClaimRecords.voterWallet, voterWallet)))
      .limit(1);
    if (!claimRecord) {
      const voteSummary = await this.getContestVoteSummaryInternal(contestId);
      const voterEntry = voteSummary.find(v => v.voterWallet === voterWallet);
      if (!voterEntry) return { claimable: 0, totalClaimed: 0, sharePercent: 0 };
      const totalVotes = voteSummary.reduce((sum, v) => sum + v.totalSamuAmount, 0);
      const sharePercent = totalVotes > 0 ? (voterEntry.totalSamuAmount / totalVotes) * 100 : 0;
      const claimable = pool.rewardPerShare * sharePercent;
      return { claimable, totalClaimed: 0, sharePercent };
    }
    const unclaimedRewardPerShare = pool.rewardPerShare - claimRecord.lastClaimedRewardPerShare;
    const claimable = unclaimedRewardPerShare * claimRecord.sharePercent;
    return { claimable, totalClaimed: claimRecord.totalClaimed, sharePercent: claimRecord.sharePercent };
  }

  async getBatchClaimableAmounts(contestIds: number[], voterWallet: string): Promise<Map<number, { claimable: number; totalClaimed: number }>> {
    if (!this.db) throw new Error("Database not available");
    const result = new Map<number, { claimable: number; totalClaimed: number }>();
    if (contestIds.length === 0) return result;

    // 한 번에 모든 풀 + 클레임 레코드 조회
    const [pools, claimRecords] = await Promise.all([
      this.db.select().from(voterRewardPool).where(inArray(voterRewardPool.contestId, contestIds)),
      this.db.select().from(voterClaimRecords).where(
        and(eq(voterClaimRecords.voterWallet, voterWallet), inArray(voterClaimRecords.contestId, contestIds))
      ),
    ]);

    const poolByContest = new Map(pools.map(p => [p.contestId, p]));
    const claimByContest = new Map(claimRecords.map(c => [c.contestId, c]));

    for (const cid of contestIds) {
      const pool = poolByContest.get(cid);
      if (!pool) { result.set(cid, { claimable: 0, totalClaimed: 0 }); continue; }

      const claimRecord = claimByContest.get(cid);
      if (!claimRecord) {
        // 클레임 기록 없음 = 아직 한 번도 클레임 안 한 경우 → 개별 조회로 fallback
        const individual = await this.getClaimableAmount(cid, voterWallet);
        result.set(cid, { claimable: individual.claimable, totalClaimed: individual.totalClaimed });
      } else {
        const unclaimedRps = pool.rewardPerShare - claimRecord.lastClaimedRewardPerShare;
        result.set(cid, {
          claimable: unclaimedRps * claimRecord.sharePercent,
          totalClaimed: claimRecord.totalClaimed,
        });
      }
    }
    return result;
  }

  async claimVoterReward(contestId: number, voterWallet: string): Promise<{ claimedAmount: number }> {
    if (!this.db) throw new Error("Database not available");
    const pool = await this.getVoterRewardPool(contestId);
    if (!pool) throw new Error("No reward pool found");

    const voteSummary = await this.getContestVoteSummaryInternal(contestId);
    const voterEntry = voteSummary.find(v => v.voterWallet === voterWallet);
    if (!voterEntry) throw new Error("You have no votes in this contest");
    const totalVotes = voteSummary.reduce((sum, v) => sum + v.totalSamuAmount, 0);
    const sharePercent = totalVotes > 0 ? (voterEntry.totalSamuAmount / totalVotes) * 100 : 0;

    const claimRecord = await this.getOrCreateVoterClaimRecord(contestId, voterWallet, sharePercent);
    const unclaimedRewardPerShare = pool.rewardPerShare - claimRecord.lastClaimedRewardPerShare;
    const claimable = unclaimedRewardPerShare * claimRecord.sharePercent;

    if (claimable <= 0) throw new Error("No rewards to claim");

    // 트랜잭션 + optimistic locking: lastClaimedRewardPerShare가 읽은 값과 다르면 0 rows updated → 이중클레임 차단
    return await this.db.transaction(async (tx) => {
      const [updated] = await tx.update(voterClaimRecords)
        .set({
          lastClaimedRewardPerShare: pool.rewardPerShare,
          totalClaimed: claimRecord.totalClaimed + claimable,
          updatedAt: new Date(),
        })
        .where(and(
          eq(voterClaimRecords.contestId, contestId),
          eq(voterClaimRecords.voterWallet, voterWallet),
          eq(voterClaimRecords.lastClaimedRewardPerShare, claimRecord.lastClaimedRewardPerShare),
        ))
        .returning();

      if (!updated) throw new Error("이미 처리 중인 클레임입니다. 잠시 후 다시 시도해주세요.");

      await tx.update(voterRewardPool)
        .set({
          totalClaimed: pool.totalClaimed + claimable,
          updatedAt: new Date(),
        })
        .where(eq(voterRewardPool.contestId, contestId));

      return { claimedAmount: claimable };
    });
  }

  async getVoterClaimsByWallet(walletAddress: string): Promise<VoterClaimRecord[]> {
    if (!this.db) throw new Error("Database not available");
    return this.db.select().from(voterClaimRecords)
      .where(eq(voterClaimRecords.voterWallet, walletAddress));
  }

  async createCreatorRewardDistributions(data: InsertCreatorRewardDistribution[]): Promise<CreatorRewardDistribution[]> {
    if (!this.db) throw new Error("Database not available");
    if (data.length === 0) return [];
    const results = await this.db.insert(creatorRewardDistributions).values(data).returning();
    return results;
  }

  async getCreatorRewardDistributionsByDistributionId(distributionId: number): Promise<CreatorRewardDistribution[]> {
    if (!this.db) throw new Error("Database not available");
    return this.db.select().from(creatorRewardDistributions)
      .where(eq(creatorRewardDistributions.distributionId, distributionId));
  }

  async getCreatorRewardDistributionsByContestId(contestId: number): Promise<CreatorRewardDistribution[]> {
    if (!this.db) throw new Error("Database not available");
    return this.db.select().from(creatorRewardDistributions)
      .where(eq(creatorRewardDistributions.contestId, contestId));
  }

  async getCreatorRewardDistributionsByWallet(walletAddress: string): Promise<CreatorRewardDistribution[]> {
    if (!this.db) throw new Error("Database not available");
    return this.db.select().from(creatorRewardDistributions)
      .where(eq(creatorRewardDistributions.creatorWallet, walletAddress))
      .orderBy(desc(creatorRewardDistributions.createdAt));
  }

  async getUnclaimedCreatorDistributionsByWallet(walletAddress: string): Promise<CreatorRewardDistribution[]> {
    if (!this.db) throw new Error("Database not available");
    return this.db.select().from(creatorRewardDistributions)
      .where(and(
        eq(creatorRewardDistributions.creatorWallet, walletAddress),
        isNull(creatorRewardDistributions.claimedAt)
      ));
  }

  async markCreatorDistributionsClaimed(ids: number[], txSignature: string): Promise<void> {
    if (!this.db) throw new Error("Database not available");
    if (ids.length === 0) return;
    await this.db.update(creatorRewardDistributions)
      .set({ claimedAt: new Date(), claimTxSignature: txSignature })
      .where(inArray(creatorRewardDistributions.id, ids));
  }

  async createVoterRewardDistributions(data: InsertVoterRewardDistribution[]): Promise<VoterRewardDistribution[]> {
    if (!this.db) throw new Error("Database not available");
    if (data.length === 0) return [];
    const results = await this.db.insert(voterRewardDistributions).values(data).returning();
    return results;
  }

  async getUnclaimedVoterDistributionsByWallet(walletAddress: string): Promise<VoterRewardDistribution[]> {
    if (!this.db) throw new Error("Database not available");
    return this.db.select().from(voterRewardDistributions)
      .where(and(
        eq(voterRewardDistributions.voterWallet, walletAddress),
        isNull(voterRewardDistributions.claimedAt)
      ));
  }

  async markVoterDistributionsClaimed(ids: number[], txSignature: string): Promise<void> {
    if (!this.db) throw new Error("Database not available");
    if (ids.length === 0) return;
    await this.db.update(voterRewardDistributions)
      .set({ claimedAt: new Date(), claimTxSignature: txSignature })
      .where(inArray(voterRewardDistributions.id, ids));
  }

  async getVoterRewardDistributionsByContestId(contestId: number): Promise<VoterRewardDistribution[]> {
    if (!this.db) throw new Error("Database not available");
    return this.db.select().from(voterRewardDistributions)
      .where(eq(voterRewardDistributions.contestId, contestId));
  }

  async getAllVoterDistributionsByWallet(walletAddress: string): Promise<VoterRewardDistribution[]> {
    if (!this.db) throw new Error("Database not available");
    return this.db.select().from(voterRewardDistributions)
      .where(eq(voterRewardDistributions.voterWallet, walletAddress))
      .orderBy(desc(voterRewardDistributions.createdAt));
  }
}
