import { Router } from "express";
import { storage } from "../storage";
import crypto from "crypto";
import { distributeEscrowProfit } from "./goods";

const router = Router();

function verifyPrintfulWebhook(req: any): boolean {
  const webhookSecret = process.env.PRINTFUL_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return true;
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
      console.log(`[Printful Webhook] Escrow profit distributed on ${eventType} for order ${orderId}`);
    } else {
      console.log(`[Printful Webhook] No locked escrow for order ${orderId}, skipping distribution`);
    }
  } catch (distErr: any) {
    console.error(`[Printful Webhook] Escrow distribution failed for order ${orderId}:`, distErr.message);
  }
}

router.post("/printful", async (req, res) => {
  try {
    if (!verifyPrintfulWebhook(req)) {
      console.warn("[Printful Webhook] Invalid signature, rejecting request");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { type, data } = req.body;

    if (!type || !data) {
      return res.status(400).json({ error: "Invalid webhook payload" });
    }

    console.log(`[Printful Webhook] Event: ${type}`, JSON.stringify(data).substring(0, 500));

    // v1: data.order?.id or data.shipment?.order_id
    // v2: data.order_id or data.id (for order events)
    const printfulOrderId =
      data.order?.id ||
      data.shipment?.order_id ||
      data.order_id ||
      (type.startsWith("order_") ? data.id : null);

    if (!printfulOrderId) {
      console.log("[Printful Webhook] No order ID in payload, skipping");
      return res.status(200).json({ ok: true });
    }

    const order = await storage.getOrderByPrintfulId(Number(printfulOrderId));
    if (!order) {
      console.log(`[Printful Webhook] Order not found for Printful ID: ${printfulOrderId}`);
      return res.status(200).json({ ok: true });
    }

    let updates: Record<string, any> = {};

    switch (type) {
      // ── v1 이벤트 ──────────────────────────────────────────
      case "package_shipped":
        updates.printfulStatus = "shipped";
        if (data.shipment?.tracking_number) updates.trackingNumber = data.shipment.tracking_number;
        if (data.shipment?.tracking_url) updates.trackingUrl = data.shipment.tracking_url;
        console.log(`[Printful Webhook] Order ${order.id} shipped (v1). Tracking: ${updates.trackingNumber || "N/A"}`);
        break;

      case "package_in_transit":
        updates.printfulStatus = "in_transit";
        if (data.shipment?.tracking_number && !order.trackingNumber) updates.trackingNumber = data.shipment.tracking_number;
        if (data.shipment?.tracking_url && !order.trackingUrl) updates.trackingUrl = data.shipment.tracking_url;
        console.log(`[Printful Webhook] Order ${order.id} in transit (v1)`);
        break;

      case "package_delivered":
        updates.printfulStatus = "delivered";
        updates.status = "delivered";
        console.log(`[Printful Webhook] Order ${order.id} delivered (v1)!`);
        await triggerEscrowDistribution(order.id, "package_delivered");
        break;

      // ── v2 이벤트 ──────────────────────────────────────────
      case "shipment_sent":
        updates.printfulStatus = "shipped";
        // v2 payload: data.tracking_number / data.tracking_url / data.carrier_url
        const sentTracking = data.tracking_number || data.shipment?.tracking_number;
        const sentUrl = data.tracking_url || data.carrier_url || data.shipment?.tracking_url;
        if (sentTracking) updates.trackingNumber = sentTracking;
        if (sentUrl) updates.trackingUrl = sentUrl;
        console.log(`[Printful Webhook] Order ${order.id} shipment_sent (v2). Tracking: ${updates.trackingNumber || "N/A"}`);
        break;

      case "shipment_delivered":
        updates.printfulStatus = "delivered";
        updates.status = "delivered";
        console.log(`[Printful Webhook] Order ${order.id} shipment_delivered (v2)!`);
        await triggerEscrowDistribution(order.id, "shipment_delivered");
        break;

      case "shipment_returned":
        updates.printfulStatus = "returned";
        updates.status = "returned";
        console.log(`[Printful Webhook] Order ${order.id} shipment_returned (v2)`);
        break;

      case "shipment_canceled":
        updates.printfulStatus = "canceled";
        console.log(`[Printful Webhook] Order ${order.id} shipment_canceled (v2)`);
        break;

      // ── 공통 주문 이벤트 ───────────────────────────────────
      case "order_failed":
        updates.printfulStatus = "failed";
        updates.status = "failed";
        console.log(`[Printful Webhook] Order ${order.id} failed`);
        break;

      case "order_canceled":
        updates.printfulStatus = "canceled";
        updates.status = "canceled";
        console.log(`[Printful Webhook] Order ${order.id} canceled`);
        break;

      case "order_created":
        updates.printfulStatus = "pending";
        console.log(`[Printful Webhook] Order ${order.id} created in Printful`);
        break;

      case "order_updated":
        if (data.order?.status) updates.printfulStatus = data.order.status;
        else if (data.status) updates.printfulStatus = data.status;
        console.log(`[Printful Webhook] Order ${order.id} updated: ${data.order?.status || data.status || "unknown"}`);
        break;

      default:
        console.log(`[Printful Webhook] Unhandled event type: ${type}`);
        return res.status(200).json({ ok: true });
    }

    if (Object.keys(updates).length > 0) {
      await storage.updateOrder(order.id, updates);
      console.log(`[Printful Webhook] Order ${order.id} updated:`, updates);
    }

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error("[Printful Webhook] Error:", error.message);
    return res.status(200).json({ ok: true });
  }
});

export default router;
