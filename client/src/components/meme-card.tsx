import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePrivy } from '@privy-io/react-auth';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowUp, Share2, Twitter, Send, Trash2 } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { UserInfoModal } from "@/components/user-info-modal";
import { MemeDetailModal } from "@/components/meme-detail-modal";
import { MediaDisplay } from "@/components/media-display";
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
  const [voteAmount, setVoteAmount] = useState(1);
  const { authenticated, user } = usePrivy();
  const queryClient = useQueryClient();
  
  // Listen for profile updates to refresh author info
  useEffect(() => {
    const handleProfileUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/memes'] });
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, []);

  // Get wallet using same logic as WalletConnect component - prioritize Solana
  const walletAccounts = user?.linkedAccounts?.filter(account => account.type === 'wallet') || [];
  const solanaWallet = walletAccounts.find(w => w.chainType === 'solana');
  const selectedWalletAccount = solanaWallet || walletAccounts[0];
  const walletAddress = selectedWalletAccount?.address || '';
  const { toast } = useToast();

  // Get actual voting power from backend
  const { data: votingPowerData } = useQuery({
    queryKey: ['voting-power', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      const res = await fetch(`/api/voting-power/${walletAddress}`);
      if (!res.ok) throw new Error('Failed to fetch voting power');
      return res.json();
    },
    enabled: !!walletAddress,
    staleTime: 5000, // Cache for 5 seconds
  });

  const remainingVotingPower = votingPowerData?.remainingPower || 0;

  const handleVote = async () => {
    if (!canVote || !walletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to vote.",
        variant: "destructive",
      });
      return;
    }

    // Check if user has enough voting power
    if (remainingVotingPower < voteAmount) {
      toast({
        title: "Insufficient Voting Power",
        description: `You need ${voteAmount} voting power but only have ${remainingVotingPower}.`,
        variant: "destructive",
      });
      return;
    }

    setIsVoting(true);
    
    try {
      await apiRequest("POST", `/api/memes/${meme.id}/vote`, {
        voterWallet: walletAddress,
        votingPower: remainingVotingPower,
        powerUsed: voteAmount
      });

      toast({
        title: "Vote Submitted!",
        description: `Used ${voteAmount} voting power on this meme.`,
        duration: 1000
      });

      setShowVoteDialog(false);
      
      // 스마트 캐시 동기화 - 순차적 업데이트
      try {
        // 1단계: 투표력 데이터 즉시 업데이트
        await queryClient.invalidateQueries({ queryKey: ['voting-power'] });
        
        // 2단계: 사용자 투표 기록 업데이트
        await queryClient.invalidateQueries({ queryKey: ['user-votes'] });
        
        // 3단계: 밈 데이터 업데이트 (투표 수 반영)
        await queryClient.invalidateQueries({ queryKey: ['/api/memes'] });
        
        // 4단계: 사용자 통계 업데이트
        await queryClient.invalidateQueries({ queryKey: ['user-stats'] });
        
        onVote(); // 부모에서 UI 업데이트 처리
      } catch (error) {
        // 캐시 업데이트 실패 시에도 기본 동작 수행
        onVote();
      }
    } catch (error: any) {
      toast({
        title: "Voting Failed",
        description: error.message || "Failed to submit vote. Please try again.",
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
        <div className="w-full aspect-square bg-accent flex items-center justify-center">
          <MediaDisplay
            src={meme.imageUrl}
            alt={meme.title}
            className="w-full h-full"
            showControls={false}
            onClick={() => setShowDetailDialog(true)}
          />
        </div>

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
                className="text-sm text-muted-foreground cursor-pointer"
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
            <div className="bg-accent rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Your remaining voting power:</span>
                <span className="font-semibold text-primary">{remainingVotingPower.toLocaleString()}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                You can allocate any amount of your voting power to this meme
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="vote-amount" className="text-sm font-medium text-foreground">
                  Voting Power to Use: {voteAmount}
                </Label>
                <div className="mt-2">
                  <Slider
                    id="vote-amount"
                    min={1}
                    max={Math.max(1, remainingVotingPower)}
                    step={1}
                    value={[voteAmount]}
                    onValueChange={(value) => setVoteAmount(value[0])}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1</span>
                  <span>{remainingVotingPower}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="vote-input" className="text-sm font-medium text-foreground">
                  Or enter amount directly:
                </Label>
                <Input
                  id="vote-input"
                  type="number"
                  min={1}
                  max={remainingVotingPower}
                  value={voteAmount}
                  onChange={(e) => {
                    const value = Math.max(1, Math.min(remainingVotingPower, parseInt(e.target.value) || 1));
                    setVoteAmount(value);
                  }}
                  className="mt-1"
                />
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