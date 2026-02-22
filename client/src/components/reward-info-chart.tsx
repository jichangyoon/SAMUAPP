import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PieChart, Users, Palette, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";

interface RewardBreakdownData {
  shareRatios: { creator: number; voter: number; platform: number };
  creators: {
    wallet: string;
    username: string;
    profileImage: string | null;
    totalVotesReceived: number;
    memeCount: number;
    percent: number;
  }[];
  voters: {
    wallet: string;
    username: string;
    profileImage: string | null;
    totalSamuSpent: number;
    percent: number;
  }[];
  totalVotes: number;
  totalSamuSpent: number;
}

interface RewardInfoChartProps {
  contestId: number;
  compact?: boolean;
  walletAddress?: string;
}

const COLORS = {
  creator: "hsl(45, 90%, 55%)",
  voter: "hsl(200, 80%, 55%)",
  platform: "hsl(280, 60%, 55%)",
};

const DETAIL_COLORS = [
  "hsl(45, 90%, 55%)",
  "hsl(35, 85%, 50%)",
  "hsl(55, 80%, 50%)",
  "hsl(25, 75%, 55%)",
  "hsl(65, 70%, 50%)",
  "hsl(15, 85%, 55%)",
  "hsl(50, 75%, 45%)",
  "hsl(40, 80%, 60%)",
];

const VOTER_COLORS = [
  "hsl(200, 80%, 55%)",
  "hsl(210, 75%, 50%)",
  "hsl(190, 70%, 50%)",
  "hsl(220, 65%, 55%)",
  "hsl(180, 60%, 50%)",
  "hsl(230, 75%, 55%)",
  "hsl(195, 70%, 45%)",
  "hsl(205, 80%, 60%)",
];

function DonutChart({ segments, size = 120, strokeWidth = 20 }: {
  segments: { percent: number; color: string; label: string }[];
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulativePercent = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="hsl(0, 0%, 20%)"
        strokeWidth={strokeWidth}
      />
      {segments.map((segment, i) => {
        const strokeDasharray = `${(segment.percent / 100) * circumference} ${circumference}`;
        const rotation = (cumulativePercent / 100) * 360 - 90;
        cumulativePercent += segment.percent;

        return (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset="0"
            transform={`rotate(${rotation} ${center} ${center})`}
            strokeLinecap="butt"
            className="transition-all duration-500"
          />
        );
      })}
    </svg>
  );
}

