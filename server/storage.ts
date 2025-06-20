import { memes, votes, nfts, nftComments, type Meme, type InsertMeme, type Vote, type InsertVote, type Nft, type InsertNft, type NftComment, type InsertNftComment } from "@shared/schema";

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
  
  // NFT operations
  getNfts(): Promise<Nft[]>;
  getNftById(id: number): Promise<Nft | undefined>;
  
  // NFT Comment operations
  createNftComment(comment: InsertNftComment): Promise<NftComment>;
  getNftComments(nftId: number): Promise<NftComment[]>;
}

export class MemStorage implements IStorage {
  private memes: Map<number, Meme>;
  private votes: Map<number, Vote>;
  private nfts: Map<number, Nft>;
  private nftComments: Map<number, NftComment>;
  private currentMemeId: number;
  private currentVoteId: number;
  private currentNftId: number;
  private currentCommentId: number;

  constructor() {
    this.memes = new Map();
    this.votes = new Map();
    this.nfts = new Map();
    this.nftComments = new Map();
    this.currentMemeId = 1;
    this.currentVoteId = 1;
    this.currentNftId = 1;
    this.currentCommentId = 1;
    
    // Add some sample memes for the contest
    this.initializeSampleData();
    // Initialize 164 NFTs
    this.initializeNftData();
  }

  private initializeSampleData() {
    const sampleMemes: InsertMeme[] = [
      {
        title: "HODL STRONG",
        description: "When dip but you trust SAMU",
        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23F7DC6F'/%3E%3Ccircle cx='200' cy='150' r='80' fill='%232C3E50'/%3E%3Cpath d='M140 120 L160 100 L180 120 L200 100 L220 120 L240 100 L260 120 L240 140 L200 130 L160 140 Z' fill='%23F7DC6F'/%3E%3Ccircle cx='170' cy='130' r='8' fill='%23FF8C00'/%3E%3Ccircle cx='230' cy='130' r='8' fill='%23FF8C00'/%3E%3Cpath d='M180 150 L200 170 L220 150' stroke='%23F7DC6F' stroke-width='4' fill='none'/%3E%3Ctext x='200' y='280' text-anchor='middle' font-family='Arial' font-size='32' font-weight='bold' fill='%232C3E50'%3EHODL STRONG%3C/text%3E%3Ctext x='200' y='320' text-anchor='middle' font-family='Arial' font-size='16' fill='%238B4513'%3EWhen dip but you trust SAMU%3C/text%3E%3C/svg%3E",
        authorWallet: "7x8k9mPqRt3vFw2nBc5dE1fG",
        authorUsername: "wolf_master"
      },
      {
        title: "TO THE MOON",
        description: "SAMU pack assembling",
        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='moonGrad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%238B4513'/%3E%3Cstop offset='100%25' stop-color='%23FF8C00'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='400' fill='url(%23moonGrad)'/%3E%3Ccircle cx='200' cy='150' r='90' fill='white' fill-opacity='0.3'/%3E%3Cpath d='M130 130 L150 110 L170 130 L190 110 L210 130 L230 110 L250 130 L270 130 L250 150 L200 140 L150 150 Z' fill='white'/%3E%3Ccircle cx='170' cy='135' r='6' fill='%23FF8C00'/%3E%3Ccircle cx='230' cy='135' r='6' fill='%23FF8C00'/%3E%3Cpath d='M175 150 L200 165 L225 150' stroke='%23FF8C00' stroke-width='4' fill='none'/%3E%3Ctext x='200' y='280' text-anchor='middle' font-family='Arial' font-size='32' font-weight='bold' fill='white'%3ETO THE MOON%3C/text%3E%3Ctext x='200' y='320' text-anchor='middle' font-family='Arial' font-size='16' fill='white' fill-opacity='0.8'%3ESAMU pack assembling%3C/text%3E%3C/svg%3E",
        authorWallet: "9mPq3vFw2nBc5dE1fG7x8kRt",
        authorUsername: "moon_wolf"
      },
      {
        title: "DIAMOND PAWS",
        description: "Never selling my SAMU",
        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='diamondGrad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%232C3E50'/%3E%3Cstop offset='100%25' stop-color='%2334495E'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='400' fill='url(%23diamondGrad)'/%3E%3Ccircle cx='200' cy='150' r='85' fill='%23F7DC6F' fill-opacity='0.3'/%3E%3Cpath d='M135 135 L155 115 L175 135 L195 115 L215 135 L235 115 L255 135 L275 135 L255 155 L200 145 L145 155 Z' fill='%23F7DC6F'/%3E%3Ccircle cx='175' cy='140' r='6' fill='%23FF8C00'/%3E%3Ccircle cx='225' cy='140' r='6' fill='%23FF8C00'/%3E%3Cpath d='M180 155 L200 170 L220 155' stroke='%23FF8C00' stroke-width='4' fill='none'/%3E%3Ctext x='200' y='280' text-anchor='middle' font-family='Arial' font-size='28' font-weight='bold' fill='%23F7DC6F'%3EDIAMOND PAWS%3C/text%3E%3Ctext x='200' y='320' text-anchor='middle' font-family='Arial' font-size='16' fill='%23F7DC6F' fill-opacity='0.8'%3ENever selling my SAMU%3C/text%3E%3C/svg%3E",
        authorWallet: "Bc5dE1fG7x8kRt9mPq3vFw2n",
        authorUsername: "diamond_wolf"
      }
    ];

    sampleMemes.forEach(meme => {
      const id = this.currentMemeId++;
      const newMeme: Meme = {
        id,
        title: meme.title,
        description: meme.description || null,
        imageUrl: meme.imageUrl,
        authorWallet: meme.authorWallet,
        authorUsername: meme.authorUsername,
        votes: Math.floor(Math.random() * 1500) + 100,
        createdAt: new Date()
      };
      this.memes.set(id, newMeme);
    });
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
    // Create 164 unique NFTs with varied designs
    for (let i = 1; i <= 164; i++) {
      const nft: Nft = {
        id: i,
        title: `SAMU Wolf #${String(i).padStart(3, '0')}`,
        tokenId: i,
        creator: `creator_${Math.floor(Math.random() * 20) + 1}`,
        description: `Unique SAMU Wolf NFT with special traits. Part of the legendary 164 collection.`,
        imageUrl: this.generateNftImage(i),
        createdAt: new Date()
      };
      this.nfts.set(i, nft);
    }
  }

  private generateNftImage(tokenId: number): string {
    // Use static image files from attached_assets/nfts/
    // Images should be named: 1.png, 2.png, 3.png, etc.
    return `/assets/nfts/${tokenId}.png`;
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
}

export const storage = new MemStorage();
