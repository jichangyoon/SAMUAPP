import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { useUniversalSignTransaction } from "@/hooks/use-universal-sign-transaction";
import { Transaction, Connection } from "@solana/web3.js";
import { REWARD_COLORS, MiniDonut } from "@/lib/reward-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Wallet, Lock, ChevronRight, ExternalLink, MapPin, TrendingUp, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SOL_CONNECTION = new Connection(
  import.meta.env.VITE_HELIUS_API_KEY
    ? `https://rpc.helius.xyz/?api-key=${import.meta.env.VITE_HELIUS_API_KEY}`
    : "https://api.mainnet-beta.solana.com",
  "confirmed"
);

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:      { label: "Confirmed",    color: "bg-blue-500/20 text-blue-400 border-blue-400/30" },
  draft:        { label: "Confirmed",    color: "bg-blue-500/20 text-blue-400 border-blue-400/30" },
  confirmed:    { label: "Confirmed",    color: "bg-blue-500/20 text-blue-400 border-blue-400/30" },
  inprocess:    { label: "In Production",color: "bg-orange-500/20 text-orange-400 border-orange-400/30" },
  in_production:{ label: "In Production",color: "bg-orange-500/20 text-orange-400 border-orange-400/30" },
  shipped:      { label: "Shipped",      color: "bg-purple-500/20 text-purple-400 border-purple-400/30" },
  in_transit:   { label: "Shipped",      color: "bg-purple-500/20 text-purple-400 border-purple-400/30" },
  delivered:    { label: "Delivered",    color: "bg-green-500/20 text-green-400 border-green-400/30" },
  canceled:     { label: "Canceled",     color: "bg-red-500/20 text-red-400 border-red-400/30" },
  failed:       { label: "Failed",       color: "bg-red-500/20 text-red-400 border-red-400/30" },
};


function getStatusStyle(status: string) {
  return STATUS_LABEL[status] ?? { label: status, color: "bg-gray-500/20 text-gray-400" };
}


