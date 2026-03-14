import { Router } from "express";
import { insertContestSchema } from "@shared/schema";
import { storage } from "../storage";
import { contestScheduler } from "../contest-scheduler";
import { config } from "../config";
import { distributeEscrowProfit } from "./goods";
import { logger } from "../utils/logger";

const router = Router();

// Admin 인증 미들웨어
const requireAdmin = (req: any, res: any, next: any) => {
  const email = (req.body?.adminEmail || req.headers['x-admin-email'] || '').toLowerCase();
  if (!email || !config.ADMIN_EMAILS.includes(email)) {
    return res.status(401).json({ error: "Admin access required" });
  }
  next();
};

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

// Get all contests (excluding archived ones) - with cache headers
router.get("/contests", async (req, res) => {
  try {
    // Set cache headers for better performance
    res.set('Cache-Control', 'public, max-age=60'); // 1분 브라우저 캐시
    
    const allContests = await storage.getContests();
    // Filter out contests that have been archived
    const contests = allContests.filter(contest => contest.status !== 'archived');
    res.json(contests);
  } catch (error) {
    logger.error("Error fetching contests:", error);
    res.status(500).json({ error: "Failed to fetch contests" });
  }
});

// Get archived contests - with cache headers
router.get("/archived-contests", async (req, res) => {
  try {
    // Set cache headers for better performance
    res.set('Cache-Control', 'public, max-age=120'); // 2분 브라우저 캐시
    
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
    const STORE_ID = "17717241";
    const WEBHOOK_URL = "https://samu.ink/api/webhooks/printful";

    // v2 API 먼저 시도 (shipment_delivered 지원)
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
    const v2Response = await fetch(`https://api.printful.com/v2/webhooks?store_id=${STORE_ID}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.PRINTFUL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ default_url: WEBHOOK_URL, events: V2_EVENTS }),
    });
    const v2Data = await v2Response.json() as any;

    if (v2Response.ok) {
      logger.debug("[Admin] Printful webhook registered via v2:", JSON.stringify(v2Data));
      return res.json({ ok: true, result: v2Data });
    }

    logger.error("[Admin] v2 registration failed:", JSON.stringify(v2Data));
    return res.status(500).json({ ok: false, error: v2Data });
  } catch (error: any) {
    logger.error("[Admin] Webhook registration error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post("/sync-printful-orders", requireAdmin, async (req, res) => {
  try {
    const STORE_ID = "17717241";
    const orders = await storage.getAllOrders();
    const results: any[] = [];
    let distributedCount = 0;

    for (const order of orders) {
      if (!order.printfulOrderId) continue;

      try {
        const [orderRes, shipmentsRes] = await Promise.all([
          fetch(`https://api.printful.com/v2/orders/${order.printfulOrderId}?store_id=${STORE_ID}`, {
            headers: { "Authorization": `Bearer ${process.env.PRINTFUL_API_KEY}` },
          }),
          fetch(`https://api.printful.com/v2/orders/${order.printfulOrderId}/shipments?store_id=${STORE_ID}`, {
            headers: { "Authorization": `Bearer ${process.env.PRINTFUL_API_KEY}` },
          }),
        ]);

        const orderData = orderRes.ok ? (await orderRes.json() as any).data : null;
        const shipmentsData = shipmentsRes.ok ? (await shipmentsRes.json() as any).data : [];

        const updates: Record<string, any> = {};
        const alreadyDelivered = ["delivered", "returned"].includes(order.status);

        if (orderData?.status && !alreadyDelivered) {
          updates.printfulStatus = orderData.status;
        }

        const shipment = shipmentsData?.[0];
        if (shipment) {
          if (shipment.tracking_number) updates.trackingNumber = shipment.tracking_number;
          if (shipment.tracking_url) updates.trackingUrl = shipment.tracking_url;
          if (!alreadyDelivered) {
            if (shipment.shipment_status === "shipped") updates.printfulStatus = "shipped";
            if (shipment.delivery_status === "delivered") {
              updates.printfulStatus = "delivered";
              updates.status = "delivered";
            }
          }
        }

        if (Object.keys(updates).length > 0) {
          await storage.updateOrder(order.id, updates);
          results.push({ orderId: order.id, printfulOrderId: order.printfulOrderId, updates });
          logger.info(`[Admin Sync] Order ${order.id} updated:`, updates);

          if (updates.status === "delivered") {
            try {
              const escrow = await storage.getEscrowDepositByOrderId(order.id);
              if (escrow && escrow.status === "locked") {
                await distributeEscrowProfit(escrow);
                distributedCount++;
                logger.info(`[Admin Sync] Order ${order.id} profit distributed`);
              }
            } catch (distErr: any) {
              logger.error(`[Admin Sync] Profit distribution failed for order ${order.id}:`, distErr.message);
            }
          }
        } else {
          results.push({ orderId: order.id, printfulOrderId: order.printfulOrderId, updates: "no changes" });
        }
      } catch (err: any) {
        results.push({ orderId: order.id, error: err.message });
      }
    }

    return res.json({
      ok: true,
      synced: results.filter(r => typeof r.updates === "object" && r.updates !== "no changes").length,
      distributed: distributedCount,
      results,
    });
  } catch (error: any) {
    logger.error("[Admin] Sync error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;