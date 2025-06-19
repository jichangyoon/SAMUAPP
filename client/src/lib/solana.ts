// SAMU token mint address on Solana mainnet
const SAMU_TOKEN_MINT = 'EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF';

// Multiple RPC endpoints for reliability
const RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana',
  'https://solana-api.projectserum.com'
];

export async function getSamuTokenBalance(walletAddress: string): Promise<number> {
  if (!walletAddress || walletAddress.startsWith('0x')) {
    return 0;
  }

  // Try multiple endpoints for reliability
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Math.floor(Math.random() * 1000),
          method: 'getTokenAccountsByOwner',
          params: [
            walletAddress,
            {
              mint: SAMU_TOKEN_MINT,
            },
            {
              encoding: 'jsonParsed',
            },
          ],
        }),
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      
      if (data.error) {
        continue;
      }

      const tokenAccounts = data.result?.value || [];
      
      if (tokenAccounts.length === 0) {
        return 0;
      }

      // Get the balance from the first token account
      const tokenAccount = tokenAccounts[0];
      const balance = tokenAccount?.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0;
      
      return balance;
    } catch (error) {
      console.warn(`Failed to fetch SAMU balance from ${endpoint}:`, error);
      continue;
    }
  }

  // If all endpoints fail, return 0 instead of throwing
  return 0;
}

export function isSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  return address.length >= 32 && address.length <= 44 && !address.startsWith('0x');
}