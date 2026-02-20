import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Trophy, Medal, Crown, TrendingUp, Calendar, ChevronDown, ChevronUp, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserInfoModal } from "@/components/user-info-modal";
import { MemeDetailModal } from "@/components/meme-detail-modal";
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import type { Meme } from "@shared/schema";

export function Leaderboard() {
  const [activeTab, setActiveTab] = useState("current");
  const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null);
  const [selectedUser, setSelectedUser] = useState<{ walletAddress: string; username: string } | null>(null);
  const [showMemeModal, setShowMemeModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAllCurrent, setShowAllCurrent] = useState(false);
  const [showAllCreators, setShowAllCreators] = useState(false);
  const [expandedContestId, setExpandedContestId] = useState<number | null>(null);

  const { authenticated } = usePrivy();
  const { wallets: solWallets } = useSolanaWallets();
  const walletAddress = solWallets?.[0]?.address;

  // Optimized data fetching - use same query as home page to avoid duplication
  const { data: memesResponse, isLoading } = useQuery({
    queryKey: ["/api/memes", { page: 1, limit: 100, sortBy: "votes" }],
    queryFn: async () => {
      const response = await fetch(`/api/memes?page=1&limit=100&sortBy=votes`);
      return response.json();
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5분 캐시 (더 길게)
    refetchOnWindowFocus: false,
    refetchOnMount: false, // 중복 호출 방지
  });

  // Fetch archived contests for Hall of Fame
  const { data: archivedContests, isLoading: archiveLoading } = useQuery({
    queryKey: ['/api/admin/archived-contests'],
    queryFn: () => fetch('/api/admin/archived-contests').then(res => res.json()),
    staleTime: 30000,
    gcTime: 300000
  });

  // Extract memes array with proper type checking
  const memesArray: Meme[] = memesResponse?.memes || [];

  // Optimize meme sorting with useMemo
  const { sortedMemes, topMemes, displayedMemes } = useMemo(() => {
    if (!Array.isArray(memesArray) || memesArray.length === 0) {
      return { sortedMemes: [], topMemes: [], displayedMemes: [] };
    }
    const sorted = [...memesArray].sort((a, b) => b.votes - a.votes);
    return {
      sortedMemes: sorted,
      topMemes: sorted.slice(0, 10),
      displayedMemes: showAllCurrent ? sorted : sorted.slice(0, 10)
    };
  }, [memesArray, showAllCurrent]);

  // Optimize creator stats calculation with useMemo
  const { creatorStats, displayedCreators } = useMemo(() => {
    if (!Array.isArray(memesArray) || memesArray.length === 0) {
      return { creatorStats: {}, displayedCreators: [] };
    }
    
    const stats = memesArray.reduce((acc, meme) => {
      if (!acc[meme.authorUsername]) {
        acc[meme.authorUsername] = {
          username: meme.authorUsername,
          walletAddress: meme.authorWallet,
          avatarUrl: (meme as any).authorAvatarUrl,
          totalVotes: 0,
          memeCount: 0,
          avgVotes: 0
        };
      } else {
        // Update avatar if this meme has a more recent one
        if ((meme as any).authorAvatarUrl) {
          acc[meme.authorUsername].avatarUrl = (meme as any).authorAvatarUrl;
        }
      }
      acc[meme.authorUsername].totalVotes += meme.votes;
      acc[meme.authorUsername].memeCount += 1;
      acc[meme.authorUsername].avgVotes = Math.round(acc[meme.authorUsername].totalVotes / acc[meme.authorUsername].memeCount);
      return acc;
    }, {} as Record<string, any>);
    
    const creators = Object.values(stats)
      .sort((a: any, b: any) => b.totalVotes - a.totalVotes);
    
    return {
      creatorStats: stats,
      displayedCreators: showAllCreators ? creators : creators.slice(0, 10)
    };
  }, [memesArray, showAllCreators]);

  // Process archived contests for Hall of Fame
  const hallOfFameData = useMemo(() => {
    if (!archivedContests || !Array.isArray(archivedContests)) return [];
    
    return archivedContests
      .sort((a: any, b: any) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime())
      .slice(0, 10) // Show top 10 archived contests
      .map((contest: any) => {
        // Use the enriched winner meme data from the backend
        const winnerMeme = contest.winnerMeme;
          
        return {
          id: contest.id,
          contestTitle: contest.title,
          title: winnerMeme?.title || 'No entries',
          author: winnerMeme?.authorUsername || 'Unknown',
          votes: winnerMeme?.votes || 0,
          contestDate: new Date(contest.archivedAt).toLocaleDateString(),
          totalEntries: contest.totalMemes || 0,
          totalVotes: contest.totalVotes || 0,
          winnerMeme: winnerMeme
        };
      });
  }, [archivedContests]);

  const { data: myContestVotes, isLoading: myVotesLoading } = useQuery({
    queryKey: ['my-contest-votes', expandedContestId, walletAddress],
    queryFn: async () => {
      const res = await fetch(`/api/memes/contest/${expandedContestId}/my-votes/${walletAddress}`);
      if (!res.ok) return { myTotalSamu: 0, myRevenueSharePercent: 0, votes: [] };
      return res.json();
    },
    enabled: !!expandedContestId && !!walletAddress && authenticated,
    staleTime: 30000,
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-yellow-400" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Medal className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse border-border bg-card">
            <CardContent className="p-4">
              <div className="h-4 bg-accent rounded mb-2" />
              <div className="h-3 bg-accent rounded w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  // Empty state
  if (!Array.isArray(memesArray) || memesArray.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No memes available</div>;
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-10">
          <TabsTrigger value="current" className="text-xs">Current</TabsTrigger>
          <TabsTrigger value="creators" className="text-xs">Top Creators</TabsTrigger>
          <TabsTrigger value="hall-of-fame" className="text-xs">Hall of Fame</TabsTrigger>
        </TabsList>

        {/* Current Contest Rankings */}
        <TabsContent value="current" className="mt-4 space-y-3">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-primary flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                Current Contest Rankings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {displayedMemes.map((meme, index) => (
                <div key={meme.id} className="flex items-center justify-between p-3 bg-accent rounded-lg cursor-pointer hover:bg-accent/80 transition-colors"
                     onClick={() => {
                       setSelectedMeme(meme);
                       setShowMemeModal(true);
                     }}>
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 shrink-0">
                      {getRankIcon(index + 1)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground text-sm truncate">
                        {meme.title}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        by <span 
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser({ walletAddress: meme.authorWallet, username: meme.authorUsername });
                            setShowUserModal(true);
                          }}
                        >
                          {meme.authorUsername}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">
                      {meme.votes.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">votes</div>
                  </div>
                </div>
              ))}
              
              {displayedMemes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No memes with votes yet
                </div>
              )}
              
              {/* More button for current rankings */}
              {!showAllCurrent && sortedMemes.length > 10 && (
                <div className="flex justify-center pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllCurrent(true)}
                    className="text-primary border-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <ChevronDown className="h-4 w-4 mr-2" />
                    MORE ({sortedMemes.length - 10} more)
                  </Button>
                </div>
              )}
              
              {showAllCurrent && sortedMemes.length > 10 && (
                <div className="flex justify-center pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllCurrent(false)}
                    className="text-muted-foreground"
                  >
                    Show Less
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Creators */}
        <TabsContent value="creators" className="mt-4 space-y-3">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-primary flex items-center">
                <Crown className="h-5 w-5 mr-2 text-primary" />
                Top Creators
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {displayedCreators.map((creator: any, index) => (
                <div key={creator.username} 
                     className="flex items-center justify-between p-3 bg-accent rounded-lg cursor-pointer hover:bg-accent/80 transition-colors"
                     onClick={() => {
                       setSelectedUser({ walletAddress: creator.walletAddress, username: creator.username });
                       setShowUserModal(true);
                     }}>
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 shrink-0">
                      {getRankIcon(index + 1)}
                    </div>
                    <div className="flex items-center space-x-2 min-w-0">
                      <Avatar className="h-8 w-8 bg-primary shrink-0">
                        {creator.avatarUrl ? (
                          <img 
                            src={creator.avatarUrl} 
                            alt={creator.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <AvatarFallback className="text-primary-foreground font-bold text-xs">
                            {creator.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground text-sm truncate">
                          {creator.username}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {creator.memeCount} memes submitted
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">
                      {creator.totalVotes.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      avg {creator.avgVotes}
                    </div>
                  </div>
                </div>
              ))}
              
              {displayedCreators.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No creators yet
                </div>
              )}
              
              {/* More button for creators */}
              {!showAllCreators && Object.keys(creatorStats || {}).length > 10 && (
                <div className="flex justify-center pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllCreators(true)}
                    className="text-primary border-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <ChevronDown className="h-4 w-4 mr-2" />
                    MORE ({Object.keys(creatorStats || {}).length - 10} more)
                  </Button>
                </div>
              )}
              
              {showAllCreators && Object.keys(creatorStats || {}).length > 10 && (
                <div className="flex justify-center pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllCreators(false)}
                    className="text-muted-foreground"
                  >
                    Show Less
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hall of Fame */}
        <TabsContent value="hall-of-fame" className="mt-4 space-y-3">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-primary flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-yellow-400" />
                Hall of Fame
              </CardTitle>
              <p className="text-sm text-muted-foreground">Past contest winners</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {archiveLoading ? (
                <div className="text-center py-4 text-muted-foreground">
                  Loading contest history...
                </div>
              ) : hallOfFameData.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No completed contests yet
                </div>
              ) : (
                hallOfFameData.map((winner: any, index: number) => {
                  const archivedContest = archivedContests?.find((c: any) => c.id === winner.id);
                  const originalContestId = archivedContest?.originalContestId;
                  const isExpanded = expandedContestId === originalContestId;
                  
                  return (
                  <div key={winner.id} className="border border-primary/20 bg-primary/5 rounded-lg overflow-hidden">
                    <div 
                      className="p-4 cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={() => {
                        if (originalContestId) {
                          setExpandedContestId(isExpanded ? null : originalContestId);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Trophy className="h-4 w-4 text-yellow-400" />
                          <Badge className="bg-primary text-primary-foreground text-xs">
                            {index === 0 ? "Latest Winner" : "Past Winner"}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-xs text-muted-foreground flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {winner.contestDate}
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-foreground mb-1 text-sm truncate">
                            {winner.contestTitle}
                          </div>
                          <div className="text-xs text-muted-foreground mb-1 truncate">
                            Winner: "{winner.title}" by {winner.author}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {winner.totalEntries} entries
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-primary">
                            {winner.votes.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            winning votes
                          </div>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-primary/20 p-4 bg-accent/30 space-y-3">
                        {winner.winnerMeme && (
                          <div 
                            className="flex items-center space-x-3 p-2 bg-accent rounded-lg cursor-pointer hover:bg-accent/80 transition-colors"
                            onClick={() => {
                              setSelectedMeme(winner.winnerMeme);
                              setShowMemeModal(true);
                            }}
                          >
                            <img src={winner.winnerMeme.imageUrl} alt={winner.winnerMeme.title} className="w-12 h-12 rounded object-cover shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-foreground truncate">{winner.winnerMeme.title}</div>
                              <div className="text-xs text-muted-foreground truncate">by {winner.winnerMeme.authorUsername}</div>
                            </div>
                            <Badge variant="outline" className="text-yellow-400 border-yellow-400">1st</Badge>
                          </div>
                        )}

                        {authenticated && walletAddress && myVotesLoading ? (
                          <div className="text-xs text-muted-foreground text-center py-2">Loading your votes...</div>
                        ) : authenticated && walletAddress && myContestVotes ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold text-foreground flex items-center">
                                <Vote className="h-4 w-4 mr-1 text-primary" />
                                My Votes
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-bold text-primary">{(myContestVotes.myTotalSamu || 0).toLocaleString()} SAMU</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  Reward Share: {myContestVotes.myRevenueSharePercent || 0}%
                                </span>
                              </div>
                            </div>

                            {myContestVotes.votes?.length > 0 ? (
                              myContestVotes.votes.map((v: any, vi: number) => (
                                <div key={vi} className="flex items-center justify-between p-2 bg-accent/50 rounded text-xs">
                                  <div className="flex items-center space-x-2">
                                    {v.memeImageUrl && <img src={v.memeImageUrl} alt="" className="w-8 h-8 rounded object-cover" />}
                                    <span className="text-foreground">{v.memeTitle}</span>
                                  </div>
                                  <span className="font-bold text-primary">{(v.samuAmount || 0).toLocaleString()} SAMU</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-muted-foreground text-center py-2">
                                No votes in this contest
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground text-center py-2">
                            Log in to see your vote history
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })
              )}
            </CardContent>
          </Card>
          
          {/* Statistics Card */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-primary">
                Overall Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-accent rounded-lg overflow-hidden">
                  <div className="text-xl sm:text-2xl font-bold text-primary truncate">
                    {(memesArray.length + (archivedContests?.reduce((sum: number, contest: any) => sum + (contest.totalMemes || 0), 0) || 0)).toLocaleString()}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Total Memes</div>
                </div>
                <div className="text-center p-3 bg-accent rounded-lg overflow-hidden">
                  <div className="text-xl sm:text-2xl font-bold text-primary truncate">
                    {(memesArray.reduce((sum, meme) => sum + meme.votes, 0) + 
                      (archivedContests?.reduce((sum: number, contest: any) => sum + (contest.totalVotes || 0), 0) || 0)
                    ).toLocaleString()}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Total Votes</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Meme Detail Modal */}
      {selectedMeme && (
        <MemeDetailModal
          isOpen={showMemeModal}
          onClose={() => setShowMemeModal(false)}
          meme={selectedMeme}
        />
      )}

      {/* User Info Modal */}
      {selectedUser && (
        <UserInfoModal
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          walletAddress={selectedUser.walletAddress}
          username={selectedUser.username}
        />
      )}
    </div>
  );
}