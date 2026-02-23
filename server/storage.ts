import { memes, votes, partnerMemes, partnerVotes, users, contests, archivedContests, loginLogs, blockedIps, revenues, revenueShares, goods, orders, goodsRevenueDistributions, voterRewardPool, voterClaimRecords, escrowDeposits, creatorRewardDistributions, type Meme, type InsertMeme, type Vote, type InsertVote, type PartnerMeme, type InsertPartnerMeme, type PartnerVote, type InsertPartnerVote, type User, type InsertUser, type Contest, type InsertContest, type ArchivedContest, type InsertArchivedContest, type LoginLog, type InsertLoginLog, type BlockedIp, type InsertBlockedIp, type Revenue, type InsertRevenue, type RevenueShare, type InsertRevenueShare, type Goods, type InsertGoods, type Order, type InsertOrder, type GoodsRevenueDistribution, type InsertGoodsRevenueDistribution, type VoterRewardPool, type InsertVoterRewardPool, type VoterClaimRecord, type InsertVoterClaimRecord, type EscrowDeposit, type InsertEscrowDeposit, type CreatorRewardDistribution, type InsertCreatorRewardDistribution } from "@shared/schema";
import { getDatabase } from "./db";
import { eq, and, desc, isNull, or, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  getUserByDisplayName(displayName: string): Promise<User | undefined>;
  updateUser(walletAddress: string, updates: Partial<InsertUser & { displayName?: string; avatarUrl?: string }>): Promise<User>;
  updateUserMemeAuthorInfo(walletAddress: string, newDisplayName: string, newAvatarUrl?: string): Promise<void>;
  getUserMemes(walletAddress: string): Promise<Meme[]>;
  getUserVotes(walletAddress: string): Promise<Vote[]>;
  // Meme operations
  createMeme(meme: InsertMeme): Promise<Meme>;
  getMemes(): Promise<Meme[]>;
  getAllMemes(): Promise<Meme[]>;
  getMemeById(id: number): Promise<Meme | undefined>;
  getMemesByContestId(contestId: number): Promise<Meme[]>;
  deleteMeme(id: number): Promise<void>;
  
  // Vote operations
  createVote(vote: InsertVote): Promise<Vote>;
  getAllVotes(): Promise<Vote[]>;
  getVotesByMemeId(memeId: number): Promise<Vote[]>;
  getVoteByTxSignature(txSignature: string): Promise<Vote | undefined>;
  hasUserVoted(memeId: number, voterWallet: string): Promise<boolean>;
  updateMemeVoteCount(memeId: number): Promise<void>;
  getUserVoteHistoryByContest(walletAddress: string): Promise<any[]>;
  getUserVotesForContest(walletAddress: string, contestId: number): Promise<any[]>;
  
  // Partner Meme operations
  createPartnerMeme(meme: InsertMeme, partnerId: string): Promise<Meme>;
  getPartnerMemes(partnerId: string): Promise<Meme[]>;
  getPartnerMemeById(partnerId: string, id: number): Promise<Meme | undefined>;
  createPartnerVote(vote: InsertVote, partnerId: string): Promise<Vote>;
  hasUserVotedPartner(partnerId: string, memeId: number, voterWallet: string): Promise<boolean>;
  updatePartnerMemeVoteCount(partnerId: string, memeId: number): Promise<void>;
  
  // Contest operations
  createContest(contest: InsertContest): Promise<Contest>;
  getContests(): Promise<Contest[]>;
  getContestById(id: number): Promise<Contest | undefined>;
  updateContestStatus(id: number, status: string): Promise<Contest>;
  updateContestTimes(id: number, startTime: Date, endTime: Date): Promise<Contest>;
  endContestAndArchive(contestId: number): Promise<ArchivedContest>;
  getArchivedContests(): Promise<ArchivedContest[]>;
  getCurrentActiveContest(): Promise<Contest | undefined>;
  
  // IP 추적 시스템
  logLogin(loginLog: InsertLoginLog): Promise<LoginLog>;
  getTodayLoginsByIp(ipAddress: string): Promise<string[]>;
  getTodayLoginsByDeviceId(deviceId: string): Promise<string[]>;
  blockIp(blockData: InsertBlockedIp): Promise<BlockedIp>;
  unblockIp(ipAddress: string): Promise<void>;
  isIpBlocked(ipAddress: string): Promise<boolean>;
  getBlockedIps(): Promise<BlockedIp[]>;
  getRecentLogins(limit?: number): Promise<LoginLog[]>;
  getSuspiciousIps(): Promise<{ipAddress: string, walletCount: number, wallets: string[]}[]>;
  getSuspiciousDevices(): Promise<{deviceId: string, walletCount: number, wallets: string[]}[]>;

  // Revenue operations
  createRevenue(revenue: InsertRevenue): Promise<Revenue>;
  getRevenuesByContestId(contestId: number): Promise<Revenue[]>;
  getRevenueById(id: number): Promise<Revenue | undefined>;
  updateRevenueStatus(id: number, status: string, distributedAt?: Date): Promise<Revenue>;
  createRevenueShare(share: InsertRevenueShare): Promise<RevenueShare>;
  createRevenueShares(shares: InsertRevenueShare[]): Promise<RevenueShare[]>;
  getRevenueSharesByRevenueId(revenueId: number): Promise<RevenueShare[]>;
  getRevenueSharesByWallet(walletAddress: string): Promise<RevenueShare[]>;
  getRevenueSharesByContestId(contestId: number): Promise<RevenueShare[]>;
  getContestVoteSummary(contestId: number): Promise<{voterWallet: string, totalSamuAmount: number}[]>;

  // Goods operations
  getGoods(): Promise<Goods[]>;
  getGoodsById(id: number): Promise<Goods | undefined>;
  createGoods(data: InsertGoods): Promise<Goods>;
  updateGoods(id: number, data: Partial<InsertGoods>): Promise<Goods>;
  getOrders(walletAddress: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  getOrderByTxSignature(txSignature: string): Promise<Order | undefined>;
  getOrderByPrintfulId(printfulOrderId: number): Promise<Order | undefined>;
  createOrder(data: InsertOrder): Promise<Order>;
  updateOrder(id: number, data: Partial<InsertOrder>): Promise<Order>;

  // Goods Revenue Distribution operations
  createGoodsRevenueDistribution(data: InsertGoodsRevenueDistribution): Promise<GoodsRevenueDistribution>;
  getGoodsRevenueDistributions(contestId?: number): Promise<GoodsRevenueDistribution[]>;
  getAllGoodsRevenueDistributions(): Promise<GoodsRevenueDistribution[]>;

  // Voter Reward Pool operations
  getOrCreateVoterRewardPool(contestId: number, totalShares: number): Promise<VoterRewardPool>;
  updateVoterRewardPool(contestId: number, depositAmount: number): Promise<VoterRewardPool>;
  getVoterRewardPool(contestId: number): Promise<VoterRewardPool | undefined>;

  // Voter Claim operations
  getOrCreateVoterClaimRecord(contestId: number, voterWallet: string, sharePercent: number): Promise<VoterClaimRecord>;
  getClaimableAmount(contestId: number, voterWallet: string): Promise<{ claimable: number; totalClaimed: number; sharePercent: number }>;
  claimVoterReward(contestId: number, voterWallet: string): Promise<{ claimedAmount: number }>;
  getVoterClaimsByWallet(walletAddress: string): Promise<VoterClaimRecord[]>;

  createCreatorRewardDistributions(data: InsertCreatorRewardDistribution[]): Promise<CreatorRewardDistribution[]>;
  getCreatorRewardDistributionsByDistributionId(distributionId: number): Promise<CreatorRewardDistribution[]>;
  getCreatorRewardDistributionsByContestId(contestId: number): Promise<CreatorRewardDistribution[]>;
  getCreatorRewardDistributionsByWallet(walletAddress: string): Promise<CreatorRewardDistribution[]>;
  createEscrowDeposit(data: InsertEscrowDeposit): Promise<EscrowDeposit>;
  getAllEscrowDeposits(): Promise<EscrowDeposit[]>;
  getEscrowDepositsByContestId(contestId: number): Promise<EscrowDeposit[]>;
  getEscrowDepositByOrderId(orderId: number): Promise<EscrowDeposit | undefined>;
  updateEscrowStatus(id: number, status: string, distributedAt?: Date): Promise<EscrowDeposit>;
  getLockedEscrowDeposits(): Promise<EscrowDeposit[]>;

  getMemeVoteSummary(contestId: number): Promise<{memeId: number, authorWallet: string, totalSamuReceived: number}[]>;
}

export class MemStorage implements IStorage {
  private memes: Map<number, Meme>;
  private votes: Map<number, Vote>;
  private partnerMemes: Map<string, Map<number, Meme>>;
  private partnerVotes: Map<string, Map<number, Vote>>;
  private users: Map<string, User>;
  private currentMemeId: number;
  private currentVoteId: number;
  private currentUserId: number;

  constructor() {
    this.memes = new Map();
    this.votes = new Map();
    this.partnerMemes = new Map();
    this.partnerVotes = new Map();
    this.users = new Map();
    this.currentMemeId = 1;
    this.currentVoteId = 1;
    this.currentUserId = 1;
    
  }

  async createMeme(insertMeme: InsertMeme): Promise<Meme> {
    const id = this.currentMemeId++;
    const meme: Meme = {
      id,
      contestId: insertMeme.contestId ?? null,
      title: insertMeme.title,
      description: insertMeme.description || null,
      imageUrl: insertMeme.imageUrl,
      authorWallet: insertMeme.authorWallet,
      authorUsername: insertMeme.authorUsername,
      authorAvatarUrl: insertMeme.authorAvatarUrl ?? null,
      votes: 0,
      additionalImages: null,
      createdAt: new Date()
    };
    this.memes.set(id, meme);
    return meme;
  }

  async getMemes(): Promise<Meme[]> {
    return Array.from(this.memes.values()).sort((a, b) => b.votes - a.votes);
  }

  async getAllMemes(): Promise<Meme[]> {
    return Array.from(this.memes.values()).sort((a, b) => b.votes - a.votes);
  }

  async getMemeById(id: number): Promise<Meme | undefined> {
    return this.memes.get(id);
  }

  async getMemesByContestId(contestId: number): Promise<Meme[]> {
    return Array.from(this.memes.values()).filter(meme => meme.contestId === contestId);
  }

  async deleteMeme(id: number): Promise<void> {
    // Delete associated votes first
    const votesToDelete = Array.from(this.votes.values())
      .filter(vote => vote.memeId === id)
      .map(vote => vote.id);
    
    votesToDelete.forEach(voteId => this.votes.delete(voteId));
    
    // Delete the meme
    this.memes.delete(id);
  }

  // User operations
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      id,
      walletAddress: insertUser.walletAddress,
      email: insertUser.email || null,
      username: insertUser.username,
      displayName: insertUser.displayName ?? null,
      avatarUrl: insertUser.avatarUrl || null,
      samuBalance: insertUser.samuBalance || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(insertUser.walletAddress, user);
    return user;
  }

  async getUserByWallet(walletAddress: string): Promise<User | undefined> {
    return this.users.get(walletAddress);
  }

  async getUserByDisplayName(displayName: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.displayName === displayName) {
        return user;
      }
    }
    return undefined;
  }

  async updateUser(walletAddress: string, updates: Partial<InsertUser>): Promise<User> {
    const existingUser = this.users.get(walletAddress);
    if (!existingUser) {
      throw new Error("User not found");
    }
    
    const updatedUser: User = {
      ...existingUser,
      ...updates,
      updatedAt: new Date()
    };
    this.users.set(walletAddress, updatedUser);
    return updatedUser;
  }

  async getUserMemes(walletAddress: string): Promise<Meme[]> {
    return Array.from(this.memes.values())
      .filter(meme => meme.authorWallet === walletAddress)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getUserVotes(walletAddress: string): Promise<Vote[]> {
    return Array.from(this.votes.values())
      .filter(vote => vote.voterWallet === walletAddress)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getUserVoteHistoryByContest(walletAddress: string): Promise<any[]> {
    return [];
  }

  async getUserVotesForContest(walletAddress: string, contestId: number): Promise<any[]> {
    return [];
  }

  async getAllVotes(): Promise<Vote[]> {
    return Array.from(this.votes.values());
  }

  async createVote(insertVote: InsertVote): Promise<Vote> {
    const id = this.currentVoteId++;
    const vote: Vote = {
      id,
      memeId: insertVote.memeId,
      voterWallet: insertVote.voterWallet,
      samuAmount: insertVote.samuAmount ?? 0,
      txSignature: insertVote.txSignature ?? null,
      createdAt: new Date()
    };
    this.votes.set(id, vote);
    
    // Update meme vote count
    await this.updateMemeVoteCount(insertVote.memeId);
    
    return vote;
  }

  async getVotesByMemeId(memeId: number): Promise<Vote[]> {
    return Array.from(this.votes.values()).filter(vote => vote.memeId === memeId);
  }

  async getVoteByTxSignature(txSignature: string): Promise<Vote | undefined> {
    return Array.from(this.votes.values()).find(vote => vote.txSignature === txSignature);
  }

  async hasUserVoted(memeId: number, voterWallet: string): Promise<boolean> {
    return Array.from(this.votes.values()).some(
      vote => vote.memeId === memeId && vote.voterWallet === voterWallet
    );
  }

  async updateMemeVoteCount(memeId: number): Promise<void> {
    const meme = this.memes.get(memeId);
    if (meme) {
      const totalSamu = Array.from(this.votes.values())
        .filter(vote => vote.memeId === memeId)
        .reduce((sum, vote) => sum + vote.samuAmount, 0);
      
      meme.votes = totalSamu;
      this.memes.set(memeId, meme);
    }
  }

  // Partner Meme operations
  async createPartnerMeme(insertMeme: InsertMeme, partnerId: string): Promise<Meme> {
    if (!this.partnerMemes.has(partnerId)) {
      this.partnerMemes.set(partnerId, new Map());
    }
    
    const id = this.currentMemeId++;
    const meme: Meme = {
      id,
      contestId: insertMeme.contestId ?? null,
      title: insertMeme.title,
      description: insertMeme.description ?? null,
      imageUrl: insertMeme.imageUrl,
      authorWallet: insertMeme.authorWallet,
      authorUsername: insertMeme.authorUsername,
      authorAvatarUrl: insertMeme.authorAvatarUrl ?? null,
      votes: 0,
      additionalImages: null,
      createdAt: new Date()
    };
    
    this.partnerMemes.get(partnerId)!.set(id, meme);
    return meme;
  }

  async getPartnerMemes(partnerId: string): Promise<Meme[]> {
    if (!this.partnerMemes.has(partnerId)) {
      return [];
    }
    return Array.from(this.partnerMemes.get(partnerId)!.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPartnerMemeById(partnerId: string, id: number): Promise<Meme | undefined> {
    return this.partnerMemes.get(partnerId)?.get(id);
  }

  async createPartnerVote(insertVote: InsertVote, partnerId: string): Promise<Vote> {
    if (!this.partnerVotes.has(partnerId)) {
      this.partnerVotes.set(partnerId, new Map());
    }
    
    const id = this.currentVoteId++;
    const vote: Vote = {
      id,
      memeId: insertVote.memeId,
      voterWallet: insertVote.voterWallet,
      samuAmount: insertVote.samuAmount ?? 0,
      txSignature: insertVote.txSignature ?? null,
      createdAt: new Date()
    };
    
    this.partnerVotes.get(partnerId)!.set(id, vote);
    return vote;
  }

  async hasUserVotedPartner(partnerId: string, memeId: number, voterWallet: string): Promise<boolean> {
    if (!this.partnerVotes.has(partnerId)) {
      return false;
    }
    
    return Array.from(this.partnerVotes.get(partnerId)!.values())
      .some(vote => vote.memeId === memeId && vote.voterWallet === voterWallet);
  }

  async updatePartnerMemeVoteCount(partnerId: string, memeId: number): Promise<void> {
    const meme = this.partnerMemes.get(partnerId)?.get(memeId);
    if (!meme) return;

    if (!this.partnerVotes.has(partnerId)) {
      return;
    }
    
    const voteCount = Array.from(this.partnerVotes.get(partnerId)!.values())
      .filter(vote => vote.memeId === memeId).length;
    
    meme.votes = voteCount;
  }

  async createRevenue(_revenue: InsertRevenue): Promise<Revenue> { throw new Error("Not implemented"); }
  async getRevenuesByContestId(_contestId: number): Promise<Revenue[]> { return []; }
  async getRevenueById(_id: number): Promise<Revenue | undefined> { return undefined; }
  async updateRevenueStatus(_id: number, _status: string): Promise<Revenue> { throw new Error("Not implemented"); }
  async createRevenueShare(_share: InsertRevenueShare): Promise<RevenueShare> { throw new Error("Not implemented"); }
  async createRevenueShares(_shares: InsertRevenueShare[]): Promise<RevenueShare[]> { return []; }
  async getRevenueSharesByRevenueId(_revenueId: number): Promise<RevenueShare[]> { return []; }
  async getRevenueSharesByWallet(_walletAddress: string): Promise<RevenueShare[]> { return []; }
  async getRevenueSharesByContestId(_contestId: number): Promise<RevenueShare[]> { return []; }
  async getContestVoteSummary(_contestId: number): Promise<{voterWallet: string, totalSamuAmount: number}[]> { return []; }

  async createContest(_contest: InsertContest): Promise<Contest> { throw new Error("Not implemented"); }
  async getContests(): Promise<Contest[]> { return []; }
  async getContestById(_id: number): Promise<Contest | undefined> { return undefined; }
  async updateContestStatus(_id: number, _status: string): Promise<Contest> { throw new Error("Not implemented"); }
  async updateContestTimes(_id: number, _startTime: Date, _endTime: Date): Promise<Contest> { throw new Error("Not implemented"); }
  async getCurrentActiveContest(): Promise<Contest | undefined> { return undefined; }
  async endContestAndArchive(_contestId: number): Promise<ArchivedContest> { throw new Error("Not implemented"); }
  async getArchivedContests(): Promise<ArchivedContest[]> { return []; }

  async logLogin(_loginLog: InsertLoginLog): Promise<LoginLog> { throw new Error("Not implemented"); }
  async getTodayLoginsByIp(_ipAddress: string): Promise<string[]> { return []; }
  async getTodayLoginsByDeviceId(_deviceId: string): Promise<string[]> { return []; }
  async blockIp(_blockData: InsertBlockedIp): Promise<BlockedIp> { throw new Error("Not implemented"); }
  async unblockIp(_ipAddress: string): Promise<void> {}
  async isIpBlocked(_ipAddress: string): Promise<boolean> { return false; }
  async getBlockedIps(): Promise<BlockedIp[]> { return []; }
  async getRecentLogins(_limit?: number): Promise<LoginLog[]> { return []; }
  async getSuspiciousIps(): Promise<{ipAddress: string, walletCount: number, wallets: string[]}[]> { return []; }
  async getSuspiciousDevices(): Promise<{deviceId: string, walletCount: number, wallets: string[]}[]> { return []; }

  async updateUserMemeAuthorInfo(_walletAddress: string, _newDisplayName: string, _newAvatarUrl?: string): Promise<void> {}

  async getGoods(): Promise<Goods[]> { return []; }
  async getGoodsById(_id: number): Promise<Goods | undefined> { return undefined; }
  async createGoods(_data: InsertGoods): Promise<Goods> { throw new Error("Not implemented"); }
  async updateGoods(_id: number, _data: Partial<InsertGoods>): Promise<Goods> { throw new Error("Not implemented"); }
  async getOrders(_walletAddress: string): Promise<Order[]> { return []; }
  async getAllOrders(): Promise<Order[]> { return []; }
  async getOrderByTxSignature(_txSignature: string): Promise<Order | undefined> { return undefined; }
  async getOrderByPrintfulId(_printfulOrderId: number): Promise<Order | undefined> { return undefined; }
  async createOrder(_data: InsertOrder): Promise<Order> { throw new Error("Not implemented"); }
  async updateOrder(_id: number, _data: Partial<InsertOrder>): Promise<Order> { throw new Error("Not implemented"); }
  async createGoodsRevenueDistribution(_data: InsertGoodsRevenueDistribution): Promise<GoodsRevenueDistribution> { throw new Error("Not implemented"); }
  async getGoodsRevenueDistributions(_contestId?: number): Promise<GoodsRevenueDistribution[]> { return []; }
  async getAllGoodsRevenueDistributions(): Promise<GoodsRevenueDistribution[]> { return []; }
  async getOrCreateVoterRewardPool(_contestId: number, _totalShares: number): Promise<VoterRewardPool> { throw new Error("Not implemented"); }
  async updateVoterRewardPool(_contestId: number, _depositAmount: number): Promise<VoterRewardPool> { throw new Error("Not implemented"); }
  async getVoterRewardPool(_contestId: number): Promise<VoterRewardPool | undefined> { return undefined; }
  async getOrCreateVoterClaimRecord(_contestId: number, _voterWallet: string, _sharePercent: number): Promise<VoterClaimRecord> { throw new Error("Not implemented"); }
  async getClaimableAmount(_contestId: number, _voterWallet: string): Promise<{ claimable: number; totalClaimed: number; sharePercent: number }> { return { claimable: 0, totalClaimed: 0, sharePercent: 0 }; }
  async claimVoterReward(_contestId: number, _voterWallet: string): Promise<{ claimedAmount: number }> { throw new Error("Not implemented"); }
  async getVoterClaimsByWallet(_walletAddress: string): Promise<VoterClaimRecord[]> { return []; }
  async createCreatorRewardDistributions(_data: InsertCreatorRewardDistribution[]): Promise<CreatorRewardDistribution[]> { return []; }
  async getCreatorRewardDistributionsByDistributionId(_distributionId: number): Promise<CreatorRewardDistribution[]> { return []; }
  async getCreatorRewardDistributionsByContestId(_contestId: number): Promise<CreatorRewardDistribution[]> { return []; }
  async getCreatorRewardDistributionsByWallet(_walletAddress: string): Promise<CreatorRewardDistribution[]> { return []; }
  async createEscrowDeposit(_data: InsertEscrowDeposit): Promise<EscrowDeposit> { throw new Error("Not implemented"); }
  async getAllEscrowDeposits(): Promise<EscrowDeposit[]> { return []; }
  async getEscrowDepositsByContestId(_contestId: number): Promise<EscrowDeposit[]> { return []; }
  async getEscrowDepositByOrderId(_orderId: number): Promise<EscrowDeposit | undefined> { return undefined; }
  async updateEscrowStatus(_id: number, _status: string, _distributedAt?: Date): Promise<EscrowDeposit> { throw new Error("Not implemented"); }
  async getLockedEscrowDeposits(): Promise<EscrowDeposit[]> { return []; }
  async getMemeVoteSummary(_contestId: number): Promise<{memeId: number, authorWallet: string, totalSamuReceived: number}[]> { return []; }
}

export class DatabaseStorage implements IStorage {
  private db = getDatabase();

  private async enrichMemesWithProfiles<T extends Meme | null>(memeList: T[]): Promise<T[]> {
    if (!this.db) return memeList;
    const validMemes = memeList.filter((m): m is Meme & T => m !== null);
    if (validMemes.length === 0) return memeList;

    const wallets = Array.from(new Set(validMemes.map(m => m.authorWallet)));
    const userRows = await this.db
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

  // User operations
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
    
    const [user] = await this.db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.walletAddress, walletAddress))
      .returning();
    
    // Update author info in all memes if profile changed
    if (updates.displayName || updates.avatarUrl) {
      await this.updateUserMemeAuthorInfo(walletAddress, updates.displayName || '', updates.avatarUrl);
    }
    
    return user;
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
    for (const cid of contestIds) {
      const archived = await this.db.select().from(archivedContests).where(eq(archivedContests.originalContestId, cid));
      if (archived.length > 0) {
        contestMap[cid] = archived[0];
        contestIsArchived[cid] = true;
      } else {
        const contest = await this.db.select().from(contests).where(eq(contests.id, cid));
        if (contest.length > 0) {
          contestMap[cid] = contest[0];
          contestIsArchived[cid] = false;
        }
      }
    }

    const grouped: Record<string, any> = {};
    for (const v of userVotes) {
      const cid = v.contestId || 0;
      const key = String(cid);
      if (!grouped[key]) {
        const contestInfo = contestMap[cid];
        const totalContestVotes = await this.db
          .select({ total: sql<number>`COALESCE(SUM(${votes.samuAmount}), 0)` })
          .from(votes)
          .innerJoin(memes, eq(votes.memeId, memes.id))
          .where(cid ? eq(memes.contestId, cid) : isNull(memes.contestId));
        
        grouped[key] = {
          contestId: cid,
          contestTitle: contestInfo?.title || 'Current Contest',
          contestStatus: contestIsArchived[cid] ? 'archived' : (contestInfo?.status || 'active'),
          startTime: contestInfo?.startTime || contestInfo?.start_time,
          endTime: contestInfo?.endTime || contestInfo?.end_time,
          totalContestSamu: Number(totalContestVotes[0]?.total || 0),
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
    const currentContest = await this.getCurrentActiveContest();
    
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
    
    // Get ALL memes from database (both current and archived contests)
    const result = await this.db
      .select()
      .from(memes)
      .orderBy(desc(memes.createdAt));
    
    return result;
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

    return this.enrichMemesWithProfiles(contestMemes);
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
    
    const [vote] = await this.db
      .insert(votes)
      .values(insertVote)
      .returning();
    
    // Update meme vote count
    await this.updateMemeVoteCount(insertVote.memeId);
    
    return vote;
  }

  async getVotesByMemeId(memeId: number): Promise<Vote[]> {
    if (!this.db) throw new Error("Database not available");
    
    return await this.db
      .select()
      .from(votes)
      .where(eq(votes.memeId, memeId));
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
    
    const memeVotes = await this.getVotesByMemeId(memeId);
    const totalSamu = memeVotes.reduce((sum, vote) => sum + vote.samuAmount, 0);
    
    await this.db
      .update(memes)
      .set({ votes: totalSamu })
      .where(eq(memes.id, memeId));
  }



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
    
    const [vote] = await this.db
      .insert(partnerVotes)
      .values({ ...insertVote, partnerId })
      .returning();
    
    // Update partner meme vote count
    await this.updatePartnerMemeVoteCount(partnerId, insertVote.memeId);
    
    return {
      id: vote.id,
      memeId: vote.memeId,
      voterWallet: vote.voterWallet,
      samuAmount: vote.samuAmount,
      txSignature: vote.txSignature,
      createdAt: vote.createdAt
    };
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

  // Contest operations
  async createContest(insertContest: InsertContest): Promise<Contest> {
    if (!this.db) throw new Error("Database not available");
    
    const [contest] = await this.db
      .insert(contests)
      .values(insertContest)
      .returning();
    return contest;
  }

  async getContests(): Promise<Contest[]> {
    if (!this.db) throw new Error("Database not available");
    
    return await this.db
      .select()
      .from(contests)
      .orderBy(desc(contests.createdAt));
  }

  async getContestById(id: number): Promise<Contest | undefined> {
    if (!this.db) throw new Error("Database not available");
    
    const [contest] = await this.db
      .select()
      .from(contests)
      .where(eq(contests.id, id));
    return contest;
  }

  async updateContestStatus(id: number, status: string): Promise<Contest> {
    if (!this.db) throw new Error("Database not available");
    
    const [contest] = await this.db
      .update(contests)
      .set({ status, updatedAt: new Date() })
      .where(eq(contests.id, id))
      .returning();
    
    return contest;
  }

  async updateContestTimes(id: number, startTime: Date, endTime: Date): Promise<Contest> {
    if (!this.db) throw new Error("Database not available");
    
    const [contest] = await this.db
      .update(contests)
      .set({ 
        status: "active",
        startTime, 
        endTime, 
        updatedAt: new Date() 
      })
      .where(eq(contests.id, id))
      .returning();
    
    return contest;
  }

  async getCurrentActiveContest(): Promise<Contest | undefined> {
    if (!this.db) throw new Error("Database not available");
    
    const [contest] = await this.db
      .select()
      .from(contests)
      .where(eq(contests.status, "active"))
      .limit(1);
    
    return contest;
  }

  async endContestAndArchive(contestId: number): Promise<ArchivedContest> {
    if (!this.db) throw new Error("Database not available");
    
    // Get contest details
    const contest = await this.getContestById(contestId);
    if (!contest) {
      throw new Error("Contest not found");
    }

    if (contest.status === "archived") {
      console.log(`Contest ${contestId} is already archived, skipping`);
      const existing = await this.db
        .select()
        .from(archivedContests)
        .where(eq(archivedContests.originalContestId, contestId))
        .limit(1);
      if (existing.length > 0) return existing[0];
      console.log(`Contest ${contestId} marked archived but no archive record, proceeding with archival`);
    } else if (contest.status === "archiving") {
      console.log(`Contest ${contestId} is already being archived by another process, skipping`);
      const existing = await this.db
        .select()
        .from(archivedContests)
        .where(eq(archivedContests.originalContestId, contestId))
        .limit(1);
      if (existing.length > 0) return existing[0];
      console.log(`Contest ${contestId} marked archiving but no archive record, proceeding with archival`);
    } else {
      await this.db
        .update(contests)
        .set({ status: "archiving" })
        .where(eq(contests.id, contestId));
      console.log(`Contest ${contestId} status set to archiving`);
    }

    try {
    // Get all memes for this contest - current active contest memes have contestId = null
    // OR memes that already belong to this specific contest
    const contestMemes = await this.db
      .select()
      .from(memes)
      .where(or(
        isNull(memes.contestId),
        eq(memes.contestId, contestId)
      ))
      .orderBy(desc(memes.votes));

    // Allow ending contest even with no memes

    // Move all contest files to archive in R2 storage (parallel batches of 10)
    if (contestMemes.length > 0) {
      const { moveToArchive, extractKeyFromUrl } = await import('./r2-storage');
      
      let archiveSuccess = 0;
      let archiveFail = 0;
      const failedFiles: string[] = [];
      const BATCH_SIZE = 10;

      const processMeme = async (meme: typeof contestMemes[0]) => {
        const updateFields: { imageUrl?: string; additionalImages?: string[] } = {};

        if (meme.imageUrl) {
          const key = extractKeyFromUrl(meme.imageUrl);
          if (key) {
            try {
              const result = await moveToArchive(key, contestId);
              if (result.success && result.url) {
                updateFields.imageUrl = result.url;
                archiveSuccess++;
              } else {
                archiveFail++;
                failedFiles.push(`meme-${meme.id}-main: ${meme.imageUrl}`);
              }
            } catch (err: any) {
              archiveFail++;
              failedFiles.push(`meme-${meme.id}-main: ${meme.imageUrl}`);
            }
          }
        }

        if (meme.additionalImages && Array.isArray(meme.additionalImages) && meme.additionalImages.length > 0) {
          const archivedAdditional: string[] = [];
          for (let i = 0; i < meme.additionalImages.length; i++) {
            const imgUrl = meme.additionalImages[i];
            const key = extractKeyFromUrl(imgUrl);
            if (key) {
              try {
                const result = await moveToArchive(key, contestId);
                if (result.success && result.url) {
                  archivedAdditional.push(result.url);
                  archiveSuccess++;
                } else {
                  archivedAdditional.push(imgUrl);
                  archiveFail++;
                  failedFiles.push(`meme-${meme.id}-additional-${i}: ${imgUrl}`);
                }
              } catch (err: any) {
                archivedAdditional.push(imgUrl);
                archiveFail++;
                failedFiles.push(`meme-${meme.id}-additional-${i}: ${imgUrl}`);
              }
            } else {
              archivedAdditional.push(imgUrl);
            }
          }
          updateFields.additionalImages = archivedAdditional;
        }

        if (Object.keys(updateFields).length > 0) {
          await this.db!
            .update(memes)
            .set(updateFields)
            .where(eq(memes.id, meme.id));
        }
      };

      for (let i = 0; i < contestMemes.length; i += BATCH_SIZE) {
        const batch = contestMemes.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(meme => processMeme(meme).catch(err => {
          archiveFail++;
          failedFiles.push(`meme-${meme.id}-unexpected: ${err?.message || err}`);
          console.error(`[Archive] Unexpected error for meme ${meme.id}:`, err);
        })));
        console.log(`[Archive] Progress: ${Math.min(i + BATCH_SIZE, contestMemes.length)}/${contestMemes.length} memes processed`);
      }

      console.log(`[Archive] Contest ${contestId} file migration complete: ${archiveSuccess} succeeded, ${archiveFail} failed out of ${archiveSuccess + archiveFail} total files`);
      if (failedFiles.length > 0) {
        console.error(`[Archive] Failed files for contest ${contestId}:`, failedFiles);
      }
    }

    // Calculate stats
    const totalMemes = contestMemes.length;
    const totalVotes = contestMemes.reduce((sum, meme) => sum + meme.votes, 0);
    const uniqueParticipants = contestMemes.length > 0 ? new Set(contestMemes.map(meme => meme.authorWallet)).size : 0;

    // Get top 3 memes (handle empty contest)
    const sortedMemes = contestMemes.sort((a, b) => b.votes - a.votes);
    const winnerMemeId = sortedMemes[0]?.id || null;
    const secondMemeId = sortedMemes[1]?.id || null;
    const thirdMemeId = sortedMemes[2]?.id || null;

    let archivedContest: ArchivedContest;
    try {
      const [inserted] = await this.db
        .insert(archivedContests)
        .values({
          originalContestId: contestId,
          title: contest.title,
          description: contest.description,
          totalMemes,
          totalVotes,
          totalParticipants: uniqueParticipants,
          winnerMemeId,
          secondMemeId,
          thirdMemeId,
          prizePool: contest.prizePool,
          startTime: contest.startTime || contest.createdAt || new Date(),
          endTime: new Date(),
        })
        .returning();
      archivedContest = inserted;
    } catch (insertError: any) {
      if (insertError?.code === '23505') {
        console.log(`Contest ${contestId} archive insert conflict (unique constraint), returning existing`);
        const existing = await this.db
          .select()
          .from(archivedContests)
          .where(eq(archivedContests.originalContestId, contestId))
          .limit(1);
        if (existing.length > 0) return existing[0];
      }
      throw insertError;
    }

    // Update contest status to archived
    await this.updateContestStatus(contestId, "archived");

    // Move current contest memes to archived contest (only if there are memes)
    if (contestMemes.length > 0) {
      await this.db
        .update(memes)
        .set({ contestId: contestId })
        .where(or(
          isNull(memes.contestId),
          eq(memes.contestId, contestId)
        ));
    }

    // Cancel any scheduled timers for this contest
    try {
      const { contestScheduler } = await import('./contest-scheduler');
      contestScheduler.cancelScheduled(contestId);
      console.log(`Cancelled scheduled actions for contest ${contestId}`);
    } catch (error) {
      console.error("Failed to cancel scheduled actions:", error);
    }

    console.log(`Contest ${contestId} archived with ${totalMemes} files moved to archives/contest-${contestId}/`);

    return archivedContest;
    } catch (archiveError) {
      console.error(`[Archive] Critical failure for contest ${contestId}, reverting to ended:`, archiveError);
      try {
        await this.updateContestStatus(contestId, "ended");
      } catch (revertError) {
        console.error(`[Archive] Failed to revert contest ${contestId} status:`, revertError);
      }
      throw archiveError;
    }
  }

  async getArchivedContests(): Promise<ArchivedContest[]> {
    if (!this.db) throw new Error("Database not available");
    
    const archived = await this.db
      .select()
      .from(archivedContests)
      .orderBy(desc(archivedContests.archivedAt));

    const allMemeIds = archived.flatMap(c => 
      [c.winnerMemeId, c.secondMemeId, c.thirdMemeId].filter((id): id is number => id !== null)
    );

    let memeMap = new Map<number, Meme>();
    if (allMemeIds.length > 0) {
      const allMemes = await this.db
        .select()
        .from(memes)
        .where(inArray(memes.id, allMemeIds));
      const enriched = await this.enrichMemesWithProfiles(allMemes);
      memeMap = new Map(enriched.map(m => [m.id, m]));
    }

    const enrichedContests = archived.map(contest => ({
      ...contest,
      winnerMeme: contest.winnerMemeId ? memeMap.get(contest.winnerMemeId) || null : null,
      secondMeme: contest.secondMemeId ? memeMap.get(contest.secondMemeId) || null : null,
      thirdMeme: contest.thirdMemeId ? memeMap.get(contest.thirdMemeId) || null : null,
    }));

    // Filter out contests with no winner (empty contests) for Hall of Fame
    return enrichedContests.filter(contest => contest.winnerMeme !== null);
  }

  // IP 추적 시스템 구현
  async logLogin(insertLoginLog: InsertLoginLog): Promise<LoginLog> {
    if (!this.db) throw new Error("Database not available");
    
    const [loginLog] = await this.db
      .insert(loginLogs)
      .values(insertLoginLog)
      .returning();
    return loginLog;
  }

  async getTodayLoginsByIp(ipAddress: string): Promise<string[]> {
    if (!this.db) throw new Error("Database not available");
    
    // 오늘 해당 IP로 로그인한 고유 지갑 주소들을 반환
    const result = await this.db
      .selectDistinct({ walletAddress: loginLogs.walletAddress })
      .from(loginLogs)
      .where(and(
        eq(loginLogs.ipAddress, ipAddress),
        sql`DATE(${loginLogs.loginTime}) = CURRENT_DATE`
      ));
    
    return result.map(row => row.walletAddress);
  }

  async getTodayLoginsByDeviceId(deviceId: string): Promise<string[]> {
    if (!this.db) throw new Error("Database not available");
    
    // 오늘 해당 디바이스로 로그인한 고유 지갑 주소들을 반환
    const result = await this.db
      .selectDistinct({ walletAddress: loginLogs.walletAddress })
      .from(loginLogs)
      .where(and(
        eq(loginLogs.deviceId, deviceId),
        sql`DATE(${loginLogs.loginTime}) = CURRENT_DATE`
      ));
    
    return result.map(row => row.walletAddress);
  }

  async blockIp(insertBlockedIp: InsertBlockedIp): Promise<BlockedIp> {
    if (!this.db) throw new Error("Database not available");
    
    const [blockedIp] = await this.db
      .insert(blockedIps)
      .values(insertBlockedIp)
      .returning();
    return blockedIp;
  }

  async unblockIp(ipAddress: string): Promise<void> {
    if (!this.db) throw new Error("Database not available");
    
    await this.db
      .delete(blockedIps)
      .where(eq(blockedIps.ipAddress, ipAddress));
  }

  async isIpBlocked(ipAddress: string): Promise<boolean> {
    if (!this.db) throw new Error("Database not available");
    
    const [blocked] = await this.db
      .select()
      .from(blockedIps)
      .where(eq(blockedIps.ipAddress, ipAddress));
    
    return !!blocked;
  }

  async getBlockedIps(): Promise<BlockedIp[]> {
    if (!this.db) throw new Error("Database not available");
    
    return await this.db
      .select()
      .from(blockedIps)
      .orderBy(desc(blockedIps.blockedAt));
  }

  async getRecentLogins(limit: number = 50): Promise<LoginLog[]> {
    if (!this.db) throw new Error("Database not available");
    
    return await this.db
      .select()
      .from(loginLogs)
      .orderBy(desc(loginLogs.loginTime))
      .limit(limit);
  }

  async getSuspiciousIps(): Promise<{ipAddress: string, walletCount: number, wallets: string[]}[]> {
    if (!this.db) throw new Error("Database not available");
    
    // 오늘 3개 이상의 서로 다른 지갑으로 로그인한 의심스러운 IP들
    const suspiciousIps = await this.db
      .select({
        ipAddress: loginLogs.ipAddress,
        walletCount: sql<number>`count(distinct ${loginLogs.walletAddress})`,
        wallets: sql<string[]>`array_agg(distinct ${loginLogs.walletAddress})`
      })
      .from(loginLogs)
      .where(sql`DATE(${loginLogs.loginTime}) = CURRENT_DATE`)
      .groupBy(loginLogs.ipAddress)
      .having(sql`count(distinct ${loginLogs.walletAddress}) >= 3`);
    
    return suspiciousIps;
  }

  async getSuspiciousDevices(): Promise<{deviceId: string, walletCount: number, wallets: string[]}[]> {
    if (!this.db) throw new Error("Database not available");
    
    // 오늘 3개 이상의 서로 다른 지갑으로 로그인한 의심스러운 디바이스들
    const suspiciousDevices = await this.db
      .select({
        deviceId: loginLogs.deviceId,
        walletCount: sql<number>`count(distinct ${loginLogs.walletAddress})`,
        wallets: sql<string[]>`array_agg(distinct ${loginLogs.walletAddress})`
      })
      .from(loginLogs)
      .where(and(
        sql`DATE(${loginLogs.loginTime}) = CURRENT_DATE`,
        sql`${loginLogs.deviceId} IS NOT NULL`
      ))
      .groupBy(loginLogs.deviceId)
      .having(sql`count(distinct ${loginLogs.walletAddress}) >= 3`);
    
    return suspiciousDevices.map(row => ({
      deviceId: row.deviceId!,
      walletCount: row.walletCount,
      wallets: row.wallets
    }));
  }

  // Revenue operations
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
    const allVotes = await this.db.select().from(votes).where(
      sql`${votes.memeId} IN (${sql.raw(memeIds.join(','))})`
    );
    
    const summary = new Map<string, number>();
    for (const vote of allVotes) {
      const current = summary.get(vote.voterWallet) || 0;
      summary.set(vote.voterWallet, current + (vote.samuAmount || 0));
    }
    
    return Array.from(summary.entries()).map(([voterWallet, totalSamuAmount]) => ({ voterWallet, totalSamuAmount }));
  }

  async getGoods(): Promise<Goods[]> {
    if (!this.db) throw new Error("Database not available");
    return await this.db
      .select()
      .from(goods)
      .where(eq(goods.status, "active"))
      .orderBy(desc(goods.createdAt));
  }

  async getGoodsById(id: number): Promise<Goods | undefined> {
    if (!this.db) throw new Error("Database not available");
    const [item] = await this.db
      .select()
      .from(goods)
      .where(eq(goods.id, id));
    return item;
  }

  async createGoods(data: InsertGoods): Promise<Goods> {
    if (!this.db) throw new Error("Database not available");
    const [item] = await this.db
      .insert(goods)
      .values(data)
      .returning();
    return item;
  }

  async updateGoods(id: number, data: Partial<InsertGoods>): Promise<Goods> {
    if (!this.db) throw new Error("Database not available");
    const [item] = await this.db
      .update(goods)
      .set(data)
      .where(eq(goods.id, id))
      .returning();
    return item;
  }

  async getOrders(walletAddress: string): Promise<Order[]> {
    if (!this.db) throw new Error("Database not available");
    return await this.db
      .select()
      .from(orders)
      .where(eq(orders.buyerWallet, walletAddress))
      .orderBy(desc(orders.createdAt));
  }

  async getOrderByTxSignature(txSignature: string): Promise<Order | undefined> {
    if (!this.db) throw new Error("Database not available");
    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.txSignature, txSignature))
      .limit(1);
    return order;
  }

  async getOrderByPrintfulId(printfulOrderId: number): Promise<Order | undefined> {
    if (!this.db) throw new Error("Database not available");
    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.printfulOrderId, printfulOrderId))
      .limit(1);
    return order;
  }

  async createOrder(data: InsertOrder): Promise<Order> {
    if (!this.db) throw new Error("Database not available");
    const [order] = await this.db
      .insert(orders)
      .values(data)
      .returning();
    return order;
  }

  async updateOrder(id: number, data: Partial<InsertOrder>): Promise<Order> {
    if (!this.db) throw new Error("Database not available");
    const [order] = await this.db
      .update(orders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async getAllOrders(): Promise<Order[]> {
    if (!this.db) throw new Error("Database not available");
    return this.db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async createGoodsRevenueDistribution(data: InsertGoodsRevenueDistribution): Promise<GoodsRevenueDistribution> {
    if (!this.db) throw new Error("Database not available");
    const [dist] = await this.db.insert(goodsRevenueDistributions).values(data).returning();
    return dist;
  }

  async getGoodsRevenueDistributions(contestId?: number): Promise<GoodsRevenueDistribution[]> {
    if (!this.db) throw new Error("Database not available");
    if (contestId) {
      return this.db.select().from(goodsRevenueDistributions)
        .where(eq(goodsRevenueDistributions.contestId, contestId))
        .orderBy(desc(goodsRevenueDistributions.createdAt));
    }
    return this.db.select().from(goodsRevenueDistributions)
      .orderBy(desc(goodsRevenueDistributions.createdAt));
  }

  async getAllGoodsRevenueDistributions(): Promise<GoodsRevenueDistribution[]> {
    if (!this.db) throw new Error("Database not available");
    return this.db.select().from(goodsRevenueDistributions)
      .orderBy(desc(goodsRevenueDistributions.createdAt));
  }

  async getOrCreateVoterRewardPool(contestId: number, totalShares: number): Promise<VoterRewardPool> {
    if (!this.db) throw new Error("Database not available");
    const [existing] = await this.db.select().from(voterRewardPool)
      .where(eq(voterRewardPool.contestId, contestId)).limit(1);
    if (existing) return existing;
    const [pool] = await this.db.insert(voterRewardPool).values({
      contestId,
      rewardPerShare: 0,
      totalDeposited: 0,
      totalClaimed: 0,
      totalShares: totalShares,
    }).returning();
    return pool;
  }

  async updateVoterRewardPool(contestId: number, depositAmount: number): Promise<VoterRewardPool> {
    if (!this.db) throw new Error("Database not available");
    let pool = await this.getVoterRewardPool(contestId);
    if (!pool) {
      console.log(`Voter reward pool not found for contest ${contestId}, creating one automatically`);
      const [newPool] = await this.db.insert(voterRewardPool)
        .values({
          contestId,
          totalShares: 0,
          rewardPerShare: 0,
          totalDeposited: 0,
        })
        .returning();
      pool = newPool;
    }
    if (pool.totalShares <= 0) {
      console.log(`No voters in contest ${contestId} yet. Depositing ${depositAmount} SOL to pool (will be distributed when voters join)`);
      const [updated] = await this.db.update(voterRewardPool)
        .set({
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
      const voteSummary = await this.getContestVoteSummary(contestId);
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

  async claimVoterReward(contestId: number, voterWallet: string): Promise<{ claimedAmount: number }> {
    if (!this.db) throw new Error("Database not available");
    const pool = await this.getVoterRewardPool(contestId);
    if (!pool) throw new Error("No reward pool found");

    const voteSummary = await this.getContestVoteSummary(contestId);
    const voterEntry = voteSummary.find(v => v.voterWallet === voterWallet);
    if (!voterEntry) throw new Error("You have no votes in this contest");
    const totalVotes = voteSummary.reduce((sum, v) => sum + v.totalSamuAmount, 0);
    const sharePercent = totalVotes > 0 ? (voterEntry.totalSamuAmount / totalVotes) * 100 : 0;

    const claimRecord = await this.getOrCreateVoterClaimRecord(contestId, voterWallet, sharePercent);
    const unclaimedRewardPerShare = pool.rewardPerShare - claimRecord.lastClaimedRewardPerShare;
    const claimable = unclaimedRewardPerShare * claimRecord.sharePercent;

    if (claimable <= 0) throw new Error("No rewards to claim");

    await this.db.update(voterClaimRecords)
      .set({
        lastClaimedRewardPerShare: pool.rewardPerShare,
        totalClaimed: claimRecord.totalClaimed + claimable,
        updatedAt: new Date(),
      })
      .where(and(eq(voterClaimRecords.contestId, contestId), eq(voterClaimRecords.voterWallet, voterWallet)));

    await this.db.update(voterRewardPool)
      .set({
        totalClaimed: pool.totalClaimed + claimable,
        updatedAt: new Date(),
      })
      .where(eq(voterRewardPool.contestId, contestId));

    return { claimedAmount: claimable };
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

// Use DatabaseStorage if database is available, otherwise fallback to MemStorage
const db = getDatabase();
export const storage = db ? new DatabaseStorage() : new MemStorage();
