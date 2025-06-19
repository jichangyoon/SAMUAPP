import { Button } from "@/components/ui/button";
import { Wallet, LogOut, Plus } from "lucide-react";
import { usePrivy, useWallets } from '@privy-io/react-auth';

export function WalletConnect() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets, createWallet } = useWallets();

  if (!ready) {
    return (
      <Button disabled size="lg" className="bg-gray-200 text-gray-500">
        <Wallet className="h-5 w-5 mr-2" />
        Loading...
      </Button>
    );
  }

  if (authenticated && user) {
    // Find any wallet associated with the user
    const userWallet = wallets[0]; // First available wallet
    const walletAddress = userWallet?.address || '';
    const displayAddress = walletAddress 
      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      : 'Connected';

    // If user is authenticated but has no wallet, show create wallet option
    if (!userWallet && user.email) {
      return (
        <div className="flex flex-col gap-2">
          <Button
            onClick={logout}
            variant="outline"
            size="sm"
            className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs">
                {user.email.address}
              </span>
              <span className="text-xs">Email Connected</span>
            </div>
            <LogOut className="h-4 w-4 ml-2" />
          </Button>
          <Button
            onClick={createWallet}
            size="sm"
            className="bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Wallet
          </Button>
        </div>
      );
    }

    return (
      <Button
        onClick={logout}
        variant="outline"
        size="sm"
        className="bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
      >
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-xs">
            {displayAddress}
          </span>
          <span className="text-xs">
            {user.email?.address || 'Wallet User'}
          </span>
        </div>
        <LogOut className="h-4 w-4 ml-2" />
      </Button>
    );
  }

  return (
    <Button
      onClick={login}
      size="lg"
      className="bg-gradient-to-r from-[hsl(50,85%,75%)] to-[hsl(30,85%,65%)] hover:from-[hsl(50,75%,65%)] hover:to-[hsl(30,75%,55%)] text-[hsl(201,30%,25%)] font-bold shadow-lg border-2 border-[hsl(30,100%,50%)]"
    >
      <Wallet className="h-5 w-5 mr-2" />
      Connect Wallet
    </Button>
  );
}