import { getDatabase } from "../db";
import { eq, and, desc, isNull, or, sql, inArray } from "drizzle-orm";
import { logger } from "../utils/logger";
import {
  users, memes, votes, contests, archivedContests,
  type User, type InsertUser, type Meme, type Vote, type Contest
} from "@shared/schema";

export class UserStorage {
  private db = getDatabase();
  async createUser(insertUser: InsertUser): Promise<User> {
    if (!this.db) throw new Error("Database not available");
    
    const [user] = await this.db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getUserByWallet(walletAddress: string): Promise<User | undefined> {
    if (!this.db) throw new Error("Database not available");
    
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress));
    return user;
  }

  async getUsersByWallets(wallets: string[]): Promise<User[]> {
    if (!this.db) throw new Error("Database not available");
    if (wallets.length === 0) return [];

    return await this.db
      .select()
      .from(users)
      .where(inArray(users.walletAddress, wallets));
  }

  async getUserByDisplayName(displayName: string): Promise<User | undefined> {
    if (!this.db) throw new Error("Database not available");
    
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.displayName, displayName));
    return user;
  }

  async updateUser(walletAddress: string, updates: Partial<InsertUser & { displayName?: string; avatarUrl?: string }>): Promise<User> {
    if (!this.db) throw new Error("Database not available");

    return await this.db.transaction(async (tx) => {
      const [user] = await tx
        .update(users)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(users.walletAddress, walletAddress))
        .returning();

      if (updates.displayName || updates.avatarUrl) {
        const updateData: Record<string, string> = {};
        if (updates.displayName) updateData.authorUsername = updates.displayName;
        if (updates.avatarUrl) updateData.authorAvatarUrl = updates.avatarUrl;
        await tx
          .update(memes)
          .set(updateData)
          .where(eq(memes.authorWallet, walletAddress));
      }

      return user;
    });
  }

  async updateUserMemeAuthorInfo(walletAddress: string, newDisplayName: string, newAvatarUrl?: string): Promise<void> {
    if (!this.db) throw new Error("Database not available");
    
    // Prepare update data
    const updateData: any = {};
    if (newDisplayName) updateData.authorUsername = newDisplayName;
    if (newAvatarUrl) updateData.authorAvatarUrl = newAvatarUrl;
    
    // Update author info in all memes created by this user
    const result = await this.db
      .update(memes)
      .set(updateData)
      .where(eq(memes.authorWallet, walletAddress))
      .returning();
  }

  async getUserMemes(walletAddress: string): Promise<Meme[]> {
    if (!this.db) throw new Error("Database not available");
    
    return await this.db
      .select()
      .from(memes)
      .where(eq(memes.authorWallet, walletAddress))
      .orderBy(desc(memes.createdAt));
  }

  async getUserMemesByContest(walletAddress: string): Promise<any[]> {
    if (!this.db) throw new Error("Database not available");

    const userMemes = await this.db
      .select()
      .from(memes)
      .where(eq(memes.authorWallet, walletAddress))
      .orderBy(desc(memes.createdAt));

    const contestIds = Array.from(new Set(userMemes.map(m => m.contestId).filter(Boolean))) as number[];

    const contestMap: Record<number, any> = {};
    const contestIsArchived: Record<number, boolean> = {};
    if (contestIds.length > 0) {
      const archivedList = await this.db.select().from(archivedContests)
        .where(inArray(archivedContests.originalContestId, contestIds));
      const archivedIdSet = new Set(archivedList.map(a => a.originalContestId));
      for (const a of archivedList) {
        contestMap[a.originalContestId] = a;
        contestIsArchived[a.originalContestId] = true;
      }
      const remainingIds = contestIds.filter(id => !archivedIdSet.has(id));
      if (remainingIds.length > 0) {
        const activeList = await this.db.select().from(contests)
          .where(inArray(contests.id, remainingIds));
        for (const c of activeList) {
          contestMap[c.id] = c;
          contestIsArchived[c.id] = false;
        }
      }
    }

    const grouped: Record<string, any> = {};
    for (const meme of userMemes) {
      const cid = meme.contestId || 0;
      const key = String(cid);
      if (!grouped[key]) {
        const contestInfo = contestMap[cid];
        grouped[key] = {
          contestId: cid,
          contestTitle: contestInfo?.title || 'Current Contest',
          contestStatus: contestIsArchived[cid] ? 'archived' : (contestInfo?.status || 'active'),
          endTime: contestInfo?.endTime || contestInfo?.end_time,
          totalVotesReceived: 0,
          memes: [],
        };
      }
      grouped[key].totalVotesReceived += (meme.votes || 0);
      grouped[key].memes.push(meme);
    }

    return Object.values(grouped).sort((a, b) => (b.contestId || 0) - (a.contestId || 0));
  }

  async getUserVotes(walletAddress: string): Promise<Vote[]> {
    if (!this.db) throw new Error("Database not available");
    
    // Get all votes for this user (includes both current and archived contest votes)
    const allVotes = await this.db
      .select()
      .from(votes)
      .where(eq(votes.voterWallet, walletAddress))
      .orderBy(desc(votes.createdAt));
    
    return allVotes;
  }

  async getUserVoteHistoryByContest(walletAddress: string): Promise<any[]> {
    if (!this.db) throw new Error("Database not available");
    
    const userVotes = await this.db
      .select({
        memeId: votes.memeId,
        samuAmount: votes.samuAmount,
        createdAt: votes.createdAt,
        contestId: memes.contestId,
        memeTitle: memes.title,
        memeImageUrl: memes.imageUrl,
      })
      .from(votes)
      .innerJoin(memes, eq(votes.memeId, memes.id))
      .where(eq(votes.voterWallet, walletAddress))
      .orderBy(desc(votes.createdAt));

    const contestIds = Array.from(new Set(userVotes.map(v => v.contestId).filter(Boolean))) as number[];
    
    const contestMap: Record<number, any> = {};
    const contestIsArchived: Record<number, boolean> = {};
    if (contestIds.length > 0) {
      const archivedList = await this.db.select().from(archivedContests)
        .where(inArray(archivedContests.originalContestId, contestIds));
      const archivedIdSet = new Set(archivedList.map(a => a.originalContestId));
      for (const a of archivedList) {
        contestMap[a.originalContestId] = a;
        contestIsArchived[a.originalContestId] = true;
      }
      const remainingIds = contestIds.filter(id => !archivedIdSet.has(id));
      if (remainingIds.length > 0) {
        const activeList = await this.db.select().from(contests)
          .where(inArray(contests.id, remainingIds));
        for (const c of activeList) {
          contestMap[c.id] = c;
          contestIsArchived[c.id] = false;
        }
      }
    }

    // 콘테스트별 총 투표 SAMU 단일 GROUP BY 쿼리 (N+1 제거)
    const samuByContest: Record<number, number> = {};
    if (contestIds.length > 0) {
      const samuRows = await this.db
        .select({
          contestId: memes.contestId,
          total: sql<number>`COALESCE(SUM(${votes.samuAmount}), 0)`
        })
        .from(votes)
        .innerJoin(memes, eq(votes.memeId, memes.id))
        .where(inArray(memes.contestId, contestIds))
        .groupBy(memes.contestId);
      for (const row of samuRows) {
        if (row.contestId != null) samuByContest[row.contestId] = Number(row.total);
      }
    }

    const grouped: Record<string, any> = {};
    for (const v of userVotes) {
      const cid = v.contestId || 0;
      const key = String(cid);
      if (!grouped[key]) {
        const contestInfo = contestMap[cid];
        grouped[key] = {
          contestId: cid,
          contestTitle: contestInfo?.title || 'Current Contest',
          contestStatus: contestIsArchived[cid] ? 'archived' : (contestInfo?.status || 'active'),
          startTime: contestInfo?.startTime || contestInfo?.start_time,
          endTime: contestInfo?.endTime || contestInfo?.end_time,
          totalContestSamu: samuByContest[cid] ?? 0,
          myTotalSamu: 0,
          myRevenueSharePercent: 0,
          votes: [],
        };
      }
      grouped[key].myTotalSamu += v.samuAmount;
      grouped[key].votes.push({
        memeId: v.memeId,
        memeTitle: v.memeTitle,
        memeImageUrl: v.memeImageUrl,
        samuAmount: v.samuAmount,
        createdAt: v.createdAt,
      });
    }

    for (const key of Object.keys(grouped)) {
      const g = grouped[key];
      if (g.totalContestSamu > 0) {
        g.myRevenueSharePercent = parseFloat(((g.myTotalSamu / g.totalContestSamu) * 30).toFixed(2));
      }
    }

    return Object.values(grouped).sort((a, b) => (b.contestId || 0) - (a.contestId || 0));
  }

  async getUserVotesForContest(walletAddress: string, contestId: number): Promise<any[]> {
    if (!this.db) throw new Error("Database not available");
    
    const userVotes = await this.db
      .select({
        memeId: votes.memeId,
        samuAmount: votes.samuAmount,
        txSignature: votes.txSignature,
        createdAt: votes.createdAt,
        memeTitle: memes.title,
        memeImageUrl: memes.imageUrl,
      })
      .from(votes)
      .innerJoin(memes, eq(votes.memeId, memes.id))
      .where(and(eq(votes.voterWallet, walletAddress), eq(memes.contestId, contestId)))
      .orderBy(desc(votes.samuAmount));

    const totalContestVotes = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${votes.samuAmount}), 0)` })
      .from(votes)
      .innerJoin(memes, eq(votes.memeId, memes.id))
      .where(eq(memes.contestId, contestId));

    const totalSamu = Number(totalContestVotes[0]?.total || 0);
    const myTotalSamu = userVotes.reduce((sum, v) => sum + v.samuAmount, 0);
    const myRevenueSharePercent = totalSamu > 0 ? parseFloat(((myTotalSamu / totalSamu) * 30).toFixed(2)) : 0;

    return {
      contestId,
      myTotalSamu,
      totalContestSamu: totalSamu,
      myRevenueSharePercent,
      votes: userVotes,
    } as any;
  }

  async getVotesByContestIds(contestIds: number[]): Promise<Vote[]> {
    if (!this.db) throw new Error("Database not available");
    if (contestIds.length === 0) return [];

    const result = await this.db
      .select({
        id: votes.id,
        memeId: votes.memeId,
        voterWallet: votes.voterWallet,
        samuAmount: votes.samuAmount,
        txSignature: votes.txSignature,
        createdAt: votes.createdAt,
      })
      .from(votes)
      .innerJoin(memes, eq(votes.memeId, memes.id))
      .where(inArray(memes.contestId, contestIds));
    
    return result;
  }
}