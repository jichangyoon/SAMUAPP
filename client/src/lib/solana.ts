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
  walletSigner?: any; // Privy wallet signer for real transactions
}): Promise<{ success: boolean; txHash?: string; error?: string; isSimulation?: boolean }> {
  try {
    // If wallet signer is provided, attempt real transaction
    if (params.walletSigner && typeof window !== 'undefined') {
      return await executeRealTransaction({
        fromAddress: params.fromAddress,
        toAddress: params.toAddress,
        amount: params.amount,
        tokenType: params.tokenType,
        walletSigner: params.walletSigner
      });
    }

    // Otherwise, use simulation API
    const response = await fetch('/api/send-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: params.fromAddress,
        toAddress: params.toAddress,
        amount: params.amount,
        tokenType: params.tokenType
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.error || 'Transaction failed' };
    }

    const data = await response.json();
    return { success: true, txHash: data.txHash, isSimulation: true };
  } catch (error) {
    return { success: false, error: 'Network error occurred' };
  }
}

async function executeRealTransaction(params: {
  fromAddress: string;
  toAddress: string;
  amount: number;
  tokenType: 'SOL' | 'SAMU';
  walletSigner?: any;
}): Promise<{ success: boolean; txHash?: string; error?: string; isSimulation?: boolean }> {
  try {
    const { Connection, PublicKey, Transaction, SystemProgram } = await import('@solana/web3.js');
    
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    const fromPubkey = new PublicKey(params.fromAddress);
    const toPubkey = new PublicKey(params.toAddress);

    if (params.tokenType === 'SOL') {
      // SOL transfer
      const lamports = params.amount * 1000000000; // Convert SOL to lamports
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      // Sign and send transaction using Privy wallet
      const signedTransaction = await params.walletSigner.signTransaction(transaction);
      const txHash = await connection.sendRawTransaction(signedTransaction.serialize());
      
      return { success: true, txHash, isSimulation: false };
    } else {
      // SAMU token transfer
      const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createTransferInstruction } = await import('@solana/spl-token');
      
      const SAMU_MINT = new PublicKey('EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF');
      const decimals = 6; // SAMU token decimals
      const amount = params.amount * Math.pow(10, decimals);

      const fromTokenAccount = await getAssociatedTokenAddress(SAMU_MINT, fromPubkey);
      const toTokenAccount = await getAssociatedTokenAddress(SAMU_MINT, toPubkey);

      const transaction = new Transaction().add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPubkey,
          amount,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      const signedTransaction = await params.walletSigner.signTransaction(transaction);
      const txHash = await connection.sendRawTransaction(signedTransaction.serialize());
      
      return { success: true, txHash, isSimulation: false };
    }
  } catch (error: any) {
    console.error('Real transaction error:', error);
    return { 
      success: false, 
      error: error.message || 'Transaction failed',
      isSimulation: false 
    };
  }
}