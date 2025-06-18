import { useState, useEffect } from 'react';
import { phantomWallet } from '@/lib/phantom';

export function useWallet() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [samuBalance, setSamuBalance] = useState(0);
  const [balanceStatus, setBalanceStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle');


  useEffect(() => {
    // Check if wallet was previously connected
    const checkConnection = async () => {
      if (phantomWallet.connected && phantomWallet.publicKey) {
        setIsConnected(true);
        setWalletAddress(formatAddress(phantomWallet.publicKey));
        await updateBalances();
      } else {
        // Check if phantom is available and auto-connect if previously connected
        const phantom = (window as any).phantom?.solana;
        if (phantom && phantom.isConnected) {
          try {
            const response = await phantom.connect({ onlyIfTrusted: true });
            if (response.publicKey) {
              const publicKeyString = response.publicKey.toBase58();
              setIsConnected(true);
              setWalletAddress(formatAddress(publicKeyString));
              await updateBalances();
            }
          } catch (error) {
            // Silent fail for auto-connect
          }
        }
      }
    };
    
    checkConnection();

    // Listen for account changes
    if (typeof window !== 'undefined' && (window as any).phantom?.solana) {
      const phantom = (window as any).phantom.solana;
      
      phantom.on('accountChanged', (publicKey: any) => {
        if (publicKey) {
          setWalletAddress(formatAddress(publicKey.toBase58()));
          updateBalances();
        } else {
          // Wallet disconnected
          setIsConnected(false);
          setWalletAddress('');
          setSamuBalance(0);
        }
      });

      phantom.on('disconnect', () => {
        setIsConnected(false);
        setWalletAddress('');
        setSamuBalance(0);
      });
    }
  }, []);

  const connect = async () => {
    try {
      setIsConnecting(true);
      const wallet = await phantomWallet.connect();
      
      setIsConnected(true);
      setWalletAddress(formatAddress(wallet.publicKey));
      
      // Force update balances after connection
      setTimeout(async () => {
        await updateBalances();
      }, 100);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      await phantomWallet.disconnect();
      setIsConnected(false);
      setWalletAddress('');
      setSamuBalance(0);
      setBalanceStatus('idle');
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  const updateBalances = async () => {
    try {
      setBalanceStatus('loading');
      const balance = await phantomWallet.getSamuBalance();
      setSamuBalance(Math.floor(balance)); // Round down for display
      setBalanceStatus('success');
    } catch (error) {
      console.error('Failed to fetch balances:', error);
      setSamuBalance(0);
      setBalanceStatus('error');
    }
  };

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return {
    isConnected,
    isConnecting,
    walletAddress,
    samuBalance,
    balanceStatus,
    votingPower: samuBalance, // Voting power based on SAMU balance only
    connect,
    disconnect,
    updateBalances
  };
}
