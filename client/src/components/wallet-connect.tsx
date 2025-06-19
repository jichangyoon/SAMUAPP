import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet-ultra-stable";
import { Wallet, Smartphone } from "lucide-react";
import { useState, useEffect } from "react";

export function WalletConnect() {
  const { isConnected, walletAddress, samuBalance, balanceStatus, connectWallet, disconnectWallet, isConnecting } = useWallet();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isConnected) {
    return (
      <Button
        onClick={disconnectWallet}
        variant="outline"
        size="sm"
        className="bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
      >
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-xs">
            {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
          </span>
          {balanceStatus === 'loading' ? (
            <span className="text-xs animate-pulse">Loading...</span>
          ) : (
            <span className="text-xs font-bold">{samuBalance.toLocaleString()} SAMU</span>
          )}
        </div>
        <span className="text-xs ml-2">Disconnect</span>
      </Button>
    );
  }

  return (
    <Button
      onClick={connectWallet}
      disabled={isConnecting}
      size="lg"
      className="bg-gradient-to-r from-[hsl(50,85%,75%)] to-[hsl(30,85%,65%)] hover:from-[hsl(50,75%,65%)] hover:to-[hsl(30,75%,55%)] text-[hsl(201,30%,25%)] font-bold shadow-lg border-2 border-[hsl(30,100%,50%)]"
    >
      {isMobile ? (
        <Smartphone className="h-5 w-5 mr-2" />
      ) : (
        <Wallet className="h-5 w-5 mr-2" />
      )}
      {isConnecting ? "연결 중..." : isMobile ? "Phantom 앱에서 열기" : "Phantom 지갑 연결"}
    </Button>
  );
}
