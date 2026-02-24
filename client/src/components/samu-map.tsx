import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Package, MapPin, ExternalLink, TrendingUp, Clock, DollarSign, Truck, PieChart, ChevronUp, ChevronDown } from "lucide-react";
import { getCoordinates, getCountryName } from "@/data/country-coordinates";
import samuLogoImg from "@/assets/samu-logo.webp";

interface FulfillmentCenter {
  coords: [number, number];
  label: string;
}

const FULFILLMENT_CENTERS: Record<string, FulfillmentCenter> = {
  japan: { coords: [32.30, 130.19], label: "Amakusa, JP" },
  us: { coords: [35.23, -80.84], label: "Charlotte, US" },
  europe: { coords: [56.95, 24.11], label: "Riga, LV" },
  australia: { coords: [-27.47, 153.03], label: "Brisbane, AU" },
  brazil: { coords: [-22.91, -43.17], label: "Rio, BR" },
  mexico: { coords: [32.53, -117.03], label: "Tijuana, MX" },
};

const ASIA_COUNTRIES = ["JP", "KR", "CN", "TW", "HK", "SG", "TH", "VN", "MY", "ID", "PH", "IN", "BD", "LK", "NP", "MM", "KH", "LA", "MN", "BN"];
const EUROPE_COUNTRIES = ["GB", "DE", "FR", "IT", "ES", "NL", "BE", "AT", "CH", "SE", "NO", "DK", "FI", "PL", "CZ", "PT", "IE", "GR", "HU", "RO", "BG", "HR", "SK", "SI", "LT", "LV", "EE", "LU", "MT", "CY", "IS", "UA", "RS", "BA", "ME", "MK", "AL", "XK", "MD"];
const OCEANIA_COUNTRIES = ["AU", "NZ", "FJ", "PG"];
const SOUTH_AMERICA_COUNTRIES = ["BR", "AR", "CL", "CO", "PE", "VE", "EC", "BO", "PY", "UY", "GY", "SR"];

function getFulfillmentCenter(country: string): FulfillmentCenter {
  if (ASIA_COUNTRIES.includes(country)) return FULFILLMENT_CENTERS.japan;
  if (EUROPE_COUNTRIES.includes(country)) return FULFILLMENT_CENTERS.europe;
  if (OCEANIA_COUNTRIES.includes(country)) return FULFILLMENT_CENTERS.australia;
  if (SOUTH_AMERICA_COUNTRIES.includes(country)) return FULFILLMENT_CENTERS.brazil;
  if (country === "MX") return FULFILLMENT_CENTERS.mexico;
  return FULFILLMENT_CENTERS.us;
}

