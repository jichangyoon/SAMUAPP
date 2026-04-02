import { Router } from "express";
import { storage } from "../storage";
import { insertGoodsSchema } from "@shared/schema";
import { config } from "../config";
import { uploadToR2 } from "../r2-storage";
import { requireAdminMiddleware as requireAdmin } from "../utils/admin-auth";
import { logger } from "../utils/logger";
import { distributeEscrowProfit } from "../utils/distribute";
import {
  PRINTFUL_API_KEY,
  STICKER_PRODUCT_ID,
  STICKER_VARIANT_MAP,
  STICKER_PRINTFILE_SIZE,
  printfulRequest,
  getPrintfulCatalogPrice,
} from "../utils/printful-api";

const router = Router();

const SHARE_RATIOS = config.REVENUE_SHARES;

router.post("/admin/create-simple", requireAdmin, async (req, res) => {
  try {
    const { title, description, imageUrl, contestId, memeId, retailPrice, sizes, category, productType } = req.body;

    if (!title || !imageUrl || !retailPrice) {
      return res.status(400).json({ error: "title, imageUrl, and retailPrice are required" });
    }

    const selectedSizes = sizes || ['3"×3"', '4"×4"', '5.5"×5.5"'];
    const firstSize = selectedSizes[0] || '3"×3"';
    const variantId = STICKER_VARIANT_MAP[firstSize] || 10163;

    let actualBasePrice = retailPrice * 0.6;
    const catalogPrice = await getPrintfulCatalogPrice(variantId);
    if (catalogPrice && catalogPrice > 0) {
      actualBasePrice = catalogPrice;
    }

    const goodsData = insertGoodsSchema.parse({
      title,
      description: description || null,
      imageUrl,
      mockupUrls: [imageUrl],
      contestId: contestId || null,
      memeId: memeId || null,
      category: category || "sticker",
      productType: productType || "sticker",
      basePrice: actualBasePrice,
      retailPrice,
      sizes: selectedSizes,
      colors: [],
      status: "active",
    });

    const item = await storage.createGoods(goodsData);
    res.json(item);
  } catch (error: any) {
    logger.error("Error creating goods (simple):", error);
    res.status(400).json({ error: error.message || "Failed to create goods" });
  }
});

router.post("/admin/create", requireAdmin, async (req, res) => {
  try {
    const { title, description, imageUrl, contestId, memeId, retailPrice, sizes } = req.body;

    if (!title || !imageUrl || !retailPrice) {
      return res.status(400).json({ error: "title, imageUrl, and retailPrice are required" });
    }

    if (!PRINTFUL_API_KEY) {
      return res.status(500).json({ error: "Printful API key not configured" });
    }

    const selectedSizes = sizes || ['3"×3"', '4"×4"', '5.5"×5.5"'];

    const syncVariants: any[] = [];
    for (const size of selectedSizes) {
      const variantId = STICKER_VARIANT_MAP[size];
      if (variantId) {
        syncVariants.push({
          variant_id: variantId,
          retail_price: retailPrice.toFixed(2),
          files: [{ url: imageUrl }],
        });
      }
    }

    if (syncVariants.length === 0) {
      return res.status(400).json({ error: "No valid sticker size variants found" });
    }

    const productPayload = {
      sync_product: { name: title, thumbnail: imageUrl },
      sync_variants: syncVariants,
    };

    const productResult = await printfulRequest("POST", "/store/products", productPayload);
    const createResult = productResult.result;
    const printfulProductId = createResult?.sync_product?.id ?? createResult?.id ?? null;

    let printfulVariantId: number | null = null;
    if (createResult?.sync_variants?.length > 0) {
      printfulVariantId = createResult.sync_variants[0].id;
    } else if (printfulProductId) {
      try {
        const productDetail = await printfulRequest("GET", `/store/products/${printfulProductId}`);
        const variants = productDetail.result?.sync_variants || [];
        if (variants.length > 0) printfulVariantId = variants[0].id;
      } catch (detailErr: any) {
        logger.error("Failed to fetch product variants:", detailErr.message);
      }
    }

    const firstSize = selectedSizes[0] || '3"×3"';
    const firstVariantId = STICKER_VARIANT_MAP[firstSize] || 10163;

    let actualBasePrice = retailPrice * 0.6;
    const catalogPrice = await getPrintfulCatalogPrice(firstVariantId);
    if (catalogPrice && catalogPrice > 0) {
      actualBasePrice = catalogPrice;
    }

    const goodsData = insertGoodsSchema.parse({
      printfulProductId,
      printfulVariantId,
      contestId: contestId || null,
      memeId: memeId || null,
      title,
      description: description || null,
      imageUrl,
      mockupUrls: [imageUrl],
      category: "sticker",
      productType: "sticker",
      basePrice: actualBasePrice,
      retailPrice,
      sizes: selectedSizes,
      colors: [],
      status: "active",
    });

    const item = await storage.createGoods(goodsData);
    res.json({ goods: item, printfulProductId, printfulVariantId });
  } catch (error: any) {
    logger.error("Error creating goods with Printful:", error);
    res.status(500).json({ error: error.message || "Failed to create goods with Printful" });
  }
});

