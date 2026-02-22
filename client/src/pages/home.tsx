import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from "react";
import { useQuery } from "@tanstack/react-query";
import { WalletConnect } from "@/components/wallet-connect";
import { ContestHeader } from "@/components/contest-header";
import { RewardInfoChart } from "@/components/reward-info-chart";
import { MemeCard } from "@/components/meme-card";
import { MediaDisplay } from "@/components/media-display";
import { MultiImageBadge } from "@/components/image-carousel";
import { MemeDetailModal } from "@/components/meme-detail-modal";

const UploadForm = lazy(() => import("@/components/upload-form").then(m => ({ default: m.UploadForm })));
const Leaderboard = lazy(() => import("@/components/leaderboard").then(m => ({ default: m.Leaderboard })));
const GoodsShop = lazy(() => import("@/components/goods-shop").then(m => ({ default: m.GoodsShop })));
const RewardsDashboard = lazy(() => import("@/components/rewards-dashboard").then(m => ({ default: m.RewardsDashboard })));
const SamuMap = lazy(() => import("@/components/samu-map").then(m => ({ default: m.SamuMap })));


import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { Transaction } from '@solana/web3.js';
import { getSharedConnection } from "@/lib/solana";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Grid3X3, List, ArrowUp, Share2, Twitter, Send, Trophy, ShoppingBag, Archive, Users, Plus, Lock, RefreshCw, ChevronDown, ChevronUp, Coins } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Meme } from "@shared/schema";
import samuLogoImg from "@/assets/samu-logo.webp";
import { getDeviceId } from "@/utils/deviceFingerprint";