function createDotIcon(color: string, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 18 : 12;
  const borderColor = isSelected ? "#fbbf24" : "#fff";
  const borderWidth = isSelected ? 3 : 2;
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      <div style="width:${size}px;height:${size}px;background:${color};border:${borderWidth}px solid ${borderColor};border-radius:50%;box-shadow:0 0 8px ${color}80;"></div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${size * 2}px;height:${size * 2}px;background:${color};border-radius:50%;opacity:0.3;animation:pulse-ring 2s infinite;pointer-events:none;"></div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createFulfillmentIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="width:12px;height:12px;background:#fbbf24;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px #fbbf2480;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

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
  contestId: number | null;
  hasRevenue: boolean;
  isBuyer: boolean;
  revenueRole: string | null;
  revenueStatus: string | null;
  myEstimatedRevenue: number | null;
  distribution: {
    creatorAmount: number;
    voterPoolAmount: number;
    platformAmount: number;
  } | null;
  escrow: {
    totalSolPaid: number;
    costSol: number;
    profitSol: number;
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

function getRevenueRoleLabel(role: string | null): string {
  switch (role) {
    case "creator": return "🎨 Creator Revenue";
    case "voter": return "🗳️ Voter Revenue";
    case "creator_voter": return "🎨🗳️ Creator + Voter";
    case "buyer": return "🛒 My Order";
    default: return "📦 Standard Order";
  }
}

const REWARD_COLORS = {
  creator: "hsl(45, 90%, 55%)",
  voter: "hsl(200, 80%, 55%)",
  platform: "hsl(280, 60%, 55%)",
};

function MiniDonut({ size = 44, strokeWidth = 7 }: { size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const segments = [
    { percent: 45, color: REWARD_COLORS.creator },
    { percent: 40, color: REWARD_COLORS.voter },
    { percent: 15, color: REWARD_COLORS.platform },
  ];
  let cumulative = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={center} cy={center} r={radius} fill="none" stroke="hsl(0,0%,20%)" strokeWidth={strokeWidth} />
      {segments.map((seg, i) => {
        const dash = `${(seg.percent / 100) * circumference} ${circumference}`;
        const rot = (cumulative / 100) * 360 - 90;
        cumulative += seg.percent;
        return (
          <circle key={i} cx={center} cy={center} r={radius} fill="none" stroke={seg.color}
            strokeWidth={strokeWidth} strokeDasharray={dash} strokeDashoffset="0"
            transform={`rotate(${rot} ${center} ${center})`} strokeLinecap="butt" />
        );
      })}
    </svg>
  );
}

interface RewardBreakdownData {
  shareRatios: { creator: number; voter: number; platform: number };
  creators: { wallet: string; percent: number }[];
  voters: { wallet: string; percent: number }[];
  totalVotes: number;
  totalSamuSpent: number;
}

function MapRevenueWidget({ order, walletAddress }: { order: MapOrder; walletAddress?: string }) {
  const { data: rewardData, isLoading: rewardLoading } = useQuery<RewardBreakdownData>({
    queryKey: [`/api/memes/contest/${order.contestId}/reward-breakdown`],
    staleTime: 30000,
    enabled: !!order.contestId && !!walletAddress,
  });

  const totalPaid = order.escrow?.totalSolPaid || order.solAmount || 0;
  const productionCost = order.escrow?.costSol || (order.distribution ? totalPaid - (order.distribution.creatorAmount + order.distribution.voterPoolAmount + order.distribution.platformAmount) : 0);
  const profit = order.escrow?.profitSol || (order.distribution ? order.distribution.creatorAmount + order.distribution.voterPoolAmount + order.distribution.platformAmount : 0);

  const creatorPct = 45;
  const voterPct = 40;
  const platformPct = 15;

  let myCreatorShareInPool = 0;
  let myVoterShareInPool = 0;
  if (rewardData && walletAddress) {
    const myCreator = rewardData.creators.find(c => c.wallet === walletAddress);
    const myVoter = rewardData.voters.find(v => v.wallet === walletAddress);
    if (myCreator) myCreatorShareInPool = myCreator.percent;
    if (myVoter) myVoterShareInPool = myVoter.percent;
  }
  const myCreatorOverall = (myCreatorShareInPool / 100) * creatorPct;
  const myVoterOverall = (myVoterShareInPool / 100) * voterPct;
  const myTotalShare = myCreatorOverall + myVoterOverall;
  const myEstimatedSol = profit > 0 ? profit * (myTotalShare / 100) : 0;

  const hasDistribution = order.distribution || order.escrow;
  const hasMyShare = myTotalShare > 0;

  return (
    <div className="p-3 rounded-lg bg-accent/30 border border-border/30 space-y-3">
      <div className="flex items-center gap-3">
        <MiniDonut size={40} strokeWidth={6} />
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <PieChart className="h-3 w-3 text-primary" />
            <span className="text-xs font-semibold">Revenue Split</span>
          </div>
          <div className="flex gap-2.5 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: REWARD_COLORS.creator }} />
              Creator {creatorPct}%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: REWARD_COLORS.voter }} />
              Voter {voterPct}%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: REWARD_COLORS.platform }} />
              Platform {platformPct}%
            </span>
          </div>
        </div>
      </div>

      {hasDistribution && (
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Paid</span>
            <span className="font-medium">{totalPaid > 0 ? `${totalPaid.toFixed(4)} SOL` : "—"}</span>
          </div>
          {totalPaid > 0 && productionCost > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Production Cost</span>
              <span className="text-red-400">-{productionCost.toFixed(4)} SOL</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border/30 pt-1.5">
            <span className="text-muted-foreground font-medium">Profit</span>
            <span className="font-semibold text-green-400">{profit > 0 ? `${profit.toFixed(4)} SOL` : "—"}</span>
          </div>
        </div>
      )}

      {!hasDistribution && (
        <div className="text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Item Price</span>
            <span className="font-medium">${order.totalPrice.toFixed(2)}</span>
          </div>
          <p className="text-[10px] mt-1 opacity-70">Revenue details appear after escrow processing.</p>
        </div>
      )}

      {walletAddress && rewardLoading && (
        <div className="bg-primary/5 rounded-md p-2.5 flex items-center gap-2">
          <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
          <span className="text-[10px] text-muted-foreground">Loading your share...</span>
        </div>
      )}

      {hasMyShare && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-md p-2.5 space-y-1.5">
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
              <div>Creator: {myCreatorShareInPool.toFixed(1)}% of pool → <span className="text-[hsl(45,90%,55%)]">{myCreatorOverall.toFixed(1)}%</span> of total</div>
            )}
            {myVoterShareInPool > 0 && (
              <div>Voter: {myVoterShareInPool.toFixed(1)}% of pool → <span className="text-[hsl(200,80%,55%)]">{myVoterOverall.toFixed(1)}%</span> of total</div>
            )}
          </div>
          <div className="text-xs font-bold text-green-400 pt-0.5">
            Total share: {myTotalShare.toFixed(1)}% of profit
          </div>
        </div>
      )}

      {order.hasRevenue && !hasMyShare && !rewardLoading && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-md p-2.5">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3 w-3 text-green-400" />
            <span className="text-[11px] text-green-400 font-medium">
              {getRevenueRoleLabel(order.revenueRole)}
            </span>
          </div>
          {(order.revenueRole === "buyer" || order.isBuyer) && !order.revenueRole?.includes("creator") && !order.revenueRole?.includes("voter") && (
            <p className="text-[10px] text-green-400/50 mt-1">Your purchase generates revenue for creators and voters.</p>
          )}
        </div>
      )}
    </div>
  );
}

