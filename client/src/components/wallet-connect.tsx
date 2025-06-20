import { Button } from "@/components/ui/button";
import { Wallet, LogOut, Mail } from "lucide-react";
import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import { getSamuTokenBalance, getSolBalance } from "@/lib/solana";

export function WalletConnect() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const [samuBalance, setSamuBalance] = useState<number>(0);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [balanceStatus, setBalanceStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Get wallet info from Privy embedded wallet
  const walletAccounts = user?.linkedAccounts?.filter(account => account.type === 'wallet') || [];
  const solanaWallet = walletAccounts.find(w => w.chainType === 'solana');
  const selectedWalletAccount = solanaWallet || walletAccounts[0];
  
  const walletAddress = selectedWalletAccount?.address || '';
  const isSolana = selectedWalletAccount?.chainType === 'solana';

  // Fetch SAMU and SOL balances for Solana wallets
  useEffect(() => {
    if (authenticated && walletAddress && isSolana) {
      console.log('💰 Fetching balances for wallet:', walletAddress);
      setBalanceStatus('loading');
      setSamuBalance(0);
      setSolBalance(0);
      
      // Fetch both balances concurrently
      Promise.all([
        getSamuTokenBalance(walletAddress),
        getSolBalance(walletAddress)
      ])
        .then(([samuBal, solBal]) => {
          console.log('✅ Balances received - SAMU:', samuBal, 'SOL:', solBal);
          setSamuBalance(samuBal);
          setSolBalance(solBal);
          setBalanceStatus('success');
        })
        .catch(error => {
          console.warn('❌ Failed to fetch balances:', error);
          setSamuBalance(0);
          setSolBalance(0);
          setBalanceStatus('error');
        });
    } else if (!authenticated) {
      setSamuBalance(0);
      setSolBalance(0);
      setBalanceStatus('idle');
    }
  }, [authenticated, walletAddress, isSolana]);

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
      <div className="flex items-center gap-2">
        {/* Balance Display */}
        {isSolana && (
          <div className="text-right flex items-center gap-3">
            <div className="text-center">
              <div className="text-xs font-bold text-[hsl(30,100%,50%)]">
                {balanceStatus === 'loading' ? 'Loading...' : `${samuBalance.toLocaleString()}`}
              </div>
              <div className="text-xs text-muted-foreground">SAMU</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-purple-400">
                {balanceStatus === 'loading' ? '...' : `${solBalance.toFixed(3)}`}
              </div>
              <div className="text-xs text-muted-foreground">SOL</div>
            </div>
          </div>
        )}
        
        {/* Wallet Info Button */}
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
      </div>
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