import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';

export interface PrivyWalletState {
  isConnected: boolean;
  walletAddress: string;
  samuBalance: number;
  balanceStatus: 'idle' | 'loading' | 'success' | 'error';
  isConnecting: boolean;
}

const SAMU_TOKEN_MINT = 'EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF';
const SOLANA_RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
  'https://rpc.ankr.com/solana'
];

export function usePrivyWallet(): PrivyWalletState & {
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
} {
  const { login, logout, ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const [samuBalance, setSamuBalance] = useState(0);
  const [balanceStatus, setBalanceStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const primaryWallet = wallets[0];
  const walletAddress = primaryWallet?.address || '';

  const getSamuBalance = async (address: string): Promise<number> => {
    if (!address) return 0;

    try {
      setBalanceStatus('loading');
      
      for (const endpoint of SOLANA_RPC_ENDPOINTS) {
        try {
          const connection = new Connection(endpoint, 'confirmed');
          const publicKey = new PublicKey(address);
          
          const response = await connection.getParsedTokenAccountsByOwner(publicKey, {
            mint: new PublicKey(SAMU_TOKEN_MINT)
          });

          if (response.value.length > 0) {
            const tokenAccount = response.value[0];
            const balance = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount || 0;
            setBalanceStatus('success');
            return balance;
          }
          
          setBalanceStatus('success');
          return 0;
        } catch (endpointError) {
          console.warn(`Failed to fetch from ${endpoint}:`, endpointError);
          continue;
        }
      }
      
      setBalanceStatus('error');
      return 0;
    } catch (error) {
      console.error('SAMU balance fetch error:', error);
      setBalanceStatus('error');
      return 0;
    }
  };

  useEffect(() => {
    if (authenticated && walletAddress) {
      getSamuBalance(walletAddress).then(setSamuBalance);
    } else {
      setSamuBalance(0);
      setBalanceStatus('idle');
    }
  }, [authenticated, walletAddress]);

  const connectWallet = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Privy wallet connection failed:', error);
      throw error;
    }
  };

  const disconnectWallet = async () => {
    try {
      await logout();
      setSamuBalance(0);
      setBalanceStatus('idle');
    } catch (error) {
      console.error('Privy wallet disconnect failed:', error);
    }
  };

  return {
    isConnected: authenticated && !!primaryWallet,
    walletAddress,
    samuBalance,
    balanceStatus,
    isConnecting: !ready,
    connectWallet,
    disconnectWallet
  };
}