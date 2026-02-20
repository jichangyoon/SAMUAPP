import { Connection } from '@solana/web3.js';

let _sharedConnection: Connection | null = null;

export function getSharedConnection(): Connection {
  if (!_sharedConnection) {
    const rpcUrl = import.meta.env.VITE_HELIUS_API_KEY
      ? `https://rpc.helius.xyz/?api-key=${import.meta.env.VITE_HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com';
    _sharedConnection = new Connection(rpcUrl, 'confirmed');
  }
  return _sharedConnection;
}

export async function getSamuTokenBalance(walletAddress: string): Promise<number> {
  // Return 0 immediately for non-Solana addresses
  if (!walletAddress || walletAddress.startsWith('0x')) {
    return 0;
  }

  try {
    // Use server-side proxy to avoid CORS and browser compatibility issues
    const response = await fetch(`/api/samu-balance/${encodeURIComponent(walletAddress)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return 0;
    }

    const data = await response.json();
    return data.balance || 0;
  } catch (error) {
    return 0;
  }
}

export async function getSolBalance(walletAddress: string): Promise<number> {
  // Return 0 immediately for non-Solana addresses
  if (!walletAddress || walletAddress.startsWith('0x')) {
    return 0;
  }

  try {
    // Use server-side proxy to avoid CORS and browser compatibility issues
    const response = await fetch(`/api/sol-balance/${encodeURIComponent(walletAddress)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return 0;
    }

    const data = await response.json();
    return data.balance || 0;
  } catch (error) {
    return 0;
  }
}

export function isSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  return address.length >= 32 && address.length <= 44 && !address.startsWith('0x');
}