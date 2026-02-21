import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Package, MapPin, ExternalLink, TrendingUp, Clock, DollarSign, Truck } from "lucide-react";
import { getCoordinates, getCountryName } from "@/data/country-coordinates";
import samuLogoImg from "@/assets/samu-logo.webp";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface MapOrder {
  id: number;
  city: string;
  country: string;
  lat: number | null;
  lng: number | null;
  status: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  solAmount: number | null;
  totalPrice: number;
  goodsTitle: string;
  goodsImage: string | null;
  productType: string | null;
  createdAt: string;
  hasRevenue: boolean;
  distribution: {
    creatorAmount: number;
    voterPoolAmount: number;
    platformAmount: number;
  } | null;
}

interface MapData {
  orders: MapOrder[];
  stats: {
    total: number;
    shipped: number;
    delivered: number;
    countries: number;
  };
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "pending": return "Preparing";
    case "confirmed": return "Confirmed";
    case "shipped": return "Shipped";
    case "in_transit": return "In Transit";
    case "delivered": return "Delivered";
    case "failed": return "Failed";
    case "canceled": return "Canceled";
    default: return status;
  }
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case "pending": return "📦";
    case "confirmed": return "✅";
    case "shipped": return "🚀";
    case "in_transit": return "✈️";
    case "delivered": return "🎉";
    case "failed": return "😢";
    case "canceled": return "❌";
    default: return "📦";
  }
}

function getSamuMessage(status: string, city: string, country: string): string {
  const location = city || getCountryName(country);
  switch (status) {
    case "pending": return `SAMU is getting ready for ${location}!`;
    case "confirmed": return `SAMU is packed and heading to ${location}!`;
    case "shipped": return `SAMU just departed for ${location}! 🚀`;
    case "in_transit": return `SAMU is traveling to ${location}! ✈️`;
    case "delivered": return `SAMU arrived in ${location}! 🎉`;
    case "failed": return `SAMU couldn't make it to ${location}... 😢`;
    case "canceled": return `SAMU's trip to ${location} was canceled`;
    default: return `SAMU is heading to ${location}!`;
  }
}

interface SamuMapProps {
  walletAddress?: string;
}

