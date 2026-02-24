import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Shield, Ban, Eye, AlertTriangle } from "lucide-react";

interface SuspiciousIp {
  ipAddress: string;
  walletCount: number;
  wallets: string[];
}

interface SuspiciousDevice {
  deviceId: string;
  walletCount: number;
  wallets: string[];
}

interface RecentLogin {
  id: number;
  walletAddress: string;
  ipAddress: string;
  deviceId?: string;
  loginTime: string;
}

interface BlockedIp {
  id: number;
  ipAddress: string;
  reason: string;
  blockedAt: string;
}

export function IPTrackingPanel() {
  const { toast } = useToast();
  const [blockIpAddress, setBlockIpAddress] = useState("");
  const [blockReason, setBlockReason] = useState("");

  // Fetch suspicious IPs
  const { data: suspiciousIps = [], isLoading: loadingSuspicious } = useQuery<SuspiciousIp[]>({
    queryKey: ["/api/admin/suspicious-ips"],
    staleTime: 30000, // 30초 캐시
  });

  // Fetch suspicious devices
  const { data: suspiciousDevices = [], isLoading: loadingSuspiciousDevices } = useQuery<SuspiciousDevice[]>({
    queryKey: ["/api/admin/suspicious-devices"],
    staleTime: 30000, // 30초 캐시
  });

  // Fetch recent logins
  const { data: recentLogins = [], isLoading: loadingLogins } = useQuery<RecentLogin[]>({
    queryKey: ["/api/admin/recent-logins"],
    staleTime: 30000, // 30초 캐시
  });

  // Fetch blocked IPs
  const { data: blockedIps = [], isLoading: loadingBlocked } = useQuery<BlockedIp[]>({
    queryKey: ["/api/admin/blocked-ips"],
    staleTime: 30000, // 30초 캐시
  });

  // Block IP mutation
  const blockIpMutation = useMutation({
    mutationFn: async (data: { ipAddress: string; reason: string }) => {
      return apiRequest("POST", "/api/admin/block-ip", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blocked-ips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/suspicious-ips"] });
      setBlockIpAddress("");
      setBlockReason("");
      toast({ title: "IP blocked successfully" });
    },
    onError: () => {
      toast({ title: "Failed to block IP", variant: "destructive" });
    },
  });

  // Unblock IP mutation
  const unblockIpMutation = useMutation({
    mutationFn: async (ipAddress: string) => {
      return apiRequest("POST", "/api/admin/unblock-ip", { ipAddress });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blocked-ips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/suspicious-ips"] });
      toast({ title: "IP unblocked successfully" });
    },
    onError: () => {
      toast({ title: "Failed to unblock IP", variant: "destructive" });
    },
  });

  const handleBlockIp = () => {
    if (!blockIpAddress.trim()) {
      toast({ title: "Please enter an IP address", variant: "destructive" });
      return;
    }
    blockIpMutation.mutate({
      ipAddress: blockIpAddress,
      reason: blockReason || "Manually blocked by admin"
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatWalletAddress = (address: string) => {
    return address.slice(0, 6) + '...' + address.slice(-4);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="suspicious" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="suspicious">Suspicious IPs</TabsTrigger>
          <TabsTrigger value="devices">Suspicious Devices</TabsTrigger>
          <TabsTrigger value="recent">Recent Logins</TabsTrigger>
          <TabsTrigger value="blocked">Blocked IPs</TabsTrigger>
          <TabsTrigger value="block">Block IP</TabsTrigger>
        </TabsList>

        <TabsContent value="suspicious" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Suspicious IP Addresses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSuspicious ? (
                <div className="text-center py-4">Loading suspicious IPs...</div>
              ) : suspiciousIps.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No suspicious activity detected today
                </div>
              ) : (
                <div className="space-y-4">
                  {suspiciousIps.map((ip) => (
                    <div key={ip.ipAddress} className="border rounded-lg p-4 bg-orange-50 dark:bg-orange-900/10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{ip.ipAddress}</span>
                          <Badge variant="destructive">
                            {ip.walletCount} wallets
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setBlockIpAddress(ip.ipAddress);
                            setBlockReason(`Suspicious activity: ${ip.walletCount} different wallets`);
                          }}
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Block
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Wallets:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {ip.wallets.map((wallet) => (
                            <Badge key={wallet} variant="outline" className="text-xs">
                              {formatWalletAddress(wallet)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Suspicious Device IDs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSuspiciousDevices ? (
                <div className="text-center py-4">Loading suspicious devices...</div>
              ) : suspiciousDevices.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No suspicious device activity detected today
                </div>
              ) : (
                <div className="space-y-4">
                  {suspiciousDevices.map((device) => (
                    <div key={device.deviceId} className="border rounded-lg p-4 bg-red-50 dark:bg-red-900/10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{device.deviceId}</span>
                          <Badge variant="destructive">
                            {device.walletCount} wallets
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                          }}
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Block Device
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Wallets:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {device.wallets.map((wallet) => (
                            <Badge key={wallet} variant="outline" className="text-xs">
                              {formatWalletAddress(wallet)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Recent Login Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLogins ? (
                <div className="text-center py-4">Loading recent logins...</div>
              ) : recentLogins.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No recent login activity
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {recentLogins.map((login) => (
                    <div key={login.id} className="border rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs">{login.ipAddress}</span>
                          <Badge variant="outline">
                            {formatWalletAddress(login.walletAddress)}
                          </Badge>
                        </div>
                        <span className="text-muted-foreground text-xs">
                          {formatDate(login.loginTime)}
                        </span>
                      </div>
                      {login.deviceId && (
                        <div className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">Device:</span> {login.deviceId}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocked" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-red-500" />
                Blocked IP Addresses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingBlocked ? (
                <div className="text-center py-4">Loading blocked IPs...</div>
              ) : blockedIps.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No blocked IPs
                </div>
              ) : (
                <div className="space-y-4">
                  {blockedIps.map((ip) => (
                    <div key={ip.id} className="border rounded-lg p-4 bg-red-50 dark:bg-red-900/10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{ip.ipAddress}</span>
                          <Badge variant="destructive">Blocked</Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unblockIpMutation.mutate(ip.ipAddress)}
                          disabled={unblockIpMutation.isPending}
                        >
                          Unblock
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div><span className="font-medium">Reason:</span> {ip.reason}</div>
                        <div><span className="font-medium">Blocked:</span> {formatDate(ip.blockedAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="block" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Block IP Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">IP Address</label>
                  <Input
                    placeholder="192.168.1.1"
                    value={blockIpAddress}
                    onChange={(e) => setBlockIpAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reason (Optional)</label>
                  <Input
                    placeholder="Reason for blocking..."
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleBlockIp}
                  disabled={blockIpMutation.isPending}
                  className="w-full"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Block IP Address
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}