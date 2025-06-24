import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { usePrivy } from '@privy-io/react-auth';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowUp, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MemeDetailModal } from "@/components/meme-detail-modal";
import { UserInfoModal } from "@/components/user-info-modal";
import type { Meme } from "@shared/schema";

interface MemeCardProps {
  meme: Meme;
  onVote: () => void;
  canVote: boolean;
}

export function MemeCard({ meme, onVote, canVote }: MemeCardProps) {
  const [showVoteDialog, setShowVoteDialog] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const { authenticated, user } = usePrivy();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = (event: any) => {
      if (event.detail.walletAddress === meme.authorWallet) {
        queryClient.invalidateQueries({ queryKey: ['/api/memes'] });
      }
    };

    const handleImageUpdate = (event: any) => {
      if (event.detail.walletAddress === meme.authorWallet) {
        queryClient.invalidateQueries({ queryKey: ['/api/memes'] });
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    window.addEventListener('imageUpdated', handleImageUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('imageUpdated', handleImageUpdate);
    };
  }, [meme.authorWallet, queryClient]);

  // Get wallet address
  const walletAddress = user?.linkedAccounts?.find(
    (account: any) => account.type === 'wallet' && account.chainType === 'solana'
  )?.address;

  const deleteMeme = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/memes/${meme.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete meme');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Meme deleted successfully",
        duration: 1000,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/memes'] });
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to delete meme",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const voteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/memes/${meme.id}/vote`, {
        method: 'POST'
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Vote submitted successfully!",
        duration: 1000,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/memes'] });
      setShowVoteDialog(false);
      setIsVoting(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to vote",
        description: error.message,
        variant: "destructive",
      });
      setIsVoting(false);
    }
  });

  const handleVote = () => {
    setIsVoting(true);
    voteMutation.mutate();
  };

  // Check if current user is the author
  const isAuthor = authenticated && walletAddress === meme.authorWallet;

  return (
    <>
      <Card className="overflow-hidden border-border bg-card">
        <button 
          onClick={() => setShowDetailModal(true)}
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
            <h3 className="font-semibold text-foreground">{meme.title}</h3>
            <div className="flex items-center gap-1 text-primary">
              <ArrowUp className="h-4 w-4" />
              <span className="font-bold">{meme.votes}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowUserModal(true)}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={(meme as any).authorAvatarUrl} 
                  alt={meme.authorUsername}
                  key={`card-${meme.id}-${(meme as any).authorAvatarUrl}`}
                />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {meme.authorUsername.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">{meme.authorUsername}</span>
            </button>

            <div className="flex gap-2">
              {canVote && (
                <Button 
                  onClick={() => setShowVoteDialog(true)}
                  size="sm" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Vote
                </Button>
              )}
              {isAuthor && (
                <Button 
                  onClick={() => setShowDeleteDialog(true)}
                  size="sm" 
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vote Confirmation Dialog */}
      <Drawer open={showVoteDialog} onOpenChange={setShowVoteDialog}>
        <DrawerContent className="bg-card border-border">
          <DrawerHeader>
            <DrawerTitle className="text-foreground">Confirm Vote</DrawerTitle>
            <DrawerDescription className="text-muted-foreground">
              Vote for "{meme.title}" by {meme.authorUsername}?
            </DrawerDescription>
          </DrawerHeader>
          
          <DrawerFooter>
            <Button 
              onClick={handleVote}
              disabled={isVoting || voteMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isVoting || voteMutation.isPending ? 'Voting...' : 'Confirm Vote'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowVoteDialog(false)}
              disabled={isVoting || voteMutation.isPending}
            >
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <Drawer open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DrawerContent className="bg-card border-border">
          <DrawerHeader>
            <DrawerTitle className="text-foreground">Delete Meme</DrawerTitle>
            <DrawerDescription className="text-muted-foreground">
              Are you sure you want to delete "{meme.title}"? This action cannot be undone.
            </DrawerDescription>
          </DrawerHeader>
          
          <DrawerFooter>
            <Button 
              onClick={() => deleteMeme.mutate()}
              disabled={deleteMeme.isPending}
              variant="destructive"
            >
              {deleteMeme.isPending ? 'Deleting...' : 'Delete'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteMeme.isPending}
            >
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Unified Detail Modal */}
      <MemeDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        meme={meme}
        onVote={() => {
          setShowDetailModal(false);
          setShowVoteDialog(true);
        }}
        canVote={canVote}
      />

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