export function SamuMap({ walletAddress }: SamuMapProps) {
  const [selectedOrder, setSelectedOrder] = useState<MapOrder | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const mapUrl = walletAddress ? `/api/rewards/map?wallet=${walletAddress}` : "/api/rewards/map";
  const { data: mapData, isLoading } = useQuery<MapData>({
    queryKey: [mapUrl],
    refetchInterval: 30000,
  });

  const markers = useMemo(() => {
    if (!mapData?.orders) return [];
    return mapData.orders
      .map((order) => {
        let lat = order.lat;
        let lng = order.lng;
        if (lat == null || lng == null) {
          const coords = getCoordinates(order.country, order.city);
          if (coords) {
            lat = coords.lat;
            lng = coords.lng;
          }
        }
        if (lat == null || lng == null) return null;
        const jitter = (Math.random() - 0.5) * 3;
        return { ...order, lat: lat + jitter, lng: lng + jitter };
      })
      .filter(Boolean) as (MapOrder & { lat: number; lng: number })[];
  }, [mapData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-[300px] bg-accent animate-pulse rounded-lg" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-accent animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative rounded-lg overflow-hidden border border-border/50 bg-[#1a1a2e]">
        <ComposableMap
          projectionConfig={{ scale: 147, center: [0, 20] }}
          width={800}
          height={400}
          style={{ width: "100%", height: "auto" }}
        >
          <ZoomableGroup>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#2a2a4a"
                    stroke="#3a3a5a"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: { fill: "#3a3a6a", outline: "none" },
                      pressed: { outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>

            {markers.map((marker) => (
              <Marker
                key={marker.id}
                coordinates={[marker.lng, marker.lat]}
                onClick={() => {
                  setSelectedOrder(marker);
                  setShowDetail(false);
                }}
              >
                <circle
                  r={4}
                  fill={marker.hasRevenue ? "#22c55e" : "#ef4444"}
                  stroke="#fff"
                  strokeWidth={1}
                  className="cursor-pointer"
                  opacity={0.9}
                />
                <circle
                  r={8}
                  fill={marker.hasRevenue ? "#22c55e" : "#ef4444"}
                  opacity={0.2}
                  className="cursor-pointer"
                >
                  <animate
                    attributeName="r"
                    from="4"
                    to="12"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.3"
                    to="0"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>

        {markers.length === 0 && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No deliveries yet</p>
              <p className="text-xs mt-1">Orders will appear here on the map</p>
            </div>
          </div>
        )}

        <div className="absolute bottom-2 left-2 flex items-center gap-3 text-[10px] text-white/70">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
            <span>My Revenue</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
            <span>Other</span>
          </div>
        </div>
      </div>

      {mapData?.stats && (
        <div className="grid grid-cols-4 gap-2">
          <Card className="border-border/30">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-primary">{mapData.stats.total}</div>
              <div className="text-[10px] text-muted-foreground">Total Orders</div>
            </CardContent>
          </Card>
          <Card className="border-border/30">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-blue-400">{mapData.stats.shipped}</div>
              <div className="text-[10px] text-muted-foreground">In Transit</div>
            </CardContent>
          </Card>
          <Card className="border-border/30">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-green-400">{mapData.stats.delivered}</div>
              <div className="text-[10px] text-muted-foreground">Delivered</div>
            </CardContent>
          </Card>
          <Card className="border-border/30">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-yellow-400">{mapData.stats.countries}</div>
              <div className="text-[10px] text-muted-foreground">Countries</div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedOrder && !showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedOrder(null)}>
          <Card className="w-full max-w-sm border-primary/30 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-5">
              <button
                onClick={() => setSelectedOrder(null)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-yellow-400/20 flex items-center justify-center overflow-hidden">
                  <img src={samuLogoImg} alt="SAMU" className="w-12 h-12 object-contain" />
                </div>

                <div className="text-2xl">{getStatusEmoji(selectedOrder.status)}</div>

                <p className="text-sm font-medium text-foreground">
                  {getSamuMessage(selectedOrder.status, selectedOrder.city, selectedOrder.country)}
                </p>

                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {selectedOrder.city}, {getCountryName(selectedOrder.country)}
                  </span>
                </div>

                <Badge
                  variant={selectedOrder.hasRevenue ? "default" : "secondary"}
                  className={selectedOrder.hasRevenue ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}
                >
                  {selectedOrder.hasRevenue ? "💰 Revenue Order" : "📦 Standard Order"}
                </Badge>

                <button
                  onClick={() => setShowDetail(true)}
                  className="text-xs text-primary hover:text-primary/80 transition-colors mt-2"
                >
                  View Details →
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedOrder && showDetail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => { setSelectedOrder(null); setShowDetail(false); }}>
          <Card className="w-full max-w-md border-primary/30 animate-fade-in max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center overflow-hidden">
                    <img src={samuLogoImg} alt="SAMU" className="w-6 h-6 object-contain" />
                  </div>
                  <h3 className="font-semibold text-foreground">Order #{selectedOrder.id}</h3>
                </div>
                <button
                  onClick={() => { setSelectedOrder(null); setShowDetail(false); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                  <div className="text-2xl">{getStatusEmoji(selectedOrder.status)}</div>
                  <div>
                    <div className="text-sm font-medium">{getStatusLabel(selectedOrder.status)}</div>
                    <div className="text-xs text-muted-foreground">
                      {getSamuMessage(selectedOrder.status, selectedOrder.city, selectedOrder.country)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shipping Info</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{selectedOrder.city}, {getCountryName(selectedOrder.country)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{selectedOrder.goodsTitle}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span>{new Date(selectedOrder.createdAt).toLocaleDateString()}</span>
                    </div>
                    {selectedOrder.trackingNumber && (
                      <div className="flex items-center gap-2">
                        <Truck className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        {selectedOrder.trackingUrl ? (
                          <a
                            href={selectedOrder.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 flex items-center gap-1"
                          >
                            Track <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="truncate">{selectedOrder.trackingNumber}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment</h4>
                  <div className="p-3 rounded-lg bg-accent/50 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Item Price</span>
                      <span className="font-medium">${selectedOrder.totalPrice.toFixed(2)}</span>
                    </div>
                    {selectedOrder.solAmount && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">SOL Paid</span>
                        <span className="font-medium text-primary">{selectedOrder.solAmount.toFixed(4)} SOL</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedOrder.distribution && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Revenue Distribution
                    </h4>
                    <div className="p-3 rounded-lg bg-accent/50 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Creator (45%)</span>
                        <span className="font-medium text-yellow-400">
                          {selectedOrder.distribution.creatorAmount.toFixed(4)} SOL
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Voters (40%)</span>
                        <span className="font-medium text-orange-400">
                          {selectedOrder.distribution.voterPoolAmount.toFixed(4)} SOL
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Platform (15%)</span>
                        <span className="font-medium text-gray-400">
                          {selectedOrder.distribution.platformAmount.toFixed(4)} SOL
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedOrder.hasRevenue && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-green-400 font-medium">You earn revenue from this order!</span>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowDetail(false)}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-2"
              >
                ← Back to summary
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      {markers.length > 0 && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            🐺 SAMU is traveling across {mapData?.stats.countries || 0} countries worldwide!
          </p>
        </div>
      )}
    </div>
  );
}
