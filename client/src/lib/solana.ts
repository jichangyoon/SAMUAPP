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
  walletSigner?: any;
}): Promise<{ success: boolean; txHash?: string; error?: string; isSimulation?: boolean }> {
  try {
    // Execute real blockchain transaction directly
    return await executeRealTransaction({
      fromAddress: params.fromAddress,
      toAddress: params.toAddress,
      amount: params.amount,
      tokenType: params.tokenType,
      walletSigner: params.walletSigner
    });
  } catch (error: any) {
    return { success: false, error: error.message || 'Transaction failed' };
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
      const lamports = Math.floor(params.amount * 1000000000);
      
      if (lamports <= 0) {
        throw new Error('Invalid amount: must be greater than 0');
      }

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      // Execute real SOL transfer transaction
      if (!params.walletSigner) {
        throw new Error('지갑 연결이 필요합니다. 지갑을 연결한 후 다시 시도해주세요.');
      }

      const signedTx = await params.walletSigner.signTransaction(transaction);
      const txHash = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      
      await connection.confirmTransaction(txHash, 'confirmed');
      
      console.log('✅ SOL 전송 완료:', {
        txHash,
        from: fromPubkey.toString(),
        to: toPubkey.toString(),
        amount: lamports / 1000000000
      });
      
      return { success: true, txHash, isSimulation: false };
      
    } else {
      // SAMU token transfer using GPT's method
      const { getAssociatedTokenAddress, createTransferInstruction } = await import('@solana/spl-token');
      
      const SAMU_MINT = new PublicKey('EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF');
      const decimals = 6;
      const amount = Math.floor(params.amount * Math.pow(10, decimals));

      if (amount <= 0) {
        throw new Error('Invalid amount: must be greater than 0');
      }

      if (!params.walletSigner) {
        throw new Error('지갑 연결이 필요합니다. 지갑을 연결한 후 다시 시도해주세요.');
      }

      // Get token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(SAMU_MINT, fromPubkey);
      const toTokenAccount = await getAssociatedTokenAddress(SAMU_MINT, toPubkey);
      
      // Create transaction for SAMU token transfer
      const transaction = new Transaction().add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPubkey,
          amount,
          []
        )
      );

      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      const signedTx = await params.walletSigner.signTransaction(transaction);
      const txHash = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      
      await connection.confirmTransaction(txHash, 'confirmed');
      
      console.log('✅ SAMU 토큰 전송 완료:', {
        txHash,
        from: fromPubkey.toString(),
        to: toPubkey.toString(),
        amount: amount / Math.pow(10, decimals)
      });
      
      return { success: true, txHash, isSimulation: false };
    }
  } catch (error: any) {
    console.error('Transaction error:', error);
    return { 
      success: false, 
      error: error.message || 'Transaction failed',
      isSimulation: false 
    };
  }
}