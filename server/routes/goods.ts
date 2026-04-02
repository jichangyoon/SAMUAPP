import { Router } from "express";
import { storage } from "../storage";
import { insertOrderSchema } from "@shared/schema";
import { config } from "../config";
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { geocodeAddress } from "../utils/geocode";
import { getConnection, getEscrowPoolPda } from "../utils/solana";
import { logger } from "../utils/logger";
import {
  PRINTFUL_API_KEY,
  STICKER_PRODUCT_ID,
  STICKER_VARIANT_MAP,
  normalizePhoneForPrintful,
  printfulRequest,
  getPrintfulProductCost,
} from "../utils/printful-api";
import { getSOLPriceUSD } from "../utils/sol-pricing";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const allGoods = await storage.getGoods();
    res.json(allGoods);
  } catch (error) {
    logger.error("Error fetching goods:", error);
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
    logger.error("Error fetching Printful variants:", error);
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
    logger.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.get("/orders/:orderId/printful-detail", async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.orderId)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }
    const orderId = parseInt(req.params.orderId, 10);

    const order = await storage.getOrderById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const wallet = req.query.wallet as string;
    if (!wallet || order.buyerWallet !== wallet) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (!order.printfulOrderId) {
      return res.status(404).json({ error: "No Printful order linked" });
    }

    if (!PRINTFUL_API_KEY) {
      return res.status(503).json({ error: "Printful API not configured" });
    }

    const data = await printfulRequest("GET", `/orders/${order.printfulOrderId}`);
    const pf = data.result || data.data || data;

    const goods = await storage.getGoodsById(order.goodsId);
    const goodsImageUrl = goods?.imageUrl || null;

    const orderItems = pf.items || pf.order_items || [];
    const items = orderItems.map((item: any) => {
      const nameParts = (item.name || "").split(" / ");
      const size = nameParts.length >= 3 ? nameParts[nameParts.length - 1] : null;
      return {
        name: item.name || "Sticker",
        quantity: item.quantity || 1,
        size,
        price: item.retail_price || item.price || null,
        currency: item.retail_currency || item.currency || "USD",
        thumbnailUrl: item.files?.find((f: any) => f.type === "preview")?.preview_url
          || item.files?.find((f: any) => f.type === "default")?.thumbnail_url
          || goodsImageUrl,
      };
    });

    const costs = pf.retail_costs || pf.costs || null;

    res.json({
      printfulId: pf.id,
      externalId: pf.external_id || null,
      status: pf.status,
      createdAt: pf.created_at || pf.created,
      items,
      costs,
      recipient: pf.recipient ? {
        name: pf.recipient.name,
        city: pf.recipient.city,
        country: pf.recipient.country_name || pf.recipient.country_code,
      } : null,
    });
  } catch (error: any) {
    logger.error("Error fetching Printful detail:", error);
    res.status(500).json({ error: error.message || "Failed to fetch Printful order details" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid goods ID" });

    const item = await storage.getGoodsById(id);
    if (!item) return res.status(404).json({ error: "Goods not found" });

    res.json(item);
  } catch (error) {
    logger.error("Error fetching goods item:", error);
    res.status(500).json({ error: "Failed to fetch goods item" });
  }
});

router.get("/:id/story", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid goods ID" });

    const item = await storage.getGoodsById(id);
    if (!item) return res.status(404).json({ error: "Goods not found" });

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
        const idx = sorted.findIndex(m => m.memeId === item.memeId);
        memeRank = Math.max(1, idx + 1);
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
      shareRatios: config.REVENUE_SHARES,
    });
  } catch (error: any) {
    logger.error("Error fetching goods story:", error);
    res.status(500).json({ error: error.message || "Failed to fetch goods story" });
  }
});

