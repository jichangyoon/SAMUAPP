import { Router } from "express";
import { storage } from "../storage";
import { eq } from "drizzle-orm";
import { users } from "@shared/schema";
import { getDatabase } from "../db";

const router = Router();
const db = getDatabase();

// SAMU Token Contract Address on Solana
const SAMU_TOKEN_ADDRESS = "EHy2UQWKKVWYvMTzbEfYy1jvZD3VhRBUAvz3bnJ1GnuF";

// Solana RPC endpoints for token balance queries
const RPC_ENDPOINTS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana-api.projectserum.com",
  "https://rpc.ankr.com/solana"
];

async function getSamuBalance(walletAddress: string): Promise<number> {
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenAccountsByOwner',
          params: [
            walletAddress,
            { mint: SAMU_TOKEN_ADDRESS },
            { encoding: 'jsonParsed' }
          ]
        })
      });

      const data = await response.json();
      
      if (data.result?.value?.length > 0) {
        const tokenAccount = data.result.value[0];
        const balance = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
        return Math.floor(balance || 0);
      }
      
      return 0;
    } catch (error) {
      console.log(`RPC endpoint ${endpoint} failed, trying next...`);
      continue;
    }
  }
  
  return 0; // Return 0 if all endpoints fail
}

// Sync single user's SAMU balance
router.post("/user/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    if (!db) {
      return res.status(500).json({ message: "Database not available" });
    }

    // Fetch real SAMU balance from blockchain
    const realSamuBalance = await getSamuBalance(walletAddress);
    const votingPower = Math.floor(realSamuBalance * 0.8); // 80% of SAMU as voting power

    // Update user in database
    const updatedUser = await db
      .update(users)
      .set({
        samuBalance: realSamuBalance,
        totalVotingPower: votingPower,
        updatedAt: new Date()
      })
      .where(eq(users.walletAddress, walletAddress))
      .returning();

    if (updatedUser.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user: updatedUser[0],
      syncedBalance: realSamuBalance,
      votingPower: votingPower
    });
  } catch (error) {
    console.error("Error syncing user SAMU balance:", error);
    res.status(500).json({ message: "Failed to sync SAMU balance" });
  }
});

// Sync all users' SAMU balances
router.post("/all-users", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ message: "Database not available" });
    }

    // Get all users with wallet addresses
    const allUsers = await db
      .select()
      .from(users);

    const syncResults = [];

    for (const user of allUsers) {
      try {
        // Fetch real SAMU balance from blockchain
        const realSamuBalance = await getSamuBalance(user.walletAddress);
        const votingPower = Math.floor(realSamuBalance * 0.8);

        // Update user in database
        const updatedUser = await db
          .update(users)
          .set({
            samuBalance: realSamuBalance,
            totalVotingPower: votingPower,
            updatedAt: new Date()
          })
          .where(eq(users.id, user.id))
          .returning();

        syncResults.push({
          userId: user.id,
          username: user.username,
          walletAddress: user.walletAddress,
          oldBalance: user.samuBalance,
          newBalance: realSamuBalance,
          votingPower: votingPower,
          synced: true
        });

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        syncResults.push({
          userId: user.id,
          username: user.username,
          walletAddress: user.walletAddress,
          error: String(error),
          synced: false
        });
      }
    }

    res.json({
      message: "Bulk sync completed",
      totalUsers: allUsers.length,
      successfulSyncs: syncResults.filter(r => r.synced).length,
      results: syncResults
    });
  } catch (error) {
    console.error("Error syncing all users:", error);
    res.status(500).json({ message: "Failed to sync all users" });
  }
});

// Get current SAMU balance without updating database
router.get("/balance/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const currentBalance = await getSamuBalance(walletAddress);
    const votingPower = Math.floor(currentBalance * 0.8);

    res.json({
      walletAddress,
      samuBalance: currentBalance,
      votingPower,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error fetching SAMU balance:", error);
    res.status(500).json({ message: "Failed to fetch balance" });
  }
});

export default router;