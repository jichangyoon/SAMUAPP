import { Router } from "express";
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';

const router = Router();

// Solana connection
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// SAMU Token Mint Address
const SAMU_TOKEN_MINT = 'EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF';

// Create SOL transfer transaction
router.post('/create-sol-transfer', async (req, res) => {
  try {
    const { fromAddress, toAddress, amount } = req.body;

    if (!fromAddress || !toAddress || !amount) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Create SOL transfer transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(fromAddress),
        toPubkey: new PublicKey(toAddress),
        lamports: Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL)
      })
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(fromAddress);

    // Serialize transaction to base64
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    }).toString('base64');

    res.json({
      transaction: serializedTransaction,
      type: 'SOL'
    });

  } catch (error) {
    console.error('SOL transfer creation error:', error);
    res.status(500).json({ error: 'Failed to create SOL transfer transaction' });
  }
});

// Create SAMU token transfer transaction
router.post('/create-samu-transfer', async (req, res) => {
  try {
    const { fromAddress, toAddress, amount } = req.body;

    if (!fromAddress || !toAddress || !amount) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Get associated token accounts
    const fromTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(SAMU_TOKEN_MINT),
      new PublicKey(fromAddress)
    );
    
    const toTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(SAMU_TOKEN_MINT),
      new PublicKey(toAddress)
    );

    // Convert amount to token decimals (SAMU has 6 decimals)
    const tokenAmount = Math.floor(parseFloat(amount) * Math.pow(10, 6));

    // Create token transfer transaction
    const transaction = new Transaction().add(
      createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        new PublicKey(fromAddress),
        tokenAmount
      )
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(fromAddress);

    // Serialize transaction to base64
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    }).toString('base64');

    res.json({
      transaction: serializedTransaction,
      type: 'SAMU'
    });

  } catch (error) {
    console.error('SAMU transfer creation error:', error);
    res.status(500).json({ error: 'Failed to create SAMU transfer transaction' });
  }
});

export default router;