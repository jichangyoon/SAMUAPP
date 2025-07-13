import { memes, votes, nfts, nftComments, partnerMemes, partnerVotes, users, contests, archivedContests, type Meme, type InsertMeme, type Vote, type InsertVote, type Nft, type InsertNft, type NftComment, type InsertNftComment, type PartnerMeme, type InsertPartnerMeme, type PartnerVote, type InsertPartnerVote, type User, type InsertUser, type Contest, type InsertContest, type ArchivedContest, type InsertArchivedContest } from "@shared/schema";
import { getDatabase } from "./db";
import { eq, and, desc, isNull } from "drizzle-orm";

export interface IStorage {
  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  getUserByDisplayName(displayName: string): Promise<User | undefined>;
  updateUser(walletAddress: string, updates: Partial<InsertUser & { displayName?: string; avatarUrl?: string }>): Promise<User>;
  updateUserMemeAuthorInfo(walletAddress: string, newDisplayName: string, newAvatarUrl?: string): Promise<void>;
  getUserMemes(walletAddress: string): Promise<Meme[]>;
  getUserVotes(walletAddress: string): Promise<Vote[]>;
  getUserComments(walletAddress: string): Promise<NftComment[]>;
  
  // Meme operations
  createMeme(meme: InsertMeme): Promise<Meme>;
  getMemes(): Promise<Meme[]>;
  getMemeById(id: number): Promise<Meme | undefined>;
  getMemesByContestId(contestId: number): Promise<Meme[]>;
  deleteMeme(id: number): Promise<void>;
  
  // Vote operations
  createVote(vote: InsertVote): Promise<Vote>;
  getVotesByMemeId(memeId: number): Promise<Vote[]>;
  hasUserVoted(memeId: number, voterWallet: string): Promise<boolean>;
  updateMemeVoteCount(memeId: number): Promise<void>;
  
  // NFT operations
  getNfts(): Promise<Nft[]>;
  getNftById(id: number): Promise<Nft | undefined>;
  
  // NFT Comment operations
  createNftComment(comment: InsertNftComment): Promise<NftComment>;
  getNftComments(nftId: number): Promise<NftComment[]>;
  getNftCommentById(commentId: number): Promise<NftComment | undefined>;
  deleteNftComment(commentId: number): Promise<void>;
  
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
}

export class MemStorage implements IStorage {
  private memes: Map<number, Meme>;
  private votes: Map<number, Vote>;
  private nfts: Map<number, Nft>;
  private nftComments: Map<number, NftComment>;
  private partnerMemes: Map<string, Map<number, Meme>>;
  private partnerVotes: Map<string, Map<number, Vote>>;
  private users: Map<string, User>;
  private currentMemeId: number;
  private currentVoteId: number;
  private currentNftId: number;
  private currentCommentId: number;
  private currentUserId: number;

  constructor() {
    this.memes = new Map();
    this.votes = new Map();
    this.nfts = new Map();
    this.nftComments = new Map();
    this.partnerMemes = new Map();
    this.partnerVotes = new Map();
    this.users = new Map();
    this.currentMemeId = 1;
    this.currentVoteId = 1;
    this.currentNftId = 1;
    this.currentCommentId = 1;
    this.currentUserId = 1;
    
    // Initialize 164 NFTs (keeping for gallery display)
    this.initializeNftData();
  }

  async createMeme(insertMeme: InsertMeme): Promise<Meme> {
    const id = this.currentMemeId++;
    const meme: Meme = {
      id,
      title: insertMeme.title,
      description: insertMeme.description || null,
      imageUrl: insertMeme.imageUrl,
      authorWallet: insertMeme.authorWallet,
      authorUsername: insertMeme.authorUsername,
      votes: 0,
      createdAt: new Date()
    };
    this.memes.set(id, meme);
    return meme;
  }