function OrderDetailDrawer({ order, walletAddress, open, onClose }: {
  order: any;
  walletAddress?: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data: rewardData, isLoading: rewardLoading } = useQuery<any>({
    queryKey: [`/api/memes/contest/${order?.contestId}/reward-breakdown`],
    staleTime: 30000,
    enabled: !!order?.contestId && !!walletAddress,
  });

  const { data: pdaData } = useQuery<{ pda: string | null; contractEnabled: boolean }>({
    queryKey: [`/api/rewards/escrow-pda/${order?.contestId}`],
    staleTime: Infinity,
    enabled: !!order?.contestId,
  });

  if (!order) return null;

  const s = getStatusStyle(order.status);
  const totalPaid = order.solAmount || 0;
  const productionCost = order.escrowAmount > 0
    ? (totalPaid - order.escrowAmount > 0 ? totalPaid - order.escrowAmount : 0)
    : 0;
  const profit = order.escrowAmount || (order.distribution
    ? (order.distribution.creatorAmount + order.distribution.voterPoolAmount + order.distribution.platformAmount)
    : 0);

  let myCreatorShareInPool = 0;
  let myVoterShareInPool = 0;
  if (rewardData && walletAddress) {
    const myCreator = rewardData.creators?.find((c: any) => c.wallet === walletAddress);
    const myVoter = rewardData.voters?.find((v: any) => v.wallet === walletAddress);
    if (myCreator) myCreatorShareInPool = myCreator.percent;
    if (myVoter) myVoterShareInPool = myVoter.percent;
  }
  const myCreatorOverall = (myCreatorShareInPool / 100) * 45;
  const myVoterOverall = (myVoterShareInPool / 100) * 40;
  const myTotalShare = myCreatorOverall + myVoterOverall;
  const myEstimatedSol = profit > 0 ? profit * (myTotalShare / 100) : 0;
  const hasMyShare = myTotalShare > 0;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {order.city ? `${order.city}, ` : ""}{order.country}
          </DrawerTitle>
          <DrawerDescription className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${s.color}`}>{s.label}</Badge>
            <span className="text-xs">{order.goodsTitle}</span>
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-8 space-y-4">
          <div className="p-3 rounded-lg bg-accent/30 border border-border/30 space-y-3">
            <div className="flex items-center gap-3">
              <MiniDonut size={40} strokeWidth={6} />
              <div className="flex-1">
                <div className="text-xs font-semibold mb-0.5">Revenue Split</div>
                <div className="flex gap-2.5 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: REWARD_COLORS.creator }} />
                    Creator 45%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: REWARD_COLORS.voter }} />
                    Voter 40%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: REWARD_COLORS.platform }} />
                    Platform 15%
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              {totalPaid > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Paid</span>
                  <span className="font-medium">{totalPaid.toFixed(4)} SOL</span>
                </div>
              )}
              {productionCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Production Cost</span>
                  <span className="text-red-400">-{productionCost.toFixed(4)} SOL</span>
                </div>
              )}
              {profit > 0 && (
                <div className="flex justify-between border-t border-border/30 pt-1.5">
                  <span className="text-muted-foreground font-medium">Profit</span>
                  <span className="font-semibold text-green-400">{profit.toFixed(4)} SOL</span>
                </div>
              )}
            </div>
          </div>

          {walletAddress && rewardLoading && (
            <div className="bg-primary/5 rounded-md p-2.5 flex items-center gap-2">
              <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
              <span className="text-[10px] text-muted-foreground">Loading your share...</span>
            </div>
          )}

          {hasMyShare && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-md p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-green-400" />
                  <span className="text-[11px] text-green-400 font-medium">My Revenue Share</span>
                </div>
                {myEstimatedSol > 0 && (
                  <span className="text-sm font-bold text-green-400">+{myEstimatedSol.toFixed(4)} SOL</span>
                )}
              </div>
              <div className="text-[10px] text-green-400/70 leading-relaxed space-y-0.5">
                {myCreatorShareInPool > 0 && (
                  <div>
                    Creator: {myCreatorShareInPool.toFixed(1)}% of pool →{" "}
                    <span style={{ color: REWARD_COLORS.creator }}>{myCreatorOverall.toFixed(1)}%</span> of total
                  </div>
                )}
                {myVoterShareInPool > 0 && (
                  <div>
                    Voter: {myVoterShareInPool.toFixed(1)}% of pool →{" "}
                    <span style={{ color: REWARD_COLORS.voter }}>{myVoterOverall.toFixed(1)}%</span> of total
                  </div>
                )}
              </div>
              <div className="text-xs font-bold text-green-400 pt-0.5">
                Total share: {myTotalShare.toFixed(1)}% of profit
              </div>
            </div>
          )}

          {order.revenueStatus === "locked" && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                Funds locked in escrow — released when delivered
              </p>
              {pdaData?.pda && (
                <a
                  href={`https://solscan.io/account/${pdaData.pda}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors group"
                >
                  <Lock className="h-3 w-3 flex-shrink-0 group-hover:text-primary" />
                  <span className="font-mono truncate">
                    {pdaData.pda.slice(0, 8)}…{pdaData.pda.slice(-6)}
                  </span>
                  <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-60 group-hover:opacity-100" />
                </a>
              )}
            </div>
          )}

          {order.trackingUrl && (
            <a
              href={order.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-white no-underline hover:no-underline"
            >
              <ExternalLink className="h-3 w-3" />
              Track shipment {order.trackingNumber ? `(${order.trackingNumber})` : ""}
            </a>
          )}

          <p className="text-xs text-muted-foreground">
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              year: "numeric", month: "short", day: "numeric",
            })}
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function OrderRow({ order, showMyCut, onClick }: { order: any; showMyCut: boolean; onClick: () => void }) {
  const s = getStatusStyle(order.status);
  const claimed = showMyCut && order.isClaimed === true;
  return (
    <div
      className={`border rounded-lg p-3 space-y-2 cursor-pointer transition-colors active:scale-[0.98] ${
        claimed
          ? 'border-border/20 bg-muted/20 opacity-50 hover:opacity-60'
          : 'border-border/30 hover:border-primary/40 hover:bg-accent/20'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className={`h-3.5 w-3.5 shrink-0 ${claimed ? 'text-muted-foreground/50' : 'text-muted-foreground'}`} />
          <span className={`text-sm font-medium truncate ${claimed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
            {order.city ? `${order.city}, ` : ""}{order.country}
          </span>
          {claimed && (
            <span className="text-xs text-muted-foreground/70 shrink-0">Claimed</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className={`text-xs ${claimed ? 'opacity-40' : s.color}`}>
            {s.label}
          </Badge>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="text-muted-foreground">
          Escrow:{" "}
          <span className={`font-medium ${claimed ? 'text-muted-foreground/50 line-through' : 'text-foreground'}`}>
            {order.escrowAmount > 0 ? `${order.escrowAmount.toFixed(4)} SOL` : "—"}
          </span>
        </div>
        {showMyCut && (
          <div className="text-muted-foreground">
            Your cut:{" "}
            <span className={`font-medium ${claimed ? 'text-muted-foreground/50 line-through' : 'text-primary'}`}>
              ~{order.myEstimatedRevenue > 0 ? `${order.myEstimatedRevenue.toFixed(4)} SOL` : "0 SOL"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  sublabel,
  value,
  count,
  accent,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  value: number;
  count: number;
  accent: "primary" | "muted";
  onClick: () => void;
}) {
  const valueClass = accent === "primary" ? "text-primary" : "text-foreground";
  return (
    <Card
      className="border-border/50 cursor-pointer hover:border-primary/40 transition-colors active:scale-[0.98]"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className={accent === "primary" ? "text-primary" : "text-muted-foreground"}>
            {icon}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className={`text-xl font-bold ${valueClass} mb-0.5`}>
          {value.toFixed(4)}
          <span className="text-xs font-normal text-muted-foreground ml-1">SOL</span>
        </div>
        <div className="text-xs font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{sublabel}</div>
        {count > 0 && (
          <Badge variant="secondary" className="mt-2 text-xs px-1.5 py-0">
            {count} order{count !== 1 ? "s" : ""}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

export function RewardsDashboard({ walletAddress }: { walletAddress?: string }) {
  const { authenticated } = usePrivy();
  const signTransaction = useUniversalSignTransaction(walletAddress ?? '');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [openDrawer, setOpenDrawer] = useState<"my-claimable" | "my-escrow" | "total-claimable" | "total-escrow" | null>(null);
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<any | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  const { data: summary, isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/rewards/summary", walletAddress],
    queryFn: async ({ signal }) => {
      const url = walletAddress
        ? `/api/rewards/summary?wallet=${walletAddress}`
        : "/api/rewards/summary";
      const res = await fetch(url, { cache: 'no-cache', signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 0,
    refetchInterval: 60000,
    retry: 2,
  });

  const handleClaim = useCallback(async () => {
    if (!walletAddress || isClaiming) return;
    setIsClaiming(true);
    try {
      const prepareRes = await fetch(`/api/rewards/prepare-claim?wallet=${walletAddress}`);
      const prepareData = await prepareRes.json();

      if (prepareData.contractEnabled) {
        if (!prepareData.transactions?.length) {
          toast({ title: "Nothing to claim", description: "No claimable rewards found." });
          return;
        }

        // Phase 2: 유저가 직접 서명 (가스비 유저 부담)
        let totalClaimed = 0;
        const confirmItems: { contestId: number; txSignature: string; creatorDistributionIds: number[]; voterLamports: number }[] = [];

        for (const item of prepareData.transactions) {
          const tx = Transaction.from(Buffer.from(item.transaction, "base64"));
          toast({ title: `Signing claim for contest #${item.contestId}...`, duration: 3000 });
          const signedTx = await signTransaction(tx, SOL_CONNECTION);
          const sig = await SOL_CONNECTION.sendRawTransaction(signedTx.serialize());
          await SOL_CONNECTION.confirmTransaction(sig, "confirmed");
          totalClaimed += item.solAmount;
          confirmItems.push({
            contestId: item.contestId,
            txSignature: sig,
            creatorDistributionIds: item.creatorDistributionIds ?? [],
            voterLamports: item.voterLamports ?? 0,
          });
        }

        // TX 성공 후 DB 동기화
        await fetch("/api/rewards/confirm-claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress, items: confirmItems }),
        });

        toast({
          title: "Claimed!",
          description: `${totalClaimed.toFixed(4)} SOL received. ${confirmItems.length > 1 ? `${confirmItems.length} TXs` : `TX: ${confirmItems[0]?.txSignature?.slice(0, 8)}...`}`,
        });
      } else {
        // Legacy: 컨트랙트 비활성화 시 서버가 escrow에서 전송
        const res = await fetch("/api/rewards/claim-all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Claim failed");
        toast({
          title: "Claimed!",
          description: `${data.totalSol.toFixed(4)} SOL sent to your wallet.`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/rewards/summary", walletAddress] });
      setOpenDrawer(null);
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      const isInsufficientFunds =
        msg.includes('insufficient') ||
        msg.includes('Insufficient') ||
        msg.includes('0x1') ||
        msg.includes('lamports') ||
        msg.includes('funds');
      toast({
        title: "Claim Failed",
        description: isInsufficientFunds
          ? "Insufficient SOL balance for claim."
          : msg || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsClaiming(false);
    }
  }, [walletAddress, isClaiming, signTransaction, toast, queryClient]);

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-muted-foreground text-sm">데이터를 불러오지 못했습니다.</p>
        <button
          onClick={() => refetch()}
          className="text-xs text-primary underline underline-offset-2"
        >
          새로고침
        </button>
      </div>
    );
  }

  const my = summary?.my ?? { claimable: 0, escrow: 0, claimableOrders: [], escrowOrders: [] };
  const total = summary?.total ?? { claimable: 0, escrow: 0, claimableOrders: [], escrowOrders: [] };

  const drawerConfig = {
    "my-claimable":    { title: "My Claimable",     desc: "Orders where your rewards have been distributed", orders: my.claimableOrders,    showMyCut: true },
    "my-escrow":       { title: "My Escrow",         desc: "Orders pending delivery — funds locked in escrow", orders: my.escrowOrders,       showMyCut: true },
    "total-claimable": { title: "Total Claimable",   desc: "All distributed rewards across all orders",       orders: total.claimableOrders, showMyCut: false },
    "total-escrow":    { title: "Total Escrow",      desc: "All funds currently locked in escrow",            orders: total.escrowOrders,    showMyCut: false },
  } as const;

  const active = openDrawer ? drawerConfig[openDrawer] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Wallet className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold text-primary">Rewards</h2>
        {!authenticated && (
          <Badge variant="outline" className="text-xs text-muted-foreground ml-auto">
            Login to see your rewards
          </Badge>
        )}
      </div>

      {authenticated && (
        <>
          <p className="text-xs text-muted-foreground -mt-2">My Rewards</p>
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard
              icon={<Wallet className="h-4 w-4" />}
              label="My Claimable"
              sublabel="Ready to claim"
              value={my.claimable}
              count={my.claimableOrders.length}
              accent="primary"
              onClick={() => setOpenDrawer("my-claimable")}
            />
            <SummaryCard
              icon={<Lock className="h-4 w-4" />}
              label="My Escrow"
              sublabel="Pending delivery"
              value={my.escrow}
              count={my.escrowOrders.length}
              accent="primary"
              onClick={() => setOpenDrawer("my-escrow")}
            />
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground">Platform Total</p>
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard
          icon={<Wallet className="h-4 w-4" />}
          label="Total Claimable"
          sublabel="All distributed"
          value={total.claimable}
          count={total.claimableOrders.length}
          accent="muted"
          onClick={() => setOpenDrawer("total-claimable")}
        />
        <SummaryCard
          icon={<Lock className="h-4 w-4" />}
          label="Total Escrow"
          sublabel="Locked on-chain"
          value={total.escrow}
          count={total.escrowOrders.length}
          accent="muted"
          onClick={() => setOpenDrawer("total-escrow")}
        />
      </div>

      <Drawer open={!!openDrawer} onOpenChange={(open) => !open && setOpenDrawer(null)}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader>
            <DrawerTitle>{active?.title}</DrawerTitle>
            <DrawerDescription>{active?.desc}</DrawerDescription>
          </DrawerHeader>

          {openDrawer === "my-claimable" && walletAddress && (
            <div className="px-4 pb-3">
              <Button
                className="w-full font-bold text-base"
                onClick={handleClaim}
                disabled={isClaiming || my.claimable <= 0.000001}
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4 mr-2" />
                    Claim {my.claimable.toFixed(4)} SOL
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="overflow-y-auto px-4 pb-6 space-y-3">
            {active?.orders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No orders yet
              </div>
            ) : (
              active?.orders.map((order: any) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  showMyCut={active.showMyCut}
                  onClick={() => setSelectedDetailOrder(order)}
                />
              ))
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <OrderDetailDrawer
        order={selectedDetailOrder}
        walletAddress={walletAddress}
        open={!!selectedDetailOrder}
        onClose={() => setSelectedDetailOrder(null)}
      />
    </div>
  );
}