router.post("/admin/sync-printful/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid goods ID" });

    const item = await storage.getGoodsById(id);
    if (!item) return res.status(404).json({ error: "Goods not found" });

    if (!PRINTFUL_API_KEY) return res.status(500).json({ error: "Printful API key not configured" });

    if (item.printfulProductId) {
      return res.status(400).json({ error: "This item is already synced to Printful", printfulProductId: item.printfulProductId });
    }

    const selectedSizes = item.sizes || ['3"×3"', '4"×4"', '5.5"×5.5"'];
    const syncVariants: any[] = [];
    for (const size of selectedSizes) {
      const variantId = STICKER_VARIANT_MAP[size as string];
      if (variantId) {
        syncVariants.push({
          variant_id: variantId,
          retail_price: (item.retailPrice || 4.99).toFixed(2),
          files: [{ url: item.imageUrl }],
        });
      }
    }

    if (syncVariants.length === 0) {
      return res.status(400).json({ error: "No valid sticker size variants found for this item" });
    }

    const productPayload = {
      sync_product: { name: item.title, thumbnail: item.imageUrl },
      sync_variants: syncVariants,
    };

    const productResult = await printfulRequest("POST", "/store/products", productPayload);
    const result = productResult.result;
    const printfulProductId = result?.sync_product?.id ?? result?.id ?? null;

    let printfulVariantId: number | null = null;
    if (result?.sync_variants?.length > 0) {
      printfulVariantId = result.sync_variants[0].id;
    } else if (printfulProductId) {
      try {
        const productDetail = await printfulRequest("GET", `/store/products/${printfulProductId}`);
        const variants = productDetail.result?.sync_variants || [];
        if (variants.length > 0) printfulVariantId = variants[0].id;
      } catch (detailErr: any) {
        logger.error("Failed to fetch product variants:", detailErr.message);
      }
    }

    const updatedItem = await storage.updateGoods(id, { printfulProductId, printfulVariantId });
    res.json({ goods: updatedItem, printfulProductId, printfulVariantId });
  } catch (error: any) {
    logger.error("Error syncing goods to Printful:", error);
    res.status(500).json({ error: error.message || "Failed to sync to Printful" });
  }
});

