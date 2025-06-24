import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { usePrivy } from '@privy-io/react-auth';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowUp, Share2, Twitter, Send, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserInfoModal } from "@/components/user-info-modal";
import { MemeDetailModal } from "@/components/meme-detail-modal";
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const { authenticated, user } = usePrivy();
  const queryClient = useQueryClient();
  
  // Listen for profile updates to refresh author info
  useEffect(() => {
    const handleProfileUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/memes'] });
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [queryClient]);

  // Get wallet using same logic as WalletConnect component - prioritize Solana
  const walletAccounts = user?.linkedAccounts?.filter(account => account.type === 'wallet') || [];
  const solanaWallet = walletAccounts.find(w => w.chainType === 'solana');
  const selectedWalletAccount = solanaWallet || walletAccounts[0];
  const walletAddress = selectedWalletAccount?.address || '';
  const samuBalance = 1;
  const { toast } = useToast();

  const votingPower = samuBalance;

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
    
    // 1. 즉시 UI 업데이트 (낙관적 업데이트)
    const optimisticUpdate = () => {
      queryClient.setQueryData(['/api/memes'], (oldData: any) => {
        if (!oldData?.memes) return oldData;
        return {
          ...oldData,
          memes: oldData.memes.map((m: any) => 
            m.id === meme.id ? { ...m, votes: m.votes + votingPower } : m
          )
        };
      });
    };

    optimisticUpdate();

    try {
      // 2. 서버 요청
      await apiRequest("POST", `/api/memes/${meme.id}/vote`, {
        voterWallet: walletAddress,
        votingPower,
      });

      // 3. 성공 시 실제 데이터로 업데이트
      queryClient.invalidateQueries({ queryKey: ['/api/memes'] });
      queryClient.invalidateQueries({ queryKey: ['user-votes', walletAddress] });

      toast({
        title: "Vote Submitted!",
        description: `Your vote with ${votingPower} voting power has been recorded.`,
        duration: 1000
      });

      setShowVoteDialog(false);
      onVote();
    } catch (error: any) {
      // 4. 실패 시 원래 상태로 복구
      queryClient.invalidateQueries({ queryKey: ['/api/memes'] });
      
      toast({
        title: "Voting Failed",
        description: error.message || "Failed to submit vote. You may have already voted on this meme.",
        variant: "destructive",
        duration: 1000
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

  const handleShare = (platform: string) => {
    if (platform === 'twitter') {
      shareToTwitter();
    } else if (platform === 'telegram') {
      shareToTelegram();
    }
  };

  // Delete meme mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/memes/${meme.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ authorWallet: walletAddress })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete meme');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/memes'] });
      toast({ title: "Meme deleted successfully" });
      setShowDeleteDialog(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete meme", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    }
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  // Check if current user is the author
  const isAuthor = authenticated && walletAddress === meme.authorWallet;

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
              <Avatar className="h-6 w-6">
                <AvatarImage 
                  src={(meme as any).authorAvatarUrl} 
                  alt={meme.authorUsername}
                  key={`${meme.id}-${(meme as any).authorAvatarUrl}`}
                />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {meme.authorUsername.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button 
                onClick={() => setShowUserModal(true)}
                className="text-sm text-muted-foreground cursor-pointer underline"
              >
                {meme.authorUsername}
              </button>
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
            {isAuthor && (
              <Button
                onClick={() => setShowDeleteDialog(true)}
                variant="outline"
                size="sm"
                className="px-4 border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Drawer open={showVoteDialog} onOpenChange={setShowVoteDialog}>
        <DrawerContent className="bg-card border-border max-h-[92vh] h-[92vh]">
          <DrawerHeader>
            <DrawerTitle className="text-foreground">Confirm Your Vote</DrawerTitle>
            <DrawerDescription className="text-muted-foreground">
              You're about to vote for "{meme.title}" by {meme.authorUsername}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-4 overflow-y-auto flex-1">
            <div className="bg-accent rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Your voting power:</span>
                <span className="font-semibold text-primary">{votingPower.toLocaleString()}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Based on your SAMU token balance: {samuBalance.toLocaleString()}
              </div>
            </div>
          </div>

          <DrawerFooter className="flex space-x-3">
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
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <MemeDetailModal
        isOpen={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        meme={meme}
        onVote={() => {
          setShowDetailDialog(false);
          setShowVoteDialog(true);
        }}
        canVote={canVote}
      />

      {/* Share Drawer */}
      <Drawer open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DrawerContent className="bg-card border-border max-h-[92vh] h-[92vh]">
          <DrawerHeader>
            <DrawerTitle className="text-foreground">Share Meme</DrawerTitle>
            <DrawerDescription className="text-muted-foreground">
              Share "{meme.title}" on social platforms
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex flex-col gap-3 py-4 px-4">
            <Button
              onClick={() => {
                shareToTwitter();
                setShowShareDialog(false);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <Twitter className="h-4 w-4" />
              Share on X
            </Button>
            <Button
              onClick={() => {
                shareToTelegram();
                setShowShareDialog(false);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Share on Telegram
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Drawer */}
      <Drawer open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DrawerContent className="bg-card border-border max-h-[92vh] h-[92vh]">
          <DrawerHeader>
            <DrawerTitle className="text-foreground">Delete Meme</DrawerTitle>
            <DrawerDescription className="text-muted-foreground">
              Are you sure you want to delete "{meme.title}"? This action cannot be undone.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex flex-col gap-3 py-4 px-4">
            <Button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Meme"}
            </Button>
            <Button
              onClick={() => setShowDeleteDialog(false)}
              variant="outline"
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* User Info Modal */}
      <UserInfoModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        walletAddress={meme.authorWallet}
        username={meme.authorUsername}
      />
    </>
  );
}