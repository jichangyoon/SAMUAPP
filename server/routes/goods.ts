import { Router } from "express";
import { storage } from "../storage";
import { insertGoodsSchema, insertOrderSchema } from "@shared/schema";
import { config } from "../config";
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { uploadToR2 } from "../r2-storage";

const router = Router();

const SHARE_RATIOS = {
  creator: 0.45,
  voter: 0.40,
  platform: 0.15,
};

const TREASURY_WALLET = process.env.TREASURY_WALLET_ADDRESS || "4WjMuna7iLjPE897m5fphErUt7AnSdjJTky1hyfZZaJk";
const ESCROW_WALLET = process.env.ESCROW_WALLET_ADDRESS || "ojzHLw6QxUqprnEjk4gfQM3QXS1RKHWjTLXzZS543cg";

async function distributeEscrowProfit(escrowDeposit: any) {
  const profitSol = escrowDeposit.profitSol;
  if (!profitSol || profitSol <= 0) return;

  const contestId = escrowDeposit.contestId;
  if (!contestId) return;

  const creatorPool = profitSol * SHARE_RATIOS.creator;
  const voterPoolAmount = profitSol * SHARE_RATIOS.voter;
  const platformAmount = profitSol * SHARE_RATIOS.platform;

  const memeVoteSummary = await storage.getMemeVoteSummary(contestId);
  const totalVotesReceived = memeVoteSummary.reduce((sum, m) => sum + m.totalSamuReceived, 0);

  const creatorShares: { wallet: string; amount: number; memeId: number; votePercent: number }[] = [];

  if (totalVotesReceived > 0 && memeVoteSummary.length > 0) {
    for (const meme of memeVoteSummary) {
      const votePercent = meme.totalSamuReceived / totalVotesReceived;
      const creatorAmount = creatorPool * votePercent;
      if (creatorAmount > 0) {
        creatorShares.push({
          wallet: meme.authorWallet,
          amount: creatorAmount,
          memeId: meme.memeId,
          votePercent: votePercent * 100,
        });
      }
    }
  } else {
    creatorShares.push({
      wallet: TREASURY_WALLET,
      amount: creatorPool,
      memeId: 0,
      votePercent: 100,
    });
  }

  const dist = await storage.createGoodsRevenueDistribution({
    orderId: escrowDeposit.orderId,
    contestId,
    totalSolAmount: profitSol,
    creatorAmount: creatorPool,
    voterPoolAmount,
    platformAmount,
    status: "distributed_from_escrow",
  });

  await storage.createCreatorRewardDistributions(
    creatorShares.map(cs => ({
      distributionId: dist.id,
      contestId,
      orderId: escrowDeposit.orderId,
      creatorWallet: cs.wallet,
      memeId: cs.memeId,
      solAmount: cs.amount,
      voteSharePercent: cs.votePercent,
    }))
  );

  await storage.updateVoterRewardPool(contestId, voterPoolAmount);

  await storage.updateEscrowStatus(escrowDeposit.id, "distributed", new Date());

  console.log(`Escrow profit distributed for order ${escrowDeposit.orderId}: Total profit=${profitSol.toFixed(6)} SOL`);
  console.log(`  Creators (${creatorShares.length}): ${creatorShares.map(c => `${c.wallet.slice(0,8)}...(${c.votePercent.toFixed(1)}%)=${c.amount.toFixed(6)} SOL`).join(', ')}`);
  console.log(`  Voters pool: ${voterPoolAmount.toFixed(6)} SOL, Platform: ${platformAmount.toFixed(6)} SOL`);

  return { creatorShares, voterPoolAmount, platformAmount };
}

const TRUNK_PREFIX_COUNTRIES = new Set([
  'KR', 'JP', 'CN', 'TW', 'HK', 'TH', 'VN', 'PH', 'IN', 'ID', 'MY', 'SG',
  'GB', 'DE', 'FR', 'AU', 'IT', 'ES', 'NL', 'SE', 'BR', 'MX', 'RU', 'TR',
  'ZA', 'NZ', 'IE', 'PT', 'AT', 'CH', 'BE', 'DK', 'NO', 'FI', 'PL', 'CZ',
  'NG', 'EG', 'KE', 'GH', 'TZ', 'UG', 'ET', 'CM', 'CI', 'SN', 'MA', 'TN',
  'SA', 'AE', 'IL', 'JO', 'LB', 'IQ', 'PK', 'BD', 'LK', 'NP', 'MM',
  'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY',
  'HU', 'RO', 'BG', 'HR', 'RS', 'SK', 'SI', 'LT', 'LV', 'EE', 'GR',
]);

