
import { Router } from "express";
import { storage } from "../storage";
import { insertVoteSchema } from "@shared/schema";
import { votingPowerManager } from "../voting-power";

const router = Router();

// Vote on a meme
router.post("/:id/vote", async (req, res) => {
  try {
    const memeId = parseInt(req.params.id);
    const { voterWallet, votingPower, powerUsed } = req.body;

    // 투표력 검증
    if (!powerUsed || powerUsed < 1) {
      return res.status(400).json({ message: "Power used must be at least 1" });
    }

    // 현재 투표력 확인
    const votingPowerData = await votingPowerManager.getVotingPower(voterWallet);
    if (!votingPowerData || votingPowerData.remainingPower < powerUsed) {
      return res.status(400).json({ message: "Insufficient voting power" });
    }

    const voteData = insertVoteSchema.parse({
      memeId,
      voterWallet,
      votingPower,
      powerUsed
    });

    const vote = await storage.createVote(voteData);
    
    // Update voting power - deduct the actual power used
    const powerDeducted = await votingPowerManager.useVotingPower(voterWallet, powerUsed);
    if (!powerDeducted) {
      console.error('Failed to deduct voting power for wallet:', voterWallet);
      return res.status(500).json({ message: "Failed to update voting power" });
    }
    
    const updatedMeme = await storage.getMemeById(memeId);
    
    res.json({ vote, meme: updatedMeme });
  } catch (error) {
    console.error('Error voting:', error);
    res.status(400).json({ message: "Failed to vote" });
  }
});

// Check if user has voted on a meme
router.get("/:id/voted/:wallet", async (req, res) => {
  try {
    const memeId = parseInt(req.params.id);
    const voterWallet = req.params.wallet;
    
    const hasVoted = await storage.hasUserVoted(memeId, voterWallet);
    res.json({ hasVoted });
  } catch (error) {
    res.status(500).json({ message: "Failed to check vote status" });
  }
});

export { router as votesRouter };
