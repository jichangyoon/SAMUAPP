import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, MessageCircle, ExternalLink } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Nft, Comment } from "@shared/schema";

export default function NFTDetail() {
  const [, params] = useRoute("/nft/:id");
  const [, navigate] = useLocation();
  const { authenticated, user } = usePrivy();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");

  const nftId = params?.id ? parseInt(params.id) : null;

  const { data: nft, isLoading: nftLoading } = useQuery<Nft>({
    queryKey: ['/api/nfts', nftId],
    enabled: !!nftId,
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery<Comment[]>({
    queryKey: ['/api/nfts', nftId, 'comments'],
    enabled: !!nftId,
  });

  const createCommentMutation = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      if (!nftId || !authenticated || !user) {
        throw new Error("Authentication required");
      }

      const displayName = localStorage.getItem('profileDisplayName') || 
                         user.email?.address || 
                         'Anonymous User';

      const solanaAccount = user.linkedAccounts?.find(account => 
        account.type === 'wallet' && account.chainType === 'solana'
      );
      const walletAddress = (solanaAccount as any)?.address || 'unknown';

      return apiRequest(`/api/nfts/${nftId}/comments`, 'POST', {
        content,
        authorWallet: walletAddress,
        authorUsername: displayName,
      });
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({
        queryKey: ['/api/nfts', nftId, 'comments']
      });
      toast({
        title: "댓글이 작성되었습니다",
        description: "NFT에 댓글을 성공적으로 추가했습니다.",
      });
    },
    onError: (error) => {
      console.error("Error creating comment:", error);
      toast({
        title: "댓글 작성 실패",
        description: "댓글 작성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    if (!authenticated) {
      toast({
        title: "로그인이 필요합니다",
        description: "댓글을 작성하려면 먼저 로그인해주세요.",
        variant: "destructive",
      });
      return;
    }
    createCommentMutation.mutate({ content: commentText.trim() });
  };

  if (nftLoading || !nft) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="text-center">Loading NFT...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/nfts")}
            className="text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button
            size="sm"
            className="bg-yellow-500 hover:bg-yellow-600 text-black"
            onClick={() => window.open('https://opensea.io', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            거래소
          </Button>
        </div>

        {/* NFT Display */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="aspect-square rounded-lg overflow-hidden mb-4">
              <img
                src={nft.imageUrl}
                alt={nft.title}
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">{nft.title}</h1>
            {nft.description && (
              <p className="text-muted-foreground text-sm">{nft.description}</p>
            )}
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <MessageCircle className="h-5 w-5 mr-2" />
              댓글 ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Comment Input */}
            {authenticated ? (
              <div className="space-y-3">
                <Textarea
                  placeholder="댓글을 입력하세요..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || createCommentMutation.isPending}
                  size="sm"
                  className="w-full"
                >
                  {createCommentMutation.isPending ? "작성 중..." : "댓글 작성"}
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm mb-2">
                  댓글을 작성하려면 로그인이 필요합니다
                </p>
                <Button size="sm" variant="outline">
                  로그인
                </Button>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-3">
              {commentsLoading ? (
                <div className="text-center text-muted-foreground">
                  댓글을 불러오는 중...
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  아직 댓글이 없습니다. 첫 댓글을 작성해보세요!
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3 p-3 rounded-lg bg-muted/50">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {(comment.authorUsername || 'Anonymous').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">{comment.authorUsername || 'Anonymous'}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}