function normalizePhoneForPrintful(rawPhone: string, countryCode: string): string {
  if (!rawPhone) return '';
  const parts = rawPhone.trim().split(/\s+/);
  if (parts.length < 2) return rawPhone.trim();

  const dialCode = parts[0];
  let localPart = parts.slice(1).join(' ');

  localPart = localPart.replace(/[-().]/g, ' ').replace(/\s+/g, ' ').trim();

  if (TRUNK_PREFIX_COUNTRIES.has(countryCode) && localPart.startsWith('0')) {
    localPart = localPart.substring(1).trim();
  }

  return `${dialCode} ${localPart}`;
}

function requireAdmin(req: any, res: any, next: any) {
  const email = req.headers["x-admin-email"] || req.body?.adminEmail;
  if (!email || !config.ADMIN_EMAILS.includes(String(email).toLowerCase())) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY || "";
const PRINTFUL_STORE_ID = "17717241";
const PRINTFUL_BASE_URL = "https://api.printful.com";
const STICKER_PRODUCT_ID = 358;

const STICKER_VARIANT_MAP: Record<string, number> = {
  '3"×3"': 10163,
  '4"×4"': 10164,
  '5.5"×5.5"': 10165,
  '15"×3.75"': 16362,
};

const STICKER_PRINTFILE_SIZE: Record<number, { width: number; height: number }> = {
  10163: { width: 900, height: 900 },
  10164: { width: 1200, height: 1200 },
  10165: { width: 1650, height: 1650 },
  16362: { width: 4500, height: 1125 },
};

function getSolConnection(): Connection {
  const HELIUS_API_KEY = process.env.VITE_HELIUS_API_KEY;
  const rpcUrl = HELIUS_API_KEY
    ? `https://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`
    : 'https://api.mainnet-beta.solana.com';
  return new Connection(rpcUrl, 'confirmed');
}

async function getSOLPriceUSD(): Promise<number> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const data = await res.json();
    return data.solana?.usd || 150;
  } catch {
    return 150;
  }
}

async function getPrintfulCatalogPrice(variantId: number): Promise<number | null> {
  if (!PRINTFUL_API_KEY) return null;
  try {
    const data = await printfulRequest("GET", `/products/${STICKER_PRODUCT_ID}`);
    const variants = data.result?.variants || [];
    const variant = variants.find((v: any) => v.id === variantId);
    if (variant?.price) {
      return parseFloat(variant.price);
    }
  } catch (err: any) {
    console.error("Printful catalog price fetch failed:", err.message);
  }
  return null;
}

async function getPrintfulProductCost(item: any, shippingAddress?: any): Promise<{ productCost: number; shippingCost: number; totalCost: number }> {
  if (!PRINTFUL_API_KEY) {
    const fallbackCost = (item.basePrice || item.retailPrice * 0.6);
    return { productCost: fallbackCost, shippingCost: 4.99, totalCost: fallbackCost + 4.99 };
  }

  try {
    const firstSize = item.sizes?.[0] || '3"×3"';
    const variantId = STICKER_VARIANT_MAP[firstSize] || 10163;

    const estimatePayload: any = {
      items: [{
        variant_id: variantId,
        quantity: 1,
        files: [{ url: item.imageUrl }],
      }],
    };

    if (shippingAddress) {
      estimatePayload.recipient = {
        address1: shippingAddress.address1,
        city: shippingAddress.city,
        country_code: shippingAddress.country_code,
        state_code: shippingAddress.state_code || undefined,
        zip: shippingAddress.zip,
      };
    }

    const data = await printfulRequest("POST", "/orders/estimate-costs", estimatePayload);
    const costs = data.result?.costs;
    if (costs) {
      const productCost = parseFloat(costs.subtotal) || (item.basePrice || item.retailPrice * 0.6);
      const shippingCost = parseFloat(costs.shipping) || 4.99;
      return { productCost, shippingCost, totalCost: productCost + shippingCost };
    }
  } catch (err: any) {
    console.error("Printful cost estimate failed, using fallback:", err.message);
  }

  const fallbackCost = (item.basePrice || item.retailPrice * 0.6);
  return { productCost: fallbackCost, shippingCost: 4.99, totalCost: fallbackCost + 4.99 };
}

