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
import { Play, Square, Archive, Plus, Clock, Trophy, ArrowLeft, Shield, Eye, Ban, Shirt, Package, Image, Loader2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
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
  const [showGoodsCreate, setShowGoodsCreate] = useState(false);
  const [goodsForm, setGoodsForm] = useState({
    title: '', description: '', imageUrl: '', contestId: 0, memeId: 0,
    retailPrice: 29.99, sizes: ['S', 'M', 'L', 'XL', '2XL'], colors: ['Black', 'White']
  });
  const [expandedArchiveId, setExpandedArchiveId] = useState<number | null>(null);

  const { data: goodsList = [] } = useQuery({
    queryKey: ['/api/goods'],
  });

  const createGoodsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/goods/admin/create-simple", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Goods product created!" });
      setShowGoodsCreate(false);
      setGoodsForm({ title: '', description: '', imageUrl: '', contestId: 0, memeId: 0, retailPrice: 29.99, sizes: ['S', 'M', 'L', 'XL', '2XL'], colors: ['Black', 'White'] });
      queryClient.invalidateQueries({ queryKey: ['/api/goods'] });
    },
    onError: (e: any) => {
      toast({ title: "Failed to create goods", description: e.message, variant: "destructive" });
    },
  });

  const [generatingMockupId, setGeneratingMockupId] = useState<number | null>(null);

  const generateMockupMutation = useMutation({
    mutationFn: async (goodsId: number) => {
      setGeneratingMockupId(goodsId);
      const res = await apiRequest("POST", `/api/goods/admin/generate-mockup/${goodsId}`, { adminEmail });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Mockup generated!", description: `${data.mockupUrls?.length || 0} mockup images created` });
      queryClient.invalidateQueries({ queryKey: ['/api/goods'] });
      setGeneratingMockupId(null);
    },
    onError: (e: any) => {
      toast({ title: "Mockup generation failed", description: e.message, variant: "destructive" });
      setGeneratingMockupId(null);
    },
  });

  const createPrintfulGoodsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/goods/admin/create", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Printful product created and synced!" });
      setShowGoodsCreate(false);
      setGoodsForm({ title: '', description: '', imageUrl: '', contestId: 0, memeId: 0, retailPrice: 29.99, sizes: ['S', 'M', 'L', 'XL', '2XL'], colors: ['Black', 'White'] });
      queryClient.invalidateQueries({ queryKey: ['/api/goods'] });
    },
    onError: (e: any) => {
      toast({ title: "Failed to create Printful product", description: e.message, variant: "destructive" });
    },
  });

  const [syncingPrintfulId, setSyncingPrintfulId] = useState<number | null>(null);

  const syncPrintfulMutation = useMutation({
    mutationFn: async (goodsId: number) => {
      setSyncingPrintfulId(goodsId);
      const res = await apiRequest("POST", `/api/goods/admin/sync-printful/${goodsId}`, { adminEmail });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Printful 연동 완료!", description: `Product ID: ${data.printfulProduct?.id}` });
      queryClient.invalidateQueries({ queryKey: ['/api/goods'] });
      setSyncingPrintfulId(null);
    },
    onError: (e: any) => {
      toast({ title: "Printful 연동 실패", description: e.message, variant: "destructive" });
      setSyncingPrintfulId(null);
    },
  });

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

  const expandedContest = archivedContests.find(c => c.id === expandedArchiveId);
  const expandedContestId = expandedContest?.originalContestId;

  const { data: archivedMemesData, isLoading: archivedMemesLoading } = useQuery<{ memes: any[] }>({
    queryKey: ['/api/memes', { contestId: expandedContestId }],
    queryFn: async () => {
      const res = await fetch(`/api/memes?contestId=${expandedContestId}&sortBy=votes`);
      if (!res.ok) throw new Error('Failed to fetch memes');
      return res.json();
    },
    enabled: !!expandedContestId,
  });

  const archivedTopMemes = (archivedMemesData?.memes || []).slice(0, 5);

  const handleMakeGoods = (meme: any, contestId: number) => {
    setGoodsForm({
      title: `${meme.title} Sticker`,
      description: `Kiss-Cut Sticker featuring "${meme.title}" by ${meme.authorUsername}`,
      imageUrl: meme.imageUrl,
      contestId: contestId,
      memeId: meme.id,
      retailPrice: 29.99,
      sizes: ['S', 'M', 'L', 'XL', '2XL'],
      colors: ['Black', 'White'],
    });
    setShowGoodsCreate(true);
    setTimeout(() => {
      document.getElementById('goods-create-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };


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
                {archivedContests.map((contest) => {
                  const isExpanded = expandedArchiveId === contest.id;
                  return (
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

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExpandedArchiveId(isExpanded ? null : contest.id)}
                          className="flex items-center gap-1 text-xs"
                        >
                          <Trophy className="h-3 w-3" />
                          Top Memes
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>

                        {isExpanded && (
                          <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
                            {archivedMemesLoading ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              </div>
                            ) : archivedTopMemes.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-2">No memes found</p>
                            ) : (
                              archivedTopMemes.map((meme: any, idx: number) => (
                                <div key={meme.id} className="flex items-center gap-3 p-2 rounded-lg bg-accent/50">
                                  <span className="text-xs font-bold text-yellow-400 w-5 text-center">
                                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                                  </span>
                                  <img
                                    src={meme.imageUrl}
                                    alt={meme.title}
                                    className="w-10 h-10 object-cover rounded"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-foreground truncate">{meme.title}</div>
                                    <div className="text-xs text-muted-foreground">
                                      by {meme.authorUsername} · {(meme.votes || 0).toLocaleString()} votes
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
                                    onClick={() => handleMakeGoods(meme, contest.originalContestId)}
                                  >
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    Make Goods
                                  </Button>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goods Management */}
        <Card id="goods-create-section" className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shirt className="h-5 w-5" />
              Goods Management ({(goodsList as any[]).length} products)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => setShowGoodsCreate(!showGoodsCreate)}
              className="flex items-center gap-2"
            >
              <Package className="h-4 w-4" />
              {showGoodsCreate ? 'Cancel' : 'Create Sticker Product'}
            </Button>

            {showGoodsCreate && (
              <Card className="border-primary/30">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-foreground">Create Sticker from Meme</h3>
                  <Input
                    placeholder="Product title (e.g., SAMU Sensei Sticker)"
                    value={goodsForm.title}
                    onChange={(e) => setGoodsForm(f => ({ ...f, title: e.target.value }))}
                  />
                  <Textarea
                    placeholder="Product description"
                    value={goodsForm.description}
                    onChange={(e) => setGoodsForm(f => ({ ...f, description: e.target.value }))}
                  />
                  <Input
                    placeholder="Meme image URL (from R2 storage)"
                    value={goodsForm.imageUrl}
                    onChange={(e) => setGoodsForm(f => ({ ...f, imageUrl: e.target.value }))}
                  />
                  {goodsForm.imageUrl && (
                    <img src={goodsForm.imageUrl} alt="Preview" className="w-24 h-24 object-cover rounded" />
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Contest ID</label>
                      <Input
                        type="number"
                        placeholder="Contest ID"
                        value={goodsForm.contestId || ''}
                        onChange={(e) => setGoodsForm(f => ({ ...f, contestId: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Meme ID</label>
                      <Input
                        type="number"
                        placeholder="Meme ID"
                        value={goodsForm.memeId || ''}
                        onChange={(e) => setGoodsForm(f => ({ ...f, memeId: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Retail Price (USD)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={goodsForm.retailPrice}
                      onChange={(e) => setGoodsForm(f => ({ ...f, retailPrice: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Sizes (comma separated)</label>
                      <Input
                        value={goodsForm.sizes.join(', ')}
                        onChange={(e) => setGoodsForm(f => ({ ...f, sizes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Colors (comma separated)</label>
                      <Input
                        value={goodsForm.colors.join(', ')}
                        onChange={(e) => setGoodsForm(f => ({ ...f, colors: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => createGoodsMutation.mutate(goodsForm)}
                      disabled={!goodsForm.title || !goodsForm.imageUrl || createGoodsMutation.isPending}
                      variant="outline"
                    >
                      {createGoodsMutation.isPending ? 'Creating...' : 'Save to DB Only'}
                    </Button>
                    <Button
                      onClick={() => createPrintfulGoodsMutation.mutate(goodsForm)}
                      disabled={!goodsForm.title || !goodsForm.imageUrl || createPrintfulGoodsMutation.isPending}
                    >
                      {createPrintfulGoodsMutation.isPending ? 'Creating on Printful...' : 'Create on Printful + Save'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {(goodsList as any[]).length > 0 && (
              <div className="space-y-2">
                {(goodsList as any[]).map((item: any) => {
                  const hasMockups = item.mockupUrls?.length > 1 || (item.mockupUrls?.length === 1 && item.mockupUrls[0] !== item.imageUrl);
                  return (
                    <Card key={item.id} className="border-border">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center gap-3">
                          <img src={item.mockupUrls?.[0] || item.imageUrl} alt={item.title} className="w-12 h-12 object-cover rounded" />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-foreground truncate">{item.title}</div>
                            <div className="text-xs text-muted-foreground">
                              ${item.retailPrice} | {item.sizes?.join(', ')} | {item.colors?.join(', ')}
                            </div>
                            <div className="text-xs mt-0.5 space-y-0.5">
                              {item.printfulProductId ? (
                                <span className="text-green-400">Printful synced (ID: {item.printfulProductId})</span>
                              ) : (
                                <span className="text-red-400">Not synced to Printful</span>
                              )}
                              <br />
                              {hasMockups ? (
                                <span className="text-green-400">Mockup ready ({item.mockupUrls?.length} images)</span>
                              ) : (
                                <span className="text-yellow-400">No mockup</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>{item.status}</Badge>
                            {!item.printfulProductId && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 border-blue-500/50 text-blue-400"
                                onClick={() => syncPrintfulMutation.mutate(item.id)}
                                disabled={syncingPrintfulId === item.id}
                              >
                                {syncingPrintfulId === item.id ? (
                                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Syncing...</>
                                ) : (
                                  <><Package className="h-3 w-3 mr-1" /> Sync to Printful</>
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => generateMockupMutation.mutate(item.id)}
                              disabled={generatingMockupId === item.id}
                            >
                              {generatingMockupId === item.id ? (
                                <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Generating...</>
                              ) : (
                                <><Image className="h-3 w-3 mr-1" /> {hasMockups ? 'Regenerate' : 'Generate'} Mockup</>
                              )}
                            </Button>
                          </div>
                        </div>
                        {hasMockups && (
                          <div className="flex gap-2 overflow-x-auto py-1">
                            {item.mockupUrls.map((url: string, i: number) => (
                              <img key={i} src={url} alt={`Mockup ${i + 1}`} className="w-16 h-16 object-cover rounded border border-border flex-shrink-0" />
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}