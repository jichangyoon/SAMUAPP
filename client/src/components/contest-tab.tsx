import { useState, Suspense, lazy } from "react";
import { useQuery } from "@tanstack/react-query";
import { MemeCard } from "@/components/meme-card";
import { MediaDisplay } from "@/components/media-display";
import { MultiImageBadge } from "@/components/image-carousel";
import { ContestHeader } from "@/components/contest-header";
import { RewardInfoChart } from "@/components/reward-info-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { List, Grid3X3, Plus, RefreshCw } from "lucide-react";
import type { Meme } from "@shared/schema";

const Leaderboard = lazy(() => import("@/components/leaderboard").then(m => ({ default: m.Leaderboard })));

interface ContestTabProps {
  isConnected: boolean;
  walletAddress: string | null | undefined;
  onVoteUpdate: () => Promise<void>;
  onMemeClick: (meme: Meme) => void;
  onSubmitMeme: () => void;
}

export function ContestTab({ isConnected, walletAddress, onVoteUpdate, onMemeClick, onSubmitMeme }: ContestTabProps) {
  const [sortBy, setSortBy] = useState("votes");
  const [viewMode, setViewMode] = useState<'card' | 'grid'>('card');

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

  const { data: memesResponse, isLoading } = useQuery({
    queryKey: ['/api/memes', { sortBy }],
    queryFn: async () => {
      const params = new URLSearchParams({ sortBy });
      const response = await fetch(`/api/memes?${params}`);
      if (!response.ok) throw new Error('Failed to fetch memes');
      return response.json();
    },
    staleTime: 30000,
    gcTime: 60000,
  });

  const sortedMemes: Meme[] = memesResponse?.memes || [];

  return (
    <Tabs defaultValue="contest-main" className="w-full">
      <TabsList className="grid w-full grid-cols-2 h-10">
        <TabsTrigger value="contest-main" className="text-sm">Contest</TabsTrigger>
        <TabsTrigger value="leaderboard" className="text-sm">Leaderboard</TabsTrigger>
      </TabsList>

      <TabsContent value="contest-main" className="mt-0">
        <main className="space-y-4 pb-20">
          <ContestHeader entriesCount={sortedMemes.length} />

          {currentContest?.id && (
            <RewardInfoChart contestId={currentContest.id} compact walletAddress={walletAddress || undefined} />
          )}

          {isConnected && currentContest?.status === "active" ? (
            <div className="flex justify-center">
              <Button
                onClick={onSubmitMeme}
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
                          style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
                        >
                          <MemeCard
                            meme={meme}
                            onVote={onVoteUpdate}
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
                          onClick={() => onMemeClick(meme)}
                          className="aspect-square bg-accent flex items-center justify-center hover:opacity-90 transition-all duration-200 relative group animate-fade-in"
                          style={{ animationDelay: `${Math.min(index * 30, 200)}ms` }}
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
  );
}
