
import { Router } from "express";
import { storage } from "../storage";
import { insertVoteSchema } from "@shared/schema";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { createTransferInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";

const router = Router();

const SAMU_TOKEN_MINT = new PublicKey("EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF");
const SAMU_DECIMALS = 8;
const TREASURY_WALLET = process.env.TREASURY_WALLET_ADDRESS || "4WjMuna7iLjPE897m5fphErUt7AnSdjJTky1hyfZZaJk";

function getConnection(): Connection {
  const HELIUS_API_KEY = process.env.VITE_HELIUS_API_KEY;
  const rpcUrl = HELIUS_API_KEY 
    ? `https://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`
    : 'https://api.mainnet-beta.solana.com';
  return new Connection(rpcUrl, 'confirmed');
}

async function verifyTransaction(
  connection: Connection,
  txSignature: string,
  expectedVoterWallet: string,
  expectedSamuAmount: number,
  maxRetries: number = 3
): Promise<{ valid: boolean; error?: string }> {
  const treasuryPubkey = new PublicKey(TREASURY_WALLET);
  const voterPubkey = new PublicKey(expectedVoterWallet);
  const expectedTokenAmount = Math.round(expectedSamuAmount * Math.pow(10, SAMU_DECIMALS));

  const expectedSenderATA = await getAssociatedTokenAddress(SAMU_TOKEN_MINT, voterPubkey);
  const expectedTreasuryATA = await getAssociatedTokenAddress(SAMU_TOKEN_MINT, treasuryPubkey);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const txInfo = await connection.getTransaction(txSignature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      if (!txInfo) {
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        return { valid: false, error: "Transaction not confirmed yet. Please try again in a few seconds." };
      }

      if (txInfo.meta?.err) {
        return { valid: false, error: "Transaction failed on-chain" };
      }

      const preBalances = txInfo.meta?.preTokenBalances || [];
      const postBalances = txInfo.meta?.postTokenBalances || [];

      let treasuryReceived = false;
      let receivedAmount = 0;

      for (const postBal of postBalances) {
        const preBal = preBalances.find(
          p => p.accountIndex === postBal.accountIndex
        );

        const postAmount = Number(postBal.uiTokenAmount?.amount || '0');
        const preAmount = Number(preBal?.uiTokenAmount?.amount || '0');
        const diff = postAmount - preAmount;

        if (
          diff > 0 &&
          postBal.mint === SAMU_TOKEN_MINT.toBase58() &&
          postBal.owner === treasuryPubkey.toBase58()
        ) {
          treasuryReceived = true;
          receivedAmount = diff;
        }
      }

      if (!treasuryReceived) {
        return { valid: false, error: "Transaction does not transfer SAMU to the treasury wallet" };
      }

      if (receivedAmount < expectedTokenAmount * 0.99) {
        return { valid: false, error: `Insufficient SAMU transferred. Expected ${expectedSamuAmount}, got ${receivedAmount / Math.pow(10, SAMU_DECIMALS)}` };
      }

      try {
        const msgObj = txInfo.transaction.message;
        let signerKey = '';
        if ('getAccountKeys' in msgObj && typeof msgObj.getAccountKeys === 'function') {
          const keys = msgObj.getAccountKeys();
          signerKey = keys.get(0)?.toBase58() || '';
        } else if ('accountKeys' in msgObj) {
          const keys = (msgObj as any).accountKeys;
          signerKey = keys[0]?.toBase58?.() || keys[0]?.toString?.() || '';
        }
        
        if (signerKey && signerKey !== voterPubkey.toBase58()) {
          return { valid: false, error: "Transaction signer does not match voter wallet" };
        }
      } catch {
      }

      return { valid: true };
    } catch (error: any) {
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      console.error('Transaction verification error:', error);
      return { valid: false, error: "Could not verify transaction" };
    }
  }

  return { valid: false, error: "Transaction verification timed out" };
}

router.post("/prepare-transaction", async (req, res) => {
  try {
    const { voterWallet, samuAmount } = req.body;

    if (!voterWallet || !samuAmount || samuAmount <= 0) {
      return res.status(400).json({ message: "Voter wallet and valid SAMU amount are required" });
    }

    const connection = getConnection();
    const senderPubkey = new PublicKey(voterWallet);
    const treasuryPubkey = new PublicKey(TREASURY_WALLET);
    const tokenAmount = Math.round(samuAmount * Math.pow(10, SAMU_DECIMALS));

    const senderATA = await getAssociatedTokenAddress(SAMU_TOKEN_MINT, senderPubkey);
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
          senderPubkey,
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
        senderPubkey,
        tokenAmount
      )
    );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = senderPubkey;

    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }).toString('base64');

    res.json({ 
      transaction: serializedTransaction,
      blockhash,
      lastValidBlockHeight,
      treasuryWallet: TREASURY_WALLET
    });
  } catch (error: any) {
    console.error('Error preparing vote transaction:', error);
    res.status(500).json({ message: error.message || "Failed to prepare transaction" });
  }
});

router.post("/:id/vote", async (req, res) => {
  try {
    const memeId = parseInt(req.params.id);
    const { voterWallet, samuAmount, txSignature } = req.body;

    if (!samuAmount || samuAmount <= 0) {
      return res.status(400).json({ message: "SAMU amount must be greater than 0" });
    }

    if (!txSignature) {
      return res.status(400).json({ message: "Transaction signature is required" });
    }

    if (txSignature !== "in-app-vote" && txSignature !== "blinks-vote") {
      const connection = getConnection();
      const verification = await verifyTransaction(
        connection,
        txSignature,
        voterWallet,
        samuAmount
      );

      if (!verification.valid) {
        return res.status(400).json({ message: verification.error || "Transaction verification failed" });
      }
    }

    const voteData = insertVoteSchema.parse({
      memeId,
      voterWallet,
      samuAmount,
      txSignature
    });

    const vote = await storage.createVote(voteData);
    const updatedMeme = await storage.getMemeById(memeId);
    
    res.json({ vote, meme: updatedMeme });
  } catch (error) {
    console.error('Error voting:', error);
    res.status(400).json({ message: "Failed to vote" });
  }
});

router.get("/:id/voted/:wallet", async (req, res) => {
  try {
    const memeId = parseInt(req.params.id);
    const voterWallet = req.params.wallet;
    
    const hasVoted = await storage.hasUserVoted(memeId, voterWallet);
    res.json({ hasVoted });
  } catch (error) {
    res.status(500).json({ message: "Failed to check vote status" });
  }
});

export { router as votesRouter };
