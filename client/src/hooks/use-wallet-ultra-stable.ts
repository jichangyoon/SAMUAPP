import { useState, useEffect, useCallback, useRef } from 'react';
import { phantomWallet, PhantomWallet } from '@/lib/phantom-ultra-stable';

interface WalletState {
  isConnected: boolean;
  walletAddress: string;
  samuBalance: number;
  balanceStatus: 'idle' | 'loading' | 'success' | 'error';
  isConnecting: boolean;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    walletAddress: '',
    samuBalance: 0,
    balanceStatus: 'idle',
    isConnecting: false
  });

  const balanceRequestRef = useRef<number>(0);

  const updateBalance = useCallback(async (force = false) => {
    if (!phantomWallet.connected || !phantomWallet.publicKey) {
      setState(prev => ({ ...prev, samuBalance: 0, balanceStatus: 'idle' }));
      return;
    }

    if (state.balanceStatus === 'loading' && !force) {
      console.log('잔액 조회 이미 진행 중');
      return;
    }

    const requestId = ++balanceRequestRef.current;
    
    setState(prev => ({ ...prev, balanceStatus: 'loading' }));

    try {
      const balance = await phantomWallet.getSamuBalance();
      
      // 최신 요청만 처리
      if (requestId === balanceRequestRef.current) {
        setState(prev => ({
          ...prev,
          samuBalance: balance,
          balanceStatus: 'success'
        }));
      }
    } catch (error) {
      if (requestId === balanceRequestRef.current) {
        setState(prev => ({
          ...prev,
          samuBalance: 0,
          balanceStatus: 'error'
        }));
      }
    }
  }, [state.balanceStatus]);

  const connectWallet = useCallback(async () => {
    if (state.isConnecting) return;

    setState(prev => ({ ...prev, isConnecting: true }));

    try {
      const wallet = await phantomWallet.connect();
      
      setState(prev => ({
        ...prev,
        isConnected: true,
        walletAddress: wallet.publicKey,
        isConnecting: false
      }));

      // 연결 후 잔액 조회
      setTimeout(() => updateBalance(true), 100);

    } catch (error) {
      console.log('지갑 연결 실패:', error);
      setState(prev => ({
        ...prev,
        isConnected: false,
        walletAddress: '',
        samuBalance: 0,
        balanceStatus: 'idle',
        isConnecting: false
      }));
    }
  }, [state.isConnecting, updateBalance]);

  const disconnectWallet = useCallback(async () => {
    try {
      await phantomWallet.disconnect();
    } catch (error) {
      console.log('연결 해제 중 오류:', error);
    } finally {
      setState({
        isConnected: false,
        walletAddress: '',
        samuBalance: 0,
        balanceStatus: 'idle',
        isConnecting: false
      });
      balanceRequestRef.current = 0;
    }
  }, []);

  // 지갑 상태 감지
  useEffect(() => {
    const checkWalletState = () => {
      const connected = phantomWallet.connected;
      const publicKey = phantomWallet.publicKey;

      if (connected && publicKey && !state.isConnected) {
        setState(prev => ({
          ...prev,
          isConnected: true,
          walletAddress: publicKey
        }));
        updateBalance(true);
      } else if (!connected && state.isConnected) {
        setState(prev => ({
          ...prev,
          isConnected: false,
          walletAddress: '',
          samuBalance: 0,
          balanceStatus: 'idle'
        }));
      }
    };

    const interval = setInterval(checkWalletState, 1000);
    checkWalletState();

    return () => clearInterval(interval);
  }, [state.isConnected, updateBalance]);

  return {
    ...state,
    connectWallet,
    disconnectWallet,
    updateBalance: () => updateBalance(true)
  };
}