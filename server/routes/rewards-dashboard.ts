import { Router } from "express";
import { storage } from "../storage";

const router = Router();

const SHARE_RATIOS = {
  creator: 0.45,
  voter: 0.40,
  platform: 0.15,
};

const TREASURY_WALLET = "4WjMuna7iLjPE897m5fphErUt7AnSdjJTky1hyfZZaJk";

router.get("/dashboard", async (_req, res) => {
  try {
    const distributions = await storage.getAllGoodsRevenueDistributions();
    const allOrders = await storage.getAllOrders();

    const confirmedOrders = allOrders.filter(o => o.status === "confirmed" && o.solAmount);

    const totalSalesSol = confirmedOrders.reduce((sum, o) => sum + (o.solAmount || 0), 0);
    const totalOrders = confirmedOrders.length;

    const totalDistributed = distributions.reduce((sum, d) => sum + d.totalSolAmount, 0);
    const creatorTotal = distributions.reduce((sum, d) => sum + d.creatorAmount, 0);
    const voterTotal = distributions.reduce((sum, d) => sum + d.voterPoolAmount, 0);

    const platformTotal = distributions.reduce((sum, d) => sum + d.platformAmount, 0);

    const creatorWallets = Array.from(new Set(distributions.map(d => d.creatorWallet)));
    res.json({
      summary: {
        totalSalesSol,
        totalOrders,
        totalDistributed,
      },
      shareBreakdown: {
        creator: { percent: SHARE_RATIOS.creator * 100, totalSol: creatorTotal, wallets: creatorWallets },
        voter: { percent: SHARE_RATIOS.voter * 100, totalSol: voterTotal },
        platform: { percent: SHARE_RATIOS.platform * 100, totalSol: platformTotal, wallet: TREASURY_WALLET },
      },
      recentDistributions: distributions.slice(0, 20),
      shareRatios: SHARE_RATIOS,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/voter-pool/:contestId", async (req, res) => {
  try {
    const contestId = parseInt(req.params.contestId);
    if (isNaN(contestId)) return res.status(400).json({ error: "Invalid contest ID" });

    const pool = await storage.getVoterRewardPool(contestId);
    if (!pool) return res.json({ pool: null, voters: [] });

    const voteSummary = await storage.getContestVoteSummary(contestId);
    const totalVotes = voteSummary.reduce((sum, v) => sum + v.totalSamuAmount, 0);

    const voters = voteSummary.map(v => ({
      wallet: v.voterWallet,
      samuAmount: v.totalSamuAmount,
      sharePercent: totalVotes > 0 ? (v.totalSamuAmount / totalVotes) * 100 : 0,
    }));

    res.json({ pool, voters });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/claimable/:contestId/:walletAddress", async (req, res) => {
  try {
    const contestId = parseInt(req.params.contestId);
    const walletAddress = req.params.walletAddress;
    if (isNaN(contestId)) return res.status(400).json({ error: "Invalid contest ID" });

    const result = await storage.getClaimableAmount(contestId, walletAddress);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/claim/:contestId", async (req, res) => {
  try {
    const contestId = parseInt(req.params.contestId);
    const { walletAddress } = req.body;
    if (isNaN(contestId)) return res.status(400).json({ error: "Invalid contest ID" });
    if (!walletAddress) return res.status(400).json({ error: "walletAddress is required" });

    const result = await storage.claimVoterReward(contestId, walletAddress);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/my-claims/:walletAddress", async (req, res) => {
  try {
    const walletAddress = req.params.walletAddress;
    const claims = await storage.getVoterClaimsByWallet(walletAddress);

    const claimsWithPoolInfo = await Promise.all(
      claims.map(async (claim) => {
        const pool = await storage.getVoterRewardPool(claim.contestId);
        const currentRPS = pool?.rewardPerShare || 0;
        const unclaimed = (currentRPS - claim.lastClaimedRewardPerShare) * claim.sharePercent;
        return {
          ...claim,
          pendingAmount: Math.max(0, unclaimed),
        };
      })
    );

    res.json(claimsWithPoolInfo);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/map", async (req, res) => {
  try {
    const walletAddress = req.query.wallet as string | undefined;
    const allOrders = await storage.getAllOrders();
    const distributions = await storage.getAllGoodsRevenueDistributions();

    const distributionByOrderId = new Map<number, any>();
    distributions.forEach(d => distributionByOrderId.set(d.orderId, d));

    const allGoods = await storage.getGoods();
    const goodsMap = new Map<number, any>();
    allGoods.forEach(g => goodsMap.set(g.id, g));

    const mapOrders = allOrders
      .filter(o => o.shippingCountry)
      .map(o => {
        const dist = distributionByOrderId.get(o.id);
        const good = goodsMap.get(o.goodsId);

        let hasRevenue = false;
        if (walletAddress && dist) {
          if (dist.creatorWallet === walletAddress) {
            hasRevenue = true;
          }
        }

        return {
          id: o.id,
          city: o.shippingCity,
          country: o.shippingCountry,
          lat: o.shippingLat,
          lng: o.shippingLng,
          status: o.printfulStatus || o.status,
          trackingNumber: o.trackingNumber,
          trackingUrl: o.trackingUrl,
          solAmount: o.solAmount,
          totalPrice: o.totalPrice,
          goodsTitle: good?.title || "SAMU Goods",
          goodsImage: good?.imageUrl,
          productType: good?.productType,
          createdAt: o.createdAt,
          hasRevenue,
          distribution: dist ? {
            creatorAmount: dist.creatorAmount,
            voterPoolAmount: dist.voterPoolAmount,
            platformAmount: dist.platformAmount,
          } : null,
        };
      });

    res.json({
      orders: mapOrders,
      stats: {
        total: mapOrders.length,
        shipped: mapOrders.filter(o => o.status === "shipped" || o.status === "in_transit").length,
        delivered: mapOrders.filter(o => o.status === "delivered").length,
        countries: Array.from(new Set(mapOrders.map(o => o.country))).length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