function PersonRow({ username, profileImage, value, unit, percent, color }: {
  username: string;
  profileImage: string | null;
  value: number;
  unit: string;
  percent: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <Avatar className="h-5 w-5 flex-shrink-0">
        <AvatarImage src={profileImage || undefined} />
        <AvatarFallback className="bg-primary/20 text-[8px]">
          {username.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="text-xs text-foreground truncate flex-1">{username}</span>
      <span className="text-xs text-muted-foreground flex-shrink-0">
        {value.toLocaleString()} {unit}
      </span>
      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 flex-shrink-0 border-border/50">
        {percent.toFixed(1)}%
      </Badge>
    </div>
  );
}

export function RewardInfoChart({ contestId, compact = false, walletAddress }: RewardInfoChartProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"creator" | "voter">("creator");

  const { data, isLoading } = useQuery<RewardBreakdownData>({
    queryKey: [`/api/memes/contest/${contestId}/reward-breakdown`],
    staleTime: 30000,
    enabled: !!contestId,
  });

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            <span className="text-xs text-muted-foreground">Loading reward info...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const creatorPct = Math.round(data.shareRatios.creator * 100);
  const voterPct = Math.round(data.shareRatios.voter * 100);
  const platformPct = Math.round(data.shareRatios.platform * 100);

  const mainSegments = [
    { percent: creatorPct, color: COLORS.creator, label: `Creators ${creatorPct}%` },
    { percent: voterPct, color: COLORS.voter, label: `Voters ${voterPct}%` },
    { percent: platformPct, color: COLORS.platform, label: `Platform ${platformPct}%` },
  ];

  const hasData = data.totalVotes > 0;

  const myCreatorEntry = walletAddress ? data.creators.find(c => c.wallet === walletAddress) : null;
  const myVoterEntry = walletAddress ? data.voters.find(v => v.wallet === walletAddress) : null;
  const myCreatorShare = myCreatorEntry ? (myCreatorEntry.percent / 100) * creatorPct : 0;
  const myVoterShare = myVoterEntry ? (myVoterEntry.percent / 100) * voterPct : 0;
  const myTotalShare = myCreatorShare + myVoterShare;

  return (
    <Card className="border-border/50 bg-card/80 overflow-hidden">
      <CardContent className="p-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-3 flex items-center gap-3 hover:bg-accent/30 transition-colors"
        >
          <div className="flex-shrink-0">
            <DonutChart segments={mainSegments} size={compact ? 48 : 56} strokeWidth={compact ? 8 : 10} />
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <PieChart className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-semibold text-foreground">Reward Distribution</span>
            </div>
            <div className="flex gap-3 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.creator }} />
                Creator {creatorPct}%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.voter }} />
                Voter {voterPct}%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.platform }} />
                Platform {platformPct}%
              </span>
            </div>
            {walletAddress && hasData && myTotalShare > 0 && (
              <div className="flex items-center gap-1.5 mt-1">
                <TrendingUp className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-muted-foreground">Your share</span>
                <span className="text-[10px] text-primary font-semibold">{myTotalShare.toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div className="flex-shrink-0 text-muted-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {expanded && (
          <div className="border-t border-border/30 px-3 pb-3">
            {walletAddress && hasData && myTotalShare > 0 && (
              <div className="mt-2 mb-2 bg-primary/10 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs text-muted-foreground">Your Reward Share</span>
                  </div>
                  <span className="text-sm text-primary font-bold">{myTotalShare.toFixed(1)}%</span>
                </div>
                {(myCreatorShare > 0 || myVoterShare > 0) && (
                  <div className="flex gap-3 mt-1 text-[10px]">
                    {myCreatorShare > 0 && (
                      <span className="text-muted-foreground">
                        Creator: <span className="text-[hsl(45,90%,55%)] font-medium">{myCreatorShare.toFixed(1)}%</span>
                      </span>
                    )}
                    {myVoterShare > 0 && (
                      <span className="text-muted-foreground">
                        Voter: <span className="text-[hsl(200,80%,55%)] font-medium">{myVoterShare.toFixed(1)}%</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            {!hasData ? (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">No votes yet in this contest</p>
              </div>
            ) : (
              <>
                <div className="flex gap-1 mt-2 mb-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveTab("creator"); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
                      activeTab === "creator"
                        ? "bg-[hsl(45,90%,55%)]/20 text-[hsl(45,90%,55%)]"
                        : "text-muted-foreground hover:bg-accent/30"
                    }`}
                  >
                    <Palette className="h-3 w-3" />
                    Creators ({data.creators.length})
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveTab("voter"); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
                      activeTab === "voter"
                        ? "bg-[hsl(200,80%,55%)]/20 text-[hsl(200,80%,55%)]"
                        : "text-muted-foreground hover:bg-accent/30"
                    }`}
                  >
                    <Users className="h-3 w-3" />
                    Voters ({data.voters.length})
                  </button>
                </div>

                {activeTab === "creator" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Creator Share ({creatorPct}% of profits)
                      </span>
                      <span className="text-[10px] text-primary">
                        {data.totalVotes.toLocaleString()} total votes
                      </span>
                    </div>
                    <div className="space-y-0.5 max-h-40 overflow-y-auto">
                      {data.creators.map((creator, i) => (
                        <PersonRow
                          key={creator.wallet}
                          username={creator.username}
                          profileImage={creator.profileImage}
                          value={creator.totalVotesReceived}
                          unit="votes"
                          percent={creator.percent}
                          color={DETAIL_COLORS[i % DETAIL_COLORS.length]}
                        />
                      ))}
                    </div>
                    <div className="mt-2 p-2 bg-accent/20 rounded-md">
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Creators receive {creatorPct}% of goods profits, split by votes received.
                        More votes on your meme = bigger reward share.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === "voter" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Voter Share ({voterPct}% of profits)
                      </span>
                      <span className="text-[10px] text-[hsl(200,80%,55%)]">
                        {data.totalSamuSpent?.toLocaleString() || 0} SAMU spent
                      </span>
                    </div>
                    <div className="space-y-0.5 max-h-40 overflow-y-auto">
                      {data.voters.map((voter, i) => (
                        <PersonRow
                          key={voter.wallet}
                          username={voter.username}
                          profileImage={voter.profileImage}
                          value={voter.totalSamuSpent}
                          unit="SAMU"
                          percent={voter.percent}
                          color={VOTER_COLORS[i % VOTER_COLORS.length]}
                        />
                      ))}
                    </div>
                    <div className="mt-2 p-2 bg-accent/20 rounded-md">
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Voters receive {voterPct}% of goods profits, proportional to SAMU spent voting.
                        More SAMU you vote = bigger reward share.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