router.post("/admin/generate-mockup/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid goods ID" });

    const item = await storage.getGoodsById(id);
    if (!item) return res.status(404).json({ error: "Goods not found" });

    if (!PRINTFUL_API_KEY) return res.status(500).json({ error: "Printful API key not configured" });

    const imageUrl = item.imageUrl;
    const firstSize = item.sizes?.[0] || '3"×3"';
    const variantId = STICKER_VARIANT_MAP[firstSize] || 10163;

    const variantIds = [variantId];
    const secondSize = item.sizes?.find((s: string) => s !== firstSize);
    if (secondSize) {
      const secondVariantId = STICKER_VARIANT_MAP[secondSize];
      if (secondVariantId) variantIds.push(secondVariantId);
    }

    const printfileSize = STICKER_PRINTFILE_SIZE[variantId] || { width: 900, height: 900 };
    const mockupPayload = {
      variant_ids: variantIds,
      format: "jpg",
      files: [{
        placement: "default",
        image_url: imageUrl,
        position: {
          area_width: printfileSize.width,
          area_height: printfileSize.height,
          width: printfileSize.width,
          height: printfileSize.height,
          top: 0,
          left: 0,
        },
      }],
    };

    const mockupTask = await printfulRequest(
      "POST",
      `/mockup-generator/create-task/${STICKER_PRODUCT_ID}`,
      mockupPayload,
    );

    if (!mockupTask.result?.task_key) {
      return res.status(500).json({ error: "Failed to create mockup task", details: mockupTask });
    }

    const taskKey = mockupTask.result.task_key;
    let mockupUrls: string[] = [];
    let taskComplete = false;
    let attempts = 0;

    while (!taskComplete && attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      try {
        const taskResult = await printfulRequest("GET", `/mockup-generator/task?task_key=${taskKey}`);
        if (taskResult.result?.status === "completed") {
          taskComplete = true;
          mockupUrls = (taskResult.result?.mockups || []).map((m: any) => m.mockup_url).filter(Boolean);
        } else if (taskResult.result?.status === "failed") {
          return res.status(500).json({ error: "Mockup generation failed", details: taskResult.result });
        }
      } catch (pollError: any) {
        logger.error("Mockup poll error:", pollError.message);
      }
      attempts++;
    }

    if (mockupUrls.length === 0) {
      return res.status(500).json({ error: "Mockup generation timed out or produced no results" });
    }

    const permanentUrls: string[] = [];
    for (let i = 0; i < mockupUrls.length; i++) {
      try {
        const response = await fetch(mockupUrls[i]);
        if (!response.ok) throw new Error(`Failed to download mockup: ${response.status}`);
        const buffer = Buffer.from(await response.arrayBuffer());
        const result = await uploadToR2(buffer, `mockup-${id}-${i}.jpg`, `goods/mockups`);
        if (result.success && result.url) {
          permanentUrls.push(result.url);
        } else {
          logger.error(`Failed to upload mockup ${i} to R2:`, result.error);
          permanentUrls.push(mockupUrls[i]);
        }
      } catch (dlError: any) {
        logger.error(`Failed to download/upload mockup ${i}:`, dlError.message);
        permanentUrls.push(mockupUrls[i]);
      }
    }

    const updatedItem = await storage.updateGoods(id, { mockupUrls: permanentUrls });
    res.json({ mockupUrls: permanentUrls, goods: updatedItem });
  } catch (error: any) {
    logger.error("Error generating mockup:", error);
    res.status(500).json({ error: error.message || "Failed to generate mockup" });
  }
});

