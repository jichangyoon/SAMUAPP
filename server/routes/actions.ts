import { Router } from "express";
import { 
  ActionGetResponse, 
  ActionPostRequest, 
  ActionPostResponse,
  ACTIONS_CORS_HEADERS 
} from "@solana/actions";
import { 
  Connection, 
  PublicKey, 
  Transaction
} from "@solana/web3.js";
import { createTransferInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { storage } from "../storage";
import { verifyTransaction } from "./votes";

const router = Router();

const HELIUS_API_KEY = process.env.VITE_HELIUS_API_KEY;
const SAMU_TOKEN_MINT = new PublicKey('EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF');
const SAMU_TOKEN_MINT_STR = 'EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF';
const SAMU_DECIMALS = 8;
const TREASURY_WALLET = process.env.TREASURY_WALLET_ADDRESS || "4WjMuna7iLjPE897m5fphErUt7AnSdjJTky1hyfZZaJk";

function getConnection(): Connection {
  const rpcUrl = HELIUS_API_KEY
    ? `https://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`
    : 'https://api.mainnet-beta.solana.com';
  return new Connection(rpcUrl, 'confirmed');
}

interface PendingVoteIntent {
  memeId: number;
  samuAmount: number;
  wallet: string;
  nonce: string;
  createdAt: number;
}

const pendingVotes = new Map<string, PendingVoteIntent>();

setInterval(() => {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  const keysToDelete: string[] = [];
  pendingVotes.forEach((intent, nonce) => {
    if (now - intent.createdAt > fiveMinutes) {
      keysToDelete.push(nonce);
    }
  });
  keysToDelete.forEach(key => pendingVotes.delete(key));
}, 60 * 1000);

async function getSamuBalance(walletAddress: string): Promise<number> {
  const RPC_ENDPOINTS = [
    `https://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`,
    'https://api.mainnet-beta.solana.com',
    'https://rpc.ankr.com/solana'
  ];

  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Math.floor(Math.random() * 1000),
          method: 'getTokenAccountsByOwner',
          params: [
            walletAddress,
            { mint: SAMU_TOKEN_MINT_STR },
            { encoding: 'jsonParsed' },
          ],
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();
      if (data.error) continue;

      const tokenAccounts = data.result?.value || [];
      if (tokenAccounts.length === 0) return 0;

      const tokenAccount = tokenAccounts[0];
      return tokenAccount?.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0;
    } catch {
      continue;
    }
  }
  return 0;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept-Encoding, X-Action-Version, X-Blockchain-Ids",
  "Access-Control-Expose-Headers": "X-Action-Version, X-Blockchain-Ids",
  "Content-Type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

router.options("/vote/:memeId", (req, res) => {
  res.set(corsHeaders).status(200).end();
});

router.get("/vote/:memeId", async (req, res) => {
  try {
    const memeId = parseInt(req.params.memeId);
    
    if (isNaN(memeId)) {
      return res.set(corsHeaders).status(400).json({ error: "Invalid meme ID" });
    }

    const meme = await storage.getMemeById(memeId);
    if (!meme) {
      return res.set(corsHeaders).status(404).json({ error: "Meme not found" });
    }

    const protocol = req.get("x-forwarded-proto") || req.protocol;
    const baseUrl = `${protocol}://${req.get("host")}`;
    const iconUrl = meme.imageUrl.startsWith("http") 
      ? meme.imageUrl 
      : `${baseUrl}${meme.imageUrl}`;

    const response: ActionGetResponse = {
      type: "action",
      icon: iconUrl,
      title: `Vote for: ${meme.title}`,
      description: `Vote with SAMU tokens! Currently has ${meme.votes.toLocaleString()} SAMU votes.`,
      label: "Vote Now",
      links: {
        actions: [
          {
            type: "transaction",
            label: "100 SAMU",
            href: `${baseUrl}/api/actions/vote/${memeId}?amount=100`,
          },
          {
            type: "transaction",
            label: "1,000 SAMU",
            href: `${baseUrl}/api/actions/vote/${memeId}?amount=1000`,
          },
          {
            type: "transaction",
            label: "10,000 SAMU",
            href: `${baseUrl}/api/actions/vote/${memeId}?amount=10000`,
          },
          {
            type: "transaction",
            label: "Custom Amount",
            href: `${baseUrl}/api/actions/vote/${memeId}?amount={amount}`,
            parameters: [
              {
                name: "amount",
                label: "Enter SAMU amount",
                required: true,
              },
            ],
          },
        ],
      },
    };

    res.set(corsHeaders).json(response);
  } catch (error) {
    console.error("Error in GET /api/actions/vote/:memeId:", error);
    res.set(corsHeaders).status(500).json({ error: "Internal server error" });
  }
});

