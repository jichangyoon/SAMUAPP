import { useSolanaWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { Transaction, VersionedTransaction } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';

type SolanaTransaction = Transaction | VersionedTransaction;

export function useUniversalSignTransaction(walletAddress: string) {
  const { wallets } = useSolanaWallets();
  const { signTransaction } = useSignTransaction();

  return async (transaction: Transaction, connection: Connection): Promise<SolanaTransaction> => {
    const activeWallet = wallets.find(w => w.address === walletAddress);
    if (activeWallet && (activeWallet as any).connectorType !== 'embedded') {
      return activeWallet.signTransaction(transaction);
    }

    const phantomProvider = (window as any).phantom?.solana ?? (window as any).solana;
    if (phantomProvider?.isConnected) {
      return phantomProvider.signTransaction(transaction) as Promise<SolanaTransaction>;
    }

    return signTransaction({ transaction, connection }) as Promise<SolanaTransaction>;
  };
}
