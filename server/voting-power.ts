// Voting power management system
interface VotingPowerData {
  walletAddress: string;
  totalPower: number;
  usedPower: number;
  remainingPower: number;
  lastUpdated: Date;
}

class VotingPowerManager {
  private votingPowerMap: Map<string, VotingPowerData> = new Map();
  
  // Initialize voting power based on SAMU balance
  initializeVotingPower(walletAddress: string, samuBalance: number): VotingPowerData {
    const totalPower = Math.floor(samuBalance * 1.0); // 1:1 ratio for now
    const data: VotingPowerData = {
      walletAddress,
      totalPower,
      usedPower: 0,
      remainingPower: totalPower,
      lastUpdated: new Date()
    };
    
    this.votingPowerMap.set(walletAddress, data);
    return data;
  }
  
  // Get current voting power
  getVotingPower(walletAddress: string): VotingPowerData | null {
    return this.votingPowerMap.get(walletAddress) || null;
  }
  
  // Use voting power when voting
  useVotingPower(walletAddress: string, powerUsed: number): boolean {
    const data = this.votingPowerMap.get(walletAddress);
    if (!data || data.remainingPower < powerUsed) {
      return false;
    }
    
    data.usedPower += powerUsed;
    data.remainingPower -= powerUsed;
    data.lastUpdated = new Date();
    
    return true;
  }
  
  // Reset voting power (contest end)
  resetVotingPower(walletAddress: string, newSamuBalance: number): VotingPowerData {
    return this.initializeVotingPower(walletAddress, newSamuBalance);
  }
  
  // Get all voting power data for admin
  getAllVotingPower(): VotingPowerData[] {
    return Array.from(this.votingPowerMap.values());
  }
}

export const votingPowerManager = new VotingPowerManager();
export type { VotingPowerData };