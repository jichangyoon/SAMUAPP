import { Router } from "express";
import { insertContestSchema } from "@shared/schema";
import { storage } from "../storage";
import { contestScheduler } from "../contest-scheduler";
import { logger } from "../utils/logger";
import { syncPrintfulOrders } from "../printful-sync-scheduler";
import { requireAdminMiddleware as requireAdmin } from "../utils/admin-auth";
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
    logger.error("Error checking admin status:", error);
    res.status(500).json({ error: "Failed to check admin status" });
  }
});

// Get all contests (excluding archived ones)
router.get("/contests", async (req, res) => {
  try {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    const allContests = await storage.getContests();
    const contests = allContests.filter(contest => contest.status !== 'archived');
    res.json(contests);
  } catch (error) {
    logger.error("Error fetching contests:", error);
    res.status(500).json({ error: "Failed to fetch contests" });
  }
});

// Get archived contests
router.get("/archived-contests", async (req, res) => {
  try {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    const archivedContests = await storage.getArchivedContests();
    res.json(archivedContests);
  } catch (error) {
    logger.error("Error fetching archived contests:", error);
    res.status(500).json({ error: "Failed to fetch archived contests" });
  }
});

// Create contest
router.post("/contests", requireAdmin, async (req, res) => {
  try {
    const contestData = insertContestSchema.parse({
      ...req.body,
      startTime: null, // 콘테스트는 수동으로 시작
      endTime: null,   // endTime은 시작할 때 설정
    });

    const contest = await storage.createContest(contestData);
    res.json(contest);
  } catch (error) {
    logger.error("Error creating contest:", error);
    res.status(400).json({ error: "Failed to create contest" });
  }
});

// Start contest
router.post("/contests/:id/start", requireAdmin, async (req, res) => {
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
    logger.error("Error starting contest:", error);
    res.status(500).json({ error: "Failed to start contest" });
  }
});

// End contest and archive
router.post("/contests/:id/end", requireAdmin, async (req, res) => {
  try {
    const contestId = parseInt(req.params.id);
    
    // Cancel any scheduled actions for this contest
    contestScheduler.cancelScheduled(contestId);
    
    const archivedContest = await storage.endContestAndArchive(contestId);
    res.json(archivedContest);
  } catch (error) {
    logger.error("Error ending contest:", error);
    res.status(500).json({ error: "Failed to end contest: " + (error instanceof Error ? error.message : String(error)) });
  }
});

// Get current contest info - no cache for real-time updates
router.get("/current-contest", async (req, res) => {
  try {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    const contest = await storage.getCurrentActiveContest();
    if (contest) {
      return res.json(contest);
    }

    const allContests = await storage.getContests();
    const nonArchived = allContests
      .filter(c => c.status === "archiving" || c.status === "ended")
      .sort((a, b) => {
        const aTime = a.endTime || a.createdAt || new Date(0);
        const bTime = b.endTime || b.createdAt || new Date(0);
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
    res.json(nonArchived[0] || null);
  } catch (error) {
    logger.error("Error fetching current contest:", error);
    res.status(500).json({ error: "Failed to fetch current contest" });
  }
});

// IP 추적 관리 API들
// 의심스러운 IP 목록 조회
router.get("/suspicious-ips", async (req, res) => {
  try {
    const suspiciousIps = await storage.getSuspiciousIps();
    res.json(suspiciousIps);
  } catch (error) {
    logger.error("Error fetching suspicious IPs:", error);
    res.status(500).json({ error: "Failed to fetch suspicious IPs" });
  }
});

// 의심스러운 디바이스 목록 조회
router.get("/suspicious-devices", async (req, res) => {
  try {
    const suspiciousDevices = await storage.getSuspiciousDevices();
    res.json(suspiciousDevices);
  } catch (error) {
    logger.error("Error fetching suspicious devices:", error);
    res.status(500).json({ error: "Failed to fetch suspicious devices" });
  }
});

// 최근 로그인 기록 조회
router.get("/recent-logins", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const recentLogins = await storage.getRecentLogins(limit);
    res.json(recentLogins);
  } catch (error) {
    logger.error("Error fetching recent logins:", error);
    res.status(500).json({ error: "Failed to fetch recent logins" });
  }
});

