import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { MediaDisplay } from "@/components/media-display";

export function PrintfulDetailSection({ orderId, wallet }: { orderId: number; wallet: string }) {
  const { data, isLoading, error } = useQuery<{
    printfulId: number;
    status: string;
    createdAt: string;
    externalId: string | null;
    items: { name: string; quantity: number; size: string | null; price: string | null; currency: string; thumbnailUrl: string | null }[];
    costs: { subtotal: string; shipping: string; tax: string; total: string; currency: string } | null;
    recipient: { name: string; city: string; country: string } | null;
  }>({
    queryKey: ['/api/goods/orders', orderId, 'printful-detail', wallet],
    queryFn: async () => {
      const res = await fetch(`/api/goods/orders/${orderId}/printful-detail?wallet=${wallet}`);
      if (!res.ok) throw new Error('Failed to load');
      return res.json();
    },
    enabled: !!orderId && !!wallet,
    staleTime: 60000,
  });

  const statusMap: Record<string, { label: string; color: string }> = {
    draft:        { label: "Confirmed",    color: "bg-blue-500/20 text-blue-400" },
    pending:      { label: "Confirmed",    color: "bg-blue-500/20 text-blue-400" },
    confirmed:    { label: "Confirmed",    color: "bg-blue-500/20 text-blue-400" },
    inprocess:    { label: "In Production",color: "bg-orange-500/20 text-orange-400" },
    in_production:{ label: "In Production",color: "bg-orange-500/20 text-orange-400" },
    fulfilled:    { label: "Shipped",      color: "bg-purple-500/20 text-purple-400" },
    shipped:      { label: "Shipped",      color: "bg-purple-500/20 text-purple-400" },
    in_transit:   { label: "Shipped",      color: "bg-purple-500/20 text-purple-400" },
    delivered:    { label: "Delivered",    color: "bg-green-500/20 text-green-400" },
    canceled:     { label: "Canceled",     color: "bg-red-500/20 text-red-400" },
    failed:       { label: "Failed",       color: "bg-red-500/20 text-red-400" },
    onhold:       { label: "On Hold",      color: "bg-orange-500/20 text-orange-400" },
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-semibold text-foreground">Printful Order</div>
        <div className="bg-accent/30 rounded-lg p-3 space-y-2 animate-pulse">
          <div className="h-4 bg-accent/50 rounded w-3/4" />
          <div className="flex gap-3">
            <div className="w-12 h-12 bg-accent/50 rounded" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-accent/50 rounded w-1/2" />
              <div className="h-3 bg-accent/50 rounded w-1/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) return null;

  const s = statusMap[data.status] || { label: data.status, color: "bg-accent text-foreground" };

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-foreground">Printful Order</div>
      <div className="bg-accent/30 rounded-lg p-3 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Printful #{data.printfulId}</span>
          <Badge className={`text-xs ${s.color}`}>{s.label}</Badge>
        </div>
        {data.items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            {item.thumbnailUrl && (
              <img
                src={item.thumbnailUrl}
                alt={item.name}
                className="w-12 h-12 rounded object-cover bg-gray-800 flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-foreground font-medium truncate">{item.name}</div>
              <div className="text-xs text-muted-foreground">
                {item.size && <span>{item.size} · </span>}
                Qty: {item.quantity}
                {item.price && <span> · ${item.price}</span>}
              </div>
            </div>
          </div>
        ))}
        {data.recipient && (
          <div className="text-xs text-muted-foreground pt-1 border-t border-border">
            Ship to: {data.recipient.name}, {data.recipient.city}, {data.recipient.country}
          </div>
        )}
      </div>
    </div>
  );
}

export function GoodsListItem({ item, index, onClick }: { item: any; index: number; onClick: () => void }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  return (
    <Card
      className="overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors border-border animate-fade-in"
      style={{ animationDelay: `${Math.min(index * 60, 300)}ms` }}
      onClick={onClick}
    >
      <div className="flex p-3">
        <div className="w-20 h-20 flex-shrink-0 bg-accent rounded-lg overflow-hidden relative">
          {!imgLoaded && (
            <div className="absolute inset-0 bg-accent animate-pulse rounded-lg" />
          )}
          <img
            src={item.imageUrl}
            alt={item.title}
            className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgLoaded(true)}
          />
        </div>
        <div className="flex-1 ml-3 min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate">{item.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-primary font-bold text-sm">${item.retailPrice}</span>
            <Badge variant="outline" className="text-xs">{item.productType}</Badge>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground self-center flex-shrink-0" />
      </div>
    </Card>
  );
}
