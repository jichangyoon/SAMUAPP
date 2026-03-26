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
    return signTransaction({ transaction, connection }) as Promise<SolanaTransaction>;
  };
}