// 차단된 IP 목록 조회
router.get("/blocked-ips", async (req, res) => {
  try {
    const blockedIps = await storage.getBlockedIps();
    res.json(blockedIps);
  } catch (error) {
    logger.error("Error fetching blocked IPs:", error);
    res.status(500).json({ error: "Failed to fetch blocked IPs" });
  }
});

// IP 차단하기
router.post("/block-ip", requireAdmin, async (req, res) => {
  try {
    const { ipAddress, reason } = req.body;
    
    if (!ipAddress) {
      return res.status(400).json({ error: "IP address is required" });
    }
    
    const blockedIp = await storage.blockIp({
      ipAddress,
      reason: reason || "Suspicious activity detected",
      blockedAt: new Date()
    });
    
    res.json({ message: "IP blocked successfully", blockedIp });
  } catch (error) {
    logger.error("Error blocking IP:", error);
    res.status(500).json({ error: "Failed to block IP" });
  }
});

// IP 차단 해제하기
router.post("/unblock-ip", requireAdmin, async (req, res) => {
  try {
    const { ipAddress } = req.body;
    
    if (!ipAddress) {
      return res.status(400).json({ error: "IP address is required" });
    }
    
    await storage.unblockIp(ipAddress);
    res.json({ message: "IP unblocked successfully" });
  } catch (error) {
    logger.error("Error unblocking IP:", error);
    res.status(500).json({ error: "Failed to unblock IP" });
  }
});

// 특정 IP의 오늘 로그인 현황 조회
router.get("/ip-status/:ipAddress", async (req, res) => {
  try {
    const { ipAddress } = req.params;
    
    const todayWallets = await storage.getTodayLoginsByIp(ipAddress);
    const isBlocked = await storage.isIpBlocked(ipAddress);
    
    res.json({
      ipAddress,
      todayWalletCount: todayWallets.length,
      todayWallets,
      isBlocked
    });
  } catch (error) {
    logger.error("Error fetching IP status:", error);
    res.status(500).json({ error: "Failed to fetch IP status" });
  }
});

router.post("/register-printful-webhook", requireAdmin, async (req, res) => {
  try {
    const STORE_ID = config.PRINTFUL.STORE_ID;
    const webhookSecret = process.env.PRINTFUL_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(500).json({ error: "PRINTFUL_WEBHOOK_SECRET not set" });
    }
    const WEBHOOK_URL = `https://samu.ink/api/webhooks/printful?secret=${webhookSecret}`;

    const V2_EVENTS = [
      { type: "shipment_sent" },
      { type: "shipment_delivered" },
      { type: "shipment_returned" },
      { type: "shipment_canceled" },
      { type: "order_created" },
      { type: "order_updated" },
      { type: "order_failed" },
      { type: "order_canceled" },
    ];

    // Delete existing webhook first, then re-register with correct URL
    await fetch(`https://api.printful.com/v2/webhooks`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${process.env.PRINTFUL_API_KEY}`,
        "X-PF-Store-Id": STORE_ID,
      },
    });

    const v2Response = await fetch(`https://api.printful.com/v2/webhooks`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.PRINTFUL_API_KEY}`,
        "X-PF-Store-Id": STORE_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ default_url: WEBHOOK_URL, events: V2_EVENTS }),
    });
    const v2Data = await v2Response.json() as any;

    if (v2Response.ok) {
      logger.info("[Admin] Printful webhook registered:", WEBHOOK_URL);
      return res.json({ ok: true, result: v2Data });
    }

    logger.error("[Admin] Webhook registration failed:", JSON.stringify(v2Data));
    return res.status(500).json({ ok: false, error: v2Data });
  } catch (error: any) {
    logger.error("[Admin] Webhook registration error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post("/sync-printful-orders", requireAdmin, async (_req, res) => {
  try {
    const { synced, distributed, results } = await syncPrintfulOrders();
    return res.json({ ok: true, synced, distributed, results });
  } catch (error: any) {
    logger.error("[Admin] Sync error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;