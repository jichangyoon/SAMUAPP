import { usePrivy } from '@privy-io/react-auth';

export function useWalletAddress() {
  const { authenticated, user } = usePrivy();

  const solanaWallets = (user?.linkedAccounts || []).filter(account =>
    account.type === 'wallet' && account.chainType === 'solana'
  );
  const externalWallet = solanaWallets.find(w => (w as any).connectorType !== 'embedded');
  const selectedWalletAccount = externalWallet || solanaWallets[0] || null;

  const walletAddress = (selectedWalletAccount as any)?.address || '';
  const isConnected = authenticated && !!selectedWalletAccount;

  return { walletAddress, isConnected, selectedWalletAccount };
}
