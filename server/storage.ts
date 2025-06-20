import { memes, votes, type Meme, type InsertMeme, type Vote, type InsertVote } from "@shared/schema";

export interface IStorage {
  // Meme operations
  createMeme(meme: InsertMeme): Promise<Meme>;
  getMemes(): Promise<Meme[]>;
  getMemeById(id: number): Promise<Meme | undefined>;
  
  // Vote operations
  createVote(vote: InsertVote): Promise<Vote>;
  getVotesByMemeId(memeId: number): Promise<Vote[]>;
  hasUserVoted(memeId: number, voterWallet: string): Promise<boolean>;
  updateMemeVoteCount(memeId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private memes: Map<number, Meme>;
  private votes: Map<number, Vote>;
  private currentMemeId: number;
  private currentVoteId: number;

  constructor() {
    this.memes = new Map();
    this.votes = new Map();
    this.currentMemeId = 1;
    this.currentVoteId = 1;
  }

  async createMeme(insertMeme: InsertMeme): Promise<Meme> {
    const id = this.currentMemeId++;
    const meme: Meme = {
      ...insertMeme,
      id,
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
}

export const storage = new MemStorage();
