import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet-simple";
import { Wallet, Smartphone } from "lucide-react";
import { useState, useEffect } from "react";

export function WalletConnect() {
  const { isConnected, walletAddress, connect, disconnect, isConnecting, walletStatus } = useWallet();
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
        onClick={disconnect}
        variant="outline"
        size="sm"
        className="bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
      >
        <span className="font-mono text-xs mr-2">
          {walletAddress}
        </span>
        <span className="text-xs">Disconnect</span>
      </Button>
    );
  }

  // Pump.fun 스타일의 지갑 상태 표시
  const getWalletButtonContent = () => {
    if (isConnecting) {
      return {
        text: "연결 중...",
        icon: isMobile ? <Smartphone className="h-5 w-5 mr-2" /> : <Wallet className="h-5 w-5 mr-2" />,
        className: "bg-yellow-500 hover:bg-yellow-600 text-white"
      };
    }

    switch (walletStatus) {
      case 'detected':
        return {
          text: isMobile ? "Phantom Wallet - detected" : "Phantom Extension - detected",
          icon: isMobile ? <Smartphone className="h-5 w-5 mr-2" /> : <Wallet className="h-5 w-5 mr-2" />,
          className: "bg-gradient-to-r from-[hsl(50,85%,75%)] to-[hsl(30,85%,65%)] hover:from-[hsl(50,75%,65%)] hover:to-[hsl(30,75%,55%)] text-[hsl(201,30%,25%)] font-bold shadow-lg border-2 border-[hsl(30,100%,50%)]"
        };
      case 'not-detected':
        return {
          text: isMobile ? "Install Phantom App" : "Install Phantom Extension",
          icon: isMobile ? <Smartphone className="h-5 w-5 mr-2" /> : <Wallet className="h-5 w-5 mr-2" />,
          className: "bg-gray-500 hover:bg-gray-600 text-white"
        };
      case 'checking':
        return {
          text: "Checking Phantom...",
          icon: isMobile ? <Smartphone className="h-5 w-5 mr-2" /> : <Wallet className="h-5 w-5 mr-2" />,
          className: "bg-blue-500 hover:bg-blue-600 text-white"
        };
      default:
        return {
          text: "Connect Wallet",
          icon: isMobile ? <Smartphone className="h-5 w-5 mr-2" /> : <Wallet className="h-5 w-5 mr-2" />,
          className: "bg-gray-500 hover:bg-gray-600 text-white"
        };
    }
  };

  const buttonContent = getWalletButtonContent();

  return (
    <Button
      onClick={connect}
      disabled={isConnecting || walletStatus === 'checking'}
      size="lg"
      className={buttonContent.className}
    >
      {buttonContent.icon}
      {buttonContent.text}
    </Button>
  );
}