// Real-time archive card component
function RealTimeArchiveCard({ contest, isConnected, isLoadingContestDetails, onContestClick }: {
  contest: any;
  isConnected: boolean;
  isLoadingContestDetails: boolean;
  onContestClick: () => void;
}) {
  const [realTimeStats, setRealTimeStats] = useState<{
    participants: number;
    votes: number;
    loading: boolean;
  }>({ participants: 0, votes: 0, loading: false });

  // Calculate real-time statistics if archival stats are 0
  const needsRealTimeStats = contest.totalParticipants === 0 && contest.totalVotes === 0;

  useEffect(() => {
    if (needsRealTimeStats) {
      setRealTimeStats(prev => ({ ...prev, loading: true }));
      
      fetch(`/api/memes?contestId=${contest.originalContestId}`)
        .then(res => res.json())
        .then(data => {
          const memes = data.memes || [];
          const uniqueAuthors = new Set(memes.map((m: any) => m.authorUsername)).size;
          const totalVotes = memes.reduce((sum: number, m: any) => sum + m.votes, 0);
          
          setRealTimeStats({
            participants: uniqueAuthors,
            votes: totalVotes,
            loading: false
          });
        })
        .catch(() => {
          setRealTimeStats({ participants: 0, votes: 0, loading: false });
        });
    }
  }, [contest.originalContestId, needsRealTimeStats]);

  const displayParticipants = needsRealTimeStats ? realTimeStats.participants : contest.totalParticipants;
  const displayVotes = needsRealTimeStats ? realTimeStats.votes : contest.totalVotes;

  return (
    <button
      onClick={onContestClick}
      className="w-full"
      disabled={isLoadingContestDetails}
    >
      <Card className={`border-border/50 hover:border-primary/30 transition-colors relative ${!isConnected ? 'opacity-70' : ''} ${isLoadingContestDetails ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h4 className="font-semibold text-foreground">{contest.title}</h4>
              <p className="text-sm text-muted-foreground">
                {needsRealTimeStats && realTimeStats.loading ? (
                  "Loading statistics..."
                ) : (
                  <>
                    {displayParticipants} participants • {displayVotes} votes
                    {!isConnected && (
                      <span className="text-primary ml-2">• Login to view</span>
                    )}
                  </>
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
  );
}

export default function Home() {
  const [sortBy, setSortBy] = useState("votes");
  const [currentTab, setCurrentTab] = useState("contest");
  const [viewMode, setViewMode] = useState<'card' | 'grid'>('card');
  const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null);
  const [votingMeme, setVotingMeme] = useState<Meme | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [archiveView, setArchiveView] = useState<'list' | 'contest'>('list');
  const [selectedArchiveContest, setSelectedArchiveContest] = useState<any>(null);
  const [selectedArchiveMeme, setSelectedArchiveMeme] = useState<any>(null);
  const [isLoadingContestDetails, setIsLoadingContestDetails] = useState(false);

  const [showVoteDialog, setShowVoteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [voteAmount, setVoteAmount] = useState(1);
  const [, setLocation] = useLocation();

  // 디바이스 ID는 이미 App.tsx에서 초기화됨
  
  // Removed infinite scroll - using simple data fetching

  // Check if there's an active contest
  const { data: currentContest } = useQuery({
    queryKey: ['/api/admin/current-contest'],
    queryFn: async () => {
      const response = await fetch('/api/admin/current-contest');
      if (!response.ok) return null;
      return response.json();
    },
    staleTime: 10000,
    refetchOnWindowFocus: true,
  });

  // Privy authentication
  const { authenticated, user } = usePrivy();
  const { signTransaction } = useSignTransaction();
  const { wallets: solWallets, ready: solWalletsReady } = useSolanaWallets();
  const { toast } = useToast();
  
  const solConnection = useMemo(() => getSharedConnection(), []);

  // Solana 지갑만 사용 - 간단하고 깔끔한 로직
  const walletAccounts = user?.linkedAccounts?.filter(account => 
    account.type === 'wallet' && 
    account.connectorType !== 'injected' && 
    account.chainType === 'solana'
  ) || [];
  const selectedWalletAccount = walletAccounts[0]; // 유일한 Solana 지갑

  const isConnected = authenticated && !!selectedWalletAccount;
  const walletAddress = (selectedWalletAccount as any)?.address || '';



  // Get archived contests
  const { data: archivedContests = [], isLoading: isLoadingArchives } = useQuery({
    queryKey: ["/api/admin/archived-contests"],
    staleTime: 60000,
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
    staleTime: 30000,
  });

  const { data: samuBalanceData } = useQuery({
    queryKey: ['samu-balance', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      const res = await fetch(`/api/samu-balance/${walletAddress}`);
      return res.json();
    },
    enabled: !!walletAddress && authenticated,
    staleTime: 5000,
  });

  const samuBalance = samuBalanceData?.balance || 0;




  // Profile state management - use override state only for instant updates from profile page
  const [profileOverride, setProfileOverride] = useState<{ displayName: string; profileImage: string } | null>(null);

  // Listen for profile updates from profile page
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      setProfileOverride({
        displayName: event.detail.displayName,
        profileImage: event.detail.profileImage || event.detail.avatarUrl || ''
      });
    };

    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
  }, []);

  // Clear override when userProfile data catches up
  useEffect(() => {
    if (userProfile && profileOverride) {
      setProfileOverride(null);
    }
  }, [userProfile]);

  const displayName = !authenticated
    ? 'SAMU'
    : profileOverride?.displayName
      || userProfile?.displayName
      || (userProfile === undefined ? '' : (user?.email?.address?.split('@')[0] || 'User'));
  const profileImage = profileOverride?.profileImage || userProfile?.avatarUrl || '';

  useEffect(() => {
    if (samuBalance && voteAmount > samuBalance) {
      setVoteAmount(Math.min(1, samuBalance));
    }
  }, [samuBalance, voteAmount]);

  const handleVoteUpdate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/memes'], exact: false });
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['samu-balance'] });
    }, 5000);
  }, [queryClient]);

  const executeOnChainVote = useCallback(async (memeId: number, amount: number): Promise<string> => {
    const prepareRes = await fetch('/api/memes/prepare-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voterWallet: walletAddress, samuAmount: amount })
    });

    if (!prepareRes.ok) {
      const err = await prepareRes.json();
      throw new Error(err.message || 'Failed to prepare transaction');
    }

    const { transaction: serializedTx } = await prepareRes.json();
    const transaction = Transaction.from(Buffer.from(serializedTx, 'base64'));

    const signedTx = await signTransaction({ transaction, connection: solConnection });
    const txSignature = await solConnection.sendRawTransaction(signedTx.serialize());
    
    await solConnection.confirmTransaction(txSignature, 'confirmed');
    
    return txSignature;
  }, [walletAddress, signTransaction, solConnection]);

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  const handleGridVote = useCallback(async (meme: Meme) => {
    if (!isConnected || !walletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to vote.",
        variant: "destructive",
      });
      return;
    }

    setIsVoting(true);

    try {
      toast({
        title: "Preparing transaction...",
        description: "Sending 1 SAMU to treasury",
        duration: 5000
      });

      const txSignature = await executeOnChainVote(meme.id, 1);

      queryClient.setQueryData(['/api/memes', { sortBy }], (old: any) => {
        if (!old?.memes) return old;
        return {
          ...old,
          memes: old.memes.map((m: any) =>
            m.id === meme.id ? { ...m, votes: m.votes + 1 } : m
          )
        };
      });
      queryClient.setQueryData(['samu-balance', walletAddress], (old: any) => {
        if (!old) return old;
        return { ...old, balance: Math.max(0, old.balance - 1) };
      });

      await apiRequest("POST", `/api/memes/${meme.id}/vote`, {
        voterWallet: walletAddress,
        samuAmount: 1,
        txSignature
      });

      toast({
        title: "Vote Submitted!",
        description: `Sent 1 SAMU on-chain. Tx: ${txSignature.slice(0, 8)}...`,
        duration: 3000
      });

      setSelectedMeme(null);

      await handleVoteUpdate();

    } catch (error: any) {
      queryClient.invalidateQueries({ queryKey: ['/api/memes'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['samu-balance', walletAddress] });

      const msg = error.message || "Failed to submit vote.";
      toast({
        title: "Voting Failed",
        description: msg.includes("User rejected") ? "Transaction was cancelled." : msg,
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  }, [isConnected, walletAddress, toast, handleVoteUpdate, executeOnChainVote, sortBy]);

  // Share functions
  const shareToTwitter = useCallback((meme: Meme) => {
    const text = `Check out this awesome meme: "${meme.title}" by ${meme.authorUsername} 🔥`;
    const url = window.location.href;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
  }, []);

  const shareToTelegram = useCallback((meme: Meme) => {
    const text = `Check out this awesome meme: "${meme.title}" by ${meme.authorUsername}`;
    const url = window.location.href;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank');
  }, []);



  // Simple data fetching - current contest memes only
  const { data: memesResponse, isLoading, refetch } = useQuery({
    queryKey: ['/api/memes', { sortBy }],
    queryFn: async () => {
      const params = new URLSearchParams({ sortBy });
      const response = await fetch(`/api/memes?${params}`);
      if (!response.ok) throw new Error('Failed to fetch memes');
      return response.json();
    },
    staleTime: 30000, // 30초 캐시
    gcTime: 60000, // 1분 가비지 컬렉션
  });

  // Use memes directly from API response
  const sortedMemes: Meme[] = memesResponse?.memes || [];

  // Click handlers
  const handleMemeClick = useCallback((meme: Meme) => {
    setSelectedMeme(meme);
    setShowVoteDialog(true);
  }, []);

  const handleVoteSuccess = useCallback(async () => {
    setShowVoteDialog(false);
    setSelectedMeme(null);
    
    // 투표 후 관련 쿼리 무효화
    queryClient.invalidateQueries({ queryKey: ['/api/memes'] });
  }, [queryClient]);

  // Listen for new meme uploads and refresh data
  useEffect(() => {
    const handleMemeUpload = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/memes'] });
    };

    window.addEventListener('memeUploaded', handleMemeUpload);
    return () => window.removeEventListener('memeUploaded', handleMemeUpload);
  }, [queryClient]);

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
              onClick={() => setLocation('/profile')}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity min-w-0 flex-shrink"
            >
              {authenticated ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {profileImage ? (
                      <img 
                        src={profileImage} 
                        alt="Profile" 
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : displayName ? (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-bold text-sm">
                          {displayName.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 animate-pulse" />
                    )}
                  </div>
                  {displayName ? (
                    <span className="text-lg font-bold text-primary truncate">{displayName}</span>
                  ) : (
                    <div className="h-5 w-20 bg-primary/10 rounded animate-pulse" />
                  )}
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center samu-wolf-logo overflow-hidden flex-shrink-0">
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
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="text-foreground hover:bg-accent"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <WalletConnect />
            </div>
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
                  <ContestHeader entriesCount={sortedMemes.length} />

                  {/* Reward Distribution Info */}
                  {currentContest?.id && (
                    <RewardInfoChart contestId={currentContest.id} compact walletAddress={walletAddress || undefined} />
                  )}

                  {/* Submit Button - Only show when logged in AND there's an active contest */}
                  {isConnected && currentContest?.status === "active" ? (
                    <div className="flex justify-center">
                      <Button 
                        onClick={() => setShowUploadForm(true)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-medium"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Submit Meme
                      </Button>
                    </div>
                  ) : isConnected && currentContest?.status !== "active" ? (
                    <div className="flex justify-center">
                      <Card className="bg-amber-500/10 border-amber-500/20">
                        <CardContent className="p-4 text-center">
                          <p className="text-amber-600 dark:text-amber-400 text-sm">
                            {currentContest?.status === "archiving"
                              ? "Contest is being archived... Please wait a moment."
                              : currentContest?.status === "ended" || currentContest?.status === "archived" 
                              ? "Contest has ended. Check back for the next contest!" 
                              : "No active contest at the moment. Check back later!"}
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

                    {/* 메인 콘텐츠 영역 - 간단한 로딩 표시 */}
                    <div className="transition-opacity duration-300 opacity-100">
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
                                    animationDelay: `${Math.min(index * 50, 300)}ms`,
                                  }}
                                >
                                  <MemeCard 
                                    meme={meme} 
                                    onVote={handleVoteUpdate}
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
                                    setSelectedMeme(meme);
                                  }}
                                  className="aspect-square bg-accent flex items-center justify-center hover:opacity-90 transition-all duration-200 relative group animate-fade-in"
                                  style={{ 
                                    animationDelay: `${Math.min(index * 30, 200)}ms`,
                                  }}
                                >
                                  <MultiImageBadge count={1 + (meme.additionalImages?.length || 0)} />
                                  <MediaDisplay
                                    src={meme.imageUrl}
                                    alt={meme.title}
                                    className="w-full h-full"
                                    showControls={false}
                                    muted={true}
                                    loop={true}
                                    autoPlayOnVisible={true}
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

                    {/* Simple end message */}
                    {sortedMemes.length > 0 && (
                      <div className="text-center mt-6">
                        <p className="text-sm text-muted-foreground">You've seen all memes!</p>
                      </div>
                    )}
                  </div>
                </main>
              </TabsContent>

              <TabsContent value="leaderboard">
                <Suspense fallback={<div className="flex justify-center py-8"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
                  <Leaderboard />
                </Suspense>
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
                  ) : (archivedContests as any)?.length === 0 ? (
                    <Card className="border-border/50">
                      <CardContent className="p-8 text-center">
                        <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No archived contests yet</p>
                        <p className="text-sm text-muted-foreground/70">Completed contests will appear here</p>
                      </CardContent>
                    </Card>
                  ) : (
                    (archivedContests as any).map((contest: any) => (
                      <RealTimeArchiveCard
                        key={contest.id}
                        contest={contest}
                        isConnected={isConnected}
                        isLoadingContestDetails={isLoadingContestDetails}
                        onContestClick={async () => {
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
                            
                            // Calculate real-time statistics
                            const uniqueAuthors = new Set(memes.map((m: any) => m.authorUsername)).size;
                            const totalVotes = memes.reduce((sum: number, m: any) => sum + m.votes, 0);
                            
                            setSelectedArchiveContest({
                              id: contest.originalContestId,
                              title: contest.title,
                              description: contest.description,
                              participants: contest.totalParticipants || uniqueAuthors,
                              totalVotes: contest.totalVotes || totalVotes,
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

                            toast({
                              title: "Error loading contest data",
                              description: "Please try again later",
                              duration: 3000
                            });
                          } finally {
                            setIsLoadingContestDetails(false);
                          }
                        }}
                      />
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

                    {/* Reward Distribution Chart */}
                    {selectedArchiveContest?.id && (
                      <RewardInfoChart contestId={selectedArchiveContest.id} walletAddress={walletAddress || undefined} />
                    )}


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
                            <MultiImageBadge count={1 + (meme.additionalImages?.length || 0)} />
                            <MediaDisplay
                              src={meme.imageUrl}
                              alt={meme.title}
                              className="w-full h-full"
                              showControls={false}
                              autoPlay={false}
                              muted={true}
                              loop={true}
                            />
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
            <Suspense fallback={<div className="min-h-[200px]" />}>
              <GoodsShop />
            </Suspense>
          </TabsContent>

          <TabsContent value="rewards" className="mt-4 space-y-4 pb-24">
            <Tabs defaultValue="map" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-10">
                <TabsTrigger value="map" className="text-sm">Map</TabsTrigger>
                <TabsTrigger value="dashboard" className="text-sm">Dashboard</TabsTrigger>
              </TabsList>

              <TabsContent value="map" className="mt-4">
                <Suspense fallback={<div className="min-h-[300px] bg-accent animate-pulse rounded-lg" />}>
                  <SamuMap walletAddress={walletAddress} />
                </Suspense>
              </TabsContent>

              <TabsContent value="dashboard" className="mt-4">
                <Suspense fallback={<div className="min-h-[200px]" />}>
                  <RewardsDashboard />
                </Suspense>
              </TabsContent>
            </Tabs>
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
              className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-lg transition-colors ${
                currentTab === "contest" 
                  ? "bg-primary/20 text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Trophy className="h-4 w-4" />
              <span className="text-[10px] mt-0.5">Contest</span>
            </button>
            <button
              onClick={() => setCurrentTab("archive")}
              className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-lg transition-colors ${
                currentTab === "archive" 
                  ? "bg-primary/20 text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Archive className="h-4 w-4" />
              <span className="text-[10px] mt-0.5">Archive</span>
            </button>
            <button
              onClick={() => setCurrentTab("goods")}
              className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-lg transition-colors ${
                currentTab === "goods" 
                  ? "bg-primary/20 text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="text-[10px] mt-0.5">Goods</span>
            </button>
            <button
              onClick={() => setCurrentTab("rewards")}
              className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-lg transition-colors ${
                currentTab === "rewards" 
                  ? "bg-primary/20 text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Coins className="h-4 w-4" />
              <span className="text-[10px] mt-0.5">Rewards</span>
            </button>
            <button
              onClick={() => setLocation("/partners")}
              className="flex flex-col items-center justify-center py-2 px-0.5 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            >
              <Users className="h-4 w-4" />
              <span className="text-[10px] mt-0.5">Partners</span>
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
            setVotingMeme(selectedMeme);
            setSelectedMeme(null);
            setShowVoteDialog(true);
          }}
          canVote={isConnected}
        />
      )}

      {/* Grid View Vote Confirmation Drawer */}
      {votingMeme && (
        <Drawer open={showVoteDialog} onOpenChange={setShowVoteDialog}>
          <DrawerContent className="bg-card border-border max-h-[85dvh]">
            <DrawerHeader>
              <DrawerTitle className="text-foreground">Confirm Your Vote</DrawerTitle>
              <DrawerDescription className="text-muted-foreground">
                You're about to vote for "{votingMeme.title}" by {votingMeme.authorUsername}
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
                onClick={async () => {
                  if (!votingMeme || !walletAddress) return;

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
                      description: `Sending ${voteAmount.toLocaleString()} SAMU to treasury`,
                      duration: 5000
                    });

                    const txSignature = await executeOnChainVote(votingMeme.id, voteAmount);

                    await apiRequest("POST", `/api/memes/${votingMeme.id}/vote`, {
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
                    setVotingMeme(null);
                    
                    setTimeout(() => {
                      queryClient.invalidateQueries({ queryKey: ['samu-balance', walletAddress] });
                    }, 5000);
                    queryClient.invalidateQueries({ queryKey: ['/api/memes'] });
                    queryClient.invalidateQueries({ queryKey: ['user-votes'] });
                    queryClient.invalidateQueries({ queryKey: ['user-stats'] });
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
          <DrawerContent className="bg-card border-border max-h-[90dvh]">
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
      <Drawer 
        open={showUploadForm} 
        onOpenChange={setShowUploadForm}
        shouldScaleBackground={false}
      >
        <DrawerContent className="bg-card border-border max-h-[85dvh]">
          <DrawerHeader className="py-2">
            <DrawerTitle className="text-foreground text-base">Submit New Meme</DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-6 overflow-y-auto flex-1">
            <Suspense fallback={<div className="flex justify-center py-8"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
              <UploadForm 
                onClose={() => setShowUploadForm(false)}
                onSuccess={() => {
                  setShowUploadForm(false);
                  queryClient.invalidateQueries({ queryKey: ['/api/memes'] });
                }}
              />
            </Suspense>
          </div>
        </DrawerContent>
      </Drawer>

    </div>
  );
}