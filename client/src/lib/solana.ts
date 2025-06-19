import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// SAMU token mint address on Solana mainnet
const SAMU_TOKEN_MINT = 'EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF';

// Free RPC endpoints for better reliability
const RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
  'https://rpc.ankr.com/solana'
];

export async function getSamuTokenBalance(walletAddress: string): Promise<number> {
  if (!walletAddress || walletAddress.startsWith('0x')) {
    // Not a Solana address
    return 0;
  }

  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const connection = new Connection(endpoint, 'confirmed');
      const walletPublicKey = new PublicKey(walletAddress);
      const mintPublicKey = new PublicKey(SAMU_TOKEN_MINT);

      // Get token accounts for this wallet
      const tokenAccounts = await connection.getTokenAccountsByOwner(walletPublicKey, {
        mint: mintPublicKey,
      });

      if (tokenAccounts.value.length === 0) {
        return 0;
      }

      // Get balance from the first token account
      const tokenAccountInfo = await connection.getTokenAccountBalance(
        tokenAccounts.value[0].pubkey
      );

      return tokenAccountInfo.value.uiAmount || 0;
    } catch (error) {
      console.warn(`Failed to fetch SAMU balance from ${endpoint}:`, error);
      continue;
    }
  }

  console.error('All RPC endpoints failed for SAMU balance check');
  return 0;
}

export function isSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  return address.length >= 32 && address.length <= 44 && !address.startsWith('0x');
}