import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export const REVENUE_SHARES = {
  CREATOR: 0.45,
  VOTERS: 0.40,
  PLATFORM: 0.15,
} as const;

export interface RewardSplit {
  creatorPool: number;
  voterPool: number;
  platformAmount: number;
}

export interface CreatorShare {
  wallet: string;
  memeId: number;
  amount: number;
  votePercent: number;
}

export interface MemeSummary {
  memeId: number;
  authorWallet: string;
  totalSamuReceived: number;
}

/**
 * Splits profit SOL into creator / voter / platform pools.
 */
export function calculateRewardSplit(profitSol: number): RewardSplit {
  return {
    creatorPool: profitSol * REVENUE_SHARES.CREATOR,
    voterPool: profitSol * REVENUE_SHARES.VOTERS,
    platformAmount: profitSol * REVENUE_SHARES.PLATFORM,
  };
}

/**
 * Calculates individual creator shares based on vote proportions.
 * Falls back to treasury wallet when no votes exist.
 */
export function calculateCreatorShares(
  creatorPool: number,
  memes: MemeSummary[],
  treasuryWallet: string
): CreatorShare[] {
  const totalVotes = memes.reduce((sum, m) => sum + m.totalSamuReceived, 0);

  if (totalVotes === 0 || memes.length === 0) {
    return [{ wallet: treasuryWallet, memeId: 0, amount: creatorPool, votePercent: 100 }];
  }

  return memes
    .map((meme) => {
      const votePercent = meme.totalSamuReceived / totalVotes;
      return {
        wallet: meme.authorWallet,
        memeId: meme.memeId,
        amount: creatorPool * votePercent,
        votePercent: votePercent * 100,
      };
    })
    .filter((s) => s.amount > 0);
}

/**
 * Converts SOL amounts to lamports (integer, rounded).
 */
export function solToLamports(sol: number): number {
  return Math.round(sol * LAMPORTS_PER_SOL);
}

/**
 * Validates that reward split ratios sum to ~1.0 (within floating point tolerance).
 */
export function validateRewardSplit(split: RewardSplit, profitSol: number): boolean {
  const total = split.creatorPool + split.voterPool + split.platformAmount;
  return Math.abs(total - profitSol) < 0.000001;
}
