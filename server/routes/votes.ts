
import { Router } from "express";
import { storage } from "../storage";
import { insertVoteSchema } from "@shared/schema";

const router = Router();

router.post("/:id/vote", async (req, res) => {
  try {
    const memeId = parseInt(req.params.id);
    const { voterWallet, samuAmount, txSignature } = req.body;

    if (!samuAmount || samuAmount <= 0) {
      return res.status(400).json({ message: "SAMU amount must be greater than 0" });
    }

    if (!txSignature) {
      return res.status(400).json({ message: "Transaction signature is required" });
    }

    const voteData = insertVoteSchema.parse({
      memeId,
      voterWallet,
      samuAmount,
      txSignature
    });

    const vote = await storage.createVote(voteData);
    const updatedMeme = await storage.getMemeById(memeId);
    
    res.json({ vote, meme: updatedMeme });
  } catch (error) {
    console.error('Error voting:', error);
    res.status(400).json({ message: "Failed to vote" });
  }
});

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
