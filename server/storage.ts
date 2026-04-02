import { UserStorage } from "./storage/user";
import { MemeStorage } from "./storage/meme";
import { PartnerStorage } from "./storage/partner";
import { ContestStorage } from "./storage/contest";
import { LoginStorage } from "./storage/login";
import { RevenueStorage } from "./storage/revenue";
import { GoodsStorage } from "./storage/goods";
import { GoodsDistributionStorage } from "./storage/goods-distribution";
import { VoterRewardStorage } from "./storage/voter-reward";
import { EscrowStorage } from "./storage/escrow";

import { memes, votes, partnerMemes, partnerVotes, users, contests, archivedContests, loginLogs, blockedIps, revenues, revenueShares, goods, orders, goodsRevenueDistributions, voterRewardPool, voterClaimRecords, escrowDeposits, creatorRewardDistributions, type Meme, type InsertMeme, type Vote, type InsertVote, type PartnerMeme, type InsertPartnerMeme, type PartnerVote, type InsertPartnerVote, type User, type InsertUser, type Contest, type InsertContest, type ArchivedContest, type InsertArchivedContest, type LoginLog, type InsertLoginLog, type BlockedIp, type InsertBlockedIp, type Revenue, type InsertRevenue, type RevenueShare, type InsertRevenueShare, type Goods, type InsertGoods, type Order, type InsertOrder, type GoodsRevenueDistribution, type InsertGoodsRevenueDistribution, type VoterRewardPool, type InsertVoterRewardPool, type VoterClaimRecord, type InsertVoterClaimRecord, type EscrowDeposit, type InsertEscrowDeposit, type CreatorRewardDistribution, type InsertCreatorRewardDistribution, type VoterRewardDistribution, type InsertVoterRewardDistribution } from "@shared/schema";
import { getDatabase } from "./db";
import { eq, and, desc, isNull, or, sql, inArray } from "drizzle-orm";
import { logger } from "./utils/logger";

export interface IStorage {
  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  getUserByDisplayName(displayName: string): Promise<User | undefined>;
  getUsersByWallets(wallets: string[]): Promise<User[]>;
  updateUser(walletAddress: string, updates: Partial<InsertUser & { displayName?: string; avatarUrl?: string }>): Promise<User>;
  updateUserMemeAuthorInfo(walletAddress: string, newDisplayName: string, newAvatarUrl?: string): Promise<void>;
  getUserMemes(walletAddress: string): Promise<Meme[]>;
  getUserMemesByContest(walletAddress: string): Promise<any[]>;
  getUserVotes(walletAddress: string): Promise<Vote[]>;
  // Meme operations
  createMeme(meme: InsertMeme): Promise<Meme>;
  getMemes(): Promise<Meme[]>;
  getAllMemes(): Promise<Meme[]>;
  getMemeById(id: number): Promise<Meme | undefined>;
  getMemesByContestId(contestId: number): Promise<Meme[]>;
  deleteMeme(id: number): Promise<void>;
  updateMemeAnimatedThumbnail(memeId: number, animatedThumbnailUrl: string): Promise<void>;
  
  // Vote operations
  createVote(vote: InsertVote): Promise<Vote>;
  getAllVotes(): Promise<Vote[]>;
  getVotesByMemeId(memeId: number): Promise<Vote[]>;
  getVotesByMemeIds(memeIds: number[]): Promise<Vote[]>;
  getVoteByTxSignature(txSignature: string): Promise<Vote | undefined>;
  hasUserVoted(memeId: number, voterWallet: string): Promise<boolean>;
  updateMemeVoteCount(memeId: number): Promise<void>;
  getUserVoteHistoryByContest(walletAddress: string): Promise<any[]>;
  getUserVotesForContest(walletAddress: string, contestId: number): Promise<any[]>;
  getVotesByContestIds(contestIds: number[]): Promise<Vote[]>;
  
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
  createRevenueShares(shares: InsertRevenueShare[]): Promise<RevenueShare[]>;
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
  getOrderById(id: number): Promise<Order | undefined>;
  getOrderByTxSignature(txSignature: string): Promise<Order | undefined>;
  getOrderByPrintfulId(printfulOrderId: number): Promise<Order | undefined>;
  createOrder(data: InsertOrder): Promise<Order>;
  updateOrder(id: number, data: Partial<InsertOrder>): Promise<Order>;

