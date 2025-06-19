import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wallet, LogOut, Plus } from "lucide-react";
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import { getSamuTokenBalance } from "@/lib/solana";

export function WalletConnect() {
  const { ready, authenticated, user, login, logout, createWallet } = usePrivy();
  const { wallets } = useWallets();
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [samuBalance, setSamuBalance] = useState<number>(0);
  const [balanceStatus, setBalanceStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Get wallet using same logic as Home component
  const walletAccounts = user?.linkedAccounts?.filter(account => account.type === 'wallet') || [];
  const solanaWallet = walletAccounts.find(w => w.chainType === 'solana');
  const selectedWalletAccount = solanaWallet || walletAccounts[0];
  
  const walletAddress = selectedWalletAccount?.address || '';
  const isSolana = selectedWalletAccount?.chainType === 'solana';

  // Fetch SAMU balance for Solana wallets
  useEffect(() => {
    if (authenticated && walletAddress && isSolana) {
      setBalanceStatus('loading');
      getSamuTokenBalance(walletAddress)
        .then(balance => {
          setSamuBalance(balance);
          setBalanceStatus('success');
        })
        .catch(error => {
          console.warn('Failed to fetch SAMU balance:', error);
          setSamuBalance(0);
          setBalanceStatus('error');
        });
    } else {
      setSamuBalance(0);
      setBalanceStatus('idle');
    }
  }, [authenticated, walletAddress, isSolana]);

  if (!ready) {
    return (
      <Button disabled size="sm" className="bg-muted text-muted-foreground">
        <Wallet className="h-4 w-4 mr-1" />
        Loading...
      </Button>
    );
  }

  if (authenticated && user) {
    const displayAddress = walletAddress 
      ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-3)}`
      : 'Connected';
    
    const chainType = selectedWalletAccount?.chainType || 'unknown';

    // If user is authenticated but has no wallet, offer to create Solana wallet
    if (!selectedWalletAccount && user.email) {
      const handleCreateWallet = async () => {
        setIsCreatingWallet(true);
        try {
          await createWallet();
        } catch (error) {
          console.error('Failed to create wallet:', error);
        } finally {
          setIsCreatingWallet(false);
        }
      };

      return (
        <div className="flex gap-2">
          <Button
            onClick={handleCreateWallet}
            disabled={isCreatingWallet}
            size="sm"
            className="bg-amber-500 text-white hover:bg-amber-600"
          >
            <Plus className="h-3 w-3 mr-1" />
            {isCreatingWallet ? 'Creating...' : 'Create Wallet'}
          </Button>
          <Button
            onClick={logout}
            variant="outline"
            size="sm"
            className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"
          >
            <LogOut className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        {/* SAMU Balance Display */}
        {isSolana && (
          <div className="text-right">
            <div className="text-xs font-bold text-[hsl(30,100%,50%)]">
              {balanceStatus === 'loading' ? 'Loading...' : samuBalance.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">SAMU</div>
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
      className="bg-gradient-to-r from-[hsl(50,85%,75%)] to-[hsl(30,85%,65%)] hover:from-[hsl(50,75%,65%)] hover:to-[hsl(30,75%,55%)] text-black font-bold shadow-sm border border-[hsl(30,100%,50%)]"
    >
      <Wallet className="h-4 w-4 mr-1" />
      Connect
    </Button>
  );
}