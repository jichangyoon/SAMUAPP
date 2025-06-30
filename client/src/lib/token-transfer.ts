// Token Transfer Utility for Solana
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Initialize connection
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// SAMU Token Mint Address
export const SAMU_TOKEN_MINT = 'EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF';

// Create SOL transfer transaction
export function createSolTransferTransaction(
  fromAddress: string,
  toAddress: string,
  amount: number
): Transaction {
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(fromAddress),
      toPubkey: new PublicKey(toAddress),
      lamports: Math.floor(amount * LAMPORTS_PER_SOL)
    })
  );

  return transaction;
}

// Create SAMU token transfer transaction (simplified version)
export async function createSamuTransferTransaction(
  fromAddress: string,
  toAddress: string,
  amount: number
): Promise<Transaction> {
  // For now, we'll create a simple transaction structure
  // Full SPL token transfer requires additional token program instructions
  const transaction = new Transaction();
  
  // This is a placeholder - actual SPL token transfer needs more complex setup
  // We'll implement this step by step to avoid Buffer issues
  
  return transaction;
}

export { connection };