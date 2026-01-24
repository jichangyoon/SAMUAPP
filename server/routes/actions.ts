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
  Transaction, 
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import { storage } from "../storage";
import { votingPowerManager } from "../voting-power";

const router = Router();

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const SAMU_TOKEN_MINT = 'EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF';
const HELIUS_API_KEY = process.env.VITE_HELIUS_API_KEY;
const connection = new Connection(SOLANA_RPC_URL, "confirmed");

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
            { mint: SAMU_TOKEN_MINT },
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

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const iconUrl = meme.imageUrl.startsWith("http") 
      ? meme.imageUrl 
      : `${baseUrl}${meme.imageUrl}`;

    const response: ActionGetResponse = {
      type: "action",
      icon: iconUrl,
      title: `Vote for: ${meme.title}`,
      description: `Cast your vote for this meme! Your voting power is based on your SAMU token holdings. Currently has ${meme.votes} votes.`,
      label: "Vote Now",
      links: {
        actions: [
          {
            type: "transaction",
            label: "Vote with 1 Power",
            href: `${baseUrl}/api/actions/vote/${memeId}?power=1`,
          },
          {
            type: "transaction",
            label: "Vote with 5 Power",
            href: `${baseUrl}/api/actions/vote/${memeId}?power=5`,
          },
          {
            type: "transaction",
            label: "Vote with 10 Power",
            href: `${baseUrl}/api/actions/vote/${memeId}?power=10`,
          },
          {
            type: "transaction",
            label: "Vote with Custom Power",
            href: `${baseUrl}/api/actions/vote/${memeId}?power={power}`,
            parameters: [
              {
                name: "power",
                label: "Voting Power (1-100)",
                required: true,
                type: "number",
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

router.options("/vote/:memeId", (req, res) => {
  res.set(corsHeaders).status(200).end();
});

router.post("/vote/:memeId", async (req, res) => {
  try {
    const memeId = parseInt(req.params.memeId);
    const powerUsed = parseInt(req.query.power as string) || 1;
    
    if (isNaN(memeId)) {
      return res.set(corsHeaders).status(400).json({ error: "Invalid meme ID" });
    }

    if (powerUsed < 1 || powerUsed > 100) {
      return res.set(corsHeaders).status(400).json({ error: "Power must be between 1 and 100" });
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

    const hasVoted = await storage.hasUserVoted(memeId, userWallet);
    if (hasVoted) {
      return res.set(corsHeaders).status(400).json({ 
        error: "You have already voted on this meme" 
      });
    }

    let votingPowerData = await votingPowerManager.getVotingPower(userWallet);
    
    if (!votingPowerData) {
      const samuBalance = await getSamuBalance(userWallet);
      const initialized = await votingPowerManager.initializeVotingPower(userWallet, samuBalance);
      if (!initialized) {
        return res.set(corsHeaders).status(400).json({ 
          error: "Could not initialize voting power. Make sure you hold SAMU tokens." 
        });
      }
      votingPowerData = await votingPowerManager.getVotingPower(userWallet);
    }

    if (!votingPowerData || votingPowerData.remainingPower < powerUsed) {
      return res.set(corsHeaders).status(400).json({ 
        error: `Insufficient voting power. You have ${votingPowerData?.remainingPower || 0} power remaining.` 
      });
    }

    const transaction = new Transaction();
    
    const memoInstruction = new TransactionInstruction({
      keys: [{ pubkey: userPublicKey, isSigner: true, isWritable: false }],
      programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
      data: Buffer.from(`SAMU Vote: Meme #${memeId} with ${powerUsed} power`),
    });
    
    transaction.add(memoInstruction);
    
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = userPublicKey;

    await storage.createVote({
      memeId,
      voterWallet: userWallet,
      votingPower: votingPowerData.totalPower,
      powerUsed,
    });

    await votingPowerManager.useVotingPower(userWallet, powerUsed);

    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }).toString("base64");

    const response: ActionPostResponse = {
      type: "transaction",
      transaction: serializedTransaction,
      message: `Vote submitted! Used ${powerUsed} voting power for meme "${meme.title}"`,
    };

    res.set(corsHeaders).json(response);
  } catch (error) {
    console.error("Error in POST /api/actions/vote/:memeId:", error);
    res.set(corsHeaders).status(500).json({ error: "Failed to process vote" });
  }
});

router.get("/memes", async (req, res) => {
  try {
    const memes = await storage.getMemes();
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const response: ActionGetResponse = {
      type: "action",
      icon: `${baseUrl}/assets/samu-logo.webp`,
      title: "SAMU Meme Contest",
      description: "Vote for your favorite memes using your SAMU tokens! Browse and vote on the best memes.",
      label: "View Memes",
      links: {
        actions: memes.slice(0, 5).map((meme, index) => ({
          type: "transaction" as const,
          label: `Vote: ${meme.title.slice(0, 20)}...`,
          href: `${baseUrl}/api/actions/vote/${meme.id}?power=1`,
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
