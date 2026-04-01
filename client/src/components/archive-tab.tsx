import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MediaDisplay } from "@/components/media-display";
import { MultiImageBadge } from "@/components/image-carousel";
import { MemeDetailModal } from "@/components/meme-detail-modal";
import { RewardInfoChart } from "@/components/reward-info-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Archive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function RealTimeArchiveCard({ contest, isLoadingContestDetails, onContestClick }: {
  contest: any;
  isLoadingContestDetails: boolean;
  onContestClick: () => void;
}) {
  const needsRealTimeStats = contest.totalParticipants === 0 && contest.totalVotes === 0;

  const { data: memesData, isLoading: memesLoading } = useQuery({
    queryKey: ['/api/memes', contest.originalContestId],
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/memes?contestId=${contest.originalContestId}`, { signal });
      return res.json();
    },
    enabled: needsRealTimeStats,
    staleTime: 120000,
  });

  const displayParticipants = needsRealTimeStats
    ? (memesData ? new Set(memesData.memes?.map((m: any) => m.authorUsername)).size : 0)
    : contest.totalParticipants;
  const displayVotes = needsRealTimeStats
    ? (memesData ? (memesData.memes || []).reduce((sum: number, m: any) => sum + m.votes, 0) : 0)
    : contest.totalVotes;

  return (
    <button onClick={onContestClick} className="w-full" disabled={isLoadingContestDetails}>
      <Card className={`border-border/50 hover:border-primary/30 transition-colors relative ${isLoadingContestDetails ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h4 className="font-semibold text-foreground">{contest.title}</h4>
              <p className="text-sm text-muted-foreground">
                {needsRealTimeStats && memesLoading ? (
                  "Loading statistics..."
                ) : (
                  <>{displayParticipants} participants • {displayVotes} votes</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isLoadingContestDetails ? (
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
              ) : (
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-400/20">
                  Completed
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

interface ArchiveTabProps {
  walletAddress: string | null | undefined;
}

export function ArchiveTab({ walletAddress }: ArchiveTabProps) {
  const [archiveView, setArchiveView] = useState<'list' | 'contest'>('list');
  const [selectedArchiveContest, setSelectedArchiveContest] = useState<any>(null);
  const [selectedArchiveMeme, setSelectedArchiveMeme] = useState<any>(null);
  const [isLoadingContestDetails, setIsLoadingContestDetails] = useState(false);
  const { toast } = useToast();

  const { data: archivedContests = [], isLoading: isLoadingArchives } = useQuery({
    queryKey: ["/api/admin/archived-contests"],
    staleTime: 0,
  });

  const handleContestClick = async (contest: any) => {
    setIsLoadingContestDetails(true);
    try {
      const response = await fetch(`/api/memes?contestId=${contest.originalContestId}`);
      const memesData = await response.json();
      const memes = memesData.memes || [];
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
  };

  if (archiveView === 'list') {
    return (
      <div className="space-y-4">
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

        <div className="space-y-4">
          <h3 className="text-md font-semibold text-foreground">Previous Contests</h3>

          {isLoadingArchives ? (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-muted-foreground">Loading contests...</p>
              </CardContent>
            </Card>
          ) : (archivedContests as any[])?.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center">
                <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No archived contests yet</p>
                <p className="text-sm text-muted-foreground/70">Completed contests will appear here</p>
              </CardContent>
            </Card>
          ) : (
            (archivedContests as any[]).map((contest: any) => (
              <RealTimeArchiveCard
                key={contest.id}
                contest={contest}
                isLoadingContestDetails={isLoadingContestDetails}
                onContestClick={() => handleContestClick(contest)}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  return (
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
        const deltaX = touch.clientX - touchStartX;
        const deltaTime = Date.now() - touchStartTime;
        (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
        (e.currentTarget as HTMLElement).style.opacity = '1';
        if (deltaX > 100 && deltaTime < 300) {
          setArchiveView('list');
        }
      }}
    >
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

          {selectedArchiveContest?.id && (
            <RewardInfoChart contestId={selectedArchiveContest.id} walletAddress={walletAddress || undefined} />
          )}

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">
              All Contest Entries ({selectedArchiveContest.memes.length})
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {selectedArchiveContest.memes.map((meme: any, index: number) => (
                <button
                  key={meme.id}
                  onClick={() => setSelectedArchiveMeme(meme)}
                  className="aspect-square bg-accent flex items-center justify-center hover:opacity-90 transition-opacity relative group animate-fade-in"
                  style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
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

      {selectedArchiveMeme && (
        <MemeDetailModal
          isOpen={!!selectedArchiveMeme}
          onClose={() => setSelectedArchiveMeme(null)}
          meme={selectedArchiveMeme}
          canVote={false}
        />
      )}
    </div>
  );
}