  // Goods Revenue Distribution operations
  createGoodsRevenueDistribution(data: InsertGoodsRevenueDistribution): Promise<GoodsRevenueDistribution>;
  getGoodsRevenueDistributions(contestId?: number): Promise<GoodsRevenueDistribution[]>;
  getGoodsRevenueDistributionByOrderId(orderId: number): Promise<GoodsRevenueDistribution | undefined>;
  deleteGoodsRevenueDistribution(id: number): Promise<void>;

  // Voter Reward Pool operations (read-only — legacy RPS contests)
  getVoterRewardPool(contestId: number): Promise<VoterRewardPool | undefined>;

  // Voter Claim operations
  getOrCreateVoterClaimRecord(contestId: number, voterWallet: string, sharePercent: number): Promise<VoterClaimRecord>;
  getClaimableAmount(contestId: number, voterWallet: string): Promise<{ claimable: number; totalClaimed: number; sharePercent: number }>;
  getBatchClaimableAmounts(contestIds: number[], voterWallet: string): Promise<Map<number, { claimable: number; totalClaimed: number }>>;
  claimVoterReward(contestId: number, voterWallet: string): Promise<{ claimedAmount: number }>;
  getVoterClaimsByWallet(walletAddress: string): Promise<VoterClaimRecord[]>;

  createCreatorRewardDistributions(data: InsertCreatorRewardDistribution[]): Promise<CreatorRewardDistribution[]>;
  getCreatorRewardDistributionsByContestId(contestId: number): Promise<CreatorRewardDistribution[]>;
  getCreatorRewardDistributionsByWallet(walletAddress: string): Promise<CreatorRewardDistribution[]>;
  getUnclaimedCreatorDistributionsByWallet(walletAddress: string): Promise<CreatorRewardDistribution[]>;
  markCreatorDistributionsClaimed(ids: number[], txSignature: string): Promise<void>;
  createVoterRewardDistributions(data: InsertVoterRewardDistribution[]): Promise<VoterRewardDistribution[]>;
  getUnclaimedVoterDistributionsByWallet(walletAddress: string): Promise<VoterRewardDistribution[]>;
  getAllVoterDistributionsByWallet(walletAddress: string): Promise<VoterRewardDistribution[]>;
  markVoterDistributionsClaimed(ids: number[], txSignature: string): Promise<void>;
  getVoterRewardDistributionsByContestId(contestId: number): Promise<VoterRewardDistribution[]>;
  getAllVoterRewardPools(): Promise<VoterRewardPool[]>;
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
      animatedThumbnailUrl: insertMeme.animatedThumbnailUrl ?? null,
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

