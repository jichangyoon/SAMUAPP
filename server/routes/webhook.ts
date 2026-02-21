import { Router } from "express";
import { storage } from "../storage";
import crypto from "crypto";

const router = Router();

function verifyPrintfulWebhook(req: any): boolean {
  const webhookSecret = process.env.PRINTFUL_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return true;
  }
  const signature = req.headers["x-printful-signature"];
  if (!signature) {
    return false;
  }
  const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  const expected = crypto.createHmac("sha256", webhookSecret).update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
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

    const printfulOrderId = data.order?.id || data.shipment?.order_id;
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
      case "package_shipped":
        updates.printfulStatus = "shipped";
        if (data.shipment?.tracking_number) {
          updates.trackingNumber = data.shipment.tracking_number;
        }
        if (data.shipment?.tracking_url) {
          updates.trackingUrl = data.shipment.tracking_url;
        }
        console.log(`[Printful Webhook] Order ${order.id} shipped. Tracking: ${updates.trackingNumber || "N/A"}`);
        break;

      case "package_in_transit":
        updates.printfulStatus = "in_transit";
        if (data.shipment?.tracking_number && !order.trackingNumber) {
          updates.trackingNumber = data.shipment.tracking_number;
        }
        if (data.shipment?.tracking_url && !order.trackingUrl) {
          updates.trackingUrl = data.shipment.tracking_url;
        }
        console.log(`[Printful Webhook] Order ${order.id} in transit`);
        break;

      case "package_delivered":
        updates.printfulStatus = "delivered";
        updates.status = "delivered";
        console.log(`[Printful Webhook] Order ${order.id} delivered!`);
        break;

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
        if (data.order?.status) {
          updates.printfulStatus = data.order.status;
        }
        console.log(`[Printful Webhook] Order ${order.id} updated: ${data.order?.status || "unknown"}`);
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
