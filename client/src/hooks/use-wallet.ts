import { useState, useEffect } from 'react';
import { phantomWallet } from '@/lib/phantom';

export function useWallet() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [samuBalance, setSamuBalance] = useState(0);


  useEffect(() => {
    // Check if wallet was previously connected
    const checkConnection = async () => {
      if (phantomWallet.connected && phantomWallet.publicKey) {
        setIsConnected(true);
        setWalletAddress(formatAddress(phantomWallet.publicKey));
        await updateBalances();
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
      await updateBalances();
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
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  const updateBalances = async () => {
    try {
      const balance = await phantomWallet.getSamuBalance();
      setSamuBalance(Math.floor(balance)); // Round down for display
    } catch (error) {
      console.error('Failed to fetch balances:', error);
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

    connect,
    disconnect,
    updateBalances
  };
}
