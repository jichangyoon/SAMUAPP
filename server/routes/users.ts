import { Router } from "express";
import { storage } from "../storage";
import { insertUserSchema } from "@shared/schema";

const router = Router();

// IP 및 디바이스 추적 미들웨어 함수
const trackLogin = async (ipAddress: string, walletAddress: string, deviceId?: string) => {
  try {
    // IP가 차단되었는지 확인
    const isBlocked = await storage.isIpBlocked(ipAddress);
    if (isBlocked) {
      return { blocked: true, message: "IP address is blocked" };
    }

    // 로그인 기록 저장 (디바이스 ID 포함)
    await storage.logLogin({
      ipAddress,
      deviceId,
      walletAddress,
      loginTime: new Date()
    });

    // 오늘 이 IP로 로그인한 고유 지갑 수 확인
    const todayWalletsByIp = await storage.getTodayLoginsByIp(ipAddress);
    
    // 디바이스 ID가 있는 경우 해당 디바이스로 로그인한 고유 지갑 수도 확인
    let todayWalletsByDevice: string[] = [];
    if (deviceId) {
      todayWalletsByDevice = await storage.getTodayLoginsByDeviceId(deviceId);
    }
    
    // 3개 이상의 다른 지갑으로 로그인한 경우 의심스러운 활동으로 간주
    if (todayWalletsByIp.length >= 3) {
      console.warn(`Suspicious IP detected: ${ipAddress} with ${todayWalletsByIp.length} different wallets today`);
    }
    
    if (deviceId && todayWalletsByDevice.length >= 3) {
      console.warn(`Suspicious device detected: ${deviceId} with ${todayWalletsByDevice.length} different wallets today`);
    }

    return { 
      blocked: false, 
      ipWalletCount: todayWalletsByIp.length,
      deviceWalletCount: todayWalletsByDevice.length
    };
  } catch (error) {
    console.error("Error tracking login:", error);
    return { blocked: false, ipWalletCount: 0, deviceWalletCount: 0 };
  }
};

// Get or create user profile - with cache headers and IP tracking
router.get("/profile/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    // IP 추적 로직
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const ipAddress = Array.isArray(clientIp) ? clientIp[0] : clientIp;
    
    // 디바이스 ID 가져오기 (헤더에서)
    const deviceId = req.headers['x-device-id'] as string;
    
    // IP 및 디바이스 추적 및 차단 확인
    const trackResult = await trackLogin(ipAddress, walletAddress, deviceId);
    if (trackResult.blocked) {
      return res.status(403).json({ 
        message: "Access denied. Your IP address has been blocked.",
        error: "IP_BLOCKED"
      });
    }
    
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
    const totalVotingPowerUsed = votes.reduce((sum, vote) => sum + ((vote as any).powerUsed || vote.votingPower), 0);
    
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