  async updateMemeAnimatedThumbnail(memeId: number, animatedThumbnailUrl: string): Promise<void> {
    const meme = this.memes.get(memeId);
    if (meme) {
      this.memes.set(memeId, { ...meme, animatedThumbnailUrl });
    }
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

  async getUsersByWallets(wallets: string[]): Promise<User[]> {
    return wallets.map(w => this.users.get(w)).filter((u): u is User => u !== undefined);
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

  async getUserMemesByContest(walletAddress: string): Promise<any[]> {
    return [];
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

  async getVotesByContestIds(contestIds: number[]): Promise<Vote[]> {
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

  async getVotesByMemeIds(memeIds: number[]): Promise<Vote[]> {
    const set = new Set(memeIds);
    return Array.from(this.votes.values()).filter(vote => set.has(vote.memeId));
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
      animatedThumbnailUrl: insertMeme.animatedThumbnailUrl ?? null,
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
  async createRevenueShares(_shares: InsertRevenueShare[]): Promise<RevenueShare[]> { return []; }
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
  async getOrderById(_id: number): Promise<Order | undefined> { return undefined; }
  async getOrderByTxSignature(_txSignature: string): Promise<Order | undefined> { return undefined; }
  async getOrderByPrintfulId(_printfulOrderId: number): Promise<Order | undefined> { return undefined; }
  async createOrder(_data: InsertOrder): Promise<Order> { throw new Error("Not implemented"); }
  async updateOrder(_id: number, _data: Partial<InsertOrder>): Promise<Order> { throw new Error("Not implemented"); }
  async createGoodsRevenueDistribution(_data: InsertGoodsRevenueDistribution): Promise<GoodsRevenueDistribution> { throw new Error("Not implemented"); }
  async getGoodsRevenueDistributions(_contestId?: number): Promise<GoodsRevenueDistribution[]> { return []; }
  async getGoodsRevenueDistributionByOrderId(_orderId: number): Promise<GoodsRevenueDistribution | undefined> { return undefined; }
  async deleteGoodsRevenueDistribution(_id: number): Promise<void> {}
  async getVoterRewardPool(_contestId: number): Promise<VoterRewardPool | undefined> { return undefined; }
  async getOrCreateVoterClaimRecord(_contestId: number, _voterWallet: string, _sharePercent: number): Promise<VoterClaimRecord> { throw new Error("Not implemented"); }
  async getClaimableAmount(_contestId: number, _voterWallet: string): Promise<{ claimable: number; totalClaimed: number; sharePercent: number }> { return { claimable: 0, totalClaimed: 0, sharePercent: 0 }; }
  async getBatchClaimableAmounts(_contestIds: number[], _voterWallet: string): Promise<Map<number, { claimable: number; totalClaimed: number }>> { return new Map(); }
  async claimVoterReward(_contestId: number, _voterWallet: string): Promise<{ claimedAmount: number }> { throw new Error("Not implemented"); }
  async getVoterClaimsByWallet(_walletAddress: string): Promise<VoterClaimRecord[]> { return []; }
  async createCreatorRewardDistributions(_data: InsertCreatorRewardDistribution[]): Promise<CreatorRewardDistribution[]> { return []; }
  async getCreatorRewardDistributionsByContestId(_contestId: number): Promise<CreatorRewardDistribution[]> { return []; }
  async getCreatorRewardDistributionsByWallet(_walletAddress: string): Promise<CreatorRewardDistribution[]> { return []; }
  async getUnclaimedCreatorDistributionsByWallet(_walletAddress: string): Promise<CreatorRewardDistribution[]> { return []; }
  async markCreatorDistributionsClaimed(_ids: number[], _txSignature: string): Promise<void> {}
  async createVoterRewardDistributions(_data: InsertVoterRewardDistribution[]): Promise<VoterRewardDistribution[]> { return []; }
  async getUnclaimedVoterDistributionsByWallet(_walletAddress: string): Promise<VoterRewardDistribution[]> { return []; }
  async getAllVoterDistributionsByWallet(_walletAddress: string): Promise<VoterRewardDistribution[]> { return []; }
  async markVoterDistributionsClaimed(_ids: number[], _txSignature: string): Promise<void> {}
  async getVoterRewardDistributionsByContestId(_contestId: number): Promise<VoterRewardDistribution[]> { return []; }
  async getAllVoterRewardPools(): Promise<VoterRewardPool[]> { return []; }
  async createEscrowDeposit(_data: InsertEscrowDeposit): Promise<EscrowDeposit> { throw new Error("Not implemented"); }
  async getAllEscrowDeposits(): Promise<EscrowDeposit[]> { return []; }
  async getEscrowDepositsByContestId(_contestId: number): Promise<EscrowDeposit[]> { return []; }
  async getEscrowDepositByOrderId(_orderId: number): Promise<EscrowDeposit | undefined> { return undefined; }
  async updateEscrowStatus(_id: number, _status: string, _distributedAt?: Date): Promise<EscrowDeposit> { throw new Error("Not implemented"); }
  async getLockedEscrowDeposits(): Promise<EscrowDeposit[]> { return []; }
  async getMemeVoteSummary(_contestId: number): Promise<{memeId: number, authorWallet: string, totalSamuReceived: number}[]> { return []; }
}

export class DatabaseStorage implements IStorage {
  private userStorage = new UserStorage();
  private memeStorage = new MemeStorage();
  private partnerStorage = new PartnerStorage();
  private contestStorage = new ContestStorage();
  private loginStorage = new LoginStorage();
  private revenueStorage = new RevenueStorage();
  private goodsStorage = new GoodsStorage();
  private distStorage = new GoodsDistributionStorage();
  private voterStorage = new VoterRewardStorage();
  private escrowStorage = new EscrowStorage();

  // User operations
  createUser(user: InsertUser) { return this.userStorage.createUser(user); }
  getUserByWallet(walletAddress: string) { return this.userStorage.getUserByWallet(walletAddress); }
  getUserByDisplayName(displayName: string) { return this.userStorage.getUserByDisplayName(displayName); }
  getUsersByWallets(wallets: string[]) { return this.userStorage.getUsersByWallets(wallets); }
  updateUser(walletAddress: string, updates: any) { return this.userStorage.updateUser(walletAddress, updates); }
  updateUserMemeAuthorInfo(walletAddress: string, newDisplayName: string, newAvatarUrl?: string) { return this.userStorage.updateUserMemeAuthorInfo(walletAddress, newDisplayName, newAvatarUrl); }
  getUserMemes(walletAddress: string) { return this.userStorage.getUserMemes(walletAddress); }
  getUserMemesByContest(walletAddress: string) { return this.userStorage.getUserMemesByContest(walletAddress); }
  getUserVotes(walletAddress: string) { return this.userStorage.getUserVotes(walletAddress); }
  getUserVoteHistoryByContest(walletAddress: string) { return this.userStorage.getUserVoteHistoryByContest(walletAddress); }
  getUserVotesForContest(walletAddress: string, contestId: number) { return this.userStorage.getUserVotesForContest(walletAddress, contestId); }
  getVotesByContestIds(contestIds: number[]) { return this.userStorage.getVotesByContestIds(contestIds); }

  // Meme operations
  createMeme(meme: InsertMeme) { return this.memeStorage.createMeme(meme); }
  getMemes() { return this.memeStorage.getMemes(); }
  getAllMemes() { return this.memeStorage.getAllMemes(); }
  getMemeById(id: number) { return this.memeStorage.getMemeById(id); }
  getMemesByContestId(contestId: number) { return this.memeStorage.getMemesByContestId(contestId); }
  deleteMeme(id: number) { return this.memeStorage.deleteMeme(id); }
  updateMemeAnimatedThumbnail(memeId: number, animatedThumbnailUrl: string) { return this.memeStorage.updateMemeAnimatedThumbnail(memeId, animatedThumbnailUrl); }
  getAllVotes() { return this.memeStorage.getAllVotes(); }
  createVote(vote: InsertVote) { return this.memeStorage.createVote(vote); }
  getVotesByMemeId(memeId: number) { return this.memeStorage.getVotesByMemeId(memeId); }
  getVotesByMemeIds(memeIds: number[]) { return this.memeStorage.getVotesByMemeIds(memeIds); }
  getVoteByTxSignature(txSignature: string) { return this.memeStorage.getVoteByTxSignature(txSignature); }
  hasUserVoted(memeId: number, voterWallet: string) { return this.memeStorage.hasUserVoted(memeId, voterWallet); }
  updateMemeVoteCount(memeId: number) { return this.memeStorage.updateMemeVoteCount(memeId); }

  // Partner operations
  createPartnerMeme(meme: InsertMeme, partnerId: string) { return this.partnerStorage.createPartnerMeme(meme, partnerId); }
  getPartnerMemes(partnerId: string) { return this.partnerStorage.getPartnerMemes(partnerId); }
  getPartnerMemeById(partnerId: string, id: number) { return this.partnerStorage.getPartnerMemeById(partnerId, id); }
  createPartnerVote(vote: InsertVote, partnerId: string) { return this.partnerStorage.createPartnerVote(vote, partnerId); }
  hasUserVotedPartner(partnerId: string, memeId: number, voterWallet: string) { return this.partnerStorage.hasUserVotedPartner(partnerId, memeId, voterWallet); }
  updatePartnerMemeVoteCount(partnerId: string, memeId: number) { return this.partnerStorage.updatePartnerMemeVoteCount(partnerId, memeId); }

  // Contest operations
  createContest(contest: InsertContest) { return this.contestStorage.createContest(contest); }
  getContests() { return this.contestStorage.getContests(); }
  getContestById(id: number) { return this.contestStorage.getContestById(id); }
  updateContestStatus(id: number, status: string) { return this.contestStorage.updateContestStatus(id, status); }
  updateContestTimes(id: number, startTime: Date, endTime: Date) { return this.contestStorage.updateContestTimes(id, startTime, endTime); }
  endContestAndArchive(contestId: number) { return this.contestStorage.endContestAndArchive(contestId); }
  getArchivedContests() { return this.contestStorage.getArchivedContests(); }
  getCurrentActiveContest() { return this.contestStorage.getCurrentActiveContest(); }

  // Login/IP operations
  logLogin(loginLog: InsertLoginLog) { return this.loginStorage.logLogin(loginLog); }
  getTodayLoginsByIp(ipAddress: string) { return this.loginStorage.getTodayLoginsByIp(ipAddress); }
  getTodayLoginsByDeviceId(deviceId: string) { return this.loginStorage.getTodayLoginsByDeviceId(deviceId); }
  blockIp(blockData: InsertBlockedIp) { return this.loginStorage.blockIp(blockData); }
  unblockIp(ipAddress: string) { return this.loginStorage.unblockIp(ipAddress); }
  isIpBlocked(ipAddress: string) { return this.loginStorage.isIpBlocked(ipAddress); }
  getBlockedIps() { return this.loginStorage.getBlockedIps(); }
  getRecentLogins(limit?: number) { return this.loginStorage.getRecentLogins(limit); }
  getSuspiciousIps() { return this.loginStorage.getSuspiciousIps(); }
  getSuspiciousDevices() { return this.loginStorage.getSuspiciousDevices(); }

  // Revenue operations
  createRevenue(revenue: InsertRevenue) { return this.revenueStorage.createRevenue(revenue); }
  getRevenuesByContestId(contestId: number) { return this.revenueStorage.getRevenuesByContestId(contestId); }
  getRevenueById(id: number) { return this.revenueStorage.getRevenueById(id); }
  updateRevenueStatus(id: number, status: string, distributedAt?: Date) { return this.revenueStorage.updateRevenueStatus(id, status, distributedAt); }
  createRevenueShare(share: InsertRevenueShare) { return this.revenueStorage.createRevenueShare(share); }
  createRevenueShares(shares: InsertRevenueShare[]) { return this.revenueStorage.createRevenueShares(shares); }
  getRevenueSharesByRevenueId(revenueId: number) { return this.revenueStorage.getRevenueSharesByRevenueId(revenueId); }
  getRevenueSharesByWallet(walletAddress: string) { return this.revenueStorage.getRevenueSharesByWallet(walletAddress); }
  getRevenueSharesByContestId(contestId: number) { return this.revenueStorage.getRevenueSharesByContestId(contestId); }
  getContestVoteSummary(contestId: number) { return this.revenueStorage.getContestVoteSummary(contestId); }

  // Goods operations
  getGoods() { return this.goodsStorage.getGoods(); }
  getGoodsById(id: number) { return this.goodsStorage.getGoodsById(id); }
  createGoods(data: InsertGoods) { return this.goodsStorage.createGoods(data); }
  updateGoods(id: number, data: Partial<InsertGoods>) { return this.goodsStorage.updateGoods(id, data); }
  getOrders(walletAddress: string) { return this.goodsStorage.getOrders(walletAddress); }
  getOrderById(id: number) { return this.goodsStorage.getOrderById(id); }
  getOrderByTxSignature(txSignature: string) { return this.goodsStorage.getOrderByTxSignature(txSignature); }
  getOrderByPrintfulId(printfulOrderId: number) { return this.goodsStorage.getOrderByPrintfulId(printfulOrderId); }
  createOrder(data: InsertOrder) { return this.goodsStorage.createOrder(data); }
  updateOrder(id: number, data: Partial<InsertOrder>) { return this.goodsStorage.updateOrder(id, data); }
  getAllOrders() { return this.goodsStorage.getAllOrders(); }

  // Goods distribution operations
  createGoodsRevenueDistribution(data: InsertGoodsRevenueDistribution) { return this.distStorage.createGoodsRevenueDistribution(data); }
  getGoodsRevenueDistributions(contestId?: number) { return this.distStorage.getGoodsRevenueDistributions(contestId); }
  getGoodsRevenueDistributionByOrderId(orderId: number) { return this.distStorage.getGoodsRevenueDistributionByOrderId(orderId); }
  deleteGoodsRevenueDistribution(id: number) { return this.distStorage.deleteGoodsRevenueDistribution(id); }

  // Voter reward operations (read-only — legacy RPS contests)
  getVoterRewardPool(contestId: number) { return this.voterStorage.getVoterRewardPool(contestId); }
  getOrCreateVoterClaimRecord(contestId: number, voterWallet: string, sharePercent: number) { return this.voterStorage.getOrCreateVoterClaimRecord(contestId, voterWallet, sharePercent); }
  getClaimableAmount(contestId: number, voterWallet: string) { return this.voterStorage.getClaimableAmount(contestId, voterWallet); }
  getBatchClaimableAmounts(contestIds: number[], voterWallet: string) { return this.voterStorage.getBatchClaimableAmounts(contestIds, voterWallet); }
  claimVoterReward(contestId: number, voterWallet: string) { return this.voterStorage.claimVoterReward(contestId, voterWallet); }
  getVoterClaimsByWallet(walletAddress: string) { return this.voterStorage.getVoterClaimsByWallet(walletAddress); }
  createCreatorRewardDistributions(data: InsertCreatorRewardDistribution[]) { return this.voterStorage.createCreatorRewardDistributions(data); }
  getCreatorRewardDistributionsByDistributionId(distributionId: number) { return this.voterStorage.getCreatorRewardDistributionsByDistributionId(distributionId); }
  getCreatorRewardDistributionsByContestId(contestId: number) { return this.voterStorage.getCreatorRewardDistributionsByContestId(contestId); }
  getCreatorRewardDistributionsByWallet(walletAddress: string) { return this.voterStorage.getCreatorRewardDistributionsByWallet(walletAddress); }
  getUnclaimedCreatorDistributionsByWallet(walletAddress: string) { return this.voterStorage.getUnclaimedCreatorDistributionsByWallet(walletAddress); }
  markCreatorDistributionsClaimed(ids: number[], txSignature: string) { return this.voterStorage.markCreatorDistributionsClaimed(ids, txSignature); }
  createVoterRewardDistributions(data: InsertVoterRewardDistribution[]) { return this.voterStorage.createVoterRewardDistributions(data); }
  getUnclaimedVoterDistributionsByWallet(walletAddress: string) { return this.voterStorage.getUnclaimedVoterDistributionsByWallet(walletAddress); }
  getAllVoterDistributionsByWallet(walletAddress: string) { return this.voterStorage.getAllVoterDistributionsByWallet(walletAddress); }
  markVoterDistributionsClaimed(ids: number[], txSignature: string) { return this.voterStorage.markVoterDistributionsClaimed(ids, txSignature); }
  getVoterRewardDistributionsByContestId(contestId: number) { return this.voterStorage.getVoterRewardDistributionsByContestId(contestId); }

  // Escrow operations
  getAllVoterRewardPools() { return this.escrowStorage.getAllVoterRewardPools(); }
  createEscrowDeposit(data: InsertEscrowDeposit) { return this.escrowStorage.createEscrowDeposit(data); }
  getAllEscrowDeposits() { return this.escrowStorage.getAllEscrowDeposits(); }
  getEscrowDepositsByContestId(contestId: number) { return this.escrowStorage.getEscrowDepositsByContestId(contestId); }
  getEscrowDepositByOrderId(orderId: number) { return this.escrowStorage.getEscrowDepositByOrderId(orderId); }
  updateEscrowStatus(id: number, status: string, distributedAt?: Date) { return this.escrowStorage.updateEscrowStatus(id, status, distributedAt); }
  getLockedEscrowDeposits() { return this.escrowStorage.getLockedEscrowDeposits(); }
  getMemeVoteSummary(contestId: number) { return this.escrowStorage.getMemeVoteSummary(contestId); }
}

// Use DatabaseStorage if database is available, otherwise fallback to MemStorage
const db = getDatabase();
export const storage = db ? new DatabaseStorage() : new MemStorage();
