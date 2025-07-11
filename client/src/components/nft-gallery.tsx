import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePrivy } from '@privy-io/react-auth';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, Image as ImageIcon, ExternalLink } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { NftComment } from "@shared/schema";
import { SAMU_NFTS, type StaticNft } from "@/data/nft-data";
import nftOwnersData from "@/data/nft-owners.json";

export function NftGallery() {
  const [selectedNft, setSelectedNft] = useState<StaticNft | null>(null);
  const [newComment, setNewComment] = useState("");
  const { authenticated, user } = usePrivy();
  const { toast } = useToast();

  // Get NFT owner info
  const getNftOwner = (nftId: number) => {
    return nftOwnersData[nftId.toString() as keyof typeof nftOwnersData] || null;
  };
  
  // Listen for profile updates to refresh comments
  useEffect(() => {
    const handleProfileUpdate = () => {
      // Refresh all NFT comments to get updated author info
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey.includes('comments') 
      });
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, []);

  // Force clear cache on component mount
  useEffect(() => {
    queryClient.invalidateQueries({ 
      predicate: (query) => query.queryKey.includes('comments') 
    });
  }, []);

  // Use static NFT data for instant loading
  const nfts = SAMU_NFTS;
  const isLoading = false;

  // Fetch comments for selected NFT
  const { data: comments = [] } = useQuery<NftComment[]>({
    queryKey: ['/api/nfts', selectedNft?.id, 'comments', Date.now()], // Add timestamp to force refresh
    enabled: !!selectedNft,
    staleTime: 0, // Don't cache comments
    cacheTime: 0, // Don't keep in cache
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (commentData: { comment: string; userWallet: string; username: string }) => {
      return apiRequest('POST', `/api/nfts/${selectedNft?.id}/comments`, commentData);
    },
    onSuccess: () => {
      // Force refresh comments immediately
      queryClient.invalidateQueries({ queryKey: ['/api/nfts', selectedNft?.id, 'comments'] });
      queryClient.refetchQueries({ queryKey: ['/api/nfts', selectedNft?.id, 'comments'] });
      setNewComment("");
      toast({
        title: "Comment posted!",
        description: "Your comment has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCommentSubmit = () => {
    if (!selectedNft || !authenticated || !user) {
      toast({
        title: "Login Required",
        description: "Please log in to post comments.",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim()) {
      toast({
        title: "Empty Comment",
        description: "Please enter a comment before posting.",
        variant: "destructive",
      });
      return;
    }

    // Get Solana wallet address
    const walletAccounts = user?.linkedAccounts?.filter(account => 
      account.type === 'wallet' && 
      account.connectorType !== 'injected' && 
      account.chainType === 'solana'
    ) || [];
    const selectedWalletAccount = walletAccounts[0];

    // Type assertion for wallet address
    const walletAddress = (selectedWalletAccount as any)?.address;

    if (!walletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please connect your Solana wallet to post comments.",
        variant: "destructive",
      });
      return;
    }

    createCommentMutation.mutate({
      comment: newComment.trim(),
      userWallet: walletAddress,
      username: user?.email?.address || 'Anonymous User'
    });
  };



  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">SAMU Wolf Collection</h2>
          <p className="text-muted-foreground">Loading NFTs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <Card className="bg-black border-0">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ImageIcon className="h-5 w-5 text-[hsl(50,85%,75%)]" />
            <h2 className="text-xl font-bold text-[hsl(50,85%,75%)]">SAMU Wolf Collection</h2>
          </div>
          <p className="text-sm text-[hsl(50,85%,75%)]/90">
            164 unique SAMU Wolf NFTs with legendary traits
          </p>
        </CardContent>
      </Card>

      {/* NFT Grid - 4 columns */}
      <div className="grid grid-cols-4 gap-2">
        {nfts.map((nft) => (
          <button
            key={nft.id}
            onClick={() => setSelectedNft(nft)}
            className="aspect-square bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors group"
          >
            <img
              src={nft.imageUrl}
              alt={nft.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              onError={(e) => {
                // 로컬 이미지 로드 실패시 SAMU 플레이스홀더 표시
                const target = e.target as HTMLImageElement;
                target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23333"/><text x="50" y="55" text-anchor="middle" fill="%23F7DC6F" font-size="10" font-family="Arial">SAMU %23${nft.tokenId}</text></svg>`;
              }}
            />
          </button>
        ))}
      </div>

      {/* NFT Detail Drawer - Swipe to dismiss */}
      {selectedNft && (
        <Drawer open={!!selectedNft} onOpenChange={() => setSelectedNft(null)}>
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
                          // X 앱 딥링크 우선, 웹사이트 폴백
                          const username = owner.owner.replace('@', '');
                          const xAppUrl = `twitter://user?screen_name=${username}`;
                          const webUrl = owner.url;
                          
                          if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
                            // 네이티브 앱: X 앱 딥링크 시도 후 웹 폴백
                            import('@capacitor/browser').then(({ Browser }) => {
                              Browser.open({ url: xAppUrl }).catch(() => {
                                Browser.open({ url: webUrl });
                              });
                            }).catch(() => {
                              window.open(webUrl, '_blank');
                            });
                          } else {
                            // 웹 브라우저: X 앱 딥링크 시도 후 웹 폴백
                            const iframe = document.createElement('iframe');
                            iframe.style.display = 'none';
                            iframe.src = xAppUrl;
                            document.body.appendChild(iframe);
                            
                            setTimeout(() => {
                              document.body.removeChild(iframe);
                              window.open(webUrl, '_blank');
                            }, 1000);
                          }
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
                  <h4 className="font-medium text-foreground">Comments ({comments?.length || 0})</h4>
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
                    comments.map((comment) => (
                      <div key={comment.id} className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center overflow-hidden">
                            {comment.avatarUrl ? (
                              <img 
                                src={comment.avatarUrl} 
                                alt={comment.displayName || comment.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-bold text-primary-foreground">
                                {(comment.displayName || comment.username || 'U').charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {comment.displayName || comment.username || 'Anonymous'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground pl-8">{comment.comment}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-sm text-muted-foreground py-4">
                      No comments yet. Be the first to comment!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}