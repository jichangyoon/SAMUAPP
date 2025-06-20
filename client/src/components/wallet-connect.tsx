import { Button } from "@/components/ui/button";
import { LogOut, Mail } from "lucide-react";
import { usePrivy } from '@privy-io/react-auth';

export function WalletConnect() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  // Get wallet info from Privy embedded wallet
  const walletAccounts = user?.linkedAccounts?.filter(account => account.type === 'wallet') || [];
  const solanaWallet = walletAccounts.find(w => w.chainType === 'solana');
  const selectedWalletAccount = solanaWallet || walletAccounts[0];
  
  const walletAddress = selectedWalletAccount?.address || '';

  if (!ready) {
    return (
      <Button disabled size="sm" className="bg-muted text-muted-foreground">
        <Mail className="h-4 w-4 mr-1" />
        Loading...
      </Button>
    );
  }

  if (authenticated && user && selectedWalletAccount) {
    const displayAddress = walletAddress 
      ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-3)}`
      : 'Connected';
    
    const chainType = selectedWalletAccount?.chainType || 'unknown';

    return (
      <Button
        onClick={logout}
        variant="outline"
        size="sm"
        className="bg-green-950/20 text-green-400 border-green-800 hover:bg-green-950/30 px-2 py-1 h-auto"
      >
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="font-mono text-xs">{displayAddress}</span>
          </div>
          <span className="text-xs opacity-75">
            {chainType === 'solana' ? 'Solana' : chainType === 'ethereum' ? 'Ethereum' : 'Wallet'}
          </span>
        </div>
        <LogOut className="h-3 w-3 ml-1" />
      </Button>
    );
  }

  return (
    <Button
      onClick={login}
      size="sm"
      className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm border border-primary"
    >
      <Mail className="h-4 w-4 mr-1" />
      Sign In
    </Button>
  );
}