router.post("/vote/:memeId", async (req, res) => {
  try {
    const memeId = parseInt(req.params.memeId);
    const samuAmount = parseInt(req.query.amount as string) || 100;
    
    if (isNaN(memeId)) {
      return res.set(corsHeaders).status(400).json({ error: "Invalid meme ID" });
    }

    if (samuAmount < 1) {
      return res.set(corsHeaders).status(400).json({ error: "SAMU amount must be at least 1" });
    }

    const body: ActionPostRequest = req.body;
    const userWallet = body.account;

    if (!userWallet) {
      return res.set(corsHeaders).status(400).json({ error: "Wallet address required" });
    }

    let userPublicKey: PublicKey;
    try {
      userPublicKey = new PublicKey(userWallet);
    } catch {
      return res.set(corsHeaders).status(400).json({ error: "Invalid wallet address" });
    }

    const meme = await storage.getMemeById(memeId);
    if (!meme) {
      return res.set(corsHeaders).status(404).json({ error: "Meme not found" });
    }

    const samuBalance = await getSamuBalance(userWallet);
    
    if (samuBalance < samuAmount) {
      return res.set(corsHeaders).status(400).json({ 
        error: `Insufficient SAMU balance. You have ${samuBalance.toLocaleString()} SAMU but need ${samuAmount.toLocaleString()}.` 
      });
    }

    const existingUser = await storage.getUserByWallet(userWallet);
    if (!existingUser) {
      const shortWallet = `${userWallet.slice(0, 4)}...${userWallet.slice(-4)}`;
      await storage.createUser({
        walletAddress: userWallet,
        username: shortWallet,
        email: null,
        avatarUrl: null,
        samuBalance: Math.floor(samuBalance),
      });
      console.log(`[Blinks] Auto-created user for wallet ${shortWallet} with ${samuBalance} SAMU`);
    }

    const connection = getConnection();
    const protocol = req.get("x-forwarded-proto") || req.protocol;
    const baseUrl = `${protocol}://${req.get("host")}`;
    
    const treasuryPubkey = new PublicKey(TREASURY_WALLET);
    const tokenAmount = Math.round(samuAmount * Math.pow(10, SAMU_DECIMALS));
    
    const senderATA = await getAssociatedTokenAddress(SAMU_TOKEN_MINT, userPublicKey);
    const treasuryATA = await getAssociatedTokenAddress(SAMU_TOKEN_MINT, treasuryPubkey);

    const transaction = new Transaction();
    
    let treasuryAccountExists = false;
    try {
      await getAccount(connection, treasuryATA);
      treasuryAccountExists = true;
    } catch {
      treasuryAccountExists = false;
    }

    if (!treasuryAccountExists) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          userPublicKey,
          treasuryATA,
          treasuryPubkey,
          SAMU_TOKEN_MINT
        )
      );
    }

    transaction.add(
      createTransferInstruction(
        senderATA,
        treasuryATA,
        userPublicKey,
        tokenAmount
      )
    );

    const voteNonce = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = userPublicKey;

    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }).toString("base64");

    pendingVotes.set(voteNonce, {
      memeId,
      samuAmount,
      wallet: userWallet,
      nonce: voteNonce,
      createdAt: Date.now(),
    });

    const response: ActionPostResponse = {
      type: "transaction",
      transaction: serializedTransaction,
      message: `Transfer ${samuAmount.toLocaleString()} SAMU to vote for "${meme.title}"`,
      links: {
        next: {
          type: "post",
          href: `${baseUrl}/api/actions/vote/${memeId}/confirm?nonce=${voteNonce}`,
        },
      },
    };

    res.set(corsHeaders).json(response);
  } catch (error) {
    console.error("Error in POST /api/actions/vote/:memeId:", error);
    res.set(corsHeaders).status(500).json({ error: "Failed to process vote" });
  }
});

router.options("/vote/:memeId/confirm", (req, res) => {
  res.set(corsHeaders).status(200).end();
});

