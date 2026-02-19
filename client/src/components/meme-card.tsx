import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { Connection, Transaction } from '@solana/web3.js';
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
  const { signTransaction } = useSignTransaction();
  const { wallets, ready: walletsReady } = useSolanaWallets();
  const queryClient = useQueryClient();
  
  const connection = new Connection(
    `https://rpc.helius.xyz/?api-key=${import.meta.env.VITE_HELIUS_API_KEY}`,
    'confirmed'
  );
  
  useEffect(() => {
    const handleProfileUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/memes'] });
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, []);

  const walletAccounts = user?.linkedAccounts?.filter(account => account.type === 'wallet') || [];
  const solanaWallet = walletAccounts.find(w => w.chainType === 'solana');
  const selectedWalletAccount = solanaWallet || walletAccounts[0];
  const walletAddress = selectedWalletAccount?.address || '';
  const { toast } = useToast();

  const { data: samuBalanceData } = useQuery({
    queryKey: ['samu-balance', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      const res = await fetch(`/api/samu-balance/${walletAddress}`);
      if (!res.ok) throw new Error('Failed to fetch SAMU balance');
      return res.json();
    },
    enabled: !!walletAddress,
    staleTime: 5000,
  });

  const samuBalance = samuBalanceData?.balance || 0;

  const handleVote = async () => {
    if (!canVote || !walletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to vote.",
        variant: "destructive",
      });
      return;
    }

    if (samuBalance < voteAmount) {
      toast({
        title: "Insufficient SAMU Balance",
        description: `You need ${voteAmount} SAMU but only have ${samuBalance.toLocaleString()}.`,
        variant: "destructive",
      });
      return;
    }

    setIsVoting(true);
    
    try {
      toast({
        title: "Preparing transaction...",
        description: "Building SAMU transfer to treasury",
        duration: 3000
      });

      const prepareRes = await fetch('/api/memes/prepare-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterWallet: walletAddress, samuAmount: voteAmount })
      });

      if (!prepareRes.ok) {
        const err = await prepareRes.json();
        throw new Error(err.message || 'Failed to prepare transaction');
      }

      const { transaction: serializedTx } = await prepareRes.json();
      const transaction = Transaction.from(Buffer.from(serializedTx, 'base64'));

      toast({
        title: "Please sign the transaction",
        description: `Sending ${voteAmount.toLocaleString()} SAMU to treasury`,
        duration: 10000
      });

      const signedTx = await signTransaction({ transaction, connection });
      const txSignature = await connection.sendRawTransaction(signedTx.serialize());

      toast({
        title: "Transaction sent!",
        description: "Waiting for confirmation...",
        duration: 8000
      });

      await connection.confirmTransaction(txSignature, 'confirmed');

      await apiRequest("POST", `/api/memes/${meme.id}/vote`, {
        voterWallet: walletAddress,
        samuAmount: voteAmount,
        txSignature
      });

      toast({
        title: "Vote Submitted!",
        description: `Sent ${voteAmount.toLocaleString()} SAMU on-chain. Tx: ${txSignature.slice(0, 8)}...`,
        duration: 3000
      });

      setShowVoteDialog(false);
      
      queryClient.invalidateQueries({ queryKey: ['samu-balance', walletAddress] });
      
      onVote();
    } catch (error: any) {
      const msg = error.message || "Failed to submit vote.";
      toast({
        title: "Voting Failed",
        description: msg.includes("User rejected") ? "Transaction was cancelled." : msg,
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setIsVoting(false);
    }
  };

  // Share functions - using Blinks URL for X sharing
  const shareToTwitter = () => {
    // Use production URL for Blinks
    const baseUrl = 'https://samu.ink';
    const blinksUrl = `https://dial.to/?action=solana-action:${baseUrl}/api/actions/vote/${meme.id}`;
    const text = `Vote for "${meme.title}" on SAMU Meme Contest! 🔥 #SAMU #Blinks`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(blinksUrl)}`;
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
            muted={true}
            loop={true}
            autoPlayOnVisible={true}
          />
        </div>

        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 min-w-0">
              <Avatar className="h-6 w-6 flex-shrink-0">
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
                className="text-sm text-muted-foreground cursor-pointer truncate"
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
        <DrawerContent className="bg-card border-border max-h-[85dvh]">
          <DrawerHeader>
            <DrawerTitle className="text-foreground">Confirm Your Vote</DrawerTitle>
            <DrawerDescription className="text-muted-foreground">
              You're about to vote for "{meme.title}" by {meme.authorUsername}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-4 overflow-y-auto flex-1">
            <div className="bg-accent rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Your SAMU balance:</span>
                <span className="font-semibold text-primary">{samuBalance.toLocaleString()}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Enter the amount of SAMU you want to vote with
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="vote-amount" className="text-sm font-medium text-foreground">
                  SAMU Amount: {voteAmount.toLocaleString()}
                </Label>
                <div className="mt-2">
                  <Slider
                    id="vote-amount"
                    min={1}
                    max={Math.max(1, samuBalance)}
                    step={1}
                    value={[voteAmount]}
                    onValueChange={(value) => setVoteAmount(value[0])}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1</span>
                  <span>{samuBalance.toLocaleString()}</span>
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
                  max={samuBalance}
                  value={voteAmount}
                  onChange={(e) => {
                    const value = Math.max(1, Math.min(samuBalance, parseInt(e.target.value) || 1));
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
        <DrawerContent className="bg-card border-border max-h-[90dvh]">
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
        <DrawerContent className="bg-card border-border max-h-[90dvh]">
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