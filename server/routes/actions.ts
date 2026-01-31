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
const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const connection = new Connection(SOLANA_RPC_URL, "confirmed");

interface PendingVoteIntent {
  memeId: number;
  powerUsed: number;
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
      description: `Cast your vote for this meme! Your voting power is based on your SAMU token holdings. Currently has ${meme.votes} votes.`,
      label: "Vote Now",
      links: {
        actions: [
          {
            type: "transaction",
            label: "1 Power",
            href: `${baseUrl}/api/actions/vote/${memeId}?power=1`,
          },
          {
            type: "transaction",
            label: "5 Power",
            href: `${baseUrl}/api/actions/vote/${memeId}?power=5`,
          },
          {
            type: "transaction",
            label: "10 Power",
            href: `${baseUrl}/api/actions/vote/${memeId}?power=10`,
          },
          {
            type: "transaction",
            label: "Custom Amount",
            href: `${baseUrl}/api/actions/vote/${memeId}?power={power}`,
            parameters: [
              {
                name: "power",
                label: "Enter voting power",
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

    if (powerUsed < 1 || powerUsed > 1000000) {
      return res.set(corsHeaders).status(400).json({ error: "Power must be between 1 and 1,000,000" });
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

    // For Blinks voting, ALWAYS check SAMU token balance first (regardless of user existence)
    const samuBalance = await getSamuBalance(userWallet);
    
    if (samuBalance <= 0) {
      return res.set(corsHeaders).status(400).json({ 
        error: "SAMU 토큰이 필요합니다. 투표하려면 SAMU 토큰을 보유해야 합니다. (You need SAMU tokens to vote)" 
      });
    }
    
    let votingPowerData = await votingPowerManager.getVotingPower(userWallet);
    
    if (!votingPowerData) {
      // Check if user exists in database
      const existingUser = await storage.getUserByWallet(userWallet);
      
      if (!existingUser) {
        // Auto-create user for external wallet with SAMU tokens
        const shortWallet = `${userWallet.slice(0, 4)}...${userWallet.slice(-4)}`;
        const samuBalanceInt = Math.floor(samuBalance);
        await storage.createUser({
          walletAddress: userWallet,
          username: shortWallet,
          email: null,
          avatarUrl: null,
          samuBalance: samuBalanceInt,
          totalVotingPower: 3 + Math.floor(samuBalanceInt / 1000000) * 10,
        });
        
        console.log(`[Blinks] Auto-created user for wallet ${shortWallet} with ${samuBalance} SAMU`);
      }
      
      // Initialize voting power (reuse samuBalance from above)
      const initialized = await votingPowerManager.initializeVotingPower(userWallet, samuBalance);
      if (!initialized) {
        return res.set(corsHeaders).status(400).json({ 
          error: "Could not initialize voting power." 
        });
      }
      votingPowerData = await votingPowerManager.getVotingPower(userWallet);
    }

    if (!votingPowerData || votingPowerData.remainingPower < powerUsed) {
      return res.set(corsHeaders).status(400).json({ 
        error: `Insufficient voting power. You have ${votingPowerData?.remainingPower || 0} power remaining.` 
      });
    }

    const protocol = req.get("x-forwarded-proto") || req.protocol;
    const baseUrl = `${protocol}://${req.get("host")}`;
    
    const transaction = new Transaction();
    
    const voteNonce = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    
    const memoInstruction = new TransactionInstruction({
      keys: [{ pubkey: userPublicKey, isSigner: true, isWritable: false }],
      programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
      data: Buffer.from(`SAMU Vote: Meme #${memeId}, Power: ${powerUsed}, Nonce: ${voteNonce}`),
    });
    
    transaction.add(memoInstruction);
    
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = userPublicKey;

    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }).toString("base64");

    pendingVotes.set(voteNonce, {
      memeId,
      powerUsed,
      wallet: userWallet,
      nonce: voteNonce,
      createdAt: Date.now(),
    });

    const response: ActionPostResponse = {
      type: "transaction",
      transaction: serializedTransaction,
      message: `Sign to vote for "${meme.title}" with ${powerUsed} power`,
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

    try {
      const txInfo = await connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (!txInfo) {
        return res.set(corsHeaders).status(400).json({ 
          error: "Transaction not found or not confirmed yet. Please wait and try again." 
        });
      }

      const accountKeys = txInfo.transaction.message.getAccountKeys();
      const signerKey = accountKeys.get(0)?.toBase58();
      
      if (signerKey !== userWallet) {
        return res.set(corsHeaders).status(400).json({ 
          error: "Transaction signer does not match wallet address" 
        });
      }

      const expectedMemo = `SAMU Vote: Meme #${memeId}, Power: ${pendingVote.powerUsed}, Nonce: ${nonce}`;
      let memoValidated = false;
      let foundMemoInstruction = false;
      
      const instructions = txInfo.transaction.message.compiledInstructions;
      for (const ix of instructions) {
        const programId = accountKeys.get(ix.programIdIndex)?.toBase58();
        if (programId === MEMO_PROGRAM_ID) {
          foundMemoInstruction = true;
          try {
            const memoData = Buffer.from(ix.data as Uint8Array).toString('utf8');
            if (memoData === expectedMemo) {
              memoValidated = true;
              break;
            }
          } catch {
            continue;
          }
        }
      }

      if (!foundMemoInstruction) {
        return res.set(corsHeaders).status(400).json({ 
          error: "Transaction does not contain a memo instruction." 
        });
      }

      if (!memoValidated) {
        return res.set(corsHeaders).status(400).json({ 
          error: "Transaction memo does not match vote intent. The memo must exactly match the expected format including memeId, power, and nonce." 
        });
      }
    } catch (txError) {
      console.error("Error verifying transaction:", txError);
      return res.set(corsHeaders).status(400).json({ 
        error: "Could not verify transaction. Please try again." 
      });
    }

    pendingVotes.delete(nonce);

    const powerUsed = pendingVote.powerUsed;

    let votingPowerData = await votingPowerManager.getVotingPower(userWallet);
    
    if (!votingPowerData) {
      const samuBalance = await getSamuBalance(userWallet);
      await votingPowerManager.initializeVotingPower(userWallet, samuBalance);
      votingPowerData = await votingPowerManager.getVotingPower(userWallet);
    }

    if (!votingPowerData || votingPowerData.remainingPower < powerUsed) {
      return res.set(corsHeaders).status(400).json({ 
        error: `Insufficient voting power. You have ${votingPowerData?.remainingPower || 0} power remaining.` 
      });
    }

    await storage.createVote({
      memeId,
      voterWallet: userWallet,
      votingPower: votingPowerData.totalPower,
      powerUsed,
    });

    await votingPowerManager.useVotingPower(userWallet, powerUsed);

    const updatedVotingPower = await votingPowerManager.getVotingPower(userWallet);
    const remainingPower = updatedVotingPower?.remainingPower || 0;
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    // Use action chaining to allow continued voting
    const response = {
      type: "post",
      links: {
        next: {
          type: "inline",
          action: {
            type: "action",
            title: `Vote for: ${meme.title}`,
            icon: meme.imageUrl || `${baseUrl}/samu-logo.png`,
            description: `Your vote was recorded! Used ${powerUsed} power. Remaining: ${remainingPower}. Vote again?`,
            label: "Vote Again",
            links: {
              actions: [
                { label: "Vote with 1 Power", href: `${baseUrl}/api/actions/vote/${memeId}?power=1` },
                { label: "Vote with 5 Power", href: `${baseUrl}/api/actions/vote/${memeId}?power=5` },
                { label: "Vote with 10 Power", href: `${baseUrl}/api/actions/vote/${memeId}?power=10` },
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
