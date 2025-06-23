import { Router } from "express";
import { storage } from "../storage";
import { eq } from "drizzle-orm";
import { users, memes, votes } from "@shared/schema";
import { getDatabase } from "../db";

const router = Router();
const db = getDatabase();

// Get all users for admin
router.get("/users", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ message: "Database not available" });
    }

    const allUsers = await db.select().from(users).orderBy(users.createdAt);
    res.json(allUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// Update user
router.put("/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const updateData = req.body;

    if (!db) {
      return res.status(500).json({ message: "Database not available" });
    }

    const updatedUser = await db
      .update(users)
      .set({
        username: updateData.username,
        email: updateData.email,
        // SAMU balance and voting power are auto-synced from on-chain data
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    if (updatedUser.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(updatedUser[0]);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
});

// Delete user
router.delete("/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (!db) {
      return res.status(500).json({ message: "Database not available" });
    }

    // First, delete related votes
    await db.delete(votes).where(eq(votes.voterWallet, 
      db.select({ wallet: users.walletAddress }).from(users).where(eq(users.id, userId)).limit(1)
    ));

    // Then delete user's memes
    await db.delete(memes).where(eq(memes.authorWallet, 
      db.select({ wallet: users.walletAddress }).from(users).where(eq(users.id, userId)).limit(1)
    ));

    // Finally delete the user
    const deletedUser = await db.delete(users).where(eq(users.id, userId)).returning();

    if (deletedUser.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

// Get statistics
router.get("/stats", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ message: "Database not available" });
    }

    // Get total users
    const totalUsersResult = await db.select().from(users);
    const totalUsers = totalUsersResult.length;

    // Get total memes
    const totalMemesResult = await db.select().from(memes);
    const totalMemes = totalMemesResult.length;

    // Get total votes
    const totalVotesResult = await db.select().from(votes);
    const totalVotes = totalVotesResult.length;

    // Get total SAMU
    const totalSamu = totalUsersResult.reduce((sum, user) => sum + Number(user.samuBalance), 0);

    res.json({
      totalUsers,
      totalMemes,
      totalVotes,
      totalSamu
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ message: "Failed to fetch statistics" });
  }
});

// Bulk update users
router.post("/users/bulk-update", async (req, res) => {
  try {
    const { updates } = req.body; // Array of { id, samu_balance, total_voting_power }

    if (!db) {
      return res.status(500).json({ message: "Database not available" });
    }

    const results = [];
    for (const update of updates) {
      const updatedUser = await db
        .update(users)
        .set({
          samuBalance: update.samu_balance,
          totalVotingPower: update.total_voting_power,
          updatedAt: new Date()
        })
        .where(eq(users.id, update.id))
        .returning();
      
      results.push(updatedUser[0]);
    }

    res.json(results);
  } catch (error) {
    console.error("Error bulk updating users:", error);
    res.status(500).json({ message: "Failed to bulk update users" });
  }
});

export default router;