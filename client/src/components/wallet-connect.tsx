import { Button } from "@/components/ui/button";
import { usePrivyWallet } from "@/lib/privy-wallet";
import { Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function WalletConnect() {
  const { isConnected, walletAddress, samuBalance, balanceStatus, isConnecting, connectWallet, disconnectWallet } = usePrivyWallet();
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      await connectWallet();
      toast({
        title: "Connection Successful",
        description: "Wallet connected successfully.",
      });
    } catch (error) {
      console.error('Wallet connection failed:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
      toast({
        title: "Disconnected",
        description: "Wallet disconnected successfully.",
      });
    } catch (error) {
      console.error('Wallet disconnect failed:', error);
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
      <Wallet className="h-5 w-5 mr-2" />
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}
