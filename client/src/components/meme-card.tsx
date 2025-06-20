import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePrivy } from '@privy-io/react-auth';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowUp, Share2, Twitter, Send } from "lucide-react";
import type { Meme } from "@shared/schema";

interface MemeCardProps {
  meme: Meme;
  onVote: () => void;
  canVote: boolean;
}

export function MemeCard({ meme, onVote, canVote }: MemeCardProps) {
  const [showVoteDialog, setShowVoteDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
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

  // Share functions
  const shareToTwitter = () => {
    const text = `Check out this awesome meme: "${meme.title}" by ${meme.authorUsername} 🔥`;
    const url = window.location.href;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
  };

  const shareToTelegram = () => {
    const text = `Check out this awesome meme: "${meme.title}" by ${meme.authorUsername}`;
    const url = window.location.href;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank');
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
              onClick={() => setShowShareDialog(true)}
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
                onClick={() => setShowShareDialog(true)}
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

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-sm mx-4 bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Share Meme</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Share "{meme.title}" on social platforms
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-3 py-4">
            <Button
              onClick={() => {
                shareToTwitter();
                setShowShareDialog(false);
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-2"
            >
              <Twitter className="h-4 w-4" />
              Share on Twitter
            </Button>
            <Button
              onClick={() => {
                shareToTelegram();
                setShowShareDialog(false);
              }}
              className="bg-blue-400 hover:bg-blue-500 text-white flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Share on Telegram
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
