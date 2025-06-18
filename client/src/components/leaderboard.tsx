import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, Crown, TrendingUp, Calendar } from "lucide-react";
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

  const { data: memes = [], isLoading } = useQuery<Meme[]>({
    queryKey: ["/api/memes"],
    enabled: true,
  });

  // Sort memes by votes for current leaderboard
  const sortedMemes = [...memes].sort((a, b) => b.votes - a.votes);
  const topMemes = sortedMemes.slice(0, 10);

  // Get top creators
  const creatorStats = memes.reduce((acc, meme) => {
    if (!acc[meme.authorUsername]) {
      acc[meme.authorUsername] = {
        username: meme.authorUsername,
        totalVotes: 0,
        memeCount: 0,
        avgVotes: 0
      };
    }
    acc[meme.authorUsername].totalVotes += meme.votes;
    acc[meme.authorUsername].memeCount += 1;
    acc[meme.authorUsername].avgVotes = Math.round(acc[meme.authorUsername].totalVotes / acc[meme.authorUsername].memeCount);
    return acc;
  }, {} as Record<string, any>);

  const topCreators = Object.values(creatorStats)
    .sort((a: any, b: any) => b.totalVotes - a.totalVotes)
    .slice(0, 5);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Medal className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-sm font-bold text-gray-500">#{rank}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded mb-2" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
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
          <Card className="samu-card-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-foreground flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-[hsl(30,100%,50%)]" />
                Current Contest Rankings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topMemes.map((meme, index) => (
                <div key={meme.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8">
                      {getRankIcon(index + 1)}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">
                        {meme.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        by {meme.authorUsername}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[hsl(30,100%,50%)]">
                      {meme.votes.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">votes</div>
                  </div>
                </div>
              ))}
              
              {topMemes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No memes with votes yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Creators */}
        <TabsContent value="creators" className="mt-4 space-y-3">
          <Card className="samu-card-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-foreground flex items-center">
                <Crown className="h-5 w-5 mr-2 text-[hsl(30,100%,50%)]" />
                Top Creators
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topCreators.map((creator: any, index) => (
                <div key={creator.username} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8">
                      {getRankIcon(index + 1)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8 bg-[hsl(50,85%,75%)]">
                        <AvatarFallback className="text-black font-bold text-xs">
                          {creator.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
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
                    <div className="font-bold text-[hsl(30,100%,50%)]">
                      {creator.totalVotes.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      avg {creator.avgVotes}
                    </div>
                  </div>
                </div>
              ))}
              
              {topCreators.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No creators yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hall of Fame */}
        <TabsContent value="hall-of-fame" className="mt-4 space-y-3">
          <Card className="samu-card-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-foreground flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
                Hall of Fame
              </CardTitle>
              <p className="text-sm text-muted-foreground">Past contest winners</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {hallOfFameData.map((winner, index) => (
                <div key={winner.id} className="p-4 border border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <Badge className="bg-yellow-500 text-white text-xs">
                        {index === 0 ? "Latest Winner" : "Past Winner"}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center">
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
                      <div className="font-bold text-[hsl(30,100%,50%)]">
                        {winner.votes.toLocaleString()}
                      </div>
                      <div className="text-xs text-green-600 font-semibold">
                        Prize: {winner.prize}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          
          {/* Statistics Card */}
          <Card className="samu-card-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[hsl(201,30%,25%)]">
                Overall Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-[hsl(30,100%,50%)]">
                    {memes.length + hallOfFameData.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Memes</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-[hsl(25,60%,35%)]">
                    {memes.reduce((sum, meme) => sum + meme.votes, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Votes</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}