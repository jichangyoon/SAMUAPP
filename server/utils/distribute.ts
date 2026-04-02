import { storage } from "../storage";
import { config } from "../config";
import { isContractEnabled, initializePool, depositProfit } from "./solana";
import { logger } from "./logger";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export async function distributeEscrowProfit(escrowDeposit: any) {
  const profitSol = escrowDeposit.profitSol;
  if (!profitSol || profitSol <= 0) return;

  const contestId = escrowDeposit.contestId;
  if (!contestId) return;

  const existing = await storage.getGoodsRevenueDistributionByOrderId(escrowDeposit.orderId);
  if (existing) {
    logger.warn(`[distributeEscrowProfit] Order ${escrowDeposit.orderId} already has a distribution (id=${existing.id}), skipping.`);
    return;
  }

  const creatorPool = profitSol * config.REVENUE_SHARES.CREATOR;
  const voterPoolAmount = profitSol * config.REVENUE_SHARES.VOTERS;
  const platformAmount = profitSol * config.REVENUE_SHARES.PLATFORM;

  const memeVoteSummary = await storage.getMemeVoteSummary(contestId);
  const totalVotesReceived = memeVoteSummary.reduce((sum, m) => sum + m.totalSamuReceived, 0);

  const creatorShares: { wallet: string; amount: number; memeId: number; votePercent: number }[] = [];

  if (totalVotesReceived > 0 && memeVoteSummary.length > 0) {
    for (const meme of memeVoteSummary) {
      const votePercent = meme.totalSamuReceived / totalVotesReceived;
      const creatorAmount = creatorPool * votePercent;
      if (creatorAmount > 0) {
        creatorShares.push({
          wallet: meme.authorWallet,
          amount: creatorAmount,
          memeId: meme.memeId,
          votePercent: votePercent * 100,
        });
      }
    }
  } else {
    creatorShares.push({
      wallet: config.TREASURY_WALLET,
      amount: creatorPool,
      memeId: 0,
      votePercent: 100,
    });
  }

  const dist = await storage.createGoodsRevenueDistribution({
    orderId: escrowDeposit.orderId,
    contestId,
    totalSolAmount: profitSol,
    creatorAmount: creatorPool,
    voterPoolAmount,
    platformAmount,
    status: "distributed_from_escrow",
  });

  try {
    await storage.createCreatorRewardDistributions(
      creatorShares.map(cs => ({
        distributionId: dist.id,
        contestId,
        orderId: escrowDeposit.orderId,
        creatorWallet: cs.wallet,
        memeId: cs.memeId,
        solAmount: cs.amount,
        voteSharePercent: cs.votePercent,
      }))
    );

    if (voterPoolAmount > 0) {
      const voterSummary = await storage.getContestVoteSummary(contestId);
      const totalVoterSamu = voterSummary.reduce((s, v) => s + v.totalSamuAmount, 0);
      if (totalVoterSamu > 0 && voterSummary.length > 0) {
        const voterDistRows = voterSummary
          .filter(v => v.totalSamuAmount > 0)
          .map(v => {
            const sharePercent = (v.totalSamuAmount / totalVoterSamu) * 100;
            return {
              distributionId: dist.id,
              contestId,
              orderId: escrowDeposit.orderId,
              voterWallet: v.voterWallet,
              solAmount: voterPoolAmount * (v.totalSamuAmount / totalVoterSamu),
              voteSharePercent: sharePercent,
            };
          });
        await storage.createVoterRewardDistributions(voterDistRows);
      } else {
        logger.warn(`[distributeEscrowProfit] contest=${contestId} has no voters — voter pool (${voterPoolAmount.toFixed(6)} SOL) redirected to Treasury`);
        await storage.createVoterRewardDistributions([{
          distributionId: dist.id,
          contestId,
          orderId: escrowDeposit.orderId,
          voterWallet: config.TREASURY_WALLET,
          solAmount: voterPoolAmount,
          voteSharePercent: 100,
        }]);
      }
    }

    await storage.updateEscrowStatus(escrowDeposit.id, "distributed", new Date());
  } catch (err) {
    logger.error(`[distributeEscrowProfit] Failed after creating distribution ${dist.id}, attempting rollback:`, err);
    try {
      await storage.deleteGoodsRevenueDistribution(dist.id);
      logger.warn(`[distributeEscrowProfit] Rolled back distribution ${dist.id} for order ${escrowDeposit.orderId}`);
    } catch (rollbackErr) {
      logger.error(`[distributeEscrowProfit] Rollback also failed for distribution ${dist.id}:`, rollbackErr);
    }
    throw err;
  }

  logger.info(`Escrow profit distributed for order ${escrowDeposit.orderId}: Total profit=${profitSol.toFixed(6)} SOL`);
  logger.info(`  Creators (${creatorShares.length}): ${creatorShares.map(c => `${c.wallet.slice(0,8)}...(${c.votePercent.toFixed(1)}%)=${c.amount.toFixed(6)} SOL`).join(', ')}`);
  logger.info(`  Voters pool: ${voterPoolAmount.toFixed(6)} SOL, Platform: ${platformAmount.toFixed(6)} SOL`);

  if (isContractEnabled()) {
    try {
      const allocationList: { wallet: string; role: "Creator" | "Voter" | "Platform"; lamports: number }[] = [];

      for (const cs of creatorShares) {
        if (cs.amount > 0) {
          allocationList.push({
            wallet: cs.wallet,
            role: "Creator",
            lamports: Math.round(cs.amount * LAMPORTS_PER_SOL),
          });
        }
      }

      if (voterPoolAmount > 0) {
        const voterSummary = await storage.getContestVoteSummary(contestId);
        const totalVoterSamu = voterSummary.reduce((s, v) => s + v.totalSamuAmount, 0);
        if (totalVoterSamu > 0) {
          for (const vb of voterSummary) {
            const share = vb.totalSamuAmount / totalVoterSamu;
            const lamports = Math.round(voterPoolAmount * share * LAMPORTS_PER_SOL);
            if (lamports > 0) {
              allocationList.push({ wallet: vb.voterWallet, role: "Voter", lamports });
            }
          }
        }
      }

      if (platformAmount > 0) {
        allocationList.push({
          wallet: config.TREASURY_WALLET,
          role: "Platform",
          lamports: Math.round(platformAmount * LAMPORTS_PER_SOL),
        });
      }

      if (allocationList.length > 0) {
        const totalLamports = allocationList.reduce((s, a) => s + a.lamports, 0);
        const creatorTotal = allocationList.filter(a => a.role === "Creator").reduce((s, a) => s + a.lamports, 0);
        const voterTotal = allocationList.filter(a => a.role === "Voter").reduce((s, a) => s + a.lamports, 0);
        const platformTotal = allocationList.filter(a => a.role === "Platform").reduce((s, a) => s + a.lamports, 0);

        await initializePool(contestId);

        const depositTx = await depositProfit(contestId, totalLamports, creatorTotal, voterTotal, platformTotal);
        if (depositTx) {
          logger.info(`[contract] depositProfit TX: ${depositTx}`);
          logger.info(`[contract] depositProfit complete. allocation_record는 claim 시 유저가 직접 생성.`);
        }
      }
    } catch (contractErr: any) {
      logger.error("[contract] on-chain deposit/record failed (DB distribution already complete):", contractErr?.message);
    }
  }

  return { creatorShares, voterPoolAmount, platformAmount };
}
