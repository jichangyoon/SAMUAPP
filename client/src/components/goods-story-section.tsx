import { useQuery } from "@tanstack/react-query";
import { Trophy, Users, Vote, Sparkles, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface GoodsStory {
  goods: any;
  meme: {
    id: number;
    title: string;
    imageUrl: string;
    authorWallet: string;
    creatorName: string | null;
    creatorAvatar: string | null;
  } | null;
  contest: {
    id: number;
    title: string;
    status: string;
    startTime: string | null;
    endTime: string | null;
  } | null;
  stats: {
    totalMemes: number;
    totalVotes: number;
    memeVotes: number;
    memeRank: number;
    votePercent: number;
  };
  shareRatios: {
    creator: number;
    voter: number;
    platform: number;
  };
}

function shortenWallet(addr: string) {
  if (!addr || addr.length < 8) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export default function GoodsStorySection({ goodsId }: { goodsId: number }) {
  const { data: story, isLoading } = useQuery<GoodsStory>({
    queryKey: ['/api/goods', goodsId, 'story'],
    queryFn: async () => {
      const res = await fetch(`/api/goods/${goodsId}/story`);
      if (!res.ok) throw new Error('Failed to load story');
      return res.json();
    },
    enabled: !!goodsId,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-16 bg-accent/30 rounded-lg" />
        <div className="h-12 bg-accent/30 rounded-lg" />
      </div>
    );
  }

  if (!story || (!story.meme && !story.contest)) return null;

  const { meme, contest, stats } = story;

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-[hsl(50,85%,75%)]/10 to-[hsl(30,80%,55%)]/10 border border-[hsl(50,85%,75%)]/20 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-[hsl(50,85%,75%)]" />
          <span className="text-xs font-semibold text-[hsl(50,85%,75%)] uppercase tracking-wider">Origin Story</span>
        </div>

        {meme && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-accent flex-shrink-0">
              <img src={meme.imageUrl} alt={meme.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{meme.title}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {meme.creatorAvatar ? (
                  <img src={meme.creatorAvatar} alt="" className="w-4 h-4 rounded-full" />
                ) : (
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground">
                  {meme.creatorName || shortenWallet(meme.authorWallet)}
                </span>
              </div>
            </div>
            {stats.memeRank > 0 && (
              <Badge className="bg-[hsl(50,85%,75%)]/20 text-[hsl(50,85%,75%)] border-[hsl(50,85%,75%)]/30 flex-shrink-0">
                <Trophy className="h-3 w-3 mr-1" />
                #{stats.memeRank}
              </Badge>
            )}
          </div>
        )}

        {contest && (
          <div className="bg-black/20 rounded-md p-2.5 space-y-1.5">
            <div className="text-xs font-medium text-foreground">{contest.title}</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{stats.totalMemes} memes</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Vote className="h-3 w-3" />
                <span>{stats.totalVotes.toLocaleString()} SAMU total</span>
              </div>
              {stats.memeVotes > 0 && (
                <div className="flex items-center gap-1 text-xs text-[hsl(50,85%,75%)]">
                  <Trophy className="h-3 w-3" />
                  <span>{stats.memeVotes.toLocaleString()} SAMU ({stats.votePercent.toFixed(1)}%)</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
