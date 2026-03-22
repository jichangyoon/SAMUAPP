import { storage } from "./storage";
import { distributeEscrowProfit } from "./routes/goods";
import { logger } from "./utils/logger";

const STORE_ID = "17717241";
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

const FINALIZED_STATUSES = new Set(["delivered", "returned", "canceled", "failed"]);

export interface SyncResult {
  orderId: number;
  printfulOrderId: number;
  updates: Record<string, any> | "no changes";
  error?: string;
  distributed?: boolean;
}

export async function syncPrintfulOrders(): Promise<{ synced: number; distributed: number; results: SyncResult[] }> {
  const orders = await storage.getAllOrders();
  const activeOrders = orders.filter(o => o.printfulOrderId && !FINALIZED_STATUSES.has(o.status));

  const results: SyncResult[] = [];
  let synced = 0;
  let distributed = 0;

  for (const order of activeOrders) {
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

      if (orderData?.status) {
        updates.printfulStatus = orderData.status;
      }

      const shipment = shipmentsData?.[0];
      if (shipment) {
        if (shipment.tracking_number) updates.trackingNumber = shipment.tracking_number;
        if (shipment.tracking_url) updates.trackingUrl = shipment.tracking_url;
        if (shipment.shipment_status === "shipped") updates.printfulStatus = "shipped";
        if (shipment.delivery_status === "delivered") {
          updates.printfulStatus = "delivered";
          updates.status = "delivered";
        }
      }

      if (Object.keys(updates).length > 0) {
        await storage.updateOrder(order.id, updates);
        synced++;
        logger.info(`[PrintfulSync] Order ${order.id} updated:`, updates);

        let distOk = false;
        if (updates.status === "delivered") {
          try {
            const escrow = await storage.getEscrowDepositByOrderId(order.id);
            if (escrow && escrow.status === "locked") {
              await distributeEscrowProfit(escrow);
              distributed++;
              distOk = true;
              logger.info(`[PrintfulSync] Order ${order.id} profit distributed`);
            }
          } catch (distErr: any) {
            logger.error(`[PrintfulSync] Profit distribution failed for order ${order.id}:`, distErr.message);
          }
        }

        results.push({ orderId: order.id, printfulOrderId: order.printfulOrderId!, updates, distributed: distOk });
      } else {
        results.push({ orderId: order.id, printfulOrderId: order.printfulOrderId!, updates: "no changes" });
      }
    } catch (err: any) {
      logger.error(`[PrintfulSync] Error syncing order ${order.id}:`, err.message);
      results.push({ orderId: order.id, printfulOrderId: order.printfulOrderId!, updates: {}, error: err.message });
    }
  }

  return { synced, distributed, results };
}

async function runSync() {
  try {
    const { synced, distributed } = await syncPrintfulOrders();
    if (synced > 0 || distributed > 0) {
      logger.info(`[PrintfulSync] Scheduled sync complete — ${synced} updated, ${distributed} distributed`);
    }
  } catch (err: any) {
    logger.error("[PrintfulSync] Scheduled sync error:", err.message);
  }
}

export function startPrintfulSyncScheduler() {
  runSync();
  setInterval(runSync, CHECK_INTERVAL_MS);
  logger.info("Printful sync scheduler started - checking every 6 hours");
}
