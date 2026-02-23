import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, PieChart, Wallet, Clock, TrendingUp } from "lucide-react";

interface Distribution {
  id: number;
  orderId: number;
  contestId: number;
  totalSolAmount: number;
  creatorAmount: number;
  platformAmount: number;
  voterPoolAmount: number;
  status: string;
  createdAt: string;
}

interface DashboardData {
  summary: {
    totalSalesSol: number;
    totalOrders: number;
    totalDistributed: number;
  };
  shareBreakdown: {
    creator: { percent: number; totalSol: number };
    voter: { percent: number; totalSol: number };
    platform: { percent: number; totalSol: number; wallet: string };
  };
  recentDistributions: Distribution[];
  shareRatios: { creator: number; voter: number; platform: number };
}

function PieChartSVG({ ratios }: { ratios: { creator: number; voter: number; platform: number } }) {
  const colors = {
    creator: "hsl(50, 85%, 65%)",
    voter: "hsl(30, 80%, 55%)",
    platform: "hsl(0, 0%, 50%)",
  };

  const segments = [
    { key: "creator", value: ratios.creator, color: colors.creator, label: "Creator" },
    { key: "voter", value: ratios.voter, color: colors.voter, label: "Voters" },
    { key: "platform", value: ratios.platform, color: colors.platform, label: "Platform" },
  ];

  let cumulativePercent = 0;
  const paths = segments.map((seg) => {
    const startAngle = cumulativePercent * 360;
    const endAngle = (cumulativePercent + seg.value) * 360;
    cumulativePercent += seg.value;

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = 50 + 40 * Math.cos(startRad);
    const y1 = 50 + 40 * Math.sin(startRad);
    const x2 = 50 + 40 * Math.cos(endRad);
    const y2 = 50 + 40 * Math.sin(endRad);

    const largeArc = seg.value > 0.5 ? 1 : 0;

    return (
      <path
        key={seg.key}
        d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={seg.color}
        stroke="hsl(0, 0%, 10%)"
        strokeWidth="0.5"
      />
    );
  });

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-28 h-28 flex-shrink-0">
        {paths}
      </svg>
      <div className="space-y-1.5">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-muted-foreground">{seg.label}</span>
            <span className="font-medium text-foreground">{(seg.value * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function shortenWallet(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function RewardsDashboard() {
  const { data: dashboard, isLoading } = useQuery<DashboardData>({
    queryKey: ['/api/rewards/dashboard'],
  });

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
        <p className="text-muted-foreground">Loading Rewards Dashboard...</p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load dashboard data
      </div>
    );
  }

  const { summary, shareBreakdown, recentDistributions, shareRatios } = dashboard;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="h-5 w-5 text-[hsl(50,85%,75%)]" />
        <h2 className="text-xl font-bold text-[hsl(50,85%,75%)]">Rewards Dashboard</h2>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <DollarSign className="h-5 w-5 text-primary mx-auto mb-1" />
            <div className="text-lg font-bold text-primary">{summary.totalSalesSol.toFixed(4)}</div>
            <div className="text-xs text-muted-foreground">Total Sales (SOL)</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <PieChart className="h-5 w-5 text-[hsl(30,80%,55%)] mx-auto mb-1" />
            <div className="text-lg font-bold text-foreground">{summary.totalOrders}</div>
            <div className="text-xs text-muted-foreground">Total Orders</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <Wallet className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <div className="text-lg font-bold text-green-500">{summary.totalDistributed.toFixed(4)}</div>
            <div className="text-xs text-muted-foreground">Distributed (SOL)</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <PieChart className="h-4 w-4 text-primary" />
            Revenue Share Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <PieChartSVG ratios={shareRatios} />

          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center text-sm p-2 rounded bg-accent/50">
              <span className="text-muted-foreground">Creator (45%)</span>
              <div className="text-right">
                <span className="font-medium">{shareBreakdown.creator.totalSol.toFixed(6)} SOL</span>
                <div className="text-xs text-muted-foreground">All Creators</div>
              </div>
            </div>
            <div className="flex justify-between items-center text-sm p-2 rounded bg-accent/50">
              <span className="text-muted-foreground">Voters (40%)</span>
              <div className="text-right">
                <span className="font-medium">{shareBreakdown.voter.totalSol.toFixed(6)} SOL</span>
                <div className="text-xs text-muted-foreground">Claimable Pool</div>
              </div>
            </div>
            <div className="flex justify-between items-center text-sm p-2 rounded bg-accent/50">
              <span className="text-muted-foreground">Platform (15%)</span>
              <div className="text-right">
                <span className="font-medium">{shareBreakdown.platform.totalSol.toFixed(6)} SOL</span>
                <div className="text-xs text-muted-foreground">{shortenWallet(shareBreakdown.platform.wallet)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Recent Distributions
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {recentDistributions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No distributions yet. Revenue will be distributed when goods are purchased.
            </div>
          ) : (
            <div className="space-y-2">
              {recentDistributions.map((dist) => (
                <div key={dist.id} className="border border-border/30 rounded-lg p-3 text-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-medium text-foreground">Order #{dist.orderId}</span>
                      <span className="text-muted-foreground ml-2">Contest #{dist.contestId}</span>
                    </div>
                    <Badge variant={dist.status === "completed" ? "default" : "secondary"} className="text-xs">
                      {dist.status === "completed" ? "Direct" : dist.status === "pending_creator_transfer" ? "Pending" : dist.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className="text-muted-foreground">
                      Total: <span className="text-foreground font-medium">{dist.totalSolAmount.toFixed(6)} SOL</span>
                    </div>
                    <div className="text-muted-foreground">
                      Creator: <span className="text-[hsl(50,85%,65%)]">{dist.creatorAmount.toFixed(6)}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Voters: <span className="text-[hsl(30,80%,55%)]">{dist.voterPoolAmount.toFixed(6)}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Platform: <span className="text-muted-foreground">{dist.platformAmount.toFixed(6)}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(dist.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
