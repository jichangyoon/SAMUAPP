import { Suspense, lazy } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SamuMap = lazy(() => import("@/components/samu-map").then(m => ({ default: m.SamuMap })));
const RewardsDashboard = lazy(() => import("@/components/rewards-dashboard").then(m => ({ default: m.RewardsDashboard })));

interface RewardsTabProps {
  walletAddress: string | null | undefined;
}

export function RewardsTab({ walletAddress }: RewardsTabProps) {
  return (
    <Tabs defaultValue="map" className="w-full">
      <TabsList className="grid w-full grid-cols-2 h-10">
        <TabsTrigger value="map" className="text-sm">Map</TabsTrigger>
        <TabsTrigger value="dashboard" className="text-sm">Dashboard</TabsTrigger>
      </TabsList>

      <TabsContent value="map" className="mt-4">
        <Suspense fallback={<div className="min-h-[300px] bg-accent animate-pulse rounded-lg" />}>
          <SamuMap walletAddress={walletAddress} />
        </Suspense>
      </TabsContent>

      <TabsContent value="dashboard" className="mt-4">
        <Suspense fallback={<div className="min-h-[200px]" />}>
          <RewardsDashboard walletAddress={walletAddress || undefined} />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}
