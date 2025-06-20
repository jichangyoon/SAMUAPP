import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Mail } from "lucide-react";
import { usePrivy } from '@privy-io/react-auth';

export function WalletConnect() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  if (!ready) {
    return (
      <Button disabled size="sm" className="bg-muted text-muted-foreground">
        <Mail className="h-4 w-4 mr-1" />
        Loading...
      </Button>
    );
  }

  if (authenticated && user) {
    const displayEmail = user.email?.address || 'User';
    const displayName = user.customMetadata?.displayName as string || displayEmail.split('@')[0];
    const profileImage = user.customMetadata?.profileImage as string || '';

    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={profileImage} />
          <AvatarFallback className="bg-primary/20 text-primary text-xs">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <Button
          onClick={logout}
          variant="outline"
          size="sm"
          className="bg-green-950/20 text-green-400 border-green-800 hover:bg-green-950/30 px-2 py-1 h-auto"
        >
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-xs">{displayName}</span>
            </div>
            <span className="text-xs opacity-75">
              {displayEmail}
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
      className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm border border-primary"
    >
      <Mail className="h-4 w-4 mr-1" />
      Sign In
    </Button>
  );
}