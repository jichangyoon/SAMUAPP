import { useState, useEffect } from 'react';
import { phantomWallet } from '@/lib/phantom-simple';

export function useWallet() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [samuBalance, setSamuBalance] = useState(0);
  const [balanceStatus, setBalanceStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle');

  // Initialize wallet connection state and setup listeners
  useEffect(() => {
    let mounted = true;
    
    const initializeWallet = async () => {
      // Wait a bit for Phantom to fully load
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!mounted) return;
      
      // Check if already connected
      if (phantomWallet.connected && phantomWallet.publicKey) {
        setIsConnected(true);
        setWalletAddress(phantomWallet.publicKey);
        console.log('지갑 연결 상태 확인됨:', phantomWallet.publicKey);
      }

      // Listen for account changes
      if (typeof window !== 'undefined' && (window as any).phantom?.solana) {
        const phantom = (window as any).phantom.solana;
        
        const handleAccountChange = (publicKey: any) => {
          if (publicKey && mounted) {
            const newAddress = publicKey.toBase58();
            console.log('계정 변경됨:', newAddress);
            setIsConnected(true);
            setWalletAddress(newAddress);
          } else if (mounted) {
            console.log('지갑 연결 해제됨');
            setIsConnected(false);
            setWalletAddress('');
            setSamuBalance(0);
            setBalanceStatus('idle');
          }
        };

        const handleDisconnect = () => {
          if (mounted) {
            console.log('지갑 연결 해제 이벤트');
            setIsConnected(false);
            setWalletAddress('');
            setSamuBalance(0);
            setBalanceStatus('idle');
          }
        };

        phantom.on('accountChanged', handleAccountChange);
        phantom.on('disconnect', handleDisconnect);

        return () => {
          phantom.removeListener('accountChanged', handleAccountChange);
          phantom.removeListener('disconnect', handleDisconnect);
        };
      }
    };

    initializeWallet();

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch SAMU balance when wallet is connected
  useEffect(() => {
    let mounted = true;
    
    const fetchBalance = async () => {
      if (!mounted || !isConnected || !walletAddress) return;
      
      // 이미 로딩 중이거나 성공한 경우 스킵
      if (balanceStatus === 'loading' || balanceStatus === 'success') return;
      
      console.log('SAMU 잔액 조회 시작 - 상태:', balanceStatus);
      setBalanceStatus('loading');
      
      try {
        const balance = await phantomWallet.getSamuBalance();
        console.log('조회된 잔액:', balance, typeof balance);
        
        if (mounted) {
          if (typeof balance === 'number' && balance >= 0) {
            console.log('잔액 상태 업데이트:', balance);
            setSamuBalance(balance);
            setBalanceStatus('success');
          } else {
            console.log('잔액 0으로 설정');
            setSamuBalance(0);
            setBalanceStatus('success');
          }
        }
      } catch (error) {
        console.error('잔액 조회 실패:', error);
        if (mounted) {
          setSamuBalance(0);
          setBalanceStatus('error');
        }
      }
    };

    if (isConnected && walletAddress) {
      fetchBalance();
    } else {
      setSamuBalance(0);
      setBalanceStatus('idle');
    }

    return () => {
      mounted = false;
    };
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
    connect,
    disconnect
  };
}