router.post("/:id/estimate-shipping", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid goods ID" });

    const item = await storage.getGoodsById(id);
    if (!item) return res.status(404).json({ error: "Goods not found" });

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

    const data = await printfulRequest("POST", "/shipping/rates", {
      recipient: { address1, city, country_code, state_code: state_code || undefined, zip },
      items: [{ variant_id: variantId, quantity: 1 }],
    });

    const allRates = data.result || [];
    if (allRates.length > 1) {
      allRates.sort((a: any, b: any) => parseFloat(a.rate) - parseFloat(b.rate));
      res.json({ shipping_rates: [allRates[0]] });
    } else {
      res.json({ shipping_rates: allRates });
    }
  } catch (error: any) {
    logger.error("Error estimating shipping:", error);
    res.status(500).json({ error: error.message || "Failed to estimate shipping" });
  }
});

router.post("/:id/prepare-payment", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid goods ID" });

    const item = await storage.getGoodsById(id);
    if (!item) return res.status(404).json({ error: "Goods not found" });

    const { buyerWallet, shippingAddress } = req.body;
    if (!buyerWallet) return res.status(400).json({ error: "buyerWallet is required" });
    if (!shippingAddress || !shippingAddress.address1 || !shippingAddress.city || !shippingAddress.country_code) {
      return res.status(400).json({ error: "Complete shipping address is required" });
    }

    const printfulCost = await getPrintfulProductCost(item, shippingAddress);
    const serverShippingCost = printfulCost.shippingCost;
    const totalUSD = item.retailPrice + serverShippingCost;
    const solPriceUSD = await getSOLPriceUSD();
    const solAmount = parseFloat((totalUSD / solPriceUSD).toFixed(6));

    const costUSD = printfulCost.totalCost;
    const profitUSD = Math.max(0, totalUSD - costUSD);
    const costSol = parseFloat((costUSD / solPriceUSD).toFixed(6));
    const profitSol = parseFloat((profitUSD / solPriceUSD).toFixed(6));

    logger.info(`[prepare-payment] retailPrice=$${item.retailPrice}, shippingCost=$${serverShippingCost}, totalUSD=$${totalUSD}, costUSD=$${costUSD}, profitUSD=$${profitUSD}, solPrice=$${solPriceUSD}, costSol=${costSol}, profitSol=${profitSol}, totalSol=${solAmount}`);

    const connection = getConnection();
    const buyerPubkey = new PublicKey(buyerWallet);
    const treasuryPubkey = new PublicKey(config.TREASURY_WALLET);

    // Phase 2: 컨트랙트 활성화 + 콘테스트 연계 굿즈 → escrow_pool PDA
    // 콘테스트 미연계 굿즈 → ESCROW_WALLET
    let escrowRecipient: string = config.ESCROW_WALLET;
    let escrowRole = "escrow_profit";
    if (item.contestId) {
      const programId = new PublicKey(config.SAMU_REWARDS_PROGRAM_ID);
      const [escrowPoolPda] = getEscrowPoolPda(item.contestId, programId);
      escrowRecipient = escrowPoolPda.toBase58();
      escrowRole = "escrow_pool_pda";
    }
    const escrowPubkey = new PublicKey(escrowRecipient);

    const totalLamports = Math.ceil(solAmount * LAMPORTS_PER_SOL);
    const costLamports = Math.ceil(costSol * LAMPORTS_PER_SOL);
    const profitLamports = Math.max(0, totalLamports - costLamports);

    const transaction = new Transaction();
    const splits: { recipient: string; role: string; lamports: number; solAmount: number }[] = [];

    transaction.add(
      SystemProgram.transfer({ fromPubkey: buyerPubkey, toPubkey: treasuryPubkey, lamports: costLamports }),
    );
    splits.push({ recipient: config.TREASURY_WALLET, role: "cost", lamports: costLamports, solAmount: costLamports / LAMPORTS_PER_SOL });

    if (profitLamports > 0) {
      transaction.add(
        SystemProgram.transfer({ fromPubkey: buyerPubkey, toPubkey: escrowPubkey, lamports: profitLamports }),
      );
      splits.push({ recipient: escrowRecipient, role: escrowRole, lamports: profitLamports, solAmount: profitLamports / LAMPORTS_PER_SOL });
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
      shippingCostUSD: serverShippingCost,
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
        treasury: { wallet: config.TREASURY_WALLET, amount: costLamports / LAMPORTS_PER_SOL, role: "production_cost" },
        escrow: { wallet: config.ESCROW_WALLET, amount: profitLamports / LAMPORTS_PER_SOL, role: "profit_escrow" },
      },
    });
  } catch (error: any) {
    logger.error("Error preparing payment:", error);
    res.status(500).json({ error: error.message || "Failed to prepare payment" });
  }
});

