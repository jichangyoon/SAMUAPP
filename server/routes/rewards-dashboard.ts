import { Router } from "express";
import { storage } from "../storage";
import { config } from "../config";

const router = Router();

router.get("/dashboard", async (_req, res) => {
  try {
    const distributions = await storage.getGoodsRevenueDistributions();
    const allOrders = await storage.getAllOrders();

    const confirmedOrders = allOrders.filter(o => o.status === "confirmed" && o.solAmount);

    const totalSalesSol = confirmedOrders.reduce((sum, o) => sum + (o.solAmount || 0), 0);
    const totalOrders = confirmedOrders.length;

    const totalDistributed = distributions.reduce((sum, d) => sum + d.totalSolAmount, 0);
    const creatorTotal = distributions.reduce((sum, d) => sum + d.creatorAmount, 0);
    const voterTotal = distributions.reduce((sum, d) => sum + d.voterPoolAmount, 0);

    const platformTotal = distributions.reduce((sum, d) => sum + d.platformAmount, 0);

    res.json({
      summary: {
        totalSalesSol,
        totalOrders,
        totalDistributed,
      },
      shareBreakdown: {
        creator: { percent: config.REVENUE_SHARES.CREATOR * 100, totalSol: creatorTotal },
        voter: { percent: config.REVENUE_SHARES.VOTERS * 100, totalSol: voterTotal },
        platform: { percent: config.REVENUE_SHARES.PLATFORM * 100, totalSol: platformTotal, wallet: config.TREASURY_WALLET },
      },
      recentDistributions: distributions.slice(0, 20),
      shareRatios: {
        creator: config.REVENUE_SHARES.CREATOR,
        voter: config.REVENUE_SHARES.VOTERS,
        platform: config.REVENUE_SHARES.PLATFORM,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const walletAddress = req.query.wallet as string | undefined;

    const [allOrders, distributions, allEscrow, allGoods, allMemes] = await Promise.all([
      storage.getAllOrders(),
      storage.getGoodsRevenueDistributions(),
      storage.getAllEscrowDeposits(),
      storage.getGoods(),
      storage.getAllMemes(),
    ]);

    const distributionByOrderId = new Map<number, any>();
    distributions.forEach(d => distributionByOrderId.set(d.orderId, d));

    const escrowByOrderId = new Map<number, any>();
    allEscrow.forEach(e => escrowByOrderId.set(e.orderId, e));

    const goodsMap = new Map<number, any>();
    allGoods.forEach(g => goodsMap.set(g.id, g));

    const memeContestMap = new Map<number, number | null>();
    allMemes.forEach(m => memeContestMap.set(m.id, m.contestId));

    let userCreatedContests = new Set<number>();
    let userVotedContests = new Set<number>();
    let userVoteShareByContest = new Map<number, number>();
    let creatorDistByOrder = new Map<number, number>();

    if (walletAddress) {
      for (const m of allMemes) {
        if (m.authorWallet === walletAddress && m.contestId != null) {
          userCreatedContests.add(m.contestId);
        }
      }

      const userVotes = await storage.getUserVotes(walletAddress);
      const userSamuByContest = new Map<number, number>();
      const totalSamuByContest = new Map<number, number>();

      if (userVotes.length > 0) {
        for (const vote of userVotes) {
          const contestId = memeContestMap.get(vote.memeId);
          if (contestId != null) {
            userVotedContests.add(contestId);
            userSamuByContest.set(contestId, (userSamuByContest.get(contestId) || 0) + (vote.samuAmount || 0));
          }
        }

        const contestIds = Array.from(userVotedContests);
        const contestVotes = await storage.getVotesByContestIds(contestIds);
        for (const vote of contestVotes) {
          const contestId = memeContestMap.get(vote.memeId);
          if (contestId != null) {
            totalSamuByContest.set(contestId, (totalSamuByContest.get(contestId) || 0) + (vote.samuAmount || 0));
          }
        }

        for (const contestId of contestIds) {
          const userTotal = userSamuByContest.get(contestId) || 0;
          const total = totalSamuByContest.get(contestId) || 0;
          if (total > 0) userVoteShareByContest.set(contestId, userTotal / total);
        }
      }

      const creatorDists = await storage.getCreatorRewardDistributionsByWallet(walletAddress);
      for (const cd of creatorDists) {
        creatorDistByOrder.set(cd.orderId, (creatorDistByOrder.get(cd.orderId) || 0) + cd.solAmount);
      }
    }

    const ordersWithData = allOrders
      .filter(o => o.shippingCountry)
      .map(o => {
        const dist = distributionByOrderId.get(o.id);
        const escrow = escrowByOrderId.get(o.id);
        const good = goodsMap.get(o.goodsId);
        const contestId = dist?.contestId || good?.contestId || escrow?.contestId || null;

        let myEstimatedRevenue = 0;
        let revenueStatus: string | null = null;
        let hasRevenue = false;

        if (walletAddress && dist) {
          const myCreatorEarning = creatorDistByOrder.get(o.id) || 0;
          const isCreator = myCreatorEarning > 0;
          const isVoter = contestId != null && userVotedContests.has(contestId);
          if (isCreator || isVoter) {
            hasRevenue = true;
            revenueStatus = "distributed";
            if (isCreator) myEstimatedRevenue += myCreatorEarning;
            if (isVoter && contestId != null) {
              myEstimatedRevenue += (dist.voterPoolAmount || 0) * (userVoteShareByContest.get(contestId) || 0);
            }
          }
        } else if (walletAddress && escrow && !dist) {
          const isCreator = contestId != null && userCreatedContests.has(contestId);
          const isVoter = contestId != null && userVotedContests.has(contestId);
          if (isCreator || isVoter) {
            hasRevenue = true;
            revenueStatus = escrow.status === "locked" ? "locked" : escrow.status;
            const profitSol = escrow.profitSol || 0;
            if (isCreator) {
              const contestMemes = allMemes.filter(m => m.contestId === contestId);
              const totalVotes = contestMemes.reduce((sum: number, m: any) => sum + (m.votes || 0), 0);
              const myVotes = contestMemes.filter(m => m.authorWallet === walletAddress).reduce((sum: number, m: any) => sum + (m.votes || 0), 0);
              myEstimatedRevenue += (profitSol * 0.45) * (totalVotes > 0 ? myVotes / totalVotes : 0);
            }
            if (isVoter && contestId != null) {
              myEstimatedRevenue += (profitSol * 0.40) * (userVoteShareByContest.get(contestId) || 0);
            }
          }
        }

        return {
          id: o.id,
          country: o.shippingCountry,
          city: o.shippingCity,
          status: o.printfulStatus || o.status,
          trackingUrl: o.trackingUrl,
          trackingNumber: o.trackingNumber,
          goodsTitle: good?.title || "SAMU Goods",
          createdAt: o.createdAt,
          solAmount: o.solAmount,
          contestId,
          hasRevenue,
          myEstimatedRevenue,
          revenueStatus,
          escrowAmount: escrow?.profitSol || 0,
          escrowStatus: escrow?.status || null,
          distribution: dist ? {
            creatorAmount: dist.creatorAmount,
            voterPoolAmount: dist.voterPoolAmount,
            platformAmount: dist.platformAmount,
            totalSolAmount: dist.totalSolAmount,
          } : null,
        };
      });

    const myClaimableOrders = walletAddress ? ordersWithData.filter(o => o.hasRevenue && o.revenueStatus === "distributed") : [];
    const myEscrowOrders = walletAddress ? ordersWithData.filter(o => o.hasRevenue && o.revenueStatus === "locked") : [];
    const totalClaimableOrders = ordersWithData.filter(o => o.distribution);
    const totalEscrowOrders = ordersWithData.filter(o => o.escrowStatus === "locked");

    res.json({
      my: {
        claimable: myClaimableOrders.reduce((s, o) => s + o.myEstimatedRevenue, 0),
        escrow: myEscrowOrders.reduce((s, o) => s + o.myEstimatedRevenue, 0),
        claimableOrders: myClaimableOrders,
        escrowOrders: myEscrowOrders,
      },
      total: {
        claimable: totalClaimableOrders.reduce((s, o) => s + ((o.distribution?.creatorAmount || 0) + (o.distribution?.voterPoolAmount || 0)), 0),
        escrow: totalEscrowOrders.reduce((s, o) => s + o.escrowAmount, 0),
        claimableOrders: totalClaimableOrders,
        escrowOrders: totalEscrowOrders,
      },
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
    const distributions = await storage.getGoodsRevenueDistributions();

    const distributionByOrderId = new Map<number, any>();
    distributions.forEach(d => distributionByOrderId.set(d.orderId, d));

    const allGoods = await storage.getGoods();
    const goodsMap = new Map<number, any>();
    allGoods.forEach(g => goodsMap.set(g.id, g));

    const allEscrow = await storage.getAllEscrowDeposits();
    const escrowByOrderId = new Map<number, any>();
    allEscrow.forEach(e => escrowByOrderId.set(e.orderId, e));

    let creatorDistByOrder = new Map<number, number>();
    if (walletAddress) {
      const creatorDists = await storage.getCreatorRewardDistributionsByWallet(walletAddress);
      for (const cd of creatorDists) {
        creatorDistByOrder.set(cd.orderId, (creatorDistByOrder.get(cd.orderId) || 0) + cd.solAmount);
      }
    }

    const allMemes = await storage.getMemes();
    const memeContestMap = new Map<number, number | null>();
    const memeAuthorMap = new Map<number, string>();
    allMemes.forEach(m => {
      memeContestMap.set(m.id, m.contestId);
      memeAuthorMap.set(m.id, m.authorWallet);
    });

    const userCreatedContests = new Set<number>();
    let userVotedContests = new Set<number>();
    let userVoteShareByContest = new Map<number, number>();
    let userSamuByContest = new Map<number, number>();
    let totalSamuByContest = new Map<number, number>();
    if (walletAddress) {
      for (const m of allMemes) {
        if (m.authorWallet === walletAddress && m.contestId != null) {
          userCreatedContests.add(m.contestId);
        }
      }

      const userVotes = await storage.getUserVotes(walletAddress);
      if (userVotes.length > 0) {
        for (const vote of userVotes) {
          const contestId = memeContestMap.get(vote.memeId);
          if (contestId != null) {
            userVotedContests.add(contestId);
            userSamuByContest.set(contestId, (userSamuByContest.get(contestId) || 0) + (vote.samuAmount || 0));
          }
        }

        const contestIds = Array.from(userVotedContests);
        const contestVotes = await storage.getVotesByContestIds(contestIds);
        for (const vote of contestVotes) {
          const contestId = memeContestMap.get(vote.memeId);
          if (contestId != null) {
            totalSamuByContest.set(contestId, (totalSamuByContest.get(contestId) || 0) + (vote.samuAmount || 0));
          }
        }

        for (const contestId of contestIds) {
          const userTotal = userSamuByContest.get(contestId) || 0;
          const total = totalSamuByContest.get(contestId) || 0;
          if (total > 0) {
            userVoteShareByContest.set(contestId, userTotal / total);
          }
        }
      }
    }

    const mapOrders = allOrders
      .filter(o => o.shippingCountry)
      .map(o => {
        const dist = distributionByOrderId.get(o.id);
        const good = goodsMap.get(o.goodsId);
        const escrow = escrowByOrderId.get(o.id);

        let hasRevenue = false;
        let revenueRole: string | null = null;
        let myEstimatedRevenue: number | null = null;
        let revenueStatus: string | null = null;

        const contestId = dist?.contestId || good?.contestId || escrow?.contestId || null;

        if (walletAddress && dist) {
          const myCreatorEarning = creatorDistByOrder.get(o.id) || 0;
          const isCreator = myCreatorEarning > 0;
          const isVoter = contestId != null && userVotedContests.has(contestId);

          if (isCreator || isVoter) {
            hasRevenue = true;
            revenueStatus = "distributed";
            let estimated = 0;

            if (isCreator) {
              estimated += myCreatorEarning;
            }

            if (isVoter && contestId != null) {
              const voteShare = userVoteShareByContest.get(contestId) || 0;
              estimated += dist.voterPoolAmount * voteShare;
            }

            if (isCreator && isVoter) {
              revenueRole = "creator_voter";
            } else if (isCreator) {
              revenueRole = "creator";
            } else {
              revenueRole = "voter";
            }

            myEstimatedRevenue = estimated;
          }
        } else if (walletAddress && escrow && !dist) {
          const isCreator = contestId != null && userCreatedContests.has(contestId);
          const isVoter = contestId != null && userVotedContests.has(contestId);

          if (isCreator || isVoter) {
            hasRevenue = true;
            revenueStatus = escrow.status === "locked" ? "pending" : escrow.status;
            const profitSol = escrow.profitSol || 0;
            let estimated = 0;

            if (isCreator) {
              const creatorPool = profitSol * 0.45;
              const contestMemes = allMemes.filter(m => m.contestId === contestId);
              const totalVotes = contestMemes.reduce((sum: number, m: any) => sum + (m.votes || 0), 0);
              const myMemes = contestMemes.filter(m => m.authorWallet === walletAddress);
              const myVotes = myMemes.reduce((sum: number, m: any) => sum + (m.votes || 0), 0);
              const myShare = totalVotes > 0 ? myVotes / totalVotes : 0;
              estimated += creatorPool * myShare;
            }

            if (isVoter && contestId != null) {
              const voterPool = profitSol * 0.40;
              const voteShare = userVoteShareByContest.get(contestId) || 0;
              estimated += voterPool * voteShare;
            }

            if (isCreator && isVoter) {
              revenueRole = "creator_voter";
            } else if (isCreator) {
              revenueRole = "creator";
            } else {
              revenueRole = "voter";
            }

            myEstimatedRevenue = estimated;
          }
        }

        const isBuyer = !!(walletAddress && o.buyerWallet === walletAddress);
        if (isBuyer) {
          hasRevenue = true;
          if (!revenueRole) revenueRole = "buyer";
        }

        const orderContestId = dist?.contestId || good?.contestId || escrow?.contestId || null;

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
          contestId: orderContestId,
          hasRevenue,
          isBuyer,
          revenueRole,
          revenueStatus,
          myEstimatedRevenue,
          distribution: dist ? {
            creatorAmount: dist.creatorAmount,
            voterPoolAmount: dist.voterPoolAmount,
            platformAmount: dist.platformAmount,
          } : null,
          escrow: escrow ? {
            totalSolPaid: escrow.totalSolPaid,
            costSol: escrow.costSol,
            profitSol: escrow.profitSol,
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
