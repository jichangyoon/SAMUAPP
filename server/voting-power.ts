import { getDatabase } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

// Voting power management system
interface VotingPowerData {
  walletAddress: string;
  totalPower: number;
  usedPower: number;
  remainingPower: number;
  lastUpdated: Date;
}

class VotingPowerManager {
  private db = getDatabase();
  
  // Calculate voting power based on SAMU balance
  private calculateTotalPower(samuBalance: number): number {
    // Base voting power: 3 for everyone
    const basePower = 3;
    
    // Additional power: 10 voting power per 1 million SAMU
    const additionalPower = Math.floor(samuBalance / 1000000) * 10;
    
    return basePower + additionalPower;
  }
  
  // Initialize or update voting power based on SAMU balance
  async initializeVotingPower(walletAddress: string, samuBalance: number): Promise<VotingPowerData> {
    if (!this.db) throw new Error("Database not available");
    
    const totalPower = this.calculateTotalPower(samuBalance);
    
    // Update user's total voting power and SAMU balance
    await this.db
      .update(users)
      .set({
        totalVotingPower: totalPower,
        samuBalance: samuBalance,
        updatedAt: new Date()
      })
      .where(eq(users.walletAddress, walletAddress));
    
    // Get current used power from database
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress));
    
    const usedPower = user?.usedVotingPower || 0;
    
    return {
      walletAddress,
      totalPower,
      usedPower,
      remainingPower: totalPower - usedPower,
      lastUpdated: new Date()
    };
  }
  
  // Get current voting power from database
  async getVotingPower(walletAddress: string): Promise<VotingPowerData | null> {
    if (!this.db) return null;
    
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress));
    
    if (!user) return null;
    
    const remainingPower = user.totalVotingPower - user.usedVotingPower;
    
    return {
      walletAddress,
      totalPower: user.totalVotingPower,
      usedPower: user.usedVotingPower,
      remainingPower,
      lastUpdated: user.updatedAt
    };
  }
  
  // Use voting power when voting (update database)
  async useVotingPower(walletAddress: string, powerUsed: number): Promise<boolean> {
    if (!this.db) return false;
    
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress));
    
    if (!user) return false;
    
    const remainingPower = user.totalVotingPower - user.usedVotingPower;
    if (remainingPower < powerUsed) return false;
    
    // Update used voting power in database
    await this.db
      .update(users)
      .set({
        usedVotingPower: user.usedVotingPower + powerUsed,
        updatedAt: new Date()
      })
      .where(eq(users.walletAddress, walletAddress));
    
    return true;
  }
  
  // Reset voting power (contest end) - reset used power to 0
  async resetVotingPower(walletAddress: string, newSamuBalance: number): Promise<VotingPowerData> {
    if (!this.db) throw new Error("Database not available");
    
    const totalPower = this.calculateTotalPower(newSamuBalance);
    
    await this.db
      .update(users)
      .set({
        totalVotingPower: totalPower,
        usedVotingPower: 0, // Reset used power
        samuBalance: newSamuBalance,
        updatedAt: new Date()
      })
      .where(eq(users.walletAddress, walletAddress));
    
    return {
      walletAddress,
      totalPower,
      usedPower: 0,
      remainingPower: totalPower,
      lastUpdated: new Date()
    };
  }
  
  // Get all voting power data for admin
  async getAllVotingPower(): Promise<VotingPowerData[]> {
    if (!this.db) return [];
    
    const allUsers = await this.db.select().from(users);
    
    return allUsers.map(user => ({
      walletAddress: user.walletAddress,
      totalPower: user.totalVotingPower,
      usedPower: user.usedVotingPower,
      remainingPower: user.totalVotingPower - user.usedVotingPower,
      lastUpdated: user.updatedAt
    }));
  }
}

export const votingPowerManager = new VotingPowerManager();
export type { VotingPowerData };