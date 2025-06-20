import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePrivy } from '@privy-io/react-auth';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowUp, Share2 } from "lucide-react";
import type { Meme } from "@shared/schema";

interface MemeCardProps {
  meme: Meme;
  onVote: () => void;
  canVote: boolean;
}

export function MemeCard({ meme, onVote, canVote }: MemeCardProps) {
  const [showVoteDialog, setShowVoteDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const { authenticated, user } = usePrivy();
  
  // Get wallet using same logic as WalletConnect component - prioritize Solana
  const walletAccounts = user?.linkedAccounts?.filter(account => account.type === 'wallet') || [];
  const solanaWallet = walletAccounts.find(w => w.chainType === 'solana');
  const selectedWalletAccount = solanaWallet || walletAccounts[0];
  const walletAddress = selectedWalletAccount?.address || '';
  const samuBalance = 1; // Simplified for now
  const { toast } = useToast();

  const votingPower = samuBalance; // Voting power based on SAMU balance only

  const handleVote = async () => {
    if (!canVote || !walletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to vote.",
        variant: "destructive",
      });
      return;
    }

    setIsVoting(true);
    try {
      await apiRequest("POST", `/api/memes/${meme.id}/vote`, {
        voterWallet: walletAddress,
        votingPower,
      });

      toast({
        title: "Vote Submitted!",
        description: `Your vote with ${votingPower} voting power has been recorded.`,
      });
      
      setShowVoteDialog(false);
      onVote();
    } catch (error: any) {
      toast({
        title: "Voting Failed",
        description: error.message || "Failed to submit vote. You may have already voted on this meme.",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: meme.title,
        text: meme.description ?? "",
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Meme link has been copied to clipboard.",
      });
    }
  };

  return (
    <>
      <Card className="overflow-hidden border-border bg-card">
        <button 
          onClick={() => setShowDetailDialog(true)}
          className="w-full aspect-square bg-accent flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <img
            src={meme.imageUrl}
            alt={meme.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="hidden text-center p-8">
            <div className="text-4xl mb-2">🖼️</div>
            <p className="text-muted-foreground">Image failed to load</p>
          </div>
        </button>

        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-primary-foreground">
                  {meme.authorUsername.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">{meme.authorUsername}</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-primary">{meme.votes.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">votes</div>
            </div>
          </div>

          <div className="mb-3">
            <h3 className="font-semibold text-foreground mb-1">{meme.title}</h3>
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={() => setShowVoteDialog(true)}
              disabled={!canVote}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <ArrowUp className="h-4 w-4 mr-2" />
              Vote
            </Button>
            <Button
              onClick={handleShare}
              variant="outline"
              size="sm"
              className="px-4"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showVoteDialog} onOpenChange={setShowVoteDialog}>
        <DialogContent className="max-w-sm mx-4 bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirm Your Vote</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              You're about to vote for "{meme.title}" by {meme.authorUsername}
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-accent rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Your voting power:</span>
              <span className="font-semibold text-primary">{votingPower.toLocaleString()}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Based on your SAMU token balance: {samuBalance.toLocaleString()}
            </div>
          </div>

          <DialogFooter className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowVoteDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVote}
              disabled={isVoting}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isVoting ? "Voting..." : "Confirm Vote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-md mx-4 bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{meme.title}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="aspect-square rounded-lg overflow-hidden">
              <img
                src={meme.imageUrl}
                alt={meme.title}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-primary-foreground">
                  {meme.authorUsername.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="font-medium text-foreground">{meme.authorUsername}</div>
                <div className="text-sm text-muted-foreground">
                  {meme.votes.toLocaleString()} votes
                </div>
              </div>
            </div>
            
            {meme.description && (
              <div>
                <h4 className="font-medium text-foreground mb-2">Description</h4>
                <p className="text-muted-foreground">{meme.description}</p>
              </div>
            )}
            
            <div className="flex space-x-2 pt-2">
              <Button
                onClick={() => {
                  setShowDetailDialog(false);
                  setShowVoteDialog(true);
                }}
                disabled={!canVote}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                Vote
              </Button>
              <Button
                onClick={handleShare}
                variant="outline"
                size="sm"
                className="px-4"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
