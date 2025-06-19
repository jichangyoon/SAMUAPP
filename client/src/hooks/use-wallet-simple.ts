import { useState, useEffect } from 'react';
import { phantomWallet } from '@/lib/phantom-simple';

export function useWallet() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [samuBalance, setSamuBalance] = useState(0);
  const [balanceStatus, setBalanceStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle');
  const [walletStatus, setWalletStatus] = useState<'detected' | 'not-detected' | 'connected' | 'checking'>('checking');

  // Check connection status and wallet detection on mount
  useEffect(() => {
    const checkWalletStatus = async () => {
      // First check if already connected
      if (phantomWallet.connected && phantomWallet.publicKey) {
        setIsConnected(true);
        setWalletAddress(phantomWallet.publicKey);
        setWalletStatus('connected');
        console.log('지갑 연결 상태 확인됨:', phantomWallet.publicKey);
        return;
      }

      // Check if phantom is installed/detected
      try {
        const status = await phantomWallet.getWalletStatus();
        setWalletStatus(status);
        console.log('팬텀 지갑 상태:', status);
      } catch (error) {
        console.error('팬텀 상태 확인 오류:', error);
        setWalletStatus('not-detected');
      }
    };

    checkWalletStatus();
  }, []);

  // Fetch SAMU balance when connected
  useEffect(() => {
    if (isConnected && walletAddress) {
      const fetchBalance = async () => {
        setBalanceStatus('loading');
        try {
          const balance = await phantomWallet.getSamuBalance();
          setSamuBalance(balance);
          setBalanceStatus('success');
          console.log('Wallet state:', {
            isConnected,
            walletAddress: walletAddress.slice(0, 4) + '...' + walletAddress.slice(-4),
            samuBalance: balance,
            balanceStatus: 'success'
          });
        } catch (error) {
          console.error('Balance fetch failed:', error);
          setBalanceStatus('error');
        }
      };

      fetchBalance();
    }
  }, [isConnected, walletAddress]);

  const connect = async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    console.log('지갑 연결 시작...');
    
    try {
      const result = await phantomWallet.connect();
      
      setIsConnected(true);
      setWalletAddress(result.publicKey);
      
      console.log('지갑 연결 성공!');
      
    } catch (error: any) {
      console.error('지갑 연결 실패:', error);
      
      // 딥링크 리다이렉트는 에러가 아님
      if (error.message.includes('연결 중')) {
        console.log('팬텀 앱으로 리다이렉트됨');
      }
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
      console.log('지갑 연결 해제됨');
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  return {
    isConnected,
    isConnecting,
    walletAddress,
    samuBalance,
    balanceStatus,
    walletStatus,
    connect,
    disconnect
  };
}