router.post("/admin/refresh-all-mockups", requireAdmin, async (req, res) => {
  try {
    if (!PRINTFUL_API_KEY) {
      return res.status(500).json({ error: "Printful API key not configured" });
    }

    const allGoods = await storage.getGoods();
    const results: { id: number; title: string; status: string }[] = [];

    for (const item of allGoods) {
      const hasExpiredMockups = (item.mockupUrls || []).some(
        (url: string) => url.includes('printful-upload.s3') || url.includes('/tmp/'),
      );
      if (!hasExpiredMockups && (item.mockupUrls || []).length > 0) {
        results.push({ id: item.id, title: item.title, status: "ok" });
        continue;
      }

      try {
        const imageUrl = item.imageUrl;
        const firstSize = item.sizes?.[0] || '3"×3"';
        const variantId = STICKER_VARIANT_MAP[firstSize] || 10163;
        const variantIds = [variantId];
        const secondSize = item.sizes?.find((s: string) => s !== firstSize);
        if (secondSize) {
          const secondVariantId = STICKER_VARIANT_MAP[secondSize];
          if (secondVariantId) variantIds.push(secondVariantId);
        }
        const printfileSize = STICKER_PRINTFILE_SIZE[variantId] || { width: 900, height: 900 };

        const mockupTask = await printfulRequest("POST", `/mockup-generator/create-task/${STICKER_PRODUCT_ID}`, {
          variant_ids: variantIds,
          format: "jpg",
          files: [{ placement: "default", image_url: imageUrl, position: { area_width: printfileSize.width, area_height: printfileSize.height, width: printfileSize.width, height: printfileSize.height, top: 0, left: 0 } }],
        });

        if (!mockupTask.result?.task_key) {
          results.push({ id: item.id, title: item.title, status: "failed_task_creation" });
          continue;
        }

        let mockupUrls: string[] = [];
        let taskComplete = false;
        let attempts = 0;

        while (!taskComplete && attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const taskResult = await printfulRequest("GET", `/mockup-generator/task?task_key=${mockupTask.result.task_key}`);
          if (taskResult.result?.status === "completed") {
            taskComplete = true;
            mockupUrls = (taskResult.result?.mockups || []).map((m: any) => m.mockup_url).filter(Boolean);
          } else if (taskResult.result?.status === "failed") {
            break;
          }
          attempts++;
        }

        if (mockupUrls.length === 0) {
          results.push({ id: item.id, title: item.title, status: "no_mockups_generated" });
          continue;
        }

        const permanentUrls: string[] = [];
        for (let i = 0; i < mockupUrls.length; i++) {
          try {
            const response = await fetch(mockupUrls[i]);
            if (!response.ok) throw new Error(`Download failed: ${response.status}`);
            const buffer = Buffer.from(await response.arrayBuffer());
            const result = await uploadToR2(buffer, `mockup-${item.id}-${i}.jpg`, `goods/mockups`);
            if (result.success && result.url) {
              permanentUrls.push(result.url);
            } else {
              permanentUrls.push(mockupUrls[i]);
            }
          } catch {
            permanentUrls.push(mockupUrls[i]);
          }
        }

        await storage.updateGoods(item.id, { mockupUrls: permanentUrls });
        results.push({ id: item.id, title: item.title, status: "refreshed" });
      } catch (err: any) {
        results.push({ id: item.id, title: item.title, status: `error: ${err.message}` });
      }
    }

    res.json({ results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/admin/distribute-escrow/:orderId", requireAdmin, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId)) return res.status(400).json({ error: "Invalid order ID" });

    const escrow = await storage.getEscrowDepositByOrderId(orderId);
    if (!escrow) return res.status(404).json({ error: "Escrow deposit not found for this order" });

    if (escrow.status !== "locked") {
      return res.status(400).json({ error: `Cannot distribute escrow with status '${escrow.status}'. Only 'locked' escrow deposits can be distributed.` });
    }

    const result = await distributeEscrowProfit(escrow);
    res.json({ success: true, distribution: result, escrowId: escrow.id });
  } catch (error: any) {
    logger.error("Error distributing escrow:", error);
    res.status(500).json({ error: error.message || "Failed to distribute escrow" });
  }
});

router.get("/admin/escrow-deposits", requireAdmin, async (req, res) => {
  try {
    const contestId = req.query.contestId ? parseInt(req.query.contestId as string) : undefined;
    const deposits = contestId
      ? await storage.getEscrowDepositsByContestId(contestId)
      : await storage.getLockedEscrowDeposits();
    res.json(deposits);
  } catch (error: any) {
    logger.error("Error fetching escrow deposits:", error);
    res.status(500).json({ error: error.message || "Failed to fetch escrow deposits" });
  }
});

export default router;
