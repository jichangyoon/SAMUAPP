import { Router } from "express";
import { storage } from "../storage";
import { insertRevenueSchema } from "@shared/schema";
import { config } from "../config";

const router = Router();

const REVENUE_SHARES = {
  CREATOR: 0.30,
  VOTERS: 0.30,
  NFT_HOLDER: 0.25,
  PLATFORM: 0.15,
};

const PLATFORM_WALLET = process.env.TREASURY_WALLET_ADDRESS || "4WjMuna7iLjPE897m5fphErUt7AnSdjJTky1hyfZZaJk";
const NFT_HOLDER_UNASSIGNED = "unassigned_nft_holder";

async function requireAdmin(req: any, res: any): Promise<boolean> {
  const email = req.headers["x-admin-email"] || req.body?.adminEmail;
  if (!email || !config.ADMIN_EMAILS.includes(String(email).toLowerCase())) {
    res.status(403).json({ message: "Admin access required" });
    return false;
  }
  return true;
}

router.post("/", async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const { contestId, source, description, totalAmountSol } = req.body;

    if (!contestId || !source || !totalAmountSol || totalAmountSol <= 0) {
      return res.status(400).json({ message: "Contest ID, source, and valid SOL amount are required" });
    }

    const revenueData = insertRevenueSchema.parse({
      contestId,
      source,
      description,
      totalAmountSol,
      status: "pending",
    });

    const revenue = await storage.createRevenue(revenueData);
    res.json(revenue);
  } catch (error: any) {
    console.error("Error creating revenue:", error);
    res.status(500).json({ message: error.message || "Failed to create revenue" });
  }
});

router.post("/:id/distribute", async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const revenueId = parseInt(req.params.id);
    const revenue = await storage.getRevenueById(revenueId);

    if (!revenue) {
      return res.status(404).json({ message: "Revenue not found" });
    }

    if (revenue.status === "distributed") {
      return res.status(400).json({ message: "Revenue already distributed" });
    }

    const contestId = revenue.contestId;
    const totalSol = revenue.totalAmountSol;

    const archivedContests = await (storage as any).getArchivedContests();
    const archived = archivedContests.find(
      (ac: any) => ac.originalContestId === contestId
    );

    const shares: any[] = [];

    if (archived?.winnerMemeId) {
      const contestMemes = await storage.getMemesByContestId(contestId);
      const winnerMeme = contestMemes.find(m => m.id === archived.winnerMemeId);
      if (winnerMeme) {
        shares.push({
          revenueId,
          contestId,
          walletAddress: winnerMeme.authorWallet,
          role: "creator",
          sharePercent: REVENUE_SHARES.CREATOR * 100,
          amountSol: totalSol * REVENUE_SHARES.CREATOR,
          status: "pending",
        });
      }
    } else {
      const contestMemes = await storage.getMemesByContestId(contestId);
      const topMeme = contestMemes.sort((a, b) => (b.votes || 0) - (a.votes || 0))[0];
      if (topMeme) {
        shares.push({
          revenueId,
          contestId,
          walletAddress: topMeme.authorWallet,
          role: "creator",
          sharePercent: REVENUE_SHARES.CREATOR * 100,
          amountSol: totalSol * REVENUE_SHARES.CREATOR,
          status: "pending",
        });
      }
    }

    const voteSummary = await storage.getContestVoteSummary(contestId);
    const totalVotedSamu = voteSummary.reduce((sum, v) => sum + v.totalSamuAmount, 0);

    if (totalVotedSamu > 0) {
      const voterPool = totalSol * REVENUE_SHARES.VOTERS;
      for (const voter of voteSummary) {
        const voterShare = voter.totalSamuAmount / totalVotedSamu;
        shares.push({
          revenueId,
          contestId,
          walletAddress: voter.voterWallet,
          role: "voter",
          sharePercent: voterShare * REVENUE_SHARES.VOTERS * 100,
          amountSol: voterPool * voterShare,
          status: "pending",
        });
      }
    }

    const nftHolderWallet = req.body?.nftHolderWallet || NFT_HOLDER_UNASSIGNED;
    shares.push({
      revenueId,
      contestId,
      walletAddress: nftHolderWallet,
      role: "nft_holder",
      sharePercent: REVENUE_SHARES.NFT_HOLDER * 100,
      amountSol: totalSol * REVENUE_SHARES.NFT_HOLDER,
      status: "pending",
    });

    shares.push({
      revenueId,
      contestId,
      walletAddress: PLATFORM_WALLET,
      role: "platform",
      sharePercent: REVENUE_SHARES.PLATFORM * 100,
      amountSol: totalSol * REVENUE_SHARES.PLATFORM,
      status: "pending",
    });

    const createdShares = await storage.createRevenueShares(shares);
    await storage.updateRevenueStatus(revenueId, "distributed", new Date());

    res.json({ revenue: await storage.getRevenueById(revenueId), shares: createdShares });
  } catch (error: any) {
    console.error("Error distributing revenue:", error);
    res.status(500).json({ message: error.message || "Failed to distribute revenue" });
  }
});

