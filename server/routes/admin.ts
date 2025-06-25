import { Router } from "express";
import { insertContestSchema } from "@shared/schema";
import { storage } from "../storage";

const router = Router();

// Get all contests
router.get("/contests", async (req, res) => {
  try {
    const contests = await storage.getContests();
    res.json(contests);
  } catch (error) {
    console.error("Error fetching contests:", error);
    res.status(500).json({ error: "Failed to fetch contests" });
  }
});

// Get archived contests
router.get("/archived-contests", async (req, res) => {
  try {
    const archivedContests = await storage.getArchivedContests();
    res.json(archivedContests);
  } catch (error) {
    console.error("Error fetching archived contests:", error);
    res.status(500).json({ error: "Failed to fetch archived contests" });
  }
});

// Create contest
router.post("/contests", async (req, res) => {
  try {
    const contestData = insertContestSchema.parse({
      ...req.body,
      startTime: req.body.startTime ? new Date(req.body.startTime) : null,
      endTime: req.body.endTime ? new Date(req.body.endTime) : null,
    });

    const contest = await storage.createContest(contestData);
    res.json(contest);
  } catch (error) {
    console.error("Error creating contest:", error);
    res.status(400).json({ error: "Failed to create contest" });
  }
});

// Start contest
router.post("/contests/:id/start", async (req, res) => {
  try {
    const contestId = parseInt(req.params.id);
    
    // Check if there's already an active contest
    const activeContest = await storage.getCurrentActiveContest();
    if (activeContest && activeContest.id !== contestId) {
      return res.status(400).json({ error: "Another contest is already active" });
    }

    const contest = await storage.updateContestStatus(contestId, "active");
    res.json(contest);
  } catch (error) {
    console.error("Error starting contest:", error);
    res.status(500).json({ error: "Failed to start contest" });
  }
});

// End contest and archive
router.post("/contests/:id/end", async (req, res) => {
  try {
    const contestId = parseInt(req.params.id);
    
    const archivedContest = await storage.endContestAndArchive(contestId);
    res.json(archivedContest);
  } catch (error) {
    console.error("Error ending contest:", error);
    res.status(500).json({ error: "Failed to end contest: " + error.message });
  }
});

// Get current active contest info
router.get("/current-contest", async (req, res) => {
  try {
    const activeContest = await storage.getCurrentActiveContest();
    res.json(activeContest);
  } catch (error) {
    console.error("Error fetching current contest:", error);
    res.status(500).json({ error: "Failed to fetch current contest" });
  }
});

export default router;