router.post("/vote/:memeId/confirm", async (req, res) => {
  try {
    const memeId = parseInt(req.params.memeId);
    const nonce = req.query.nonce as string;
    
    if (isNaN(memeId)) {
      return res.set(corsHeaders).status(400).json({ error: "Invalid meme ID" });
    }

    if (!nonce) {
      return res.set(corsHeaders).status(400).json({ error: "Vote nonce required" });
    }

    const pendingVote = pendingVotes.get(nonce);
    if (!pendingVote) {
      return res.set(corsHeaders).status(400).json({ 
        error: "Vote intent not found or expired. Please start the voting process again." 
      });
    }

    if (pendingVote.memeId !== memeId) {
      return res.set(corsHeaders).status(400).json({ error: "Meme ID mismatch" });
    }

    const body: ActionPostRequest = req.body;
    const userWallet = body.account;
    const signature = (body as any).signature;

    if (!userWallet) {
      return res.set(corsHeaders).status(400).json({ error: "Wallet address required" });
    }

    if (pendingVote.wallet !== userWallet) {
      return res.set(corsHeaders).status(400).json({ error: "Wallet address mismatch" });
    }

    if (!signature) {
      return res.set(corsHeaders).status(400).json({ error: "Transaction signature required" });
    }

    const meme = await storage.getMemeById(memeId);
    if (!meme) {
      return res.set(corsHeaders).status(404).json({ error: "Meme not found" });
    }

    const existingVote = await storage.getVoteByTxSignature(signature);
    if (existingVote) {
      return res.set(corsHeaders).status(400).json({ 
        error: "This transaction has already been used for a vote." 
      });
    }

    const connection = getConnection();
    const verification = await verifyTransaction(
      connection,
      signature,
      userWallet,
      pendingVote.samuAmount
    );

    if (!verification.valid) {
      return res.set(corsHeaders).status(400).json({ 
        error: verification.error || "Transaction verification failed" 
      });
    }

    pendingVotes.delete(nonce);

    await storage.createVote({
      memeId,
      voterWallet: userWallet,
      samuAmount: pendingVote.samuAmount,
      txSignature: signature,
    });

    const protocol = req.get("x-forwarded-proto") || req.protocol;
    const baseUrl = `${protocol}://${req.get("host")}`;

    const response = {
      type: "post",
      links: {
        next: {
          type: "inline",
          action: {
            type: "action",
            title: `Vote for: ${meme.title}`,
            icon: meme.imageUrl || `${baseUrl}/samu-logo.png`,
            description: `Your ${pendingVote.samuAmount.toLocaleString()} SAMU has been transferred to treasury. Vote recorded!`,
            label: "Vote Again",
            links: {
              actions: [
                { label: "100 SAMU", href: `${baseUrl}/api/actions/vote/${memeId}?amount=100` },
                { label: "1,000 SAMU", href: `${baseUrl}/api/actions/vote/${memeId}?amount=1000` },
                { label: "10,000 SAMU", href: `${baseUrl}/api/actions/vote/${memeId}?amount=10000` },
              ],
            },
          },
        },
      },
    };

    res.set(corsHeaders).json(response);
  } catch (error) {
    console.error("Error in POST /api/actions/vote/:memeId/confirm:", error);
    res.set(corsHeaders).status(500).json({ error: "Failed to confirm vote" });
  }
});

router.get("/memes", async (req, res) => {
  try {
    const memes = await storage.getMemes();
    const protocol = req.get("x-forwarded-proto") || req.protocol;
    const baseUrl = `${protocol}://${req.get("host")}`;

    const response: ActionGetResponse = {
      type: "action",
      icon: `${baseUrl}/assets/samu-logo.webp`,
      title: "SAMU Meme Contest",
      description: "Vote for your favorite memes using SAMU tokens! Browse and vote on the best memes.",
      label: "View Memes",
      links: {
        actions: memes.slice(0, 5).map((meme, index) => ({
          type: "transaction" as const,
          label: `Vote: ${meme.title.slice(0, 20)}...`,
          href: `${baseUrl}/api/actions/vote/${meme.id}?amount=100`,
        })),
      },
    };

    res.set(corsHeaders).json(response);
  } catch (error) {
    console.error("Error in GET /api/actions/memes:", error);
    res.set(corsHeaders).status(500).json({ error: "Internal server error" });
  }
});

router.options("/memes", (req, res) => {
  res.set(corsHeaders).status(200).end();
});

export { router as actionsRouter };
