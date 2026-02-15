import { Router } from "express";
import { storage } from "../storage";
import { insertGoodsSchema, insertOrderSchema } from "@shared/schema";
import { config } from "../config";

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
const TSHIRT_PRODUCT_ID = 71;

const VARIANT_MAP: Record<string, Record<string, number>> = {
  "White": { "S": 4011, "M": 4012, "L": 4013, "XL": 4014, "2XL": 4015 },
  "Black": { "S": 4017, "M": 4018, "L": 4019, "XL": 4020, "2XL": 4021 },
  "Navy": { "S": 4023, "M": 4024, "L": 4025, "XL": 4026, "2XL": 4027 },
  "Red": { "S": 4029, "M": 4030, "L": 4031, "XL": 4032, "2XL": 4033 },
  "Royal": { "S": 4035, "M": 4036, "L": 4037, "XL": 4038, "2XL": 4039 },
};

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
    if (!PRINTFUL_API_KEY) {
      return res.json({
        productId: TSHIRT_PRODUCT_ID,
        productName: "Bella + Canvas 3001 Unisex Short Sleeve Jersey T-Shirt",
        variants: VARIANT_MAP,
        availableColors: Object.keys(VARIANT_MAP),
        availableSizes: ["S", "M", "L", "XL", "2XL"],
      });
    }

    const data = await printfulRequest("GET", `/products/${TSHIRT_PRODUCT_ID}`);
    const variants = data.result?.variants || [];

    const colorSizeMap: Record<string, Record<string, number>> = {};
    const allColors = new Set<string>();
    const allSizes = new Set<string>();

    for (const variant of variants) {
      const color = variant.color || "Unknown";
      const size = variant.size || "Unknown";
      allColors.add(color);
      allSizes.add(size);
      if (!colorSizeMap[color]) colorSizeMap[color] = {};
      colorSizeMap[color][size] = variant.id;
    }

    res.json({
      productId: TSHIRT_PRODUCT_ID,
      productName: data.result?.product?.title || "Bella + Canvas 3001",
      variants: colorSizeMap,
      availableColors: Array.from(allColors),
      availableSizes: Array.from(allSizes),
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
    const { title, description, imageUrl, contestId, memeId, retailPrice, sizes, colors, category, productType } = req.body;

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
      category: category || "clothing",
      productType: productType || "t-shirt",
      basePrice: retailPrice * 0.6,
      retailPrice,
      sizes: sizes || ["S", "M", "L", "XL", "2XL"],
      colors: colors || ["Black", "White"],
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
    const { title, description, imageUrl, contestId, memeId, retailPrice, sizes, colors } = req.body;

    if (!title || !imageUrl || !retailPrice) {
      return res.status(400).json({ error: "title, imageUrl, and retailPrice are required" });
    }

    if (!PRINTFUL_API_KEY) {
      return res.status(500).json({ error: "Printful API key not configured" });
    }

    const selectedSizes = sizes || ["S", "M", "L", "XL", "2XL"];
    const selectedColors = colors || ["Black", "White"];

    const syncVariants: any[] = [];
    for (const color of selectedColors) {
      for (const size of selectedSizes) {
        const variantId = VARIANT_MAP[color]?.[size];
        if (variantId) {
          syncVariants.push({
            variant_id: variantId,
            retail_price: retailPrice.toFixed(2),
            files: [{ url: imageUrl }],
          });
        }
      }
    }

    if (syncVariants.length === 0) {
      return res.status(400).json({ error: "No valid variant combinations found for the selected sizes and colors" });
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

    let mockupUrls: string[] = [imageUrl];
    try {
      const mockupPayload = {
        variant_ids: syncVariantsResult.slice(0, 1).map((v: any) => v.variant_id),
        format: "jpg",
        files: [{ placement: "front", image_url: imageUrl }],
      };

      const mockupTask = await printfulRequest(
        "POST",
        `/mockup-generator/create-task/${TSHIRT_PRODUCT_ID}`,
        mockupPayload
      );

      if (mockupTask.result?.task_key) {
        let taskComplete = false;
        let attempts = 0;
        while (!taskComplete && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          try {
            const taskResult = await printfulRequest(
              "GET",
              `/mockup-generator/task?task_key=${mockupTask.result.task_key}`
            );
            if (taskResult.result?.status === "completed") {
              taskComplete = true;
              const mockups = taskResult.result?.mockups || [];
              mockupUrls = mockups.map((m: any) => m.mockup_url).filter(Boolean);
              if (mockupUrls.length === 0) mockupUrls = [imageUrl];
            } else if (taskResult.result?.status === "failed") {
              break;
            }
          } catch {
            break;
          }
          attempts++;
        }
      }
    } catch (mockupError) {
      console.error("Mockup generation failed, using original image:", mockupError);
    }

    const goodsData = insertGoodsSchema.parse({
      printfulProductId: syncProduct?.id || null,
      printfulVariantId: syncVariantsResult[0]?.id || null,
      contestId: contestId || null,
      memeId: memeId || null,
      title,
      description: description || null,
      imageUrl: imageUrl,
      mockupUrls,
      category: "clothing",
      productType: "t-shirt",
      basePrice: retailPrice * 0.6,
      retailPrice,
      sizes: selectedSizes,
      colors: selectedColors,
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
    const firstColor = item.colors?.[0] || "Black";
    const firstSize = item.sizes?.[0] || "M";
    const variantId = VARIANT_MAP[firstColor]?.[firstSize] || 4018;

    const secondColor = item.colors?.find((c: string) => c !== firstColor);
    const variantIds = [variantId];
    if (secondColor) {
      const secondVariantId = VARIANT_MAP[secondColor]?.[firstSize];
      if (secondVariantId) variantIds.push(secondVariantId);
    }

    const mockupPayload = {
      variant_ids: variantIds,
      format: "jpg",
      files: [{
        placement: "front",
        image_url: imageUrl,
        position: {
          area_width: 1800,
          area_height: 2400,
          width: 1800,
          height: 1800,
          top: 300,
          left: 0
        }
      }],
    };

    console.log("Creating mockup task for goods #" + id, JSON.stringify(mockupPayload));

    const mockupTask = await printfulRequest(
      "POST",
      `/mockup-generator/create-task/${TSHIRT_PRODUCT_ID}`,
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

    const firstColor = item.colors?.[0] || "Black";
    const firstSize = item.sizes?.[0] || "M";
    const variantId = VARIANT_MAP[firstColor]?.[firstSize] || 4018;

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
      size, color, buyerWallet, buyerEmail,
      shippingName, shippingAddress1, shippingAddress2,
      shippingCity, shippingState, shippingCountry, shippingZip, shippingPhone,
    } = req.body;

    if (!size || !color || !buyerWallet || !buyerEmail || !shippingName ||
        !shippingAddress1 || !shippingCity || !shippingCountry || !shippingZip) {
      return res.status(400).json({ error: "Missing required fields: size, color, buyerWallet, buyerEmail, shippingName, shippingAddress1, shippingCity, shippingCountry, shippingZip" });
    }

    const variantId = VARIANT_MAP[color]?.[size];
    if (!variantId) {
      return res.status(400).json({ error: `Invalid size/color combination: ${size}/${color}` });
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
