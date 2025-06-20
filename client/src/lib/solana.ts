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

export async function sendSolanaTokens(params: {
  fromAddress: string;
  toAddress: string;
  amount: number;
  tokenType: 'SOL' | 'SAMU';
}): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const response = await fetch('/api/send-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.error || 'Transaction failed' };
    }

    const data = await response.json();
    return { success: true, txHash: data.txHash };
  } catch (error) {
    return { success: false, error: 'Network error occurred' };
  }
}