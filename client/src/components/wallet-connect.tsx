import { Button } from "@/components/ui/button";
import { LogOut, Mail } from "lucide-react";
import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect, memo } from 'react';

export const WalletConnect = memo(function WalletConnect() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  // Solana 지갑만 사용 - Ethereum 지갑 무시
  const walletAccounts = user?.linkedAccounts?.filter(account => 
    account.type === 'wallet' && 
    account.connectorType !== 'injected' && 
    account.chainType === 'solana'
  ) || [];
  const selectedWalletAccount = walletAccounts[0]; // 첫 번째 (그리고 유일한) Solana 지갑

  const isConnected = authenticated && !!selectedWalletAccount;
  const walletAddress = selectedWalletAccount?.address || '';
  const isSolana = true; // 항상 Solana

  // 지갑 연결 안정성을 위한 에러 바운더리
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (authenticated && !selectedWalletAccount) {
      setConnectionError('Wallet connection failed');
    } else {
      setConnectionError(null);
    }
  }, [authenticated, selectedWalletAccount]);

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
          <span className="text-xs opacity-75">Solana</span>
        </div>
        <LogOut className="h-3 w-3 ml-1" />
      </Button>
    );
  }

  return (
    <Button
          onClick={login}
          disabled={!!connectionError}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold disabled:opacity-50"
        >
          {connectionError ? 'Connection Error' : 'Connect Wallet'}
        </Button>
  );
});