  async getMemes(): Promise<Meme[]> {
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
      avatarUrl: insertUser.avatarUrl || null,
      samuBalance: insertUser.samuBalance || 0,
      totalVotingPower: insertUser.totalVotingPower || 0,
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
    for (const user of this.users.values()) {
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

  async getUserComments(walletAddress: string): Promise<NftComment[]> {
    return Array.from(this.nftComments.values())
      .filter(comment => comment.userWallet === walletAddress)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createVote(insertVote: InsertVote): Promise<Vote> {
    const id = this.currentVoteId++;
    const vote: Vote = {
      ...insertVote,
      id,
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

  async hasUserVoted(memeId: number, voterWallet: string): Promise<boolean> {
    return Array.from(this.votes.values()).some(
      vote => vote.memeId === memeId && vote.voterWallet === voterWallet
    );
  }

  async updateMemeVoteCount(memeId: number): Promise<void> {
    const meme = this.memes.get(memeId);
    if (meme) {
      const votes = Array.from(this.votes.values())
        .filter(vote => vote.memeId === memeId)
        .reduce((sum, vote) => sum + vote.votingPower, 0);
      
      meme.votes = votes;
      this.memes.set(memeId, meme);
    }
  }

  private initializeNftData() {
    // Create 164 unique NFTs with URL-based images for better performance
    const nftImageUrls = this.generateNftImageUrls();
    
    for (let i = 1; i <= 164; i++) {
      const nft: Nft = {
        id: i,
        title: `SAMU Wolf #${String(i).padStart(3, '0')}`,
        tokenId: i,
        creator: "SAMU Official",
        description: `Unique SAMU Wolf NFT with special traits. Part of the legendary 164 collection.`,
        imageUrl: nftImageUrls[i - 1],
        createdAt: new Date()
      };
      this.nfts.set(i, nft);
    }
  }

  private generateNftImageUrls(): string[] {
    // High-performance NFT image URLs - using WebP format for 98% size reduction
    const urls: string[] = [];
    for (let i = 1; i <= 164; i++) {
      // Using WebP optimized images for faster loading
      urls.push(`/assets/nfts/${i}.webp`);
    }
    return urls;
  }

  // NFT operations
  async getNfts(): Promise<Nft[]> {
    return Array.from(this.nfts.values()).sort((a, b) => a.tokenId - b.tokenId);
  }

  async getNftById(id: number): Promise<Nft | undefined> {
    return this.nfts.get(id);
  }

  // NFT Comment operations
  async createNftComment(insertComment: InsertNftComment): Promise<NftComment> {
    const id = this.currentCommentId++;
    const comment: NftComment = {
      ...insertComment,
      id,
      createdAt: new Date()
    };
    this.nftComments.set(id, comment);
    return comment;
  }

  async getNftComments(nftId: number): Promise<NftComment[]> {
    return Array.from(this.nftComments.values())
      .filter(comment => comment.nftId === nftId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getNftCommentById(commentId: number): Promise<NftComment | undefined> {
    return this.nftComments.get(commentId);
  }

  async deleteNftComment(commentId: number): Promise<void> {
    this.nftComments.delete(commentId);
  }

  // Partner Meme operations
  async createPartnerMeme(insertMeme: InsertMeme, partnerId: string): Promise<Meme> {
    if (!this.partnerMemes.has(partnerId)) {
      this.partnerMemes.set(partnerId, new Map());
    }
    
    const id = this.currentMemeId++;
    const meme: Meme = {
      id,
      title: insertMeme.title,
      description: insertMeme.description ?? null,
      imageUrl: insertMeme.imageUrl,
      authorWallet: insertMeme.authorWallet,
      authorUsername: insertMeme.authorUsername,
      votes: 0,
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
      ...insertVote,
      id,
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
}

export class DatabaseStorage implements IStorage {
  private db = getDatabase();

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
    
    return await this.db
      .select()
      .from(votes)
      .where(eq(votes.voterWallet, walletAddress))
      .orderBy(desc(votes.createdAt));
  }

  async getUserComments(walletAddress: string): Promise<NftComment[]> {
    if (!this.db) throw new Error("Database not available");
    
    return await this.db
      .select()
      .from(nftComments)
      .where(eq(nftComments.userWallet, walletAddress))
      .orderBy(desc(nftComments.createdAt));
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
    
    return await this.db
      .select()
      .from(memes)
      .where(eq(memes.contestId, contestId))
      .orderBy(desc(memes.votes));
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
    const totalVotes = memeVotes.reduce((sum, vote) => sum + vote.votingPower, 0);
    
    await this.db
      .update(memes)
      .set({ votes: totalVotes })
      .where(eq(memes.id, memeId));
  }

  async getNfts(): Promise<Nft[]> {
    if (!this.db) throw new Error("Database not available");
    
    return await this.db
      .select()
      .from(nfts)
      .orderBy(desc(nfts.createdAt));
  }

  async getNftById(id: number): Promise<Nft | undefined> {
    if (!this.db) throw new Error("Database not available");
    
    const [nft] = await this.db
      .select()
      .from(nfts)
      .where(eq(nfts.id, id));
    return nft;
  }

  async createNftComment(insertComment: InsertNftComment): Promise<NftComment> {
    if (!this.db) throw new Error("Database not available");
    
    const [comment] = await this.db
      .insert(nftComments)
      .values(insertComment)
      .returning();
    return comment;
  }

  async getNftComments(nftId: number): Promise<NftComment[]> {
    if (!this.db) throw new Error("Database not available");
    
    return await this.db
      .select()
      .from(nftComments)
      .where(eq(nftComments.nftId, nftId))
      .orderBy(desc(nftComments.createdAt));
  }

  async getNftCommentById(commentId: number): Promise<NftComment | undefined> {
    if (!this.db) throw new Error("Database not available");
    
    const [comment] = await this.db
      .select()
      .from(nftComments)
      .where(eq(nftComments.id, commentId));
    return comment;
  }

  async deleteNftComment(commentId: number): Promise<void> {
    if (!this.db) throw new Error("Database not available");
    
    await this.db
      .delete(nftComments)
      .where(eq(nftComments.id, commentId));
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
      title: meme.title,
      description: meme.description,
      imageUrl: meme.imageUrl,
      authorWallet: meme.authorWallet,
      authorUsername: meme.authorUsername,
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
      title: meme.title,
      description: meme.description,
      imageUrl: meme.imageUrl,
      authorWallet: meme.authorWallet,
      authorUsername: meme.authorUsername,
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
      title: meme.title,
      description: meme.description,
      imageUrl: meme.imageUrl,
      authorWallet: meme.authorWallet,
      authorUsername: meme.authorUsername,
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
    
    // Convert PartnerVote to Vote format for compatibility
    return {
      id: vote.id,
      memeId: vote.memeId,
      voterWallet: vote.voterWallet,
      votingPower: vote.votingPower,
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
    
    const totalVotes = partnerVotesList.reduce((sum, vote) => sum + vote.votingPower, 0);
    
    await this.db
      .update(partnerMemes)
      .set({ votes: totalVotes })
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

    // Get all memes for this contest (current memes are contestId = null)
    const contestMemes = await this.db
      .select()
      .from(memes)
      .where(isNull(memes.contestId))
      .orderBy(desc(memes.votes));

    // Allow ending contest even with no memes

    // Move all contest files to archive in R2 storage
    if (contestMemes.length > 0) {
      const { moveToArchive, extractKeyFromUrl } = await import('./r2-storage');
      
      // Archive contest files to R2 storage
      for (const meme of contestMemes) {
        if (meme.imageUrl) {
          const key = extractKeyFromUrl(meme.imageUrl);
          if (key) {
            const result = await moveToArchive(key, contestId);
            if (result.success && result.url) {
              // Update meme with new archived URL
              await this.db
                .update(memes)
                .set({ imageUrl: result.url })
                .where(eq(memes.id, meme.id));
            }
          }
        }
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

    // Archive the contest
    const [archivedContest] = await this.db
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
        startTime: contest.startTime || contest.createdAt,
        endTime: new Date(),
      })
      .returning();

    // Update contest status to archived
    await this.updateContestStatus(contestId, "archived");

    // Move current contest memes to archived contest (only if there are memes)
    if (contestMemes.length > 0) {
      await this.db
        .update(memes)
        .set({ contestId: contestId })
        .where(eq(memes.contestId, contestId));
    }

    console.log(`Contest ${contestId} archived with ${totalMemes} files moved to archives/contest-${contestId}/`);

    // Reset all users' voting power after contest ends
    try {
      const { votingPowerManager } = await import('./voting-power');
      await votingPowerManager.resetAllVotingPowerAfterContest();
      console.log("All users' voting power reset after contest end");
    } catch (error) {
      console.error("Failed to reset voting power after contest end:", error);
    }

    return archivedContest;
  }

  async getArchivedContests(): Promise<ArchivedContest[]> {
    if (!this.db) throw new Error("Database not available");
    
    const archived = await this.db
      .select()
      .from(archivedContests)
      .orderBy(desc(archivedContests.archivedAt));

    // Enrich with winner meme details
    const enrichedContests = await Promise.all(
      archived.map(async (contest) => {
        let winnerMeme = null;
        let secondMeme = null;
        let thirdMeme = null;

        if (contest.winnerMemeId) {
          const [winner] = await this.db!
            .select()
            .from(memes)
            .where(eq(memes.id, contest.winnerMemeId));
          winnerMeme = winner || null;
        }

        if (contest.secondMemeId) {
          const [second] = await this.db!
            .select()
            .from(memes)
            .where(eq(memes.id, contest.secondMemeId));
          secondMeme = second || null;
        }

        if (contest.thirdMemeId) {
          const [third] = await this.db!
            .select()
            .from(memes)
            .where(eq(memes.id, contest.thirdMemeId));
          thirdMeme = third || null;
        }

        const enriched = {
          ...contest,
          winnerMeme,
          secondMeme,
          thirdMeme
        };
        
        return enriched;
      })
    );

    return enrichedContests;
  }
}

// Use DatabaseStorage if database is available, otherwise fallback to MemStorage
const db = getDatabase();
export const storage = db ? new DatabaseStorage() : new MemStorage();
