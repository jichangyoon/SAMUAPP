import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Play, Square, Archive, Plus, Clock, Trophy, ArrowLeft, Shield, Eye, Ban, DollarSign } from "lucide-react";
import type { Contest, ArchivedContest } from "@shared/schema";
import { useLocation } from "wouter";
import { IPTrackingPanel } from "@/components/ip-tracking-panel";
import { usePrivy } from "@privy-io/react-auth";

export function Admin() {
  const { user } = usePrivy();
  const adminEmail = user?.email?.address || "";
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showIPTracking, setShowIPTracking] = useState(false);
  const [newContest, setNewContest] = useState({
    title: "",
    description: "",
    prizePool: "",
    durationDays: 7
  });
  const [revenueForm, setRevenueForm] = useState<{ contestId: number | null; source: string; amount: string; description: string }>({
    contestId: null, source: 'goods', amount: '', description: ''
  });
  const [distributingId, setDistributingId] = useState<number | null>(null);

  // Fetch current contests
  const { data: contests = [], isLoading } = useQuery<Contest[]>({
    queryKey: ["/api/admin/contests"],
    staleTime: 0, // Admin 페이지에서는 항상 최신 데이터 필요
    refetchOnMount: true, // 마운트시 재요청
  });

  const { data: archivedContests = [] } = useQuery<ArchivedContest[]>({
    queryKey: ["/api/admin/archived-contests"],
    staleTime: 0,
    refetchOnMount: true,
  });

  const [expandedRevenueContest, setExpandedRevenueContest] = useState<number | null>(null);

  const { data: contestRevenueData } = useQuery({
    queryKey: ['admin-revenue', expandedRevenueContest],
    queryFn: async () => {
      const res = await fetch(`/api/revenue/contest/${expandedRevenueContest}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!expandedRevenueContest,
  });

  // Create contest mutation
  const createContestMutation = useMutation({
    mutationFn: async (contestData: typeof newContest) => {
      return apiRequest("POST", "/api/admin/contests", contestData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contests"] });
      setShowCreateForm(false);
      setNewContest({ title: "", description: "", prizePool: "", durationDays: 7 });
      toast({ title: "Contest created successfully" });
    },
    onError: (error) => {
      // Silent error handling for production
      toast({ title: "Failed to create contest", variant: "destructive" });
    },
  });

  // Start contest mutation
  const startContestMutation = useMutation({
    mutationFn: async (contestId: number) => {
      return apiRequest("POST", `/api/admin/contests/${contestId}/start`);
    },
    onSuccess: async () => {
      // 즉시 모든 관련 캐시 무효화
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/contests"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/current-contest"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/memes"] }),
        queryClient.invalidateQueries({ queryKey: ["samu-balance"] }),
      ]);

      // 중요한 쿼리들 강제 리페치
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["/api/admin/contests"] }),
        queryClient.refetchQueries({ queryKey: ["/api/admin/current-contest"] }),
      ]);

      toast({ title: "Contest started successfully" });
    },
    onError: (error) => {
      // Silent error handling for production
      toast({ title: "Failed to start contest", variant: "destructive" });
    },
  });

  // End contest mutation
  const endContestMutation = useMutation({
    mutationFn: async (contestId: number) => {
      return apiRequest("POST", `/api/admin/contests/${contestId}/end`);
    },
    onSuccess: async () => {
      // 즉시 모든 관련 캐시 무효화
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/contests"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/archived-contests"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/current-contest"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/memes"] }),
        queryClient.invalidateQueries({ queryKey: ["samu-balance"] }),
      ]);

      // 중요한 쿼리들 강제 리페치
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["/api/admin/contests"] }),
        queryClient.refetchQueries({ queryKey: ["/api/admin/archived-contests"] }),
        queryClient.refetchQueries({ queryKey: ["/api/admin/current-contest"] }),
      ]);

      // 1초 후 한번 더 무효화 (서버 DB 업데이트 완료 보장)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/contests"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/archived-contests"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/current-contest"] });
      }, 1000);

      toast({ title: "Contest ended and archived successfully" });
    },
    onError: (error) => {
      // Silent error handling for production
      toast({ title: "Failed to end contest", variant: "destructive" });
    },
  });

  const handleCreateContest = () => {
    if (!newContest.title.trim()) {
      toast({ title: "Please enter a contest title", variant: "destructive" });
      return;
    }
    createContestMutation.mutate(newContest);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-500/20 text-gray-400";
      case "active": return "bg-green-500/20 text-green-400";
      case "ended": return "bg-red-500/20 text-red-400";
      case "archived": return "bg-blue-500/20 text-blue-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative py-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="absolute left-0 top-8 text-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary mb-2">Contest Admin Panel</h1>
            <p className="text-muted-foreground">Manage SAMU meme contests</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2"
            disabled={showCreateForm}
          >
            <Plus className="h-4 w-4" />
            Create Contest
          </Button>
          <Button
            onClick={() => setShowIPTracking(true)}
            variant="outline"
            className="flex items-center gap-2"
            disabled={showIPTracking}
          >
            <Shield className="h-4 w-4" />
            IP Tracking
          </Button>
        </div>

        {/* IP Tracking Section */}
        {showIPTracking && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                IP Tracking & Anti-Fraud
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  onClick={() => setShowIPTracking(false)}
                  variant="outline"
                  className="mb-4"
                >
                  Close IP Tracking
                </Button>
                <IPTrackingPanel />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Contest Section */}
        {showCreateForm && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Contest
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  onClick={() => setShowCreateForm(false)}
                  variant="outline"
                  className="mb-4"
                >
                  Cancel
                </Button>
                <Input
                  placeholder="Contest Title"
                  value={newContest.title}
                  onChange={(e) => setNewContest(prev => ({ ...prev, title: e.target.value }))}
                />
                <Textarea
                  placeholder="Contest Description"
                  value={newContest.description}
                  onChange={(e) => setNewContest(prev => ({ ...prev, description: e.target.value }))}
                />
                <Input
                  placeholder="Prize Pool (optional)"
                  value={newContest.prizePool}
                  onChange={(e) => setNewContest(prev => ({ ...prev, prizePool: e.target.value }))}
                />
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">콘테스트 기간</label>
                  <Select
                    value={newContest.durationDays.toString()}
                    onValueChange={(value) => setNewContest(prev => ({ ...prev, durationDays: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="기간을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1일</SelectItem>
                      <SelectItem value="3">3일</SelectItem>
                      <SelectItem value="7">7일 (1주일)</SelectItem>
                      <SelectItem value="14">14일 (2주일)</SelectItem>
                      <SelectItem value="30">30일 (1달)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    콘테스트는 시작 버튼을 누른 시점부터 선택한 기간 동안 진행됩니다
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleCreateContest} 
                    disabled={createContestMutation.isPending}
                    className="flex-1"
                  >
                    {createContestMutation.isPending ? "Creating..." : "Create Contest"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Contests */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Active Contests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No contests created yet</p>
            ) : (
              <div className="space-y-4">
                {contests.map((contest) => (
                  <Card key={contest.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-foreground">{contest.title}</h3>
                          <p className="text-sm text-muted-foreground">{contest.description}</p>
                        </div>
                        <Badge className={getStatusColor(contest.status)}>
                          {contest.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-muted-foreground">Duration: </span>
                          <span>{contest.durationDays || 7}일</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status: </span>
                          <span>{contest.startTime ? "시작됨" : "시작 대기 중"}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {contest.status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() => startContestMutation.mutate(contest.id)}
                            disabled={startContestMutation.isPending}
                            className="flex items-center gap-1"
                          >
                            <Play className="h-4 w-4" />
                            Start Contest
                          </Button>
                        )}
                        {contest.status === "active" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => endContestMutation.mutate(contest.id)}
                            disabled={endContestMutation.isPending}
                            className="flex items-center gap-1"
                          >
                            <Square className="h-4 w-4" />
                            End Contest
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Archived Contests */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Archived Contests ({archivedContests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {archivedContests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No archived contests yet</p>
            ) : (
              <div className="space-y-4">
                {archivedContests.map((contest) => (
                  <Card key={contest.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-foreground">{contest.title}</h3>
                          <p className="text-sm text-muted-foreground">{contest.description}</p>
                        </div>
                        <Badge className="bg-blue-500/20 text-blue-400">
                          Archived
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">Memes: </span>
                          <span className="font-medium">{contest.totalMemes}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Votes: </span>
                          <span className="font-medium">{contest.totalVotes.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Participants: </span>
                          <span className="font-medium">{contest.totalParticipants}</span>
                        </div>
                      </div>

                      <div className="border-t border-border/50 pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedRevenueContest(expandedRevenueContest === contest.originalContestId ? null : contest.originalContestId)}
                          className="flex items-center gap-1 mb-3"
                        >
                          <DollarSign className="h-3.5 w-3.5" />
                          Revenue Management
                        </Button>

                        {expandedRevenueContest === contest.originalContestId && (
                          <div className="space-y-3">
                            {contestRevenueData?.revenues?.length > 0 && (
                              <div className="space-y-2">
                                {contestRevenueData.revenues.map((rev: any) => (
                                  <div key={rev.id} className="bg-accent/30 rounded p-3 text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-foreground font-medium">{rev.source} — {rev.totalAmountSol} SOL</span>
                                      <Badge className={rev.status === 'distributed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}>
                                        {rev.status}
                                      </Badge>
                                    </div>
                                    {rev.description && <p className="text-xs text-muted-foreground mb-2">{rev.description}</p>}
                                    {rev.status === 'pending' && (
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        disabled={distributingId === rev.id}
                                        onClick={async () => {
                                          setDistributingId(rev.id);
                                          try {
                                            await apiRequest("POST", `/api/revenue/${rev.id}/distribute`, { adminEmail });
                                            toast({ title: "Revenue distributed successfully" });
                                            queryClient.invalidateQueries({ queryKey: ['admin-revenue', contest.originalContestId] });
                                          } catch (e: any) {
                                            toast({ title: "Distribution failed", description: e.message, variant: "destructive" });
                                          } finally {
                                            setDistributingId(null);
                                          }
                                        }}
                                      >
                                        {distributingId === rev.id ? "Distributing..." : "Distribute"}
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="bg-accent/20 rounded p-3 space-y-2">
                              <p className="text-sm font-medium text-foreground">Add Revenue</p>
                              <Select
                                value={revenueForm.contestId === contest.originalContestId ? revenueForm.source : 'goods'}
                                onValueChange={(v) => setRevenueForm({ ...revenueForm, contestId: contest.originalContestId, source: v })}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="goods">Goods</SelectItem>
                                  <SelectItem value="nft_sale">NFT Sale</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                placeholder="Amount (SOL)"
                                type="number"
                                step="0.0001"
                                className="h-8 text-sm"
                                value={revenueForm.contestId === contest.originalContestId ? revenueForm.amount : ''}
                                onChange={(e) => setRevenueForm({ ...revenueForm, contestId: contest.originalContestId, amount: e.target.value })}
                              />
                              <Input
                                placeholder="Description (optional)"
                                className="h-8 text-sm"
                                value={revenueForm.contestId === contest.originalContestId ? revenueForm.description : ''}
                                onChange={(e) => setRevenueForm({ ...revenueForm, contestId: contest.originalContestId, description: e.target.value })}
                              />
                              <Button
                                size="sm"
                                disabled={!revenueForm.amount || revenueForm.contestId !== contest.originalContestId}
                                onClick={async () => {
                                  try {
                                    await apiRequest("POST", "/api/revenue/", {
                                      contestId: contest.originalContestId,
                                      source: revenueForm.source,
                                      description: revenueForm.description,
                                      totalAmountSol: parseFloat(revenueForm.amount),
                                      adminEmail,
                                    });
                                    toast({ title: "Revenue entry created" });
                                    setRevenueForm({ contestId: null, source: 'goods', amount: '', description: '' });
                                    queryClient.invalidateQueries({ queryKey: ['admin-revenue', contest.originalContestId] });
                                  } catch (e: any) {
                                    toast({ title: "Failed to create revenue", description: e.message, variant: "destructive" });
                                  }
                                }}
                              >
                                Create Revenue Entry
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}