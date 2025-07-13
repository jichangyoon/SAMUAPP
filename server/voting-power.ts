import { getDatabase } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

// Voting power management system
interface VotingPowerData {
  walletAddress: string;
  totalPower: number;
  usedPower: number;
  remainingPower: number;
  lastUpdated: string;
}

class VotingPowerManager {
  private db = getDatabase();
  
  constructor() {
    console.log('VotingPowerManager initialized, database:', this.db ? 'connected' : 'null');
  }
  
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
    if (!this.db) {
      console.log('Database connection is null');
      return null;
    }
    
    console.log('Fetching voting power for wallet:', walletAddress);
    
    try {
      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress));
      
      console.log('User found:', user ? 'Yes' : 'No');
      if (user) {
        console.log('User voting power data:', {
          totalVotingPower: user.totalVotingPower,
          usedVotingPower: user.usedVotingPower,
          samuBalance: user.samuBalance
        });
        
        const remainingPower = user.totalVotingPower - user.usedVotingPower;
        
        const result = {
          walletAddress,
          totalPower: user.totalVotingPower,
          usedPower: user.usedVotingPower,
          remainingPower,
          lastUpdated: user.updatedAt.toISOString()
        };
        
        console.log('Returning voting power result:', result);
        return result;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching voting power from database:', error);
      return null;
    }
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

  // Reset all users' voting power after contest ends
  async resetAllVotingPowerAfterContest(): Promise<void> {
    if (!this.db) throw new Error("Database not available");
    
    console.log("Resetting all users' voting power after contest end...");
    
    const allUsers = await this.db.select().from(users);
    
    for (const user of allUsers) {
      try {
        // Get current SAMU balance from API
        const response = await fetch(`http://localhost:5000/api/samu-balance/${user.walletAddress}`);
        const data = await response.json();
        const currentBalance = data.balance || 0;
        
        // Calculate new voting power based on current balance
        const newTotalPower = this.calculateTotalPower(currentBalance);
        
        // Update user with new voting power and reset used power to 0
        await this.db
          .update(users)
          .set({
            totalVotingPower: newTotalPower,
            usedVotingPower: 0, // Reset used power for next contest
            samuBalance: currentBalance,
            updatedAt: new Date()
          })
          .where(eq(users.walletAddress, user.walletAddress));
        
        console.log(`Updated voting power for ${user.walletAddress}: ${newTotalPower} (balance: ${currentBalance})`);
      } catch (error) {
        console.error(`Failed to update voting power for ${user.walletAddress}:`, error);
      }
    }
    
    console.log("Finished resetting all users' voting power");
  }

  // Reset all users' voting power for new contest
  async resetAllVotingPowerForNewContest(): Promise<void> {
    if (!this.db) throw new Error("Database not available");
    
    console.log("Resetting all users' voting power for new contest...");
    
    const allUsers = await this.db.select().from(users);
    
    for (const user of allUsers) {
      try {
        // Get current SAMU balance from API
        const response = await fetch(`http://localhost:5000/api/samu-balance/${user.walletAddress}`);
        const data = await response.json();
        const currentBalance = data.balance || 0;
        
        // Calculate new voting power
        const newTotalPower = this.calculateTotalPower(currentBalance);
        
        // Update user with new voting power and reset used power
        await this.db
          .update(users)
          .set({
            totalVotingPower: newTotalPower,
            usedVotingPower: 0, // Reset used power for new contest
            samuBalance: currentBalance,
            updatedAt: new Date()
          })
          .where(eq(users.walletAddress, user.walletAddress));
        
        console.log(`Updated voting power for ${user.walletAddress}: ${newTotalPower} (balance: ${currentBalance})`);
      } catch (error) {
        console.error(`Failed to update voting power for ${user.walletAddress}:`, error);
      }
    }
    
    console.log("Finished resetting all users' voting power");
  }
}

export const votingPowerManager = new VotingPowerManager();
export type { VotingPowerData };