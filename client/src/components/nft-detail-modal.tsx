import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePrivy } from '@privy-io/react-auth';
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, ExternalLink, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UserInfoModal } from "@/components/user-info-modal";
import type { NftComment } from "@shared/schema";
import type { StaticNft } from "@/data/nft-data";
import nftOwnersData from "@/data/nft-owners.json";

interface CommentWithProfile extends NftComment {
  userProfile?: {
    displayName?: string;
    avatarUrl?: string;
  };
}

interface NftDetailModalProps {
  selectedNft: StaticNft | null;
  isOpen: boolean;
  onClose: () => void;
}

export function NftDetailModal({ selectedNft, isOpen, onClose }: NftDetailModalProps) {
  const [newComment, setNewComment] = useState("");
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUserWallet, setSelectedUserWallet] = useState<string>('');
  const { authenticated, user } = usePrivy();
  const { toast } = useToast();

  // Get NFT owner info
  const getNftOwner = (nftId: number) => {
    return nftOwnersData[nftId.toString() as keyof typeof nftOwnersData] || null;
  };

  // Get wallet address
  const walletAccounts = user?.linkedAccounts?.filter(account => account.type === 'wallet') || [];
  const solanaWallet = walletAccounts.find(w => w.chainType === 'solana');
  const selectedWalletAccount = solanaWallet || walletAccounts[0];
  const walletAddress = selectedWalletAccount?.address || '';

  // Get current user's profile for comment submission
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      const res = await fetch(`/api/users/profile/${walletAddress}`);
      if (!res.ok) throw new Error('Failed to fetch user profile');
      return res.json();
    },
    enabled: !!walletAddress,
  });

  // Fetch comments for selected NFT
  const { data: comments = [] } = useQuery<CommentWithProfile[]>({
    queryKey: ['/api/nfts', selectedNft?.id, 'comments'],
    queryFn: async () => {
      if (!selectedNft) return [];
      const response = await fetch(`/api/nfts/${selectedNft.id}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
    enabled: !!selectedNft,
  });

  // Create comment mutation with optimistic updates
  const createCommentMutation = useMutation({
    mutationFn: async (commentData: { comment: string; userWallet: string; username: string }) => {
      return apiRequest('POST', `/api/nfts/${selectedNft?.id}/comments`, commentData);
    },
    onMutate: async (commentData) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({ queryKey: ['/api/nfts', selectedNft?.id, 'comments'] });
      await queryClient.cancelQueries({ queryKey: ['user-nft-comments', walletAddress] });

      // Get current data
      const previousComments = queryClient.getQueryData(['/api/nfts', selectedNft?.id, 'comments']);
      const previousUserComments = queryClient.getQueryData(['user-nft-comments', walletAddress]);

      // Create optimistic comment
      const optimisticComment = {
        id: Date.now(), // Temporary ID
        nftId: selectedNft?.id,
        comment: commentData.comment,
        userWallet: commentData.userWallet,
        username: commentData.username,
        createdAt: new Date().toISOString(),
        userProfile: userProfile ? {
          displayName: userProfile.displayName,
          avatarUrl: userProfile.avatarUrl
        } : null
      };

      // Optimistically add comment
      queryClient.setQueryData(['/api/nfts', selectedNft?.id, 'comments'], 
        (previous: any) => [optimisticComment, ...(previous || [])]
      );

      queryClient.setQueryData(['user-nft-comments', walletAddress],
        (previous: any) => [optimisticComment, ...(previous || [])]
      );

      return { previousComments, previousUserComments };
    },
    onError: (error, commentData, context) => {
      // Rollback on error
      if (context?.previousComments) {
        queryClient.setQueryData(['/api/nfts', selectedNft?.id, 'comments'], context.previousComments);
      }
      if (context?.previousUserComments) {
        queryClient.setQueryData(['user-nft-comments', walletAddress], context.previousUserComments);
      }
      toast({
        title: "Failed to post comment",
        description: "Please try again later.",
        variant: "destructive",
        duration: 1200,
      });
    },
    onSuccess: () => {
      setNewComment("");
      toast({
        title: "Comment posted!",
        duration: 1200,
      });
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['/api/nfts', selectedNft?.id, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['user-nft-comments', walletAddress] });
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      return apiRequest('DELETE', `/api/nfts/comments/${commentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Comment deleted",
        duration: 1200,
      });
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['/api/nfts', selectedNft?.id, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['user-nft-comments', walletAddress] });
    },
    onError: () => {
      toast({
        title: "Failed to delete comment",
        description: "Please try again later.",
        variant: "destructive",
        duration: 1200,
      });
    },
  });

  const handleCommentSubmit = () => {
    if (!newComment.trim() || !authenticated || !walletAddress) return;

    const username = userProfile?.displayName || user?.email?.address?.split('@')[0] || 'Anonymous';
    
    createCommentMutation.mutate({
      comment: newComment.trim(),
      userWallet: walletAddress,
      username: username,
    });
  };

  const handleUserClick = (userWallet: string) => {
    setSelectedUserWallet(userWallet);
    setShowUserModal(true);
  };

  if (!selectedNft) return null;

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="bg-card border-border max-h-[92vh] h-[92vh]">
          <DrawerHeader>
            <DrawerTitle className="text-foreground">{selectedNft.title}</DrawerTitle>
            <DrawerDescription className="text-muted-foreground">
              Created by {selectedNft.creator}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-4 space-y-4 overflow-y-auto">
            {/* NFT Image */}
            <div className="aspect-square rounded-lg overflow-hidden">
              <img
                src={selectedNft.imageUrl}
                alt={selectedNft.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* NFT Details */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Token ID:</span>
                <span className="text-foreground font-mono">#{selectedNft.tokenId.toString().padStart(3, '0')}</span>
              </div>
              
              {/* Owner Information */}
              {(() => {
                const owner = getNftOwner(selectedNft.tokenId);
                return owner ? (
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground">Owned by:</span>
                    <button
                      onClick={() => {
                        const username = owner.owner.replace('@', '');
                        window.open(`https://x.com/${username}`, '_blank');
                      }}
                      className="text-foreground hover:text-primary cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      {owner.owner}
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                ) : null;
              })()}
              
              {selectedNft.description && (
                <div>
                  <h4 className="font-medium text-foreground mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedNft.description}</p>
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium text-foreground">Comments ({comments.length})</h4>
              </div>

              {/* Comment Input */}
              {authenticated ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Share your thoughts about this NFT..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px] resize-none bg-background border-border text-foreground"
                  />
                  <Button
                    onClick={handleCommentSubmit}
                    disabled={createCommentMutation.isPending || !newComment.trim()}
                    size="sm"
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {createCommentMutation.isPending ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              ) : (
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Please log in to post comments
                  </p>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {comments.length > 0 ? (
                  comments.map((comment) => {
                    const commentWithProfile = comment as CommentWithProfile;
                    return (
                      <div key={comment.id} className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div 
                              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity bg-transparent p-1 rounded"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleUserClick(comment.userWallet);
                              }}
                            >
                              {commentWithProfile.userProfile?.avatarUrl ? (
                                <img 
                                  src={commentWithProfile.userProfile.avatarUrl} 
                                  alt={commentWithProfile.userProfile.displayName || 'User'}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                  <span className="text-xs font-bold text-primary-foreground">
                                    {(commentWithProfile.userProfile?.displayName || comment.username || 'U').charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <span className="text-sm font-medium text-foreground hover:text-primary">
                                {commentWithProfile.userProfile?.displayName || 'Anonymous'}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          
                          {/* Delete button - only show for comment author */}
                          {authenticated && walletAddress === comment.userWallet && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCommentMutation.mutate(comment.id)}
                              disabled={deleteCommentMutation.isPending}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground pl-8">{comment.comment}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No comments yet</p>
                    <p className="text-xs">Be the first to share your thoughts!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* User Info Modal */}
      {showUserModal && (
        <UserInfoModal
          walletAddress={selectedUserWallet}
          username="User"
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
        />
      )}
    </>
  );
}