router.post("/:id/order", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid goods ID" });

    const item = await storage.getGoodsById(id);
    if (!item) return res.status(404).json({ error: "Goods not found" });

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

    const connection = getConnection();
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
        const rates = data.result || [];
        if (rates.length > 1) rates.sort((a: any, b: any) => parseFloat(a.rate) - parseFloat(b.rate));
        return parseFloat(rates[0]?.rate) || 4.99;
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

      const treasuryPubkey = new PublicKey(config.TREASURY_WALLET);
      const escrowPubkey = new PublicKey(config.ESCROW_WALLET);

      let escrowPoolPda: PublicKey | null = null;
      if (item.contestId) {
        const programId = new PublicKey(config.SAMU_REWARDS_PROGRAM_ID);
        [escrowPoolPda] = getEscrowPoolPda(item.contestId, programId);
      }

      let totalReceived = 0;

      for (let i = 0; i < accountKeys.length; i++) {
        const received = postBalances[i] - preBalances[i];
        if (received <= 0) continue;

        if (accountKeys[i].equals(treasuryPubkey)) {
          totalReceived += received;
          verifiedCostAmount = received / LAMPORTS_PER_SOL;
        } else if (
          accountKeys[i].equals(escrowPubkey) ||
          (escrowPoolPda && accountKeys[i].equals(escrowPoolPda))
        ) {
          totalReceived += received;
          verifiedEscrowAmount = received / LAMPORTS_PER_SOL;
        }
      }

      if (totalReceived < minAcceptableLamports) {
        return res.status(400).json({
          error: `Insufficient payment: received ${totalReceived / LAMPORTS_PER_SOL} SOL, expected ~${expectedSOL.toFixed(6)} SOL`,
        });
      }

      const computedSolAmount = totalReceived / LAMPORTS_PER_SOL;
      req.body.solAmount = computedSolAmount;
      req.body.verifiedCostAmount = verifiedCostAmount;
      req.body.verifiedEscrowAmount = verifiedEscrowAmount;
    } catch (verifyErr: any) {
      logger.error("Transaction verification error:", verifyErr);
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
        logger.info("Printful order created:", { printfulOrderId, printfulStatus });
      } catch (printfulError: any) {
        logger.error("Printful order creation failed:", printfulError);
        printfulStatus = "printful_error";
      }
    }

    const geoCoords = await geocodeAddress(shippingZip, shippingCountry, shippingCity).catch(() => null);

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
      shippingLat: geoCoords?.lat ?? null,
      shippingLng: geoCoords?.lng ?? null,
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

        logger.info(`Escrow deposit created for order ${order.id}: cost=${costAmount.toFixed(6)} SOL → Treasury, profit=${escrowAmount.toFixed(6)} SOL → Escrow (locked until delivery)`);
      } catch (distError: any) {
        logger.error("Escrow deposit creation failed (order still created):", distError.message);
      }
    }

    res.json({ order, printfulOrderId });
  } catch (error: any) {
    logger.error("Error placing order:", error);
    res.status(500).json({ error: error.message || "Failed to place order" });
  }
});

router.get("/escrow/contest/:contestId", async (req, res) => {
  try {
    const contestId = parseInt(req.params.contestId);
    if (isNaN(contestId)) return res.status(400).json({ error: "Invalid contest ID" });

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
      shareRatios: config.REVENUE_SHARES,
    });
  } catch (error: any) {
    logger.error("Error fetching escrow info:", error);
    res.status(500).json({ error: error.message || "Failed to fetch escrow info" });
  }
});

export default router;
