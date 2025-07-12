import { Router } from "express";
import { storage } from "../storage";
import { insertUserSchema } from "@shared/schema";

const router = Router();

// Get or create user profile - with cache headers
router.get("/profile/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    // Set cache headers for better performance
    res.set('Cache-Control', 'public, max-age=60'); // 1분 브라우저 캐시
    
    let user = await storage.getUserByWallet(walletAddress);
    
    // If user doesn't exist, create basic profile
    if (!user) {
      const userData = {
        walletAddress,
        username: walletAddress.slice(0, 8) + '...' + walletAddress.slice(-4),
        samuBalance: 0,
        totalVotingPower: 0
      };
      
      user = await storage.createUser(userData);
    }
    
    res.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Failed to fetch user profile" });
  }
});

// Update user profile
router.put("/profile/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { displayName, avatarUrl, ...otherData } = req.body;
    
    // Check if display name is already taken by another user
    if (displayName) {
      const existingUser = await storage.getUserByDisplayName(displayName);
      if (existingUser && existingUser.walletAddress !== walletAddress) {
        return res.status(400).json({ 
          message: "Display name is already taken",
          error: "DISPLAY_NAME_TAKEN"
        });
      }
    }
    
    const updateData: any = {};
    if (displayName) updateData.displayName = displayName;
    if (avatarUrl) updateData.avatarUrl = avatarUrl;
    
    const user = await storage.updateUser(walletAddress, updateData);
    res.json(user);
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(400).json({ message: "Failed to update user profile", error: error.message });
  }
});

// Get user's memes
router.get("/:walletAddress/memes", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const memes = await storage.getUserMemes(walletAddress);
    res.json(memes);
  } catch (error) {
    console.error("Error fetching user memes:", error);
    res.status(500).json({ message: "Failed to fetch user memes" });
  }
});

// Get user's votes
router.get("/:walletAddress/votes", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const votes = await storage.getUserVotes(walletAddress);
    res.json(votes);
  } catch (error) {
    console.error("Error fetching user votes:", error);
    res.status(500).json({ message: "Failed to fetch user votes" });
  }
});

// Get user's comments
router.get("/:walletAddress/comments", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const comments = await storage.getUserComments(walletAddress);
    res.json(comments);
  } catch (error) {
    console.error("Error fetching user comments:", error);
    res.status(500).json({ message: "Failed to fetch user comments" });
  }
});

// Get user statistics
router.get("/:walletAddress/stats", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const [user, memes, votes] = await Promise.all([
      storage.getUserByWallet(walletAddress),
      storage.getUserMemes(walletAddress),
      storage.getUserVotes(walletAddress)
    ]);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const totalMemesVotes = memes.reduce((sum, meme) => sum + meme.votes, 0);
    const totalVotingPowerUsed = votes.reduce((sum, vote) => sum + vote.votingPower, 0);
    
    const stats = {
      totalMemes: memes.length,
      totalMemesVotes,
      totalVotesCast: votes.length,
      totalVotingPowerUsed,
      samuBalance: user.samuBalance,
      remainingVotingPower: user.totalVotingPower - totalVotingPowerUsed,
      memberSince: user.createdAt
    };
    
    res.json(stats);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ message: "Failed to fetch user stats" });
  }
});

// Check display name availability
router.get("/check-name/:displayName", async (req, res) => {
  try {
    const { displayName } = req.params;
    
    // Check if display name already exists
    const existingUser = await storage.getUserByDisplayName(displayName);
    const isAvailable = !existingUser;
    
    // If not available, suggest alternatives
    let suggestions: string[] = [];
    if (!isAvailable) {
      for (let i = 1; i <= 5; i++) {
        const suggestion = `${displayName}${i}`;
        const suggestionExists = await storage.getUserByDisplayName(suggestion);
        if (!suggestionExists) {
          suggestions.push(suggestion);
        }
      }
    }
    
    res.json({
      displayName,
      isAvailable,
      suggestions
    });
  } catch (error) {
    console.error("Error checking display name:", error);
    res.status(500).json({ message: "Failed to check display name availability" });
  }
});

export default router;