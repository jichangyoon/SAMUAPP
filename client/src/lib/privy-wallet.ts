import { usePrivy, useWallets } from '@privy-io/react-auth';

export interface PrivyWalletState {
  isConnected: boolean;
  walletAddress: string;
  samuBalance: number;
  balanceStatus: 'idle' | 'loading' | 'success' | 'error';
  isConnecting: boolean;
}

export function usePrivyWallet(): PrivyWalletState & {
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
} {
  const { login, logout, ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  const primaryWallet = wallets[0];
  const walletAddress = primaryWallet?.address || '';

  const connectWallet = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Privy 지갑 연결 실패:', error);
      throw error;
    }
  };

  const disconnectWallet = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Privy 지갑 연결 해제 실패:', error);
    }
  };

  return {
    isConnected: authenticated && !!primaryWallet,
    walletAddress,
    samuBalance: 0, // SAMU 토큰 잔액은 별도 구현 필요
    balanceStatus: 'idle',
    isConnecting: !ready,
    connectWallet,
    disconnectWallet
  };
}