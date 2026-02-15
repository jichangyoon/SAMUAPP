import { Router } from "express";
import { storage } from "../storage";
import { insertGoodsSchema, insertOrderSchema } from "@shared/schema";
import { config } from "../config";
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

const router = Router();

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

const TREASURY_WALLET = process.env.TREASURY_WALLET_ADDRESS || "4WjMuna7iLjPE897m5fphErUt7AnSdjJTky1hyfZZaJk";

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
    res.json(userOrders);
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

router.post("/admin/create-simple", requireAdmin, async (req, res) => {
  try {
    const { title, description, imageUrl, contestId, memeId, retailPrice, sizes, category, productType } = req.body;

    if (!title || !imageUrl || !retailPrice) {
      return res.status(400).json({ error: "title, imageUrl, and retailPrice are required" });
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
      basePrice: retailPrice * 0.6,
      retailPrice,
      sizes: sizes || ['3"×3"', '4"×4"', '5.5"×5.5"'],
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
    const syncProduct = productResult.result?.sync_product;
    const syncVariantsResult = productResult.result?.sync_variants || [];

    const goodsData = insertGoodsSchema.parse({
      printfulProductId: syncProduct?.id || null,
      printfulVariantId: syncVariantsResult[0]?.id || null,
      contestId: contestId || null,
      memeId: memeId || null,
      title,
      description: description || null,
      imageUrl: imageUrl,
      mockupUrls: [imageUrl],
      category: "sticker",
      productType: "sticker",
      basePrice: retailPrice * 0.6,
      retailPrice,
      sizes: selectedSizes,
      colors: [],
      status: "active",
    });

    const item = await storage.createGoods(goodsData);
    res.json({ goods: item, printfulProduct: syncProduct });
  } catch (error: any) {
    console.error("Error creating goods with Printful:", error);
    res.status(500).json({ error: error.message || "Failed to create goods with Printful" });
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

    console.log("Creating sticker mockup task for goods #" + id, JSON.stringify(mockupPayload));

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
        console.log("Mockup task status:", taskResult.result?.status, "attempt:", attempts);

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

    const updatedItem = await storage.updateGoods(id, {
      mockupUrls: mockupUrls,
    });

    res.json({ mockupUrls, goods: updatedItem });
  } catch (error: any) {
    console.error("Error generating mockup:", error);
    res.status(500).json({ error: error.message || "Failed to generate mockup" });
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

    const { buyerWallet, shippingCostUSD } = req.body;
    if (!buyerWallet) {
      return res.status(400).json({ error: "buyerWallet is required" });
    }

    const totalUSD = item.retailPrice + (parseFloat(shippingCostUSD) || 0);
    const solPriceUSD = await getSOLPriceUSD();
    const solAmount = parseFloat((totalUSD / solPriceUSD).toFixed(6));

    const connection = getSolConnection();
    const buyerPubkey = new PublicKey(buyerWallet);
    const treasuryPubkey = new PublicKey(TREASURY_WALLET);

    const lamports = Math.ceil(solAmount * LAMPORTS_PER_SOL);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: buyerPubkey,
        toPubkey: treasuryPubkey,
        lamports,
      })
    );

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
      lamports,
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
      size, buyerWallet, buyerEmail, txSignature, solAmount,
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

    try {
      const txInfo = await connection.getTransaction(txSignature, { maxSupportedTransactionVersion: 0 });
      if (!txInfo || txInfo.meta?.err) {
        return res.status(400).json({ error: "SOL payment transaction failed or not found on-chain" });
      }

      const treasuryPubkey = new PublicKey(TREASURY_WALLET);
      if (!txInfo.meta) {
        return res.status(400).json({ error: "Transaction metadata not available" });
      }
      const preBalances = txInfo.meta.preBalances;
      const postBalances = txInfo.meta.postBalances;
      const accountKeys = txInfo.transaction.message.getAccountKeys().staticAccountKeys;

      let treasuryIdx = -1;
      for (let i = 0; i < accountKeys.length; i++) {
        if (accountKeys[i].equals(treasuryPubkey)) {
          treasuryIdx = i;
          break;
        }
      }

      if (treasuryIdx === -1) {
        return res.status(400).json({ error: "Treasury wallet not found in transaction - invalid payment" });
      }

      const treasuryReceived = postBalances[treasuryIdx] - preBalances[treasuryIdx];
      if (treasuryReceived < minAcceptableLamports) {
        return res.status(400).json({
          error: `Insufficient payment: received ${treasuryReceived / LAMPORTS_PER_SOL} SOL, expected ~${expectedSOL.toFixed(6)} SOL`
        });
      }

      const computedSolAmount = treasuryReceived / LAMPORTS_PER_SOL;
      req.body.solAmount = computedSolAmount;
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

        const orderPayload = {
          recipient: {
            name: shippingName,
            address1: shippingAddress1,
            address2: shippingAddress2 || undefined,
            city: shippingCity,
            state_code: shippingState || undefined,
            country_code: shippingCountry,
            zip: shippingZip,
            phone: shippingPhone || undefined,
            email: buyerEmail,
          },
          items: [{
            sync_variant_id: syncVariantId,
            quantity: 1,
            retail_price: item.retailPrice.toFixed(2),
            files: [{ url: item.imageUrl }],
          }],
        };

        const orderResult = await printfulRequest("POST", "/orders", orderPayload);
        printfulOrderId = orderResult.result?.id || null;
        printfulStatus = orderResult.result?.status || null;
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
      totalPrice: item.retailPrice,
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
    res.json({ order, printfulOrderId });
  } catch (error: any) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: error.message || "Failed to place order" });
  }
});

export default router;
