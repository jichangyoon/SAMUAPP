import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Wallet, Lock, ChevronRight, ExternalLink, MapPin } from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:      { label: "Pending",      color: "bg-yellow-500/20 text-yellow-400 border-yellow-400/30" },
  draft:        { label: "Draft",        color: "bg-gray-500/20 text-gray-400 border-gray-400/30" },
  confirmed:    { label: "Confirmed",    color: "bg-blue-500/20 text-blue-400 border-blue-400/30" },
  in_production:{ label: "In Production",color: "bg-orange-500/20 text-orange-400 border-orange-400/30" },
  shipped:      { label: "Shipped",      color: "bg-purple-500/20 text-purple-400 border-purple-400/30" },
  in_transit:   { label: "In Transit",   color: "bg-purple-500/20 text-purple-400 border-purple-400/30" },
  delivered:    { label: "Delivered ✓",  color: "bg-green-500/20 text-green-400 border-green-400/30" },
  canceled:     { label: "Canceled",     color: "bg-red-500/20 text-red-400 border-red-400/30" },
  failed:       { label: "Failed",       color: "bg-red-500/20 text-red-400 border-red-400/30" },
};

function getStatusStyle(status: string) {
  return STATUS_LABEL[status] ?? { label: status, color: "bg-gray-500/20 text-gray-400" };
}

function OrderRow({ order, showMyCut }: { order: any; showMyCut: boolean }) {
  const s = getStatusStyle(order.status);
  return (
    <div className="border border-border/30 rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">
            {order.city ? `${order.city}, ` : ""}{order.country}
          </span>
        </div>
        <Badge variant="outline" className={`text-xs shrink-0 ${s.color}`}>
          {s.label}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="text-muted-foreground">
          Escrow:{" "}
          <span className="text-foreground font-medium">
            {order.escrowAmount > 0 ? `${order.escrowAmount.toFixed(4)} SOL` : "—"}
          </span>
        </div>
        {showMyCut && (
          <div className="text-muted-foreground">
            Your cut:{" "}
            <span className="text-primary font-medium">
              ~{order.myEstimatedRevenue > 0 ? `${order.myEstimatedRevenue.toFixed(4)} SOL` : "0 SOL"}
            </span>
          </div>
        )}
        {order.distribution && (
          <>
            <div className="text-muted-foreground">
              Creators:{" "}
              <span className="text-yellow-400 font-medium">{order.distribution.creatorAmount.toFixed(4)} SOL</span>
            </div>
            <div className="text-muted-foreground">
              Voters:{" "}
              <span className="text-orange-400 font-medium">{order.distribution.voterPoolAmount.toFixed(4)} SOL</span>
            </div>
          </>
        )}
      </div>

      {order.revenueStatus === "locked" && (
        <p className="text-xs text-muted-foreground">
          Funds locked in escrow — released when delivered
        </p>
      )}

      {order.trackingUrl && (
        <a
          href={order.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
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
        <div className="text-xl font-bold text-green-400 mb-0.5">
          {value.toFixed(4)}
          <span className="text-xs font-normal text-green-400 ml-1">SOL</span>
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

  const [openDrawer, setOpenDrawer] = useState<"my-claimable" | "my-escrow" | "total-claimable" | "total-escrow" | null>(null);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["/api/rewards/summary", walletAddress],
    queryFn: async () => {
      const url = walletAddress
        ? `/api/rewards/summary?wallet=${walletAddress}`
        : "/api/rewards/summary";
      const res = await fetch(url);
      return res.json();
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
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
          <div className="overflow-y-auto px-4 pb-6 space-y-3">
            {active?.orders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No orders yet
              </div>
            ) : (
              active?.orders.map((order: any) => (
                <OrderRow key={order.id} order={order} showMyCut={active.showMyCut} />
              ))
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
