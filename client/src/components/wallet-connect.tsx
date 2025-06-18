import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { Wallet } from "lucide-react";

export function WalletConnect() {
  const { isConnected, walletAddress, connect, disconnect, isConnecting } = useWallet();

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

  return (
    <Button
      onClick={connect}
      disabled={isConnecting}
      size="lg"
      className="bg-gradient-to-r from-[hsl(50,85%,75%)] to-[hsl(30,85%,65%)] hover:from-[hsl(50,75%,65%)] hover:to-[hsl(30,75%,55%)] text-[hsl(201,30%,25%)] font-bold shadow-lg border-2 border-[hsl(30,100%,50%)]"
    >
      <Wallet className="h-5 w-5 mr-2" />
      {isConnecting ? "연결 중..." : "Phantom 지갑 연결"}
    </Button>
  );
}
