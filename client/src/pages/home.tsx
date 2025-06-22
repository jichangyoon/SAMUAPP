import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { WalletConnect } from "@/components/wallet-connect";
import { ContestHeader } from "@/components/contest-header";
import { UploadForm } from "@/components/upload-form";
import { MemeCard } from "@/components/meme-card";
import { Leaderboard } from "@/components/leaderboard";
import { GoodsShop } from "@/components/goods-shop";
import { NftGallery } from "@/components/nft-gallery";

import { usePrivy } from '@privy-io/react-auth';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Grid3X3, List, ArrowUp, Share2, Twitter, Send, Trophy, ShoppingBag, Archive, Image, Users, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getSamuTokenBalance, getSolBalance } from "@/lib/solana";
import type { Meme } from "@shared/schema";
import samuLogoImg from "/assets/images/logos/samu-logo.jpg";

export default function Home() {
  const [sortBy, setSortBy] = useState("votes");
  const [currentTab, setCurrentTab] = useState("contest");
  const [viewMode, setViewMode] = useState<'card' | 'grid'>('card');
  const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null);
  const [showVoteDialog, setShowVoteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [samuBalance, setSamuBalance] = useState<number>(0);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [, setLocation] = useLocation();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [balanceStatus, setBalanceStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [archiveView, setArchiveView] = useState<'list' | 'contest'>('list');
  const [selectedArchiveContest, setSelectedArchiveContest] = useState<any>(null);
  const [selectedArchiveMeme, setSelectedArchiveMeme] = useState<any>(null);

  // Privy authentication
  const { authenticated, user } = usePrivy();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Solana 지갑만 사용 - 간단하고 깔끔한 로직
  const walletAccounts = user?.linkedAccounts?.filter(account => 
    account.type === 'wallet' && 
    account.connectorType !== 'injected' && 
    account.chainType === 'solana'
  ) || [];
  const selectedWalletAccount = walletAccounts[0]; // 유일한 Solana 지갑

  const isConnected = authenticated && !!selectedWalletAccount;
  const walletAddress = (selectedWalletAccount as any)?.address || '';
  const isSolana = true; // 항상 Solana

  // Profile state management
  const [profileData, setProfileData] = useState({ displayName: 'User', profileImage: '' });

  // Load profile data when user changes
  useEffect(() => {
    if (authenticated && user?.id) {
      try {
        const stored = localStorage.getItem(`profile_${user.id}`);
        const profile = stored ? JSON.parse(stored) : {};
        setProfileData({
          displayName: profile.displayName || 'User',
          profileImage: profile.profileImage || ''
        });
      } catch {
        setProfileData({ displayName: 'User', profileImage: '' });
      }
    } else {
      setProfileData({ displayName: 'User', profileImage: '' });
    }
  }, [authenticated, user?.id]);

  // Listen for profile updates from profile page
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      setProfileData({
        displayName: event.detail.displayName,
        profileImage: event.detail.profileImage
      });
    };

    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
    };
  }, []);

  const displayName = authenticated ? profileData.displayName : 'SAMU';
  const profileImage = profileData.profileImage;

  // Grid view voting function
  const handleGridVote = async (meme: Meme) => {
    if (!isConnected || !walletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to vote.",
        variant: "destructive",
      });
      return;
    }

    const votingPower = 1; // Simplified for now
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

      setSelectedMeme(null);
      refetch(); // Refresh the memes list
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

  // Share functions
  const shareToTwitter = (meme: Meme) => {
    const text = `Check out this awesome meme: "${meme.title}" by ${meme.authorUsername} 🔥`;
    const url = window.location.href;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
  };

  const shareToTelegram = (meme: Meme) => {
    const text = `Check out this awesome meme: "${meme.title}" by ${meme.authorUsername}`;
    const url = window.location.href;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank');
  };

  // Wallet connection handled by Privy
  useEffect(() => {
    // All wallet management is now handled by Privy authentication
  }, [authenticated]);

  // React Query로 잔액 조회 최적화
  const { data: balanceData } = useQuery({
    queryKey: ['balances', walletAddress],
    queryFn: async () => {
      if (!walletAddress || !isSolana) return { samu: 0, sol: 0 };
      
      const [samuBal, solBal] = await Promise.all([
        getSamuTokenBalance(walletAddress),
        getSolBalance(walletAddress)
      ]);
      
      return { samu: samuBal, sol: solBal };
    },
    enabled: isConnected && !!walletAddress && isSolana,
    staleTime: 30 * 1000, // 30초간 캐시 유지
    refetchInterval: 60 * 1000, // 1분마다 자동 갱신
  });

  // 잔액 상태 업데이트
  useEffect(() => {
    if (balanceData) {
      setSamuBalance(balanceData.samu);
      setSolBalance(balanceData.sol);
      setBalanceStatus('success');
    } else if (!isConnected) {
      setSamuBalance(0);
      setSolBalance(0);
      setBalanceStatus('idle');
    }
  }, [balanceData, isConnected]);

  const { data: memes = [], isLoading, refetch } = useQuery<Meme[]>({
    queryKey: ["/api/memes"],
    enabled: true,
    staleTime: 10 * 1000, // 10초간 캐시 유지
    refetchInterval: 30 * 1000, // 30초마다 자동 갱신
  });

  // Memoized sorted memes with dependency optimization
  const sortedMemes = useMemo(() => {
    if (!memes?.length) return [];

    switch (sortBy) {
      case "votes":
        return memes.slice().sort((a, b) => (b.votes || 0) - (a.votes || 0));
      case "recent":
        return memes.slice().sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      case "author":
        return memes.slice().sort((a, b) => (a.authorUsername || "").localeCompare(b.authorUsername || ""));
      default:
        return memes;
    }
  }, [memes, sortBy]);

  // Optimized click handlers with minimal dependencies
  const handleMemeClick = useCallback((meme: Meme) => {
    setSelectedMeme(meme);
    setShowVoteDialog(true);
  }, []);

  const handleVoteSuccess = useCallback(() => {
    setShowVoteDialog(false);
    setSelectedMeme(null);
    // 선택적 캐시 무효화 - 꼭 필요한 것만
    queryClient.invalidateQueries({ 
      queryKey: ['/api/memes'],
      exact: true 
    });
    // 투표 파워 캐시도 무효화 (투표 후 변경됨)
    queryClient.invalidateQueries({
      queryKey: ['balances', walletAddress],
      exact: true
    });
  }, [queryClient, walletAddress]);

  const handleShareClick = useCallback((meme: Meme) => {
    setSelectedMeme(meme);
    setShowShareDialog(true);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card shadow-sm border-b border-border">
        <div className="max-w-md mx-auto px-4 py-1">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate('/profile')}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              {authenticated ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                    {profileImage ? (
                      <img 
                        src={profileImage} 
                        alt="Profile" 
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-bold text-sm">
                          {displayName.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-lg font-bold text-primary">{displayName}</span>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center samu-wolf-logo overflow-hidden">
                    <img 
                      src={samuLogoImg} 
                      alt="SAMU Wolf" 
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <span className="text-lg font-bold text-primary">SAMU</span>
                </>
              )}
            </button>
            <WalletConnect />
          </div>
        </div>
      </header>



      {/* Main Content Container */}
      <div className="max-w-md mx-auto px-4">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">

          <TabsContent value="contest" className="mt-4 space-y-4 pb-24">
            <Tabs defaultValue="contest-main" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-10">
                <TabsTrigger value="contest-main" className="text-sm">Contest</TabsTrigger>
                <TabsTrigger value="leaderboard" className="text-sm">Leaderboard</TabsTrigger>
              </TabsList>

              <TabsContent value="contest-main" className="mt-0">
                <main className="space-y-4 pb-20">
                  {/* Contest Header */}
                  <ContestHeader />

                  {/* Submit Button - Only show when logged in */}
                  {isConnected && (
                    <div className="flex justify-center">
                      <Button 
                        onClick={() => setShowUploadForm(true)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-medium"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Submit Meme
                      </Button>
                    </div>
                  )}

                  {/* Meme Gallery */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-lg font-semibold text-foreground">Entries</h2>
                      <div className="flex items-center space-x-2">
                        <div className="flex bg-accent rounded-lg p-1">
                          <button
                            onClick={() => setViewMode('card')}
                            className={`p-1.5 rounded ${viewMode === 'card' ? 'bg-background shadow-sm' : ''}`}
                          >
                            <List className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-background shadow-sm' : ''}`}
                          >
                            <Grid3X3 className="h-4 w-4" />
                          </button>
                        </div>
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger className="w-32 h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="votes">Most Votes</SelectItem>
                            <SelectItem value="latest">Latest</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {isLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <Card key={i} className="animate-pulse">
                            <div className="aspect-square bg-accent" />
                            <CardContent className="p-4">
                              <div className="h-4 bg-accent rounded mb-2" />
                              <div className="h-3 bg-accent rounded w-3/4" />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <>
                        {viewMode === 'card' ? (
                          <div className="space-y-4">
                            {sortedMemes.map((meme) => (
                              <MemeCard 
                                key={meme.id} 
                                meme={meme} 
                                onVote={() => refetch()}
                                canVote={isConnected}
                              />
                            ))}

                            {sortedMemes.length === 0 && (
                              <Card>
                                <CardContent className="p-8 text-center">
                                  <p className="text-muted-foreground">No memes submitted yet. Be the first!</p>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-1">
                            {sortedMemes.map((meme) => (
                              <button
                                key={meme.id}
                                onClick={() => {
                                  // We'll create a grid detail view
                                  setSelectedMeme(meme);
                                }}
                                className="aspect-square bg-accent flex items-center justify-center hover:opacity-90 transition-opacity relative group"
                              >
                                <img
                                  src={meme.imageUrl}
                                  alt={meme.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <div className="text-white text-center">
                                    <div className="text-sm font-semibold">{meme.votes}</div>
                                    <div className="text-xs">votes</div>
                                  </div>
                                </div>
                              </button>
                            ))}

                            {sortedMemes.length === 0 && (
                              <div className="col-span-3">
                                <Card>
                                  <CardContent className="p-8 text-center">
                                    <p className="text-muted-foreground">No memes submitted yet. Be the first!</p>
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {sortedMemes.length > 0 && (
                      <div className="text-center mt-6">
                        <Button variant="outline" className="bg-accent text-foreground hover:bg-accent/80 border-border">
                          Load More Memes
                        </Button>
                      </div>
                    )}
                  </div>
                </main>
              </TabsContent>

              <TabsContent value="leaderboard">
                <Leaderboard />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="archive" className="mt-4 space-y-4 pb-24">
            {archiveView === 'list' ? (
              <div className="space-y-4">
                {/* Archive Header */}
                <Card className="bg-black border-0">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Archive className="h-5 w-5 text-[hsl(50,85%,75%)]" />
                      <h2 className="text-xl font-bold text-[hsl(50,85%,75%)]">Contest Archive</h2>
                    </div>
                    <p className="text-sm text-[hsl(50,85%,75%)]/90">
                      Past contest winners and memorable memes
                    </p>
                  </CardContent>
                </Card>

                {/* Past Contests List */}
                <div className="space-y-4">
                  <h3 className="text-md font-semibold text-foreground">Previous Contests</h3>

                  <button
                    onClick={() => {
                      setSelectedArchiveContest({
                        id: 1,
                        title: "Contest #1 - December 2024",
                        participants: 50,
                        totalVotes: 1247,
                        status: "Completed",
                        winner: {
                          name: "SAMU TO MARS",
                          author: "crypto_legend",
                          votes: 324
                        },
                        secondPlace: "DIAMOND PAWS",
                        thirdPlace: "PACK LEADER",
                        memes: [
                          {
                            id: 1,
                            title: "SAMU TO MARS",
                            author: "crypto_legend",
                            votes: 324,
                            rank: 1,
                            imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23F7DC6F'/%3E%3Ccircle cx='200' cy='200' r='100' fill='%23E74C3C'/%3E%3Ctext x='200' y='180' text-anchor='middle' font-family='Arial' font-size='24' font-weight='bold' fill='white'%3ESAMU%3C/text%3E%3Ctext x='200' y='220' text-anchor='middle' font-family='Arial' font-size='16' fill='white'%3ETO MARS%3C/text%3E%3C/svg%3E",
                            description: "The ultimate SAMU moon mission meme"
                          },
                          {
                            id: 2,
                            title: "DIAMOND PAWS",
                            author: "gem_hands",
                            votes: 287,
                            rank: 2,
                            imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23667BC6'/%3E%3Cpolygon points='200,100 250,150 200,200 150,150' fill='%2300BFFF'/%3E%3Ctext x='200' y='260' text-anchor='middle' font-family='Arial' font-size='20' font-weight='bold' fill='white'%3EDIAMOND%3C/text%3E%3Ctext x='200' y='290' text-anchor='middle' font-family='Arial' font-size='20' font-weight='bold' fill='white'%3EPAWS%3C/text%3E%3C/svg%3E",
                            description: "Diamond hands, diamond paws"
                          },
                          {
                            id: 3,
                            title: "PACK LEADER",
                            author: "wolf_alpha",
                            votes: 245,
                            rank: 3,
                            imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%238B4513'/%3E%3Ccircle cx='200' cy='180' r='60' fill='%23D2691E'/%3E%3Cpath d='M170 160 L200 140 L230 160 L220 180 L180 180 Z' fill='%23654321'/%3E%3Ctext x='200' y='280' text-anchor='middle' font-family='Arial' font-size='18' font-weight='bold' fill='white'%3EPACK LEADER%3C/text%3E%3C/svg%3E",
                            description: "Leading the pack to victory"
                          },
                          {
                            id: 4,
                            title: "HODL STRONG",
                            author: "diamond_wolf",
                            votes: 198,
                            rank: 4,
                            imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%232C3E50'/%3E%3Crect x='100' y='150' width='200' height='100' fill='%23F39C12'/%3E%3Ctext x='200' y='190' text-anchor='middle' font-family='Arial' font-size='16' font-weight='bold'%3EHODL%3C/text%3E%3Ctext x='200' y='220' text-anchor='middle' font-family='Arial' font-size='16' font-weight='bold'%3ESTRONG%3C/text%3E%3C/svg%3E",
                            description: "Never selling, always holding"
                          },
                          {
                            id: 5,
                            title: "MOON WOLF",
                            author: "lunar_pack",
                            votes: 156,
                            rank: 5,
                            imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%231a1a2e'/%3E%3Ccircle cx='150' cy='100' r='40' fill='%23f5f5f5'/%3E%3Ccircle cx='250' cy='200' r='50' fill='%23654321'/%3E%3Ctext x='200' y='320' text-anchor='middle' font-family='Arial' font-size='18' font-weight='bold' fill='%23f5f5f5'%3EMOON WOLF%3C/text%3E%3C/svg%3E",
                            description: "Howling at the crypto moon"
                          },
                          {
                            id: 6,
                            title: "ALPHA GAINS",
                            author: "profit_hunter",
                            votes: 134,
                            rank: 6,
                            imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%2327ae60'/%3E%3Cpath d='M200 100 L300 200 L250 250 L200 200 L150 250 L100 200 Z' fill='%23f1c40f'/%3E%3Ctext x='200' y='320' text-anchor='middle' font-family='Arial' font-size='18' font-weight='bold' fill='white'%3EALPHA GAINS%3C/text%3E%3C/svg%3E",
                            description: "Always making alpha gains"
                          }
                        ]
                      });
                      setArchiveView('contest');
                    }}
                    className="w-full"
                  >
                    <Card className="border-border/50 hover:border-primary/30 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-left">
                            <h4 className="font-semibold text-foreground">Contest #1 - December 2024</h4>
                            <p className="text-sm text-muted-foreground">50 participants • 1,247 votes</p>
                          </div>
                          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-400/20">
                            Completed
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className="space-y-4 transition-transform duration-300 ease-out"
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
                    setArchiveView('list');
                  }
                }}
              >
                {/* Contest Detail View */}
                <div className="flex items-center gap-2 mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setArchiveView('list')}
                    className="text-foreground hover:text-primary"
                  >
                    ← Back to Archive
                  </Button>
                </div>

                {selectedArchiveContest && (
                  <>
                    {/* Contest Header */}
                    <Card className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-400/20">
                      <CardContent className="p-4">
                        <div className="text-center">
                          <h2 className="text-lg font-bold text-purple-400 mb-2">
                            {selectedArchiveContest.title}
                          </h2>
                          <div className="grid grid-cols-3 gap-4 text-sm items-center">
                            <div>
                              <div className="text-purple-300 font-semibold">{selectedArchiveContest.participants}</div>
                              <div className="text-muted-foreground">Participants</div>
                            </div>
                            <div>
                              <div className="text-purple-300 font-semibold">{selectedArchiveContest.totalVotes}</div>
                              <div className="text-muted-foreground">Total Votes</div>
                            </div>
                            <div className="flex justify-center">
                              <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                                {selectedArchiveContest.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* All Memes Grid */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground">All Contest Entries</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedArchiveContest.memes.map((meme: any) => (
                          <button
                            key={meme.id}
                            onClick={() => setSelectedArchiveMeme(meme)}
                            className="aspect-square bg-accent flex items-center justify-center hover:opacity-90 transition-opacity relative group"
                          >
                            <img
                              src={meme.imageUrl}
                              alt={meme.title}
                              className="w-full h-full object-cover"
                            />
                            {/* Medal icon for top 3 */}
                            {meme.rank <= 3 && (
                              <div className="absolute top-1 left-1 text-lg">
                                {meme.rank === 1 ? '🥇' : meme.rank === 2 ? '🥈' : '🥉'}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="text-white text-center">
                                <div className="text-sm font-semibold">#{meme.rank}</div>
                                <div className="text-xs">{meme.votes} votes</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="goods" className="mt-4 space-y-4 pb-24">
            <GoodsShop />
          </TabsContent>

          <TabsContent value="nfts" className="mt-4 space-y-4 pb-24">
            <NftGallery />
          </TabsContent>
        </Tabs>
      </div>

      {/* Archive Meme Detail Drawer */}
      {selectedArchiveMeme && (
        <Drawer open={!!selectedArchiveMeme} onOpenChange={() => setSelectedArchiveMeme(null)}>
          <DrawerContent className="bg-card border-border max-h-[92vh] h-[92vh]">
            <DrawerHeader>
              <DrawerTitle className="text-foreground">{selectedArchiveMeme.title}</DrawerTitle>
              <DrawerDescription className="text-muted-foreground">
                Contest Entry from {selectedArchiveContest?.title}
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4 pb-4 overflow-y-auto flex-1 space-y-4">
              <div className="aspect-square rounded-lg overflow-hidden">
                <img 
                  src={selectedArchiveMeme.imageUrl} 
                  alt={selectedArchiveMeme.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-foreground">
                    {selectedArchiveMeme.author.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{selectedArchiveMeme.author}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedArchiveMeme.votes.toLocaleString()} votes • #{selectedArchiveMeme.rank} place
                  </div>
                </div>
                {selectedArchiveMeme.rank <= 3 && (
                  <div className="text-2xl">
                    {selectedArchiveMeme.rank === 1 ? '🥇' : selectedArchiveMeme.rank === 2 ? '🥈' : '🥉'}
                  </div>
                )}
              </div>

              {selectedArchiveMeme.description && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Description</h4>
                  <p className="text-muted-foreground">{selectedArchiveMeme.description}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  Final ranking: #{selectedArchiveMeme.rank}
                </div>
                <Button
                  onClick={() => setSelectedArchiveMeme(null)}
                  variant="outline"
                  size="sm"
                >
                  Close
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="max-w-md mx-auto px-4 py-1">
          <div className="flex justify-around items-center">
            <button
              onClick={() => setCurrentTab("contest")}
              className={`flex items-center justify-center p-3 rounded-lg transition-colors ${
                currentTab === "contest" 
                  ? "bg-primary/20 text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Trophy className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentTab("archive")}
              className={`flex items-center justify-center p-3 rounded-lg transition-colors ${
                currentTab === "archive" 
                  ? "bg-primary/20 text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Archive className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentTab("nfts")}
              className={`flex items-center justify-center p-3 rounded-lg transition-colors ${
                currentTab === "nfts" 
                  ? "bg-primary/20 text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Image className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentTab("goods")}
              className={`flex items-center justify-center p-3 rounded-lg transition-colors ${
                currentTab === "goods" 
                  ? "bg-primary/20 text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
            </button>
            <button
              onClick={() => setLocation("/partners")}
              className="flex items-center justify-center p-3 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            >
              <Users className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>



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

              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-foreground">
                    {selectedMeme.authorUsername.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
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

              <div className="flex space-x-2 pt-2">
                <Button
                  onClick={() => setShowVoteDialog(true)}
                  disabled={!isConnected}
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
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Grid View Vote Confirmation Drawer */}
      {selectedMeme && (
        <Drawer open={showVoteDialog} onOpenChange={setShowVoteDialog}>
          <DrawerContent className="bg-card border-border max-h-[92vh] h-[92vh]">
            <DrawerHeader>
              <DrawerTitle className="text-foreground">Confirm Your Vote</DrawerTitle>
              <DrawerDescription className="text-muted-foreground">
                You're about to vote for "{selectedMeme.title}" by {selectedMeme.authorUsername}
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4 pb-4 overflow-y-auto flex-1">
              <div className="bg-accent rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Your voting power:</span>
                  <span className="font-semibold text-primary">1</span>
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
                onClick={() => selectedMeme && handleGridVote(selectedMeme)}
                disabled={isVoting}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
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
                Share "{selectedMeme.title}" on social platforms
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
            <DrawerTitle className="text-foreground">Submit New Meme</DrawerTitle>
            <DrawerDescription className="text-muted-foreground">
              Upload your meme to join the SAMU contest
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-4 overflow-y-auto flex-1">
            <UploadForm 
              onClose={() => setShowUploadForm(false)}
              onSuccess={() => {
                setShowUploadForm(false);
                refetch();
              }}
            />
          </div>
        </DrawerContent>
      </Drawer>

    </div>
  );
}