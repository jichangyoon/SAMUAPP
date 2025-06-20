import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, ArrowUp, Share2, Twitter, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation, useRoute } from "wouter";
import { usePrivy } from '@privy-io/react-auth';
import type { Meme } from "@shared/schema";

export default function MemeDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute('/meme/:id');
  const memeId = params?.id;
  const { authenticated, user } = usePrivy();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showVoteDialog, setShowVoteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  // Get wallet info
  const walletAccounts = user?.linkedAccounts?.filter(account => account.type === 'wallet') || [];
  const solanaWallet = walletAccounts.find(w => w.chainType === 'solana');
  const selectedWalletAccount = solanaWallet || walletAccounts[0];
  const walletAddress = selectedWalletAccount?.address || '';

  // Fetch meme data
  const { data: allMemes = [] } = useQuery<Meme[]>({
    queryKey: ['/api/memes'],
  });

  const meme = allMemes.find(m => m.id.toString() === memeId);

  // Fetch voting power
  const { data: votingPowerData } = useQuery<any>({
    queryKey: ['/api/voting-power', walletAddress],
    enabled: !!walletAddress,
  });

  if (!meme) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-lg font-bold mb-4">Meme not found</h1>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const votingPower = votingPowerData?.remainingPower ?? 0;

  const handleVote = async () => {
    if (!authenticated || !walletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to vote.",
        variant: "destructive",
      });
      return;
    }

    if (votingPower <= 0) {
      toast({
        title: "No Voting Power",
        description: "You don't have enough voting power to vote.",
        variant: "destructive",
      });
      return;
    }

    setShowVoteDialog(true);
  };

  const confirmVote = async () => {
    setIsVoting(true);
    try {
      await apiRequest(`/api/votes`, "POST", {
        memeId: meme.id,
        voterWallet: walletAddress,
        votingPower: Math.min(votingPower, 100)
      });

      toast({
        title: "Vote Submitted!",
        description: `Your vote with ${Math.min(votingPower, 100)} voting power has been recorded.`,
      });
      
      setShowVoteDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/memes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/voting-power'] });
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

  const shareToTwitter = () => {
    const text = `Check out this awesome meme: "${meme.title}" by ${meme.authorUsername} 🔥`;
    const url = window.location.href;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
    setShowShareDialog(false);
  };

  const shareToTelegram = () => {
    const text = `Check out this awesome meme: "${meme.title}" by ${meme.authorUsername} 🔥`;
    const url = window.location.href;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank');
    setShowShareDialog(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card shadow-sm border-b border-border">
        <div className="max-w-md mx-auto px-4 py-1">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-foreground hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-lg font-bold text-foreground">Meme Detail</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShareDialog(true)}
              className="text-foreground hover:bg-accent"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            {/* Meme Image */}
            <div className="aspect-square rounded-lg overflow-hidden mb-4">
              <img
                src={meme.imageUrl}
                alt={meme.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Meme Info */}
            <div className="space-y-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">{meme.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{meme.description}</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-bold text-xs">
                      {meme.authorUsername?.slice(0, 2).toUpperCase() || 'AN'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{meme.authorUsername || 'Anonymous'}</p>
                    <p className="text-xs text-muted-foreground">Creator</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-primary">
                  {meme.votes} votes
                </Badge>
              </div>

              {/* Vote Button */}
              {authenticated && walletAddress && (
                <Button
                  onClick={handleVote}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={votingPower <= 0}
                >
                  <ArrowUp className="h-4 w-4 mr-2" />
                  {votingPower > 0 ? `Vote (${Math.min(votingPower, 100)} power)` : 'No Voting Power'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vote Confirmation Dialog */}
      <Dialog open={showVoteDialog} onOpenChange={setShowVoteDialog}>
        <DialogContent className="max-w-md mx-4 bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirm Vote</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              You are about to vote for "{meme.title}" with {Math.min(votingPower, 100)} voting power.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowVoteDialog(false)}
              disabled={isVoting}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmVote}
              disabled={isVoting}
              className="bg-primary hover:bg-primary/90"
            >
              {isVoting ? "Voting..." : "Confirm Vote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md mx-4 bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Share Meme</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              onClick={shareToTwitter}
              className="w-full justify-start bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Twitter className="h-4 w-4 mr-2" />
              Share on Twitter
            </Button>
            <Button
              onClick={shareToTelegram}
              className="w-full justify-start bg-blue-400 hover:bg-blue-500 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              Share on Telegram
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}