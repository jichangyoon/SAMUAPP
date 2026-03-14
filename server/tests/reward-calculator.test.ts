import { describe, it, expect } from "vitest";
import {
  calculateRewardSplit,
  calculateCreatorShares,
  solToLamports,
  validateRewardSplit,
  REVENUE_SHARES,
} from "../utils/reward-calculator";

const TREASURY = "4WjMuna7iLjPE897m5fphErUt7AnSdjJTky1hyfZZaJk";

describe("calculateRewardSplit", () => {
  it("splits 1 SOL profit into correct pools (45/40/15)", () => {
    const split = calculateRewardSplit(1.0);
    expect(split.creatorPool).toBeCloseTo(0.45, 6);
    expect(split.voterPool).toBeCloseTo(0.40, 6);
    expect(split.platformAmount).toBeCloseTo(0.15, 6);
  });

  it("splits 0.1 SOL profit correctly", () => {
    const split = calculateRewardSplit(0.1);
    expect(split.creatorPool).toBeCloseTo(0.045, 6);
    expect(split.voterPool).toBeCloseTo(0.040, 6);
    expect(split.platformAmount).toBeCloseTo(0.015, 6);
  });

  it("ratios sum to 100%", () => {
    const total = REVENUE_SHARES.CREATOR + REVENUE_SHARES.VOTERS + REVENUE_SHARES.PLATFORM;
    expect(total).toBeCloseTo(1.0, 10);
  });

  it("returns zero pools for zero profit", () => {
    const split = calculateRewardSplit(0);
    expect(split.creatorPool).toBe(0);
    expect(split.voterPool).toBe(0);
    expect(split.platformAmount).toBe(0);
  });
});

describe("validateRewardSplit", () => {
  it("validates a correct split", () => {
    const profitSol = 2.5;
    const split = calculateRewardSplit(profitSol);
    expect(validateRewardSplit(split, profitSol)).toBe(true);
  });

  it("rejects a tampered split", () => {
    const split = { creatorPool: 0.5, voterPool: 0.5, platformAmount: 0.5 };
    expect(validateRewardSplit(split, 1.0)).toBe(false);
  });
});

describe("calculateCreatorShares", () => {
  it("distributes proportionally based on vote count", () => {
    const memes = [
      { memeId: 1, authorWallet: "walletA", totalSamuReceived: 300 },
      { memeId: 2, authorWallet: "walletB", totalSamuReceived: 700 },
    ];
    const shares = calculateCreatorShares(1.0, memes, TREASURY);

    expect(shares).toHaveLength(2);
    expect(shares[0].wallet).toBe("walletA");
    expect(shares[0].amount).toBeCloseTo(0.3, 6);
    expect(shares[0].votePercent).toBeCloseTo(30, 4);
    expect(shares[1].wallet).toBe("walletB");
    expect(shares[1].amount).toBeCloseTo(0.7, 6);
    expect(shares[1].votePercent).toBeCloseTo(70, 4);
  });

  it("creator amounts sum to creatorPool", () => {
    const memes = [
      { memeId: 1, authorWallet: "walletA", totalSamuReceived: 100 },
      { memeId: 2, authorWallet: "walletB", totalSamuReceived: 200 },
      { memeId: 3, authorWallet: "walletC", totalSamuReceived: 700 },
    ];
    const creatorPool = 0.45;
    const shares = calculateCreatorShares(creatorPool, memes, TREASURY);
    const total = shares.reduce((s, c) => s + c.amount, 0);
    expect(total).toBeCloseTo(creatorPool, 6);
  });

  it("falls back to treasury wallet when no votes exist", () => {
    const shares = calculateCreatorShares(0.45, [], TREASURY);
    expect(shares).toHaveLength(1);
    expect(shares[0].wallet).toBe(TREASURY);
    expect(shares[0].amount).toBe(0.45);
    expect(shares[0].votePercent).toBe(100);
  });

  it("falls back to treasury when all memes have zero votes", () => {
    const memes = [
      { memeId: 1, authorWallet: "walletA", totalSamuReceived: 0 },
    ];
    const shares = calculateCreatorShares(0.45, memes, TREASURY);
    expect(shares[0].wallet).toBe(TREASURY);
  });

  it("gives a single meme 100% of creator pool", () => {
    const memes = [{ memeId: 1, authorWallet: "walletA", totalSamuReceived: 500 }];
    const shares = calculateCreatorShares(0.45, memes, TREASURY);
    expect(shares).toHaveLength(1);
    expect(shares[0].amount).toBeCloseTo(0.45, 6);
    expect(shares[0].votePercent).toBeCloseTo(100, 4);
  });
});

describe("solToLamports", () => {
  it("converts 1 SOL to 1_000_000_000 lamports", () => {
    expect(solToLamports(1)).toBe(1_000_000_000);
  });

  it("converts 0.5 SOL to 500_000_000 lamports", () => {
    expect(solToLamports(0.5)).toBe(500_000_000);
  });

  it("rounds fractional lamports", () => {
    const result = solToLamports(0.000000001);
    expect(Number.isInteger(result)).toBe(true);
  });

  it("converts 0 SOL to 0 lamports", () => {
    expect(solToLamports(0)).toBe(0);
  });
});
