import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { apiRequest } from "@/lib/queryClient";
import { MemeCard } from "@/components/meme-card";
import { Leaderboard } from "@/components/leaderboard";
import { GoodsShop } from "@/components/goods-shop";
import { NftGallery } from "@/components/nft-gallery";
import { UploadForm } from "@/components/upload-form";
import { AdminPanel } from "@/components/admin-panel";
import { MemeDetailModal } from "@/components/meme-detail-modal";
import { MediaDisplay } from "@/components/media-display";
import { User, Grid3X3, List, ArrowUp, Share2, Twitter, Send, Trophy, ShoppingBag, Archive, Image, Users, Plus } from "lucide-react";
import type { Meme } from "@shared/schema";

const SAMU_TOKEN_ADDRESS = "EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF";

interface HomeProps {}

export default function Home({}: HomeProps) {
  const { user, ready: privyReady, authenticated: isConnected, logout } = usePrivy();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [currentTab, setCurrentTab] = useState<"contest" | "archive" | "nfts" | "goods">("contest");
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [sortBy, setSortBy] = useState<'votes' | 'latest'>('votes');
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
  
  // Load archived contests
  const { data: archivedContests } = useQuery({
    queryKey: ['/api/archived-contests'],
    enabled: isConnected,
  });
  
  // Load archived memes for selected contest
  const { data: archivedMemes } = useQuery({
    queryKey: ['/api/archived-memes', selectedArchiveContest?.id],
    enabled: !!selectedArchiveContest?.id,
  });
  
  const loadArchivedContest = async (contestId: number) => {
    try {
      const response = await fetch(`/api/archived-memes?contestId=${contestId}`);
      const data = await response.json();
      
      setSelectedArchiveContest({
        id: contestId,
        title: archivedContests?.find((c: any) => c.id === contestId)?.title || "Contest",
        participants: data.archivedMemes?.length || 0,
        totalVotes: data.archivedMemes?.reduce((sum: number, meme: any) => sum + meme.votes, 0) || 0,
        status: "Completed",
        memes: data.archivedMemes || []
      });
      setArchiveView('contest');
    } catch (error) {
      console.error('Failed to load archived contest:', error);
    }
  };
  
  // Infinite scroll state
  const [page, setPage] = useState(1);
  const [allMemes, setAllMemes] = useState<Meme[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Get wallet address
  const walletAddress = user?.wallet?.address || user?.linkedAccounts?.find(account => account.type === 'wallet')?.address || '';

  // User profile query
  const { data: userProfile } = useQuery({
    queryKey: ['/api/users/profile', walletAddress],
    enabled: !!walletAddress,
  });

  // Fetch combined balance data
  const { data: balanceData } = useQuery({
    queryKey: ['/api/wallet/balance', walletAddress],
    queryFn: async () => {
      const [samuResponse, solResponse] = await Promise.all([
        fetch(`/api/samu-balance/${walletAddress}`),
        fetch(`/api/sol-balance/${walletAddress}`)
      ]);
      
      const [samuData, solData] = await Promise.all([
        samuResponse.json(),
        solResponse.json()
      ]);
      
      return {
        samu: samuData.balance || 0,
        sol: solData.balance || 0
      };
    },
    enabled: !!walletAddress && isConnected,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Update balance state
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
    staleTime: 10 * 1000,
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
  const loadMore = () => {
    if (!hasMore || isLoadingMore || isLoading) return;
    setIsLoadingMore(true);
    setPage(prev => prev + 1);
  };

  // Get sorted memes for display
  const sortedMemes = allMemes;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle successful vote
  const handleVoteSuccess = () => {
    setShowVoteDialog(false);
    setSelectedMeme(null);
    queryClient.invalidateQueries({ queryKey: ['/api/memes'] });
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === '/api/memes';
      }
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-['Poppins']">
      <div className="max-w-md mx-auto bg-card">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center space-x-3">
              <img 
                src="/assets/samu-logo.webp" 
                alt="SAMU Logo" 
                className="w-10 h-10 rounded-full"
              />
              <div>
                <h1 className="text-lg font-bold text-foreground">SAMU</h1>
                <p className="text-xs text-muted-foreground">Meme Contest</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <button 
                    onClick={() => setLocation("/profile")}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-accent transition-colors"
                  >
                    {userProfile?.avatarUrl ? (
                      <img 
                        src={userProfile.avatarUrl} 
                        alt="Profile" 
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-3 w-3 text-primary" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {userProfile?.displayName || 'User'}
                    </span>
                  </button>
                  
                  {/* Admin Button - Force Show for Testing */}
                  <Button 
                    onClick={() => {
                      console.log('Admin button force clicked');
                      setShowAdminPanel(true);
                    }}
                    variant="outline"
                    className="px-6 py-2 rounded-lg font-medium bg-yellow-600 text-white hover:bg-yellow-700"
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Admin (Force)
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => {
                    if (privyReady) {
                      window.location.href = '/login';
                    }
                  }} 
                  variant="outline"
                  className="px-4 py-2 text-sm"
                >
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as any)}>
          <TabsContent value="contest" className="mt-4 space-y-4 pb-24">
            <Tabs defaultValue="memes" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 mx-4">
                <TabsTrigger value="memes" className="text-sm">Entries</TabsTrigger>
                <TabsTrigger value="leaderboard" className="text-sm">Leaderboard</TabsTrigger>
              </TabsList>

              <TabsContent value="memes">
                <main className="px-4 space-y-4">
                  {/* Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'votes' | 'latest')}
                        className="px-3 py-1.5 text-sm bg-accent border border-border rounded-lg"
                      >
                        <option value="votes">Most Votes</option>
                        <option value="latest">Latest</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant={viewMode === 'card' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('card')}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  {isConnected && (
                    <Button 
                      onClick={() => setShowUploadForm(true)}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Submit Meme
                    </Button>
                  )}

                  {/* Memes Display */}
                  <div className="space-y-4">
                    {viewMode === 'card' ? (
                      <div className="space-y-6">
                        {sortedMemes.map((meme) => (
                          <MemeCard
                            key={meme.id}
                            meme={meme}
                            onVote={handleVoteSuccess}
                            canVote={isConnected}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {sortedMemes.map((meme) => (
                          <button
                            key={meme.id}
                            onClick={() => setSelectedMeme(meme)}
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
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-white text-xs font-medium mb-1">{meme.votes} votes</div>
                                <div className="text-white/80 text-xs">Tap to view</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Load More */}
                    {hasMore && !isLoading && (
                      <div className="text-center mt-6">
                        <Button 
                          onClick={loadMore}
                          disabled={isLoadingMore}
                          variant="outline"
                          className="px-8"
                        >
                          {isLoadingMore ? 'Loading...' : 'Load More'}
                        </Button>
                      </div>
                    )}

                    {/* Loading Indicator */}
                    {(isLoading || isLoadingMore) && (
                      <div className="flex flex-col items-center justify-center py-8">
                        <div className="flex space-x-1 mb-3">
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

                  {/* Real archived contests from database */}
                  {archivedContests?.map((contest: any) => (
                    <button
                      key={contest.id}
                      onClick={() => {
                        if (!isConnected) {
                          toast({
                            title: "Please login first",
                            description: "You need to login to view contest archives - our community heritage",
                            duration: 1000
                          });
                          return;
                        }
                        loadArchivedContest(contest.id);
                      }}
                      className="w-full"
                    >
                      <Card className={`border-border/50 hover:border-primary/30 transition-colors relative ${!isConnected ? 'opacity-70' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="text-left">
                              <h4 className="font-semibold text-foreground">
                                {contest.title} - {new Date(contest.createdAt).toLocaleDateString()}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Contest #{contest.id} • {contest.description}
                                {!isConnected && (
                                  <span className="text-primary ml-2">• Login to view</span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-400/20">
                                {contest.status}
                              </Badge>
                              <Archive className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Archive Contest Detail View */
              <div className="space-y-4">
                <div className="mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setArchiveView('list')}
                    className="text-foreground hover:text-primary px-2 py-1 text-xs h-6"
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
                              <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-400/20">
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
                        {selectedArchiveContest.memes?.map((meme: any) => (
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
                            {meme.finalRank <= 3 && (
                              <div className="absolute top-1 left-1 text-lg">
                                {meme.finalRank === 1 ? '🥇' : meme.finalRank === 2 ? '🥈' : '🥉'}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-xs font-medium">View Details</span>
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

      {/* Archive Meme Detail Modal */}
      {selectedArchiveMeme && (
        <Drawer open={!!selectedArchiveMeme} onOpenChange={() => setSelectedArchiveMeme(null)}>
          <DrawerContent className="h-[92vh] p-4">
            <div className="space-y-4">
              <div className="text-center">
                <MediaDisplay
                  src={selectedArchiveMeme.imageUrl}
                  alt={selectedArchiveMeme.title}
                  className="max-w-full max-h-[60vh] mx-auto"
                  showControls={true}
                  autoPlay={false}
                  muted={true}
                  loop={true}
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground">{selectedArchiveMeme.title}</h3>
                <p className="text-sm text-muted-foreground">
                  by {selectedArchiveMeme.authorUsername} • Rank #{selectedArchiveMeme.finalRank} • {selectedArchiveMeme.votes} votes
                </p>
                {selectedArchiveMeme.description && (
                  <p className="text-sm text-foreground/80">{selectedArchiveMeme.description}</p>
                )}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
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
              onClick={() => setCurrentTab("nfts")}
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

      {/* Upload Form */}
      {showUploadForm && (
        <UploadForm
          isOpen={showUploadForm}
          onClose={() => setShowUploadForm(false)}
          onSuccess={() => {
            setShowUploadForm(false);
            queryClient.invalidateQueries({ queryKey: ['/api/memes'] });
          }}
        />
      )}

      {/* Admin Panel */}
      {showAdminPanel && (
        <AdminPanel 
          isOpen={showAdminPanel} 
          onClose={() => setShowAdminPanel(false)} 
        />
      )}

      {/* Scroll to Top Button */}
      <Button
        onClick={scrollToTop}
        className="fixed bottom-20 right-4 w-12 h-12 rounded-full shadow-lg z-40"
        size="sm"
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
    </div>
  );
}