function getPrintfulHeaders() {
  return {
    "Authorization": `Bearer ${PRINTFUL_API_KEY}`,
    "X-PF-Store-Id": PRINTFUL_STORE_ID,
    "Content-Type": "application/json",
  };
}

async function printfulRequest(method: string, path: string, body?: any) {
  const url = `${PRINTFUL_BASE_URL}${path}`;
  const options: RequestInit = {
    method,
    headers: getPrintfulHeaders(),
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Printful API error: ${data.error?.message || data.message || JSON.stringify(data)}`);
  }
  return data;
}

router.get("/", async (_req, res) => {
  try {
    const allGoods = await storage.getGoods();
    res.json(allGoods);
  } catch (error) {
    console.error("Error fetching goods:", error);
    res.status(500).json({ error: "Failed to fetch goods" });
  }
});

router.get("/printful/variants", async (_req, res) => {
  try {
    res.json({
      productId: STICKER_PRODUCT_ID,
      productName: "Kiss-Cut Stickers",
      variants: STICKER_VARIANT_MAP,
      availableSizes: Object.keys(STICKER_VARIANT_MAP),
    });
  } catch (error: any) {
    console.error("Error fetching Printful variants:", error);
    res.status(500).json({ error: error.message || "Failed to fetch variants" });
  }
});

router.get("/orders/:wallet", async (req, res) => {
  try {
    const walletAddress = req.params.wallet;
    const userOrders = await storage.getOrders(walletAddress);
    const allGoods = await storage.getGoods();
    const goodsMap = new Map(allGoods.map(g => [g.id, g]));
    const enriched = userOrders.map(order => {
      const goodsItem = goodsMap.get(order.goodsId);
      return {
        ...order,
        goodsTitle: goodsItem?.title || '',
        goodsImageUrl: goodsItem?.imageUrl || '',
        goodsDescription: goodsItem?.description || '',
      };
    });
    res.json(enriched);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid goods ID" });
    }
    const item = await storage.getGoodsById(id);
    if (!item) {
      return res.status(404).json({ error: "Goods not found" });
    }
    res.json(item);
  } catch (error) {
    console.error("Error fetching goods item:", error);
    res.status(500).json({ error: "Failed to fetch goods item" });
  }
});

router.get("/:id/story", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid goods ID" });
    }
    const item = await storage.getGoodsById(id);
    if (!item) {
      return res.status(404).json({ error: "Goods not found" });
    }

    let meme = null;
    let contest = null;
    let totalMemes = 0;
    let totalVotes = 0;
    let memeVotes = 0;
    let memeRank = 0;
    let creatorUser = null;

    if (item.memeId) {
      meme = await storage.getMemeById(item.memeId);
      if (meme?.authorWallet) {
        creatorUser = await storage.getUserByWallet(meme.authorWallet);
      }
    }

    const contestId = item.contestId || meme?.contestId;
    if (contestId) {
      contest = await storage.getContestById(contestId);
      const contestMemes = await storage.getMemesByContestId(contestId);
      totalMemes = contestMemes.length;

      const voteSummary = await storage.getMemeVoteSummary(contestId);
      totalVotes = voteSummary.reduce((sum, m) => sum + m.totalSamuReceived, 0);

      if (item.memeId) {
        const memeEntry = voteSummary.find(m => m.memeId === item.memeId);
        memeVotes = memeEntry?.totalSamuReceived || 0;

        const sorted = [...voteSummary].sort((a, b) => b.totalSamuReceived - a.totalSamuReceived);
        memeRank = sorted.findIndex(m => m.memeId === item.memeId) + 1;
      }
    }

    res.json({
      goods: item,
      meme: meme ? {
        id: meme.id,
        title: meme.title,
        imageUrl: meme.imageUrl,
        authorWallet: meme.authorWallet,
        creatorName: creatorUser?.displayName || null,
        creatorAvatar: creatorUser?.avatarUrl || null,
      } : null,
      contest: contest ? {
        id: contest.id,
        title: contest.title,
        status: contest.status,
        startTime: contest.startTime,
        endTime: contest.endTime,
      } : null,
      stats: {
        totalMemes,
        totalVotes,
        memeVotes,
        memeRank,
        votePercent: totalVotes > 0 ? (memeVotes / totalVotes) * 100 : 0,
      },
      shareRatios: SHARE_RATIOS,
    });
  } catch (error: any) {
    console.error("Error fetching goods story:", error);
    res.status(500).json({ error: error.message || "Failed to fetch goods story" });
  }
});

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
    console.error("Error creating goods (simple):", error);
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
      sync_product: {
        name: title,
        thumbnail: imageUrl,
      },
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
        if (variants.length > 0) {
          printfulVariantId = variants[0].id;
        }
      } catch (detailErr: any) {
        console.error("Failed to fetch product variants:", detailErr.message);
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
      imageUrl: imageUrl,
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
    console.error("Error creating goods with Printful:", error);
    res.status(500).json({ error: error.message || "Failed to create goods with Printful" });
  }
});

router.post("/admin/sync-printful/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid goods ID" });
    }

    const item = await storage.getGoodsById(id);
    if (!item) {
      return res.status(404).json({ error: "Goods not found" });
    }

    if (!PRINTFUL_API_KEY) {
      return res.status(500).json({ error: "Printful API key not configured" });
    }

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
      sync_product: {
        name: item.title,
        thumbnail: item.imageUrl,
      },
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
        if (variants.length > 0) {
          printfulVariantId = variants[0].id;
        }
      } catch (detailErr: any) {
        console.error("Failed to fetch product variants:", detailErr.message);
      }
    }

    const updatedItem = await storage.updateGoods(id, {
      printfulProductId,
      printfulVariantId,
    });

    res.json({ goods: updatedItem, printfulProductId, printfulVariantId });
  } catch (error: any) {
    console.error("Error syncing goods to Printful:", error);
    res.status(500).json({ error: error.message || "Failed to sync to Printful" });
  }
});

router.post("/admin/generate-mockup/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid goods ID" });
    }

    const item = await storage.getGoodsById(id);
    if (!item) {
      return res.status(404).json({ error: "Goods not found" });
    }

    if (!PRINTFUL_API_KEY) {
      return res.status(500).json({ error: "Printful API key not configured" });
    }

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
      mockupPayload
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
        const taskResult = await printfulRequest(
          "GET",
          `/mockup-generator/task?task_key=${taskKey}`
        );
        if (taskResult.result?.status === "completed") {
          taskComplete = true;
          const mockups = taskResult.result?.mockups || [];
          mockupUrls = mockups.map((m: any) => m.mockup_url).filter(Boolean);
        } else if (taskResult.result?.status === "failed") {
          return res.status(500).json({ error: "Mockup generation failed", details: taskResult.result });
        }
      } catch (pollError: any) {
        console.error("Mockup poll error:", pollError.message);
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
          console.error(`Failed to upload mockup ${i} to R2:`, result.error);
          permanentUrls.push(mockupUrls[i]);
        }
      } catch (dlError: any) {
        console.error(`Failed to download/upload mockup ${i}:`, dlError.message);
        permanentUrls.push(mockupUrls[i]);
      }
    }

    const updatedItem = await storage.updateGoods(id, {
      mockupUrls: permanentUrls,
    });

    res.json({ mockupUrls: permanentUrls, goods: updatedItem });
  } catch (error: any) {
    console.error("Error generating mockup:", error);
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
        (url: string) => url.includes('printful-upload.s3') || url.includes('/tmp/')
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

router.post("/:id/estimate-shipping", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid goods ID" });
    }

    const item = await storage.getGoodsById(id);
    if (!item) {
      return res.status(404).json({ error: "Goods not found" });
    }

    if (!PRINTFUL_API_KEY) {
      return res.json({
        shipping_rates: [{
          id: "STANDARD",
          name: "Flat Rate (Standard)",
          rate: "4.99",
          currency: "USD",
          minDeliveryDays: 5,
          maxDeliveryDays: 10,
        }],
      });
    }

    const { address1, city, country_code, state_code, zip } = req.body;

    if (!address1 || !city || !country_code || !zip) {
      return res.status(400).json({ error: "address1, city, country_code, and zip are required" });
    }

    const firstSize = item.sizes?.[0] || '3"×3"';
    const variantId = STICKER_VARIANT_MAP[firstSize] || 10163;

    const shippingPayload = {
      recipient: {
        address1,
        city,
        country_code,
        state_code: state_code || undefined,
        zip,
      },
      items: [{
        variant_id: variantId,
        quantity: 1,
      }],
    };

    const data = await printfulRequest("POST", "/shipping/rates", shippingPayload);
    res.json({ shipping_rates: data.result || [] });
  } catch (error: any) {
    console.error("Error estimating shipping:", error);
    res.status(500).json({ error: error.message || "Failed to estimate shipping" });
  }
});

router.post("/:id/prepare-payment", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid goods ID" });
    }

    const item = await storage.getGoodsById(id);
    if (!item) {
      return res.status(404).json({ error: "Goods not found" });
    }

    const { buyerWallet, shippingCostUSD, shippingAddress } = req.body;
    if (!buyerWallet) {
      return res.status(400).json({ error: "buyerWallet is required" });
    }

    const totalUSD = item.retailPrice + (parseFloat(shippingCostUSD) || 0);
    const solPriceUSD = await getSOLPriceUSD();
    const solAmount = parseFloat((totalUSD / solPriceUSD).toFixed(6));

    const printfulCost = await getPrintfulProductCost(item, shippingAddress);
    const costUSD = printfulCost.totalCost;
    const profitUSD = Math.max(0, totalUSD - costUSD);

    const costSol = parseFloat((costUSD / solPriceUSD).toFixed(6));
    const profitSol = parseFloat((profitUSD / solPriceUSD).toFixed(6));

    const connection = getSolConnection();
    const buyerPubkey = new PublicKey(buyerWallet);
    const treasuryPubkey = new PublicKey(TREASURY_WALLET);
    const escrowPubkey = new PublicKey(ESCROW_WALLET);

    const totalLamports = Math.ceil(solAmount * LAMPORTS_PER_SOL);
    const costLamports = Math.ceil(costSol * LAMPORTS_PER_SOL);
    const profitLamports = Math.max(0, totalLamports - costLamports);

    const transaction = new Transaction();
    const splits: { recipient: string; role: string; lamports: number; solAmount: number }[] = [];

    transaction.add(
      SystemProgram.transfer({ fromPubkey: buyerPubkey, toPubkey: treasuryPubkey, lamports: costLamports })
    );
    splits.push({ recipient: TREASURY_WALLET, role: "cost", lamports: costLamports, solAmount: costLamports / LAMPORTS_PER_SOL });

    if (profitLamports > 0) {
      transaction.add(
        SystemProgram.transfer({ fromPubkey: buyerPubkey, toPubkey: escrowPubkey, lamports: profitLamports })
      );
      splits.push({ recipient: ESCROW_WALLET, role: "escrow_profit", lamports: profitLamports, solAmount: profitLamports / LAMPORTS_PER_SOL });
    }

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = buyerPubkey;

    const serializedTx = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }).toString('base64');

    res.json({
      transaction: serializedTx,
      solAmount,
      solPriceUSD,
      totalUSD,
      shippingCostUSD: parseFloat(shippingCostUSD) || 0,
      retailPrice: item.retailPrice,
      lamports: totalLamports,
      splits,
      costBreakdown: {
        costUSD,
        profitUSD,
        costSol,
        profitSol,
        printfulProductCost: printfulCost.productCost,
        printfulShippingCost: printfulCost.shippingCost,
      },
      distribution: {
        treasury: { wallet: TREASURY_WALLET, amount: costLamports / LAMPORTS_PER_SOL, role: "production_cost" },
        escrow: { wallet: ESCROW_WALLET, amount: profitLamports / LAMPORTS_PER_SOL, role: "profit_escrow" },
      },
    });
  } catch (error: any) {
    console.error("Error preparing payment:", error);
    res.status(500).json({ error: error.message || "Failed to prepare payment" });
  }
});

router.post("/:id/order", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid goods ID" });
    }

    const item = await storage.getGoodsById(id);
    if (!item) {
      return res.status(404).json({ error: "Goods not found" });
    }

    const {
      size, buyerWallet, buyerEmail, txSignature, solAmount, shippingCostUSD,
      shippingName, shippingAddress1, shippingAddress2,
      shippingCity, shippingState, shippingCountry, shippingZip, shippingPhone,
    } = req.body;

    const color = req.body.color || "";

    if (!size || !buyerWallet || !buyerEmail || !shippingName ||
        !shippingAddress1 || !shippingCity || !shippingCountry || !shippingZip || !txSignature) {
      return res.status(400).json({ error: "Missing required fields (including txSignature for SOL payment)" });
    }

    const existingOrder = await storage.getOrderByTxSignature(txSignature);
    if (existingOrder) {
      return res.status(400).json({ error: "This transaction has already been used for an order (replay rejected)" });
    }

    const connection = getSolConnection();
    const solPriceUSD = await getSOLPriceUSD();

    const shippingRes = await (async () => {
      if (!PRINTFUL_API_KEY) return 4.99;
      try {
        const firstSize = item.sizes?.[0] || '3"×3"';
        const sVariantId = STICKER_VARIANT_MAP[firstSize] || 10163;
        const data = await printfulRequest("POST", "/shipping/rates", {
          recipient: {
            address1: shippingAddress1,
            city: shippingCity,
            country_code: shippingCountry,
            state_code: shippingState || undefined,
            zip: shippingZip,
          },
          items: [{ variant_id: sVariantId, quantity: 1 }],
        });
        return parseFloat(data.result?.[0]?.rate) || 4.99;
      } catch { return 4.99; }
    })();

    const expectedTotalUSD = item.retailPrice + shippingRes;
    const expectedSOL = expectedTotalUSD / solPriceUSD;
    const expectedLamports = Math.ceil(expectedSOL * LAMPORTS_PER_SOL);
    const minAcceptableLamports = Math.floor(expectedLamports * 0.95);

    let verifiedCostAmount = 0;
    let verifiedEscrowAmount = 0;

    try {
      const txInfo = await connection.getTransaction(txSignature, { maxSupportedTransactionVersion: 0 });
      if (!txInfo || txInfo.meta?.err) {
        return res.status(400).json({ error: "SOL payment transaction failed or not found on-chain" });
      }

      if (!txInfo.meta) {
        return res.status(400).json({ error: "Transaction metadata not available" });
      }

      const preBalances = txInfo.meta.preBalances;
      const postBalances = txInfo.meta.postBalances;
      const accountKeys = txInfo.transaction.message.getAccountKeys().staticAccountKeys;

      const treasuryPubkey = new PublicKey(TREASURY_WALLET);
      const escrowPubkey = new PublicKey(ESCROW_WALLET);
      let totalReceived = 0;

      for (let i = 0; i < accountKeys.length; i++) {
        const received = postBalances[i] - preBalances[i];
        if (received <= 0) continue;

        if (accountKeys[i].equals(treasuryPubkey)) {
          totalReceived += received;
          verifiedCostAmount = received / LAMPORTS_PER_SOL;
        } else if (accountKeys[i].equals(escrowPubkey)) {
          totalReceived += received;
          verifiedEscrowAmount = received / LAMPORTS_PER_SOL;
        }
      }

      if (totalReceived < minAcceptableLamports) {
        return res.status(400).json({
          error: `Insufficient payment: received ${totalReceived / LAMPORTS_PER_SOL} SOL, expected ~${expectedSOL.toFixed(6)} SOL`
        });
      }

      const computedSolAmount = totalReceived / LAMPORTS_PER_SOL;
      req.body.solAmount = computedSolAmount;
      req.body.verifiedCostAmount = verifiedCostAmount;
      req.body.verifiedEscrowAmount = verifiedEscrowAmount;
    } catch (verifyErr: any) {
      console.error("Transaction verification error:", verifyErr);
      return res.status(400).json({ error: "Could not verify SOL payment transaction" });
    }

    const variantId = STICKER_VARIANT_MAP[size];
    if (!variantId) {
      return res.status(400).json({ error: `Invalid sticker size: ${size}` });
    }

    let printfulOrderId: number | null = null;
    let printfulStatus: string | null = null;

    if (PRINTFUL_API_KEY && item.printfulProductId) {
      try {
        const syncVariantId = item.printfulVariantId;

        const normalizedPhone = shippingPhone ? normalizePhoneForPrintful(shippingPhone, shippingCountry) : undefined;

        const orderPayload = {
          recipient: {
            name: shippingName,
            address1: shippingAddress1,
            address2: shippingAddress2 || undefined,
            city: shippingCity,
            state_code: shippingState || undefined,
            country_code: shippingCountry,
            zip: shippingZip,
            phone: normalizedPhone,
            email: buyerEmail,
          },
          items: [{
            sync_variant_id: syncVariantId,
            quantity: 1,
            retail_price: item.retailPrice.toFixed(2),
            files: [{ url: item.imageUrl }],
          }],
        };

        const orderResult = await printfulRequest("POST", "/orders?confirm=true", orderPayload);
        printfulOrderId = orderResult.result?.id || null;
        printfulStatus = orderResult.result?.status || null;
        console.log("Printful order created:", { printfulOrderId, printfulStatus });
      } catch (printfulError: any) {
        console.error("Printful order creation failed:", printfulError);
        printfulStatus = "printful_error";
      }
    }

    const orderData = insertOrderSchema.parse({
      goodsId: id,
      buyerWallet,
      buyerEmail,
      printfulOrderId,
      size,
      color,
      quantity: 1,
      totalPrice: item.retailPrice + shippingRes,
      shippingCostUsd: shippingRes,
      solAmount: solAmount || null,
      txSignature: txSignature || null,
      shippingName,
      shippingAddress1,
      shippingAddress2: shippingAddress2 || null,
      shippingCity,
      shippingState: shippingState || null,
      shippingCountry,
      shippingZip,
      shippingPhone: shippingPhone || null,
      status: printfulOrderId ? "confirmed" : "pending",
      printfulStatus,
      trackingNumber: null,
      trackingUrl: null,
    });

    const order = await storage.createOrder(orderData);

    if (order.solAmount && order.solAmount > 0 && item.contestId) {
      try {
        const escrowAmount = req.body.verifiedEscrowAmount || 0;
        const costAmount = req.body.verifiedCostAmount || 0;

        await storage.createEscrowDeposit({
          orderId: order.id,
          contestId: item.contestId,
          memeId: item.memeId || null,
          totalSolPaid: order.solAmount,
          costSol: costAmount,
          profitSol: escrowAmount,
          costTxSignature: txSignature,
          escrowTxSignature: escrowAmount > 0 ? txSignature : null,
          status: "locked",
        });

        console.log(`Escrow deposit created for order ${order.id}: cost=${costAmount.toFixed(6)} SOL → Treasury, profit=${escrowAmount.toFixed(6)} SOL → Escrow (locked until delivery)`);
      } catch (distError: any) {
        console.error("Escrow deposit creation failed (order still created):", distError.message);
      }
    }

    res.json({ order, printfulOrderId });
  } catch (error: any) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: error.message || "Failed to place order" });
  }
});

router.post("/admin/distribute-escrow/:orderId", requireAdmin, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    const escrow = await storage.getEscrowDepositByOrderId(orderId);
    if (!escrow) {
      return res.status(404).json({ error: "Escrow deposit not found for this order" });
    }

    if (escrow.status !== "locked") {
      return res.status(400).json({ error: `Cannot distribute escrow with status '${escrow.status}'. Only 'locked' escrow deposits can be distributed.` });
    }

    const result = await distributeEscrowProfit(escrow);
    res.json({ success: true, distribution: result, escrowId: escrow.id });
  } catch (error: any) {
    console.error("Error distributing escrow:", error);
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
    console.error("Error fetching escrow deposits:", error);
    res.status(500).json({ error: error.message || "Failed to fetch escrow deposits" });
  }
});

router.get("/escrow/contest/:contestId", async (req, res) => {
  try {
    const contestId = parseInt(req.params.contestId);
    if (isNaN(contestId)) {
      return res.status(400).json({ error: "Invalid contest ID" });
    }

    const deposits = await storage.getEscrowDepositsByContestId(contestId);
    const memeVoteSummary = await storage.getMemeVoteSummary(contestId);
    const totalVotes = memeVoteSummary.reduce((sum, m) => sum + m.totalSamuReceived, 0);

    const creatorBreakdown = memeVoteSummary.map(m => ({
      memeId: m.memeId,
      authorWallet: m.authorWallet,
      votesReceived: m.totalSamuReceived,
      votePercent: totalVotes > 0 ? (m.totalSamuReceived / totalVotes) * 100 : 0,
    }));

    const totalLocked = deposits.filter(d => d.status === "locked").reduce((sum, d) => sum + d.profitSol, 0);
    const totalDistributed = deposits.filter(d => d.status === "distributed").reduce((sum, d) => sum + d.profitSol, 0);

    const creatorDistributions = await storage.getCreatorRewardDistributionsByContestId(contestId);

    res.json({
      contestId,
      deposits,
      totalLocked,
      totalDistributed,
      creatorBreakdown,
      creatorDistributions,
      shareRatios: SHARE_RATIOS,
    });
  } catch (error: any) {
    console.error("Error fetching escrow info:", error);
    res.status(500).json({ error: error.message || "Failed to fetch escrow info" });
  }
});

export default router;
