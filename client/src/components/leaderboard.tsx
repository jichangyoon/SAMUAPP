import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Crown, TrendingUp, Calendar, ChevronDown } from "lucide-react";
import { UserInfoModal } from "@/components/user-info-modal";
import { MemeDetailModal } from "@/components/meme-detail-modal";
import type { Meme } from "@shared/schema";

// Mock data for past winners (명예의 전당)
const hallOfFameData = [
  {
    id: 1,
    title: "SAMU TO MARS",
    author: "crypto_legend",
    votes: 15420,
    contestDate: "2024-12-01",
    prize: "5,000 SAMU"
  },
  {
    id: 2,
    title: "PACK LEADER",
    author: "wolf_alpha",
    votes: 12850,
    contestDate: "2024-11-15",
    prize: "3,000 SAMU"
  },
  {
    id: 3,
    title: "DIAMOND HODLER",
    author: "gem_hands",
    votes: 11200,
    contestDate: "2024-11-01",
    prize: "2,000 SAMU"
  }
];

export function Leaderboard() {
  const [activeTab, setActiveTab] = useState("current");
  const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null);
  const [selectedUser, setSelectedUser] = useState<{ walletAddress: string; username: string } | null>(null);
  const [showMemeModal, setShowMemeModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAllCurrent, setShowAllCurrent] = useState(false);
  const [showAllCreators, setShowAllCreators] = useState(false);

  // Optimized data fetching for leaderboard with smart caching
  const { data: memesResponse, isLoading } = useQuery({
    queryKey: ["/api/memes", "leaderboard-all"],
    queryFn: async () => {
      // Fetch larger page size to get most data in one request
      const response = await fetch(`/api/memes?page=1&limit=100&sortBy=votes`);
      const data = await response.json();
      
      // If there are more pages, fetch remaining data
      if (data.pagination.hasMore) {
        let allMemes = [...data.memes];
        let page = 2;
        
        while (page <= data.pagination.totalPages) {
          const nextResponse = await fetch(`/api/memes?page=${page}&limit=100&sortBy=votes`);
          const nextData = await nextResponse.json();
          allMemes.push(...nextData.memes);
          page++;
        }
        
        return { memes: allMemes };
      }
      
      return data;
    },
    enabled: true,
    staleTime: 30000, // 30초 캐시 (적당한 균형)
    refetchInterval: 60000, // 1분마다 갱신
    refetchOnWindowFocus: false, // 창 포커스시 자동 갱신 비활성화
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

  // Top creators for Hall of Fame tab
  const topCreators = useMemo(() => {
    return Object.values(creatorStats || {})
      .sort((a: any, b: any) => b.totalVotes - a.totalVotes)
      .slice(0, 5);
  }, [creatorStats]);

  // Early return for loading state (after all hooks)
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading leaderboard...</div>;
  }
  
  if (!Array.isArray(memesArray) || memesArray.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No memes available</div>;
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-yellow-400" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Medal className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

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
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8">
                      {getRankIcon(index + 1)}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">
                        {meme.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        by <span 
                          className="underline cursor-pointer"
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
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8">
                      {getRankIcon(index + 1)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8 bg-primary">
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
                      <div>
                        <div className="font-semibold text-foreground text-sm">
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
              {hallOfFameData.map((winner, index) => (
                <div key={winner.id} className="p-4 border border-primary/20 bg-primary/5 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Trophy className="h-4 w-4 text-yellow-400" />
                      <Badge className="bg-primary text-primary-foreground text-xs">
                        {index === 0 ? "Latest Winner" : "Past Winner"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {winner.contestDate}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-foreground mb-1">
                        {winner.title}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        by {winner.author}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">
                        {winner.votes.toLocaleString()}
                      </div>
                      <div className="text-xs text-green-400 font-semibold">
                        Prize: {winner.prize}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
                <div className="text-center p-3 bg-accent rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {memesArray.length + hallOfFameData.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Memes</div>
                </div>
                <div className="text-center p-3 bg-accent rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {memesArray.reduce((sum, meme) => sum + meme.votes, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Votes</div>
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