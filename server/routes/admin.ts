import { Router } from "express";
import { insertContestSchema } from "@shared/schema";
import { storage } from "../storage";
import { contestScheduler } from "../contest-scheduler";
import { config } from "../config";

const router = Router();

// Check if user is admin
router.post("/check-admin", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.json({ isAdmin: false });
    }
    
    const isAdmin = config.ADMIN_EMAILS.includes(email.toLowerCase());
    res.json({ isAdmin });
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ error: "Failed to check admin status" });
  }
});

// Get all contests (excluding archived ones)
router.get("/contests", async (req, res) => {
  try {
    const allContests = await storage.getContests();
    // Filter out contests that have been archived
    const contests = allContests.filter(contest => contest.status !== 'archived');
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
      startTime: null, // 콘테스트는 수동으로 시작
      endTime: null,   // endTime은 시작할 때 설정
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

    // 콘테스트 정보 가져오기
    const contest = await storage.getContestById(contestId);
    if (!contest) {
      return res.status(404).json({ error: "Contest not found" });
    }

    // 시작 시간을 현재 시간으로 설정
    const startTime = new Date();
    // 종료 시간을 시작 시간 + durationDays로 계산 (기본 7일)
    const durationDays = contest.durationDays || 7;
    const endTime = new Date(startTime.getTime() + (durationDays * 24 * 60 * 60 * 1000));

    // 콘테스트 시작 및 시간 설정
    const updatedContest = await storage.updateContestTimes(contestId, startTime, endTime);
    
    // 자동 종료 스케줄링
    contestScheduler.scheduleContestEnd(updatedContest.id, endTime);
    
    res.json(updatedContest);
  } catch (error) {
    console.error("Error starting contest:", error);
    res.status(500).json({ error: "Failed to start contest" });
  }
});

// End contest and archive
router.post("/contests/:id/end", async (req, res) => {
  try {
    const contestId = parseInt(req.params.id);
    
    // Cancel any scheduled actions for this contest
    contestScheduler.cancelScheduled(contestId);
    
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