function MapController({ selectedOrder, markers }: { selectedOrder: MapOrder | null; markers: (MapOrder & { lat: number; lng: number })[] }) {
  const map = useMap();

  useEffect(() => {
    if (selectedOrder) {
      const marker = markers.find(m => m.id === selectedOrder.id);
      if (marker) {
        const center = getFulfillmentCenter(marker.country);
        const bounds = L.latLngBounds(
          [center.coords[0], center.coords[1]],
          [marker.lat, marker.lng]
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
      }
    }
  }, [selectedOrder, markers, map]);

  return null;
}

interface SamuMapProps {
  walletAddress?: string;
}

export function SamuMap({ walletAddress }: SamuMapProps) {
  const [selectedOrder, setSelectedOrder] = useState<MapOrder | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

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
        const seed = order.id * 2654435761;
        const jitterLat = ((seed % 1000) / 1000 - 0.5) * 0.5;
        const jitterLng = (((seed * 7) % 1000) / 1000 - 0.5) * 0.5;
        return { ...order, lat: lat + jitterLat, lng: lng + jitterLng };
      })
      .filter(Boolean) as (MapOrder & { lat: number; lng: number })[];
  }, [mapData]);

  useEffect(() => {
    if (selectedOrder) {
      setSheetExpanded(false);
    }
  }, [selectedOrder]);

  const closeSheet = () => {
    setSelectedOrder(null);
    setSheetExpanded(false);
  };

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

  const isActive = !!selectedOrder;

  const selectedMarker = selectedOrder ? markers.find(m => m.id === selectedOrder.id) : null;
  const fulfillmentCenter = selectedMarker ? getFulfillmentCenter(selectedMarker.country) : null;
  const routeLine: [number, number][] = selectedMarker && fulfillmentCenter
    ? [fulfillmentCenter.coords, [selectedMarker.lat, selectedMarker.lng]]
    : [];

  return (
    <div className={`${isActive ? "fixed inset-0 z-[60] bg-[#0d0d1a] flex flex-col" : "space-y-4"}`}>
      <div className={`relative overflow-hidden ${isActive ? "h-[33vh] flex-shrink-0" : "rounded-lg border border-border/50"}`}>
        <MapContainer
          center={[20, 0]}
          zoom={2}
          minZoom={2}
          maxZoom={18}
          style={{ width: "100%", height: isActive ? "100%" : "300px", background: "#0d0d1a" }}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          <MapController selectedOrder={selectedOrder} markers={markers} />

          {markers.map((marker) => (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={createDotIcon(
                marker.hasRevenue ? "#22c55e" : "#ef4444",
                selectedOrder?.id === marker.id
              )}
              eventHandlers={{
                click: () => setSelectedOrder(marker),
              }}
            />
          ))}

          {fulfillmentCenter && selectedMarker && (
            <>
              <Polyline
                positions={routeLine}
                pathOptions={{
                  color: selectedMarker.hasRevenue ? "#22c55e" : "#ef4444",
                  weight: 2,
                  dashArray: "8 6",
                  opacity: 0.7,
                }}
              />
              <Marker
                position={fulfillmentCenter.coords}
                icon={createFulfillmentIcon()}
              >
                <Popup className="leaflet-dark-popup">
                  <span className="text-xs font-bold">{fulfillmentCenter.label}</span>
                </Popup>
              </Marker>
            </>
          )}
        </MapContainer>

        {markers.length === 0 && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[400]">
            <div className="text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No deliveries yet</p>
              <p className="text-xs mt-1">Orders will appear here on the map</p>
            </div>
          </div>
        )}

        <div className="absolute bottom-2 left-2 z-[400] flex items-center gap-3 text-[10px] text-white/70 bg-black/40 backdrop-blur-sm rounded px-2 py-1">
          {isActive && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#fbbf24]" />
              <span>Origin</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
            <span>My Revenue</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
            <span>Other</span>
          </div>
        </div>

        {isActive && (
          <button
            onClick={closeSheet}
            className="absolute top-3 right-3 z-[500] w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!isActive && mapData?.stats && (
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

      {isActive && selectedOrder && (
        <div
          ref={sheetRef}
          className="flex-1 min-h-0 bg-background border-t border-border/50 rounded-t-2xl flex flex-col overflow-hidden"
        >
          <div
            className="flex justify-center pt-2 pb-1 cursor-pointer flex-shrink-0"
            onClick={() => setSheetExpanded(!sheetExpanded)}
          >
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="px-4 pb-4 overflow-y-auto flex-1 min-h-0">
            {!sheetExpanded ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {selectedOrder.goodsImage ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-accent flex-shrink-0">
                      <img src={selectedOrder.goodsImage} alt={selectedOrder.goodsTitle} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-yellow-400/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img src={samuLogoImg} alt="SAMU" className="w-8 h-8 object-contain" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {selectedOrder.goodsTitle}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {getStatusEmoji(selectedOrder.status)} {getSamuMessage(selectedOrder.status, selectedOrder.city, selectedOrder.country)}
                    </p>
                    {selectedOrder.productType && (
                      <Badge variant="outline" className="text-[9px] mt-1 px-1.5 py-0">{selectedOrder.productType}</Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedOrder.isBuyer && (
                    <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">🛒 My Order</Badge>
                  )}
                  {selectedOrder.revenueRole?.includes("creator") && (
                    <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">
                      🎨 Creator
                    </Badge>
                  )}
                  {selectedOrder.revenueRole?.includes("voter") && (
                    <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">
                      🗳️ Voter
                    </Badge>
                  )}
                  {!selectedOrder.revenueRole && (
                    <Badge variant="secondary" className="text-[10px]">📦 Standard Order</Badge>
                  )}

                  {selectedOrder.hasRevenue && selectedOrder.myEstimatedRevenue != null && selectedOrder.myEstimatedRevenue > 0 && (
                    <Badge
                      className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px] cursor-pointer hover:bg-green-500/20 transition-colors"
                      onClick={() => setSheetExpanded(true)}
                    >
                      <DollarSign className="h-2.5 w-2.5 mr-0.5" />
                      +{selectedOrder.myEstimatedRevenue.toFixed(4)} SOL
                    </Badge>
                  )}
                </div>

                <button
                  onClick={() => setSheetExpanded(true)}
                  className="flex items-center justify-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors w-full py-1"
                >
                  <span>View Details</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center overflow-hidden">
                      <img src={samuLogoImg} alt="SAMU" className="w-6 h-6 object-contain" />
                    </div>
                    <h3 className="font-semibold text-foreground">Order #{selectedOrder.id}</h3>
                  </div>
                  <button
                    onClick={() => setSheetExpanded(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                  {selectedOrder.goodsImage ? (
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-accent flex-shrink-0">
                      <img src={selectedOrder.goodsImage} alt={selectedOrder.goodsTitle} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="text-2xl flex-shrink-0">{getStatusEmoji(selectedOrder.status)}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{selectedOrder.goodsTitle}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-lg">{getStatusEmoji(selectedOrder.status)}</span>
                      <span className="text-xs text-muted-foreground">{getStatusLabel(selectedOrder.status)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
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
                      <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span>{new Date(selectedOrder.createdAt).toLocaleDateString()}</span>
                    </div>
                    {selectedOrder.trackingNumber && (
                      <div className="flex items-center gap-2 col-span-2">
                        <Truck className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        {selectedOrder.trackingUrl ? (
                          <a
                            href={selectedOrder.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 flex items-center gap-1"
                          >
                            Track Package <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="truncate">{selectedOrder.trackingNumber}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <MapRevenueWidget order={selectedOrder} walletAddress={walletAddress} />
              </div>
            )}
          </div>
        </div>
      )}

      {!isActive && markers.length > 0 && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            🐺 SAMU is traveling across {mapData?.stats.countries || 0} countries worldwide!
          </p>
        </div>
      )}
    </div>
  );
}
