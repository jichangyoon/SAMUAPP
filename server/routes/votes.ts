
import { Router } from "express";
import { storage } from "../storage";
import { insertVoteSchema } from "@shared/schema";
import { votingPowerManager } from "../voting-power";

const router = Router();

// Vote on a meme
router.post("/:id/vote", async (req, res) => {
  try {
    const memeId = parseInt(req.params.id);
    const { voterWallet, votingPower } = req.body;

    const voteData = insertVoteSchema.parse({
      memeId,
      voterWallet,
      votingPower
    });

    // Check if user already voted
    const hasVoted = await storage.hasUserVoted(memeId, voterWallet);
    if (hasVoted) {
      return res.status(400).json({ message: "You have already voted on this meme" });
    }

    const vote = await storage.createVote(voteData);
    
    // Update voting power - deduct 1 voting power for each vote
    const powerUsed = votingPowerManager.useVotingPower(voterWallet, 1);
    if (!powerUsed) {
      console.error('Failed to deduct voting power for wallet:', voterWallet);
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
