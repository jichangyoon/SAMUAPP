import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet-ultra-stable";
import { Wallet, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export function WalletConnect() {
  const { isConnected, walletAddress, samuBalance, balanceStatus, connectWallet, disconnectWallet, isConnecting } = useWallet();
  const [isMobile, setIsMobile] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleConnect = async () => {
    try {
      await connectWallet();
      toast({
        title: "연결 성공",
        description: "지갑이 성공적으로 연결되었습니다.",
      });
    } catch (error) {
      console.error('지갑 연결 실패:', error);
      toast({
        title: "연결 실패",
        description: "지갑 연결에 실패했습니다. Privy 지갑을 사용해보세요.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
      toast({
        title: "연결 해제",
        description: "지갑 연결이 해제되었습니다.",
      });
    } catch (error) {
      console.error('지갑 연결 해제 실패:', error);
    }
  };

  if (isConnected) {
    return (
      <Button
        onClick={handleDisconnect}
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
      onClick={handleConnect}
      disabled={isConnecting}
      size="lg"
      className="bg-gradient-to-r from-[hsl(50,85%,75%)] to-[hsl(30,85%,65%)] hover:from-[hsl(50,75%,65%)] hover:to-[hsl(30,75%,55%)] text-[hsl(201,30%,25%)] font-bold shadow-lg border-2 border-[hsl(30,100%,50%)]"
    >
      {isMobile ? (
        <Smartphone className="h-5 w-5 mr-2" />
      ) : (
        <Wallet className="h-5 w-5 mr-2" />
      )}
      {isConnecting ? "연결 중..." : "지갑 연결 (Privy)"}
    </Button>
  );
}
