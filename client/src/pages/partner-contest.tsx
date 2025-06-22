import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { WalletConnect } from "@/components/wallet-connect";
import { UploadForm } from "@/components/upload-form";
import { MemeCard } from "@/components/meme-card";
import { usePrivy } from '@privy-io/react-auth';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Grid3X3, List, ArrowUp, Share2, Twitter, Send, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Meme } from "@shared/schema";
import { partners } from "@/data/partners";

interface PartnerContestProps {
  partnerId: string;
}

export function PartnerContest({ partnerId }: PartnerContestProps) {
  const [, setLocation] = useLocation();
  const { authenticated, user } = usePrivy();
  const { toast } = useToast();
  
  const [sortBy, setSortBy] = useState<"votes" | "latest">("votes");
  const [viewMode, setViewMode] = useState<"card" | "grid">("card");
  const [samuBalance, setSamuBalance] = useState<number>(0);

  // Get wallet address from user's linked accounts
  const walletAddress = user?.linkedAccounts?.find(
    account => account.type === 'wallet'
  )?.address as string || '';
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null);
  const [showVoteDialog, setShowVoteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  const partner = partners.find(p => p.id === partnerId);
  
  if (!partner) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Partner Not Found</h1>
          <Button onClick={() => setLocation("/partners")}>
            Back to Partners
          </Button>
        </div>
      </div>
    );
  }

  // Use partner-specific memes endpoint
  const { data: memes = [], refetch } = useQuery<Meme[]>({
    queryKey: [`/api/partners/${partnerId}/memes`],
    enabled: !!partnerId
  });

  const sortedMemes = useMemo(() => {
    return [...(memes || [])].sort((a, b) => {
      if (sortBy === "votes") {
        return b.votes - a.votes;
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [memes, sortBy]);

  const handleVote = async () => {
    if (!selectedMeme || !authenticated) {
      toast({
        title: "Please connect your wallet",
        description: "You need to connect your wallet to vote",
        variant: "destructive"
      });
      return;
    }

    setIsVoting(true);
    try {
      await apiRequest(
        "POST",
        `/api/partners/${partnerId}/memes/${selectedMeme.id}/vote`,
        {
          memeId: selectedMeme.id,
          voterWallet: walletAddress,
          votingPower: Math.min(1000, samuBalance)
        }
      );
      
      toast({
        title: "Vote submitted!",
        description: `You voted for "${selectedMeme.title}"`,
      });
      
      setShowVoteDialog(false);
      refetch();
    } catch (error) {
      toast({
        title: "Vote failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsVoting(false);
    }
  };

  const shareToTwitter = (meme?: Meme) => {
    const targetMeme = meme || selectedMeme;
    if (!targetMeme) return;
    
    const text = `Check out "${targetMeme.title}" by ${targetMeme.authorUsername} in the ${partner.name} meme contest!`;
    const url = window.location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const shareToTelegram = (meme?: Meme) => {
    const targetMeme = meme || selectedMeme;
    if (!targetMeme) return;
    
    const text = `Check out "${targetMeme.title}" by ${targetMeme.authorUsername} in the ${partner.name} meme contest!`;
    const url = window.location.href;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-border py-1">
        <div className="max-w-md mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/partners")}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <img 
                src={partner.logo} 
                alt={partner.name}
                className="w-6 h-6 rounded-full"
              />
              <h1 className="text-lg font-bold text-foreground">{partner.name}</h1>
            </div>
          </div>
          <WalletConnect />
        </div>
      </header>

      <div 
        className="max-w-md mx-auto transition-transform duration-300 ease-out"
        onTouchStart={(e) => {
          const touch = e.touches[0];
          (e.currentTarget as any).touchStartX = touch.clientX;
          (e.currentTarget as any).touchStartTime = Date.now();
        }}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          const touchStartX = (e.currentTarget as any).touchStartX;
          const deltaX = touch.clientX - touchStartX;
          
          // Only apply transform for right swipe
          if (deltaX > 0) {
            const progress = Math.min(deltaX / 150, 1);
            (e.currentTarget as HTMLElement).style.transform = `translateX(${deltaX * 0.3}px)`;
            (e.currentTarget as HTMLElement).style.opacity = String(1 - progress * 0.2);
          }
        }}
        onTouchEnd={(e) => {
          const touch = e.changedTouches[0];
          const touchStartX = (e.currentTarget as any).touchStartX;
          const touchStartTime = (e.currentTarget as any).touchStartTime;
          const touchEndX = touch.clientX;
          const deltaX = touchEndX - touchStartX;
          const deltaTime = Date.now() - touchStartTime;
          
          // Reset transform
          (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
          (e.currentTarget as HTMLElement).style.opacity = '1';
          
          // Swipe right (left to right) to go back with velocity check
          if (deltaX > 100 && deltaTime < 300) {
            setLocation("/partners");
          }
        }}
      >
        <Tabs defaultValue="contest" className="w-full">
          <TabsContent value="contest" className="mt-4 space-y-4 pb-24">
            {/* Partner Contest Header */}
            <Card 
              className="border-2 mx-4"
              style={{ 
                background: `linear-gradient(135deg, ${partner.color}20, ${partner.color}10)`,
                borderColor: `${partner.color}40`
              }}
            >
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <img 
                    src={partner.logo} 
                    alt={partner.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <h2 className="text-xl font-bold" style={{ color: partner.color }}>
                    {partner.name} Meme Contest
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {partner.description}
                </p>
                <Badge 
                  className="text-xs px-3 py-1"
                  style={{ 
                    backgroundColor: partner.color,
                    color: 'white'
                  }}
                >
                  {partner.symbol} Community
                </Badge>
              </CardContent>
            </Card>

            <main className="px-4">
              <Tabs defaultValue="memes" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-muted">
                  <TabsTrigger value="memes">Contest</TabsTrigger>
                  <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                </TabsList>

                <TabsContent value="memes" className="space-y-4">
                  {/* Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Select value={sortBy} onValueChange={(value: "votes" | "latest") => setSortBy(value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="votes">Most Votes</SelectItem>
                          <SelectItem value="latest">Latest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex bg-muted rounded-lg p-1">
                        <button
                          onClick={() => setViewMode("card")}
                          className={`p-2 rounded transition-colors ${
                            viewMode === "card" 
                              ? "bg-background text-foreground shadow-sm" 
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <List className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setViewMode("grid")}
                          className={`p-2 rounded transition-colors ${
                            viewMode === "grid" 
                              ? "bg-background text-foreground shadow-sm" 
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Grid3X3 className="h-4 w-4" />
                        </button>
                      </div>

                      {authenticated && (
                        <Button
                          onClick={() => setShowUploadForm(true)}
                          size="sm"
                          style={{ backgroundColor: partner.color }}
                          className="text-white hover:opacity-90"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Submit
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Memes Display */}
                  {viewMode === "card" ? (
                    <div className="space-y-4">
                      {sortedMemes.map((meme) => (
                        <MemeCard
                          key={meme.id}
                          meme={meme}
                          onVote={() => refetch()}
                          canVote={authenticated}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {sortedMemes.map((meme) => (
                        <button
                          key={meme.id}
                          onClick={() => setSelectedMeme(meme)}
                          className="aspect-square rounded-lg overflow-hidden relative group bg-muted"
                        >
                          <img
                            src={meme.imageUrl}
                            alt={meme.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="text-white text-center">
                              <div className="text-xs font-semibold">{meme.votes} votes</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {sortedMemes.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <p className="text-muted-foreground">No memes submitted yet for {partner.name}. Be the first!</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="leaderboard">
                  <div className="space-y-4">
                    <h3 className="font-semibold">{partner.name} Top Memes</h3>
                    {sortedMemes.slice(0, 10).map((meme, index) => (
                      <Card key={meme.id} className="p-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                            style={{ backgroundColor: partner.color }}
                          >
                            #{index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{meme.title}</div>
                            <div className="text-sm text-muted-foreground">
                              by {meme.authorUsername} • {meme.votes} votes
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </main>
          </TabsContent>
        </Tabs>
      </div>

      {/* Upload Form Modal */}
      {showUploadForm && (
        <UploadForm 
          onClose={() => setShowUploadForm(false)}
          onSuccess={() => {
            setShowUploadForm(false);
            refetch();
          }}
          partnerId={partnerId}
        />
      )}

      {/* Grid View Meme Detail Drawer */}
      {selectedMeme && (
        <Drawer open={!!selectedMeme} onOpenChange={() => setSelectedMeme(null)}>
          <DrawerContent className="bg-card border-border max-h-[92vh] h-[92vh]">
            <DrawerHeader>
              <DrawerTitle className="text-foreground">{selectedMeme.title}</DrawerTitle>
            </DrawerHeader>

            <div className="px-4 pb-4 overflow-y-auto flex-1 space-y-4">
              <div className="aspect-square rounded-lg overflow-hidden">
                <img
                  src={selectedMeme.imageUrl}
                  alt={selectedMeme.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-foreground">
                    {selectedMeme.authorUsername.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{selectedMeme.authorUsername}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedMeme.votes.toLocaleString()} votes
                  </div>
                </div>
              </div>

              {selectedMeme.description && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Description</h4>
                  <p className="text-muted-foreground">{selectedMeme.description}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowVoteDialog(true)}
                  disabled={!authenticated}
                  className="flex-1"
                  style={{ backgroundColor: partner.color }}
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
          </DrawerContent>
        </Drawer>
      )}

      {/* Vote Confirmation Drawer */}
      {selectedMeme && (
        <Drawer open={showVoteDialog} onOpenChange={setShowVoteDialog}>
          <DrawerContent className="bg-card border-border max-h-[92vh] h-[92vh]">
            <DrawerHeader>
              <DrawerTitle className="text-foreground">Confirm Your Vote</DrawerTitle>
              <DrawerDescription className="text-muted-foreground">
                You're about to vote for "{selectedMeme.title}" in the {partner.name} contest
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4 pb-4 overflow-y-auto flex-1">
              <div className="bg-accent rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Your voting power:</span>
                  <span className="font-semibold text-primary">1</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Based on your {partner.symbol} token balance
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
                className="flex-1 text-white"
                style={{ backgroundColor: partner.color }}
              >
                {isVoting ? "Voting..." : "Confirm Vote"}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}

      {/* Share Drawer */}
      {selectedMeme && (
        <Drawer open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DrawerContent className="bg-card border-border max-h-[92vh] h-[92vh]">
            <DrawerHeader>
              <DrawerTitle className="text-foreground">Share Meme</DrawerTitle>
              <DrawerDescription className="text-muted-foreground">
                Share "{selectedMeme.title}" from {partner.name} contest
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4 pb-4 overflow-y-auto flex-1 flex flex-col gap-3">
              <Button
                onClick={() => {
                  shareToTwitter(selectedMeme);
                  setShowShareDialog(false);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <Twitter className="h-4 w-4" />
                Share on X
              </Button>
              <Button
                onClick={() => {
                  shareToTelegram(selectedMeme);
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
      )}

      {/* Upload Form Drawer */}
      <Drawer open={showUploadForm} onOpenChange={setShowUploadForm}>
        <DrawerContent className="bg-card border-border max-h-[92vh] h-[92vh]">
          <DrawerHeader>
            <DrawerTitle className="text-foreground">Submit to {partner.name} Contest</DrawerTitle>
            <DrawerDescription className="text-muted-foreground">
              Upload your meme to join the {partner.name} community contest
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-4 overflow-y-auto flex-1">
            <UploadForm 
              onClose={() => setShowUploadForm(false)}
              onSuccess={() => {
                setShowUploadForm(false);
                refetch();
              }}
              partnerId={partnerId}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}