router.get("/contest/:contestId", async (req, res) => {
  try {
    const contestId = parseInt(req.params.contestId);
    const revenueList = await storage.getRevenuesByContestId(contestId);
    const allShares = await storage.getRevenueSharesByContestId(contestId);

    const voteSummary = await storage.getContestVoteSummary(contestId);
    const totalVotedSamu = voteSummary.reduce((sum, v) => sum + v.totalSamuAmount, 0);

    const voterBreakdown = voteSummary.map(v => ({
      wallet: v.voterWallet,
      samuVoted: v.totalSamuAmount,
      votePercent: totalVotedSamu > 0 ? (v.totalSamuAmount / totalVotedSamu) * 100 : 0,
    }));

    res.json({
      revenues: revenueList,
      shares: allShares,
      voteSummary: {
        totalVoters: voteSummary.length,
        totalSamuVoted: totalVotedSamu,
        voterBreakdown,
      },
      shareConfig: REVENUE_SHARES,
    });
  } catch (error: any) {
    console.error("Error fetching contest revenue:", error);
    res.status(500).json({ message: error.message || "Failed to fetch revenue data" });
  }
});

router.get("/contest/:contestId/my-share/:wallet", async (req, res) => {
  try {
    const contestId = parseInt(req.params.contestId);
    const wallet = req.params.wallet;

    const voteSummary = await storage.getContestVoteSummary(contestId);
    const totalVotedSamu = voteSummary.reduce((sum, v) => sum + v.totalSamuAmount, 0);
    const myVotes = voteSummary.find(v => v.voterWallet === wallet);

    const myShares = await storage.getRevenueSharesByContestId(contestId);
    const myRevenueShares = myShares.filter(s => s.walletAddress === wallet);
    const totalEarnedSol = myRevenueShares.reduce((sum, s) => sum + s.amountSol, 0);

    const contestMemes = await storage.getMemesByContestId(contestId);
    const myMemes = contestMemes.filter(m => m.authorWallet === wallet);
    const isCreator = myMemes.length > 0;

    res.json({
      wallet,
      contestId,
      voting: {
        samuVoted: myVotes?.totalSamuAmount || 0,
        votePercent: totalVotedSamu > 0 && myVotes ? (myVotes.totalSamuAmount / totalVotedSamu) * 100 : 0,
        totalContestSamu: totalVotedSamu,
      },
      isCreator,
      revenueShares: myRevenueShares,
      totalEarnedSol,
      shareConfig: REVENUE_SHARES,
    });
  } catch (error: any) {
    console.error("Error fetching my share:", error);
    res.status(500).json({ message: error.message || "Failed to fetch share data" });
  }
});

router.get("/wallet/:wallet", async (req, res) => {
  try {
    const wallet = req.params.wallet;
    const shares = await storage.getRevenueSharesByWallet(wallet);
    const totalEarnedSol = shares.reduce((sum, s) => sum + s.amountSol, 0);

    res.json({
      wallet,
      shares,
      totalEarnedSol,
    });
  } catch (error: any) {
    console.error("Error fetching wallet revenue:", error);
    res.status(500).json({ message: error.message || "Failed to fetch wallet revenue" });
  }
});

export default router;
