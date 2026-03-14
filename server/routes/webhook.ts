import { Router } from "express";
import { storage } from "../storage";
import crypto from "crypto";
import { distributeEscrowProfit } from "./goods";
import { logger } from "../utils/logger";

const router = Router();

function verifyPrintfulWebhook(req: any): boolean {
  const webhookSecret = process.env.PRINTFUL_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.warn("[Printful Webhook] PRINTFUL_WEBHOOK_SECRET not set — rejecting request for security");
    return false;
  }
  const signature = req.headers["x-printful-signature"] || req.headers["x-pf-signature"];
  if (!signature) {
    return false;
  }
  const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  const expected = crypto.createHmac("sha256", webhookSecret).update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

async function triggerEscrowDistribution(orderId: number, eventType: string) {
  try {
    const escrow = await storage.getEscrowDepositByOrderId(orderId);
    if (escrow && escrow.status === "locked") {
      await distributeEscrowProfit(escrow);
      logger.info(`[Printful Webhook] Escrow profit distributed on ${eventType} for order ${orderId}`);
    } else {
      logger.info(`[Printful Webhook] No locked escrow for order ${orderId}, skipping distribution`);
    }
  } catch (distErr: any) {
    logger.error(`[Printful Webhook] Escrow distribution failed for order ${orderId}:`, distErr.message);
  }
}

router.post("/printful", async (req, res) => {
  try {
    if (!verifyPrintfulWebhook(req)) {
      logger.warn("[Printful Webhook] Invalid signature, rejecting request");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { type, data } = req.body;

    if (!type || !data) {
      return res.status(400).json({ error: "Invalid webhook payload" });
    }

    logger.debug(`[Printful Webhook] Event: ${type}`, JSON.stringify(data).substring(0, 500));

    // v2 payload: shipment events have order_id, order events have id
    const printfulOrderId = data.order_id || (type.startsWith("order_") ? data.id : null);

    if (!printfulOrderId) {
      logger.info("[Printful Webhook] No order ID in payload, skipping");
      return res.status(200).json({ ok: true });
    }

    const order = await storage.getOrderByPrintfulId(Number(printfulOrderId));
    if (!order) {
      logger.info(`[Printful Webhook] Order not found for Printful ID: ${printfulOrderId}`);
      return res.status(200).json({ ok: true });
    }

    let updates: Record<string, any> = {};

    switch (type) {
      case "shipment_sent":
        updates.printfulStatus = "shipped";
        if (data.tracking_number) updates.trackingNumber = data.tracking_number;
        if (data.tracking_url || data.carrier_url) updates.trackingUrl = data.tracking_url || data.carrier_url;
        logger.info(`[Printful Webhook] Order ${order.id} shipped. Tracking: ${updates.trackingNumber || "N/A"}`);
        break;

      case "shipment_delivered":
        updates.printfulStatus = "delivered";
        updates.status = "delivered";
        logger.info(`[Printful Webhook] Order ${order.id} delivered!`);
        await triggerEscrowDistribution(order.id, "shipment_delivered");
        break;

      case "shipment_returned":
        updates.printfulStatus = "returned";
        updates.status = "returned";
        logger.info(`[Printful Webhook] Order ${order.id} returned`);
        break;

      case "shipment_canceled":
        updates.printfulStatus = "canceled";
        logger.info(`[Printful Webhook] Order ${order.id} shipment canceled`);
        break;

      case "order_created":
        updates.printfulStatus = "pending";
        logger.info(`[Printful Webhook] Order ${order.id} created in Printful`);
        break;

      case "order_updated":
        if (data.status) updates.printfulStatus = data.status;
        logger.info(`[Printful Webhook] Order ${order.id} updated: ${data.status || "unknown"}`);
        break;

      case "order_failed":
        updates.printfulStatus = "failed";
        updates.status = "failed";
        logger.info(`[Printful Webhook] Order ${order.id} failed`);
        break;

      case "order_canceled":
        updates.printfulStatus = "canceled";
        updates.status = "canceled";
        logger.info(`[Printful Webhook] Order ${order.id} canceled`);
        break;

      default:
        logger.info(`[Printful Webhook] Unhandled event type: ${type}`);
        return res.status(200).json({ ok: true });
    }

    if (Object.keys(updates).length > 0) {
      await storage.updateOrder(order.id, updates);
      logger.info(`[Printful Webhook] Order ${order.id} updated:`, updates);
    }

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    logger.error("[Printful Webhook] Error:", error.message);
    return res.status(200).json({ ok: true });
  }
});

export default router;
