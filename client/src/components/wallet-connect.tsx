import { Button } from "@/components/ui/button";
import { LogOut, Mail, Settings } from "lucide-react";
import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect, memo } from 'react';
import { useLocation } from "wouter";

export const WalletConnect = memo(function WalletConnect() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const [, setLocation] = useLocation();
  const [waitingForReady, setWaitingForReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const solanaWallets = user?.linkedAccounts?.filter(account =>
    account.type === 'wallet' && account.chainType === 'solana'
  ) || [];
  const externalWallet = solanaWallets.find(w => (w as any).connectorType !== 'embedded');
  const selectedWalletAccount = externalWallet || solanaWallets[0];

  const isConnected = authenticated && !!selectedWalletAccount;
  const walletAddress = (selectedWalletAccount as any)?.address || '';

  // ready 상태 대기 → 준비되면 자동으로 login 호출
  useEffect(() => {
    if (waitingForReady && ready) {
      setWaitingForReady(false);
      login();
    }
  }, [ready, waitingForReady, login]);

  // 8초 타임아웃: ready가 여전히 false면 안내
  useEffect(() => {
    if (!waitingForReady) return;
    const timeout = setTimeout(() => {
      if (!ready) {
        setWaitingForReady(false);
        alert('연결 준비에 실패했습니다. 페이지를 새로고침 후 다시 시도해주세요.');
      }
    }, 8000);
    return () => clearTimeout(timeout);
  }, [waitingForReady, ready]);

  const handleConnect = () => {
    if (ready) {
      login();
    } else {
      setWaitingForReady(true);
    }
  };

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (authenticated && user?.email?.address) {
        try {
          const response = await fetch('/api/admin/check-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email.address })
          });
          const data = await response.json();
          setIsAdmin(data.isAdmin);
        } catch (error) {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [authenticated, user?.email?.address]);

  if (!ready && !waitingForReady) {
    return (
      <Button disabled size="sm" className="bg-muted text-muted-foreground">
        <Mail className="h-4 w-4 mr-1" />
        Loading...
      </Button>
    );
  }

  if (waitingForReady) {
    return (
      <Button disabled size="sm" className="bg-muted text-muted-foreground">
        <Mail className="h-4 w-4 mr-1" />
        Preparing...
      </Button>
    );
  }

  if (authenticated && user && selectedWalletAccount) {
    const displayAddress = walletAddress
      ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-3)}`
      : 'Connected';

    return (
      <div className="flex items-center gap-2">
        {isAdmin && (
          <Button
            onClick={() => setLocation("/admin")}
            variant="outline"
            size="sm"
            className="bg-purple-950/20 text-purple-400 border-purple-800 hover:bg-purple-950/30 px-2 py-1 h-auto"
          >
            <Settings className="h-3 w-3" />
          </Button>
        )}
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
      </div>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
    >
      Connect Wallet
    </Button>
  );
});
