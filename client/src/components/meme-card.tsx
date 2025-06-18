import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWallet } from "@/hooks/use-wallet";
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
  const [isVoting, setIsVoting] = useState(false);
  const { walletAddress, samuBalance, nftCount } = useWallet();
  const { toast } = useToast();

  const votingPower = samuBalance + (nftCount * 100); // NFTs give 100x multiplier

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
        text: meme.description,
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
      <Card className="overflow-hidden samu-card-shadow samu-voting-card">
        <div className="aspect-square bg-gray-100 flex items-center justify-center">
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
            <p className="text-gray-500">Image failed to load</p>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-[hsl(50,85%,75%)] rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-[hsl(201,30%,25%)]">
                  {meme.authorUsername.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-gray-600">{meme.authorUsername}</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-[hsl(30,100%,50%)]">{meme.votes.toLocaleString()}</div>
              <div className="text-xs text-gray-500">votes</div>
            </div>
          </div>

          <div className="mb-3">
            <h3 className="font-semibold text-[hsl(201,30%,25%)] mb-1">{meme.title}</h3>
            {meme.description && (
              <p className="text-sm text-gray-600">{meme.description}</p>
            )}
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={() => setShowVoteDialog(true)}
              disabled={!canVote}
              className="flex-1 bg-[hsl(50,85%,75%)] hover:bg-[hsl(50,75%,65%)] text-[hsl(201,30%,25%)] font-semibold"
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
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Confirm Your Vote</DialogTitle>
            <DialogDescription>
              You're about to vote for "{meme.title}" by {meme.authorUsername}
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Your voting power:</span>
              <span className="font-semibold text-[hsl(30,100%,50%)]">{votingPower.toLocaleString()}</span>
            </div>
            <div className="text-xs text-gray-500">
              Based on SAMU tokens ({samuBalance.toLocaleString()}) + NFT multiplier ({nftCount} × 100)
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
              className="flex-1 bg-[hsl(30,100%,50%)] hover:bg-[hsl(15,100%,60%)] text-white"
            >
              {isVoting ? "Voting..." : "Confirm Vote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
