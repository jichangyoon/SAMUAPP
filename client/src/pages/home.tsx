import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { WalletConnect } from "@/components/wallet-connect";
import { ContestHeader } from "@/components/contest-header";
import { UploadForm } from "@/components/upload-form";
import { MemeCard } from "@/components/meme-card";
import { Leaderboard } from "@/components/leaderboard";
import { GoodsShop } from "@/components/goods-shop";
import { NftGallery } from "@/components/nft-gallery";
import { MediaDisplay } from "@/components/media-display";
import { MemeDetailModal } from "@/components/meme-detail-modal";

import { usePrivy } from '@privy-io/react-auth';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Grid3X3, List, ArrowUp, Share2, Twitter, Send, Trophy, ShoppingBag, Archive, Image, Users, Plus, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Meme } from "@shared/schema";
import samuLogoImg from "@/assets/samu-logo.webp";

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
  const [isLoadingContestDetails, setIsLoadingContestDetails] = useState(false);
  const [showNftLoading, setShowNftLoading] = useState(false);
  
  // Infinite scroll state
  const [page, setPage] = useState(1);
  const [allMemes, setAllMemes] = useState<Meme[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Check if there's an active contest
  const { data: currentContest } = useQuery({
    queryKey: ['/api/admin/current-contest'],
    queryFn: async () => {
      const response = await fetch('/api/admin/current-contest');
      if (!response.ok) return null;
      return response.json();
    },
    staleTime: 30 * 1000, // 30초간 캐시 유지
  });

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



  // Get archived contests
  const { data: archivedContests = [], isLoading: isLoadingArchives } = useQuery({
    queryKey: ["/api/admin/archived-contests"],
  });

  // User profile data from database
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-header', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      const res = await fetch(`/api/users/profile/${walletAddress}`);
      return res.json();
    },
    enabled: !!walletAddress && authenticated,
  });

  // Profile state management
  const [profileData, setProfileData] = useState({ displayName: 'User', profileImage: '' });

  // Load profile data from database, not localStorage
  useEffect(() => {
    if (userProfile) {
      setProfileData({
        displayName: userProfile.displayName || user?.email?.address?.split('@')[0] || 'User',
        profileImage: userProfile.avatarUrl || ''
      });
      // console.log('Header profile loaded from database:', { displayName: userProfile.displayName, avatarUrl: userProfile.avatarUrl });
    } else if (authenticated) {
      setProfileData({
        displayName: user?.email?.address?.split('@')[0] || 'User',
        profileImage: ''
      });
    } else {
      setProfileData({ displayName: 'User', profileImage: '' });
    }
  }, [userProfile, authenticated, user?.email?.address]);

  // Listen for profile updates from profile page
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      // Force immediate state update for instant visual feedback
      setProfileData({
        displayName: event.detail.displayName,
        profileImage: event.detail.profileImage || event.detail.avatarUrl
      });

      // Invalidate queries for immediate sync
      queryClient.invalidateQueries({ queryKey: ['user-profile-header', walletAddress] });
      queryClient.invalidateQueries({ queryKey: ['/api/memes'] });
    };

    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
  }, [queryClient, walletAddress]);

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
      
      // Only invalidate the specific meme author's stats cache
      queryClient.invalidateQueries({ 
        queryKey: ['user-stats', meme.authorWallet]
      });
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

  // Calculate page size based on view mode
  const pageSize = viewMode === 'grid' ? 9 : 7;

  // Reset pagination when view mode or sort changes
  useEffect(() => {
    setPage(1);
    setAllMemes([]);
    setHasMore(true);
  }, [viewMode, sortBy]);

  // Fetch memes data with pagination
  const { data: memesResponse, isLoading, refetch } = useQuery({
    queryKey: ['/api/memes', { page, limit: pageSize, sortBy }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        sortBy: sortBy
      });
      const response = await fetch(`/api/memes?${params}`);
      if (!response.ok) throw new Error('Failed to fetch memes');
      return response.json();
    },
    enabled: true,
    staleTime: 10 * 1000, // 10초간 캐시 유지
  });

  // Update memes list when new data arrives
  useEffect(() => {
    if (memesResponse?.memes) {
      if (page === 1) {
        setAllMemes(memesResponse.memes);
      } else {
        setAllMemes(prev => [...prev, ...memesResponse.memes]);
      }
      setHasMore(memesResponse.pagination.hasMore);
      setIsLoadingMore(false);
    }
  }, [memesResponse, page]);

  // Load more function
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || isLoading) return;
    
    setIsLoadingMore(true);
    setPage(prev => prev + 1);
  }, [hasMore, isLoadingMore, isLoading]);

  // Infinite scroll detection
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  // Use allMemes for display (already sorted by backend)
  const sortedMemes = allMemes;

  // Optimized click handlers with minimal dependencies
  const handleMemeClick = useCallback((meme: Meme) => {
    setSelectedMeme(meme);
    setShowVoteDialog(true);
  }, []);

  const handleVoteSuccess = useCallback(async () => {
    setShowVoteDialog(false);
    setSelectedMeme(null);
    
    // Force immediate refetch of current data instead of resetting
    await Promise.all([
      refetch(), // Refetch current page data
      queryClient.invalidateQueries({ queryKey: ['/api/memes'] }),
      queryClient.invalidateQueries({ queryKey: ['user-memes', walletAddress] }),
      queryClient.invalidateQueries({ queryKey: ['user-votes', walletAddress] })
    ]);
  }, [queryClient, walletAddress, refetch]);

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

                  {/* Submit Button - Only show when logged in AND there's an active contest */}
                  {isConnected && currentContest ? (
                    <div className="flex justify-center">
                      <Button 
                        onClick={() => setShowUploadForm(true)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-medium"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Submit Meme
                      </Button>
                    </div>
                  ) : isConnected && !currentContest ? (
                    <div className="flex justify-center">
                      <Card className="bg-amber-500/10 border-amber-500/20">
                        <CardContent className="p-4 text-center">
                          <p className="text-amber-600 dark:text-amber-400 text-sm">
                            No active contest at the moment. Check back later!
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  ) : null}

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

                    {/* 메인 콘텐츠 영역 - 로딩 중일 때 반투명 효과 */}
                    <div className={`transition-opacity duration-300 ${isLoadingMore ? 'opacity-60' : 'opacity-100'}`}>
                      {isLoading ? (
                        <div className="space-y-4">
                          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
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
                              {sortedMemes.map((meme, index) => (
                                <div 
                                  key={meme.id}
                                  className="animate-fade-in"
                                  style={{ 
                                    animationDelay: `${index * 50}ms`,
                                    opacity: 0,
                                    animation: `fadeIn 0.5s ease-out ${index * 50}ms forwards`
                                  }}
                                >
                                  <MemeCard 
                                    meme={meme} 
                                    onVote={() => {
                                      // 즉시 UI 업데이트
                                      setAllMemes(prevMemes => 
                                        prevMemes.map(m => 
                                          m.id === meme.id ? { ...m, votes: m.votes + samuBalance } : m
                                        )
                                      );
                                      refetch();
                                    }}
                                    canVote={isConnected}
                                  />
                                </div>
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
                              {sortedMemes.map((meme, index) => (
                                <button
                                  key={meme.id}
                                  onClick={() => {
                                    // 현재 투표 수를 포함한 meme 객체 전달
                                    const currentMeme = allMemes.find(m => m.id === meme.id) || meme;
                                    setSelectedMeme(currentMeme);
                                  }}
                                  className="aspect-square bg-accent flex items-center justify-center hover:opacity-90 transition-all duration-200 relative group animate-fade-in"
                                  style={{ 
                                    animationDelay: `${index * 30}ms`,
                                    opacity: 0,
                                    animation: `fadeIn 0.4s ease-out ${index * 30}ms forwards`
                                  }}
                                >
                                  <MediaDisplay
                                    src={meme.imageUrl}
                                    alt={meme.title}
                                    className="w-full h-full"
                                    showControls={false}
                                    autoPlay={false}
                                    muted={true}
                                    loop={true}
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
                    </div>

                    {/* Infinite scroll loading indicator - 더 부드러운 애니메이션 */}
                    {isLoadingMore && (
                      <div className="text-center mt-6 animate-fade-in">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-bounce w-2 h-2 bg-primary rounded-full" style={{ animationDelay: '0ms' }}></div>
                          <div className="animate-bounce w-2 h-2 bg-primary rounded-full" style={{ animationDelay: '150ms' }}></div>
                          <div className="animate-bounce w-2 h-2 bg-primary rounded-full" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-3 animate-pulse">Loading more memes...</p>
                      </div>
                    )}
                    
                    {!hasMore && sortedMemes.length > 0 && (
                      <div className="text-center mt-6">
                        <p className="text-sm text-muted-foreground">You've seen all memes!</p>
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

                  {isLoadingArchives ? (
                    <Card className="border-border/50">
                      <CardContent className="p-8 text-center">
                        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
                        <p className="text-muted-foreground">Loading contests...</p>
                      </CardContent>
                    </Card>
                  ) : archivedContests.length === 0 ? (
                    <Card className="border-border/50">
                      <CardContent className="p-8 text-center">
                        <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No archived contests yet</p>
                        <p className="text-sm text-muted-foreground/70">Completed contests will appear here</p>
                      </CardContent>
                    </Card>
                  ) : (
                    archivedContests.map((contest: any) => (
                      <button
                        key={contest.id}
                        onClick={async () => {
                          if (!isConnected) {
                            toast({
                              title: "Please login first",
                              description: "You need to login to view contest archives - our community heritage",
                              duration: 1000
                            });
                            return;
                          }
                          
                          setIsLoadingContestDetails(true);
                          
                          try {
                            // Fetch contest memes
                            const response = await fetch(`/api/memes?contestId=${contest.originalContestId}`);
                            const memesData = await response.json();
                            
                            const memes = memesData.memes || [];
                            
                            setSelectedArchiveContest({
                              id: contest.originalContestId,
                              title: contest.title,
                              description: contest.description,
                              participants: contest.totalParticipants,
                              totalVotes: contest.totalVotes,
                              status: "Completed",
                              winner: {
                                name: memes.length > 0 ? memes[0].title : "Unknown",
                                author: memes.length > 0 ? memes[0].authorUsername : "Unknown",
                                votes: memes.length > 0 ? memes[0].votes : 0
                              },
                              secondPlace: memes.length > 1 ? memes[1].title : "Unknown",
                              thirdPlace: memes.length > 2 ? memes[2].title : "Unknown",
                              memes: memes.map((meme: any, index: number) => ({
                                ...meme,
                                rank: index + 1,
                                imageUrl: meme.imageUrl,
                                author: meme.authorUsername
                              }))
                            });
                            setArchiveView('contest');
                          } catch (error) {
                            console.error('Failed to load contest memes:', error);
                            toast({
                              title: "Error loading contest data",
                              description: "Please try again later",
                              duration: 3000
                            });
                          } finally {
                            setIsLoadingContestDetails(false);
                          }
                        }}
                        className="w-full"
                        disabled={isLoadingContestDetails}
                      >
                        <Card className={`border-border/50 hover:border-primary/30 transition-colors relative ${!isConnected ? 'opacity-70' : ''} ${isLoadingContestDetails ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="text-left">
                                <h4 className="font-semibold text-foreground">{contest.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {contest.totalParticipants} participants • {contest.totalVotes} votes
                                  {!isConnected && (
                                    <span className="text-primary ml-2">• Login to view</span>
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {isLoadingContestDetails ? (
                                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                                ) : (
                                  <>
                                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-400/20">
                                      Completed
                                    </Badge>
                                    {!isConnected && (
                                      <Badge variant="outline" className="text-primary border-primary/50">
                                        🔒
                                      </Badge>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </button>
                    ))
                  )}
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
                <div className="mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setArchiveView('list')}
                    className="text-foreground hover:text-primary px-2 py-1 text-xs h-6"
                  >
                    ← Back
                  </Button>
                </div>

                {selectedArchiveContest && (
                  <>
                    {/* Contest Header */}
                    <Card className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-400/20">
                      <CardContent className="p-4">
                        <div className="text-center">
                          <h2 className="text-lg font-bold text-purple-400 mb-1">
                            {selectedArchiveContest.title}
                          </h2>
                          {selectedArchiveContest.description && (
                            <p className="text-sm text-purple-300/80 mb-3">
                              {selectedArchiveContest.description}
                            </p>
                          )}
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
                      <h3 className="font-semibold text-foreground">
                        All Contest Entries ({selectedArchiveContest.memes.length})
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedArchiveContest.memes.map((meme: any) => (
                          <button
                            key={meme.id}
                            onClick={() => setSelectedArchiveMeme(meme)}
                            className="aspect-square bg-accent flex items-center justify-center hover:opacity-90 transition-opacity relative group"
                          >
                            <MediaDisplay
                              src={meme.imageUrl}
                              alt={meme.title}
                              className="w-full h-full"
                              showControls={false}
                              autoPlay={false}
                              muted={true}
                              loop={true}
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
            {showNftLoading ? (
              <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
                <p className="text-muted-foreground">Loading SAMU Wolf Collection...</p>
              </div>
            ) : (
              <NftGallery />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Archive Meme Detail Modal */}
      {selectedArchiveMeme && (
        <MemeDetailModal
          isOpen={!!selectedArchiveMeme}
          onClose={() => setSelectedArchiveMeme(null)}
          meme={selectedArchiveMeme}
          canVote={false}
        />
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="max-w-md mx-auto px-4 py-1">
          <div className="grid grid-cols-5 gap-0">
            <button
              onClick={() => setCurrentTab("contest")}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors ${
                currentTab === "contest" 
                  ? "bg-primary/20 text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Trophy className="h-4 w-4" />
              <span className="text-xs mt-1">Contest</span>
            </button>
            <button
              onClick={() => setCurrentTab("archive")}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors ${
                currentTab === "archive" 
                  ? "bg-primary/20 text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Archive className="h-4 w-4" />
              <span className="text-xs mt-1">Archive</span>
            </button>
            <button
              onClick={() => {
                setCurrentTab("nfts");
                setShowNftLoading(true);
                setTimeout(() => setShowNftLoading(false), 1200);
              }}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors ${
                currentTab === "nfts" 
                  ? "bg-primary/20 text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Image className="h-4 w-4" />
              <span className="text-xs mt-1">NFT</span>
            </button>
            <button
              onClick={() => setCurrentTab("goods")}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors ${
                currentTab === "goods" 
                  ? "bg-primary/20 text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="text-xs mt-1">Goods</span>
            </button>
            <button
              onClick={() => setLocation("/partners")}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            >
              <Users className="h-4 w-4" />
              <span className="text-xs mt-1">Partners</span>
            </button>
          </div>
        </div>
      </div>



      {/* Grid View Meme Detail Modal */}
      {selectedMeme && (
        <MemeDetailModal
          isOpen={!!selectedMeme}
          onClose={() => setSelectedMeme(null)}
          meme={selectedMeme}
          onVote={() => {
            setSelectedMeme(null);
            setShowVoteDialog(true);
          }}
          canVote={isConnected}
        />
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
                onClick={async () => {
                  if (!selectedMeme || !walletAddress) return;
                  
                  setIsVoting(true);
                  
                  // 즉시 UI 업데이트 (낙관적 업데이트)
                  setAllMemes(prevMemes => 
                    prevMemes.map(m => 
                      m.id === selectedMeme.id ? { ...m, votes: m.votes + 1 } : m
                    )
                  );
                  
                  try {
                    await apiRequest("POST", `/api/memes/${selectedMeme.id}/vote`, {
                      voterWallet: walletAddress,
                      votingPower: 1,
                    });

                    // 성공 시 실제 데이터로 업데이트
                    refetch();
                    
                    // 선택된 밈도 업데이트
                    setSelectedMeme(prev => prev ? { ...prev, votes: prev.votes + 1 } : null);

                    toast({
                      title: "Vote Submitted!",
                      description: "Your vote has been recorded.",
                      duration: 1000
                    });

                    handleVoteSuccess();
                  } catch (error: any) {
                    // 실패 시 원래 상태로 복구
                    setAllMemes(prevMemes => 
                      prevMemes.map(m => 
                        m.id === selectedMeme.id ? { ...m, votes: m.votes - 1 } : m
                      )
                    );
                    refetch();
                    
                    toast({
                      title: "Voting Failed",
                      description: error.message || "Failed to submit vote. You may have already voted on this meme.",
                      variant: "destructive",
                      duration: 1000
                    });
                  } finally {
                    setIsVoting(false);
                  }
                }}
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