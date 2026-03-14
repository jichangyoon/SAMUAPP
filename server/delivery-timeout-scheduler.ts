import { storage } from "./storage";
import { distributeEscrowProfit } from "./routes/goods";
import { logger } from "./utils/logger";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function checkDeliveryTimeouts() {
  try {
    const lockedDeposits = await storage.getLockedEscrowDeposits();
    if (lockedDeposits.length === 0) return;

    const now = Date.now();
    let processed = 0;

    for (const escrow of lockedDeposits) {
      const ageMs = now - new Date(escrow.createdAt).getTime();
      if (ageMs < THIRTY_DAYS_MS) continue;

      try {
        logger.info(`[DeliveryTimeout] Order ${escrow.orderId} locked for ${Math.floor(ageMs / 86400000)} days — auto-distributing`);
        await distributeEscrowProfit(escrow);
        await storage.updateOrder(escrow.orderId, { printfulStatus: "delivered" });
        logger.info(`[DeliveryTimeout] Order ${escrow.orderId} distributed and marked delivered`);
        processed++;
      } catch (err: any) {
        logger.error(`[DeliveryTimeout] Failed for order ${escrow.orderId}:`, err.message);
      }
    }

    if (processed > 0) {
      logger.info(`[DeliveryTimeout] Auto-distributed ${processed} timed-out order(s)`);
    }
  } catch (err: any) {
    logger.error("[DeliveryTimeout] Error during check:", err.message);
  }
}

export function startDeliveryTimeoutScheduler() {
  checkDeliveryTimeouts();
  setInterval(checkDeliveryTimeouts, CHECK_INTERVAL_MS);
  logger.info("Delivery timeout scheduler started - checking every 6 hours");
}
