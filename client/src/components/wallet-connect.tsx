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
        className="bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
      >
        <span className="font-mono text-xs">
          {walletAddress}
        </span>
      </Button>
    );
  }

  return (
    <Button
      onClick={connect}
      disabled={isConnecting}
      size="sm"
      className="bg-[hsl(50,85%,75%)] hover:bg-[hsl(50,75%,65%)] text-[hsl(201,30%,25%)] font-semibold"
    >
      <Wallet className="h-4 w-4 mr-2" />
      {isConnecting ? "Connecting..." : "Connect"}
    </Button>
  );
}
