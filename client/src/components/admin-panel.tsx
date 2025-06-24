import { useState } from "react";
import * as React from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Settings, Play, Square, Archive } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Contest {
  id: number;
  title: string;
  description: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdBy: string;
  createdAt: string;
  archivedAt: string | null;
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const { user } = usePrivy();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newContest, setNewContest] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: ""
  });

  // 시작 시간 관리
  const [customTime, setCustomTime] = useState(() => {
    const now = new Date();
    const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
    return {
      month: kst.getMonth() + 1,
      day: kst.getDate(),
      hour: kst.getHours(),
      minute: kst.getMinutes()
    };
  });

  // 종료 시간 관리
  const [endTime, setEndTime] = useState(() => {
    const now = new Date();
    const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000) + (7 * 24 * 60 * 60 * 1000)); // UTC+9, 7일 후
    return {
      month: kst.getMonth() + 1,
      day: kst.getDate(),
      hour: kst.getHours(),
      minute: kst.getMinutes()
    };
  });

  // 시작 시간 업데이트 함수
  const updateStartTime = (field: string, value: number) => {
    setCustomTime(prev => {
      const updated = { ...prev, [field]: value };
      updateContestDates(updated, endTime);
      return updated;
    });
  };

  // 종료 시간 업데이트 함수
  const updateEndTime = (field: string, value: number) => {
    setEndTime(prev => {
      const updated = { ...prev, [field]: value };
      updateContestDates(customTime, updated);
      return updated;
    });
  };

  // 콘테스트 날짜 업데이트
  const updateContestDates = (start: any, end: any) => {
    // 시작 날짜/시간 계산 (한국 시간)
    const startKST = new Date(2025, start.month - 1, start.day, start.hour, start.minute);
    const endKST = new Date(2025, end.month - 1, end.day, end.hour, end.minute);
    
    // UTC로 변환
    const startUTC = new Date(startKST.getTime() - (9 * 60 * 60 * 1000));
    const endUTC = new Date(endKST.getTime() - (9 * 60 * 60 * 1000));
    
    // ISO 형식으로 변환
    const startISO = startUTC.toISOString().slice(0, 16);
    const endISO = endUTC.toISOString().slice(0, 16);
    
    setNewContest(prev => ({
      ...prev,
      startDate: startISO,
      endDate: endISO
    }));
  };

  // 초기 시간 설정
  React.useEffect(() => {
    updateContestDates(customTime, endTime);
  }, []);

  // 현재 선택된 시간을 한국 시간으로 표시
  const getKSTDisplay = () => {
    if (!newContest.startDate || !newContest.endDate) return '';
    
    const startUTC = new Date(newContest.startDate);
    const endUTC = new Date(newContest.endDate);
    const startKST = new Date(startUTC.getTime() + (9 * 60 * 60 * 1000));
    const endKST = new Date(endUTC.getTime() + (9 * 60 * 60 * 1000));
    
    return `${startKST.toLocaleString('ko-KR')} ~ ${endKST.toLocaleString('ko-KR')}`;
  };

  const walletAddress = user?.linkedAccounts?.find(
    account => account.type === 'wallet' && account.chainType === 'solana'
  )?.address;

  // Check admin status
  const { data: adminData } = useQuery({
    queryKey: ['/api/users/admin/check', walletAddress],
    enabled: !!walletAddress,
  });

  // Get current contest
  const { data: currentContestData } = useQuery({
    queryKey: ['/api/users/admin/contests/current'],
    enabled: adminData?.isAdmin,
  });

  // Get all contests
  const { data: contestsData } = useQuery({
    queryKey: ['/api/users/admin/contests'],
    enabled: adminData?.isAdmin,
  });

  // Create contest mutation
  const createContestMutation = useMutation({
    mutationFn: async (contestData: any) => {
      const response = await apiRequest(`/api/users/admin/contests`, {
        method: 'POST',
        body: JSON.stringify({
          ...contestData,
          createdBy: walletAddress
        })
      });
      
      // 생성 후 바로 시작
      if (response.contest) {
        await apiRequest(`/api/users/admin/contests/${response.contest.id}/start`, {
          method: 'POST',
          body: JSON.stringify({ userWallet: walletAddress })
        });
      }
      
      return response;
    },
    onSuccess: () => {
      toast({ 
        title: "Contest started successfully!",
        description: "New contest is now live and accepting submissions"
      });
      setNewContest({ title: "", description: "", startDate: "", endDate: "" });
      queryClient.invalidateQueries({ queryKey: ['/api/users/admin/contests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/admin/contests/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/memes'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to start contest", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    }
  });

  // Start contest mutation
  const startContestMutation = useMutation({
    mutationFn: async (contestId: number) => {
      return apiRequest(`/api/users/admin/contests/${contestId}/start`, {
        method: 'POST',
        body: JSON.stringify({ userWallet: walletAddress })
      });
    },
    onSuccess: () => {
      toast({ title: "Contest started successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/users/admin/contests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/admin/contests/current'] });
    },
    onError: () => {
      toast({ title: "Failed to start contest", variant: "destructive" });
    }
  });

  // End contest mutation
  const endContestMutation = useMutation({
    mutationFn: async (contestId: number) => {
      return apiRequest(`/api/users/admin/contests/${contestId}/end`, {
        method: 'POST',
        body: JSON.stringify({ userWallet: walletAddress })
      });
    },
    onSuccess: (data) => {
      toast({ 
        title: "Contest ended successfully", 
        description: `${data.archivedCount} memes archived`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users/admin/contests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/admin/contests/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/memes'] });
    },
    onError: () => {
      toast({ title: "Failed to end contest", variant: "destructive" });
    }
  });

  if (!isOpen) return null;

  // 임시로 모든 사용자에게 Admin 패널 표시
  console.log('AdminPanel Debug:', { isOpen, walletAddress, adminData });
  
  // if (!adminData?.isAdmin) {
  //   return null; // 관리자가 아니면 아무것도 렌더링하지 않음
  // }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4">
      <div className="bg-background border border-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Contest Admin Panel
            </h2>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Contest Status */}
            <Card>
              <CardHeader>
                <CardTitle>Current Contest</CardTitle>
              </CardHeader>
              <CardContent>
                {currentContestData?.contest ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold">{currentContestData.contest.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {currentContestData.contest.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Active</Badge>
                      <span className="text-sm text-muted-foreground">
                        Started: {new Date(currentContestData.contest.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    <Button 
                      onClick={() => endContestMutation.mutate(currentContestData.contest.id)}
                      disabled={endContestMutation.isPending}
                      variant="destructive"
                      className="w-full"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      End Contest & Archive
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No active contest</p>
                )}
              </CardContent>
            </Card>

            {/* Create New Contest */}
            <Card>
              <CardHeader>
                <CardTitle>Create New Contest</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Contest Title</Label>
                  <Input
                    id="title"
                    value={newContest.title}
                    onChange={(e) => setNewContest(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter contest title"
                    className="text-base"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newContest.description}
                    onChange={(e) => setNewContest(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Contest description"
                    rows={2}
                    className="text-base"
                  />
                </div>

                {/* Duration Selection */}
                <div className="space-y-3">
                  <Label>Contest Duration</Label>
                  <div className="grid grid-cols-1 gap-2">
                    <Button 
                      type="button"
                      onClick={() => {
                        const start = customTime;
                        const endKst = new Date(2025, start.month - 1, start.day + 1, start.hour, start.minute);
                        setEndTime({
                          month: endKst.getMonth() + 1,
                          day: endKst.getDate(),
                          hour: endKst.getHours(),
                          minute: endKst.getMinutes()
                        });
                      }}
                      variant="outline"
                      className="justify-start text-left"
                    >
                      📅 24시간 (하루)
                    </Button>
                    
                    <Button 
                      type="button"
                      onClick={() => {
                        const start = customTime;
                        const endKst = new Date(2025, start.month - 1, start.day + 3, start.hour, start.minute);
                        setEndTime({
                          month: endKst.getMonth() + 1,
                          day: endKst.getDate(),
                          hour: endKst.getHours(),
                          minute: endKst.getMinutes()
                        });
                      }}
                      variant="outline"
                      className="justify-start text-left"
                    >
                      📅 3일 (72시간)
                    </Button>
                    
                    <Button 
                      type="button"
                      onClick={() => {
                        const start = customTime;
                        const endKst = new Date(2025, start.month - 1, start.day + 7, start.hour, start.minute);
                        setEndTime({
                          month: endKst.getMonth() + 1,
                          day: endKst.getDate(),
                          hour: endKst.getHours(),
                          minute: endKst.getMinutes()
                        });
                      }}
                      variant="outline"
                      className="justify-start text-left"
                    >
                      📅 1주일 (7일)
                    </Button>
                  </div>
                </div>

                {/* Start Time Picker */}
                <div className="space-y-4">
                  <Label>시작 시간 설정 (한국시간)</Label>
                  <div className="grid grid-cols-4 gap-2 p-4 border rounded-lg bg-accent/20">
                    {/* Month */}
                    <div className="text-center">
                      <label className="text-xs font-medium">월</label>
                      <select 
                        value={customTime.month}
                        onChange={(e) => updateStartTime('month', parseInt(e.target.value))}
                        className="w-full h-12 text-center border rounded bg-background"
                      >
                        {Array.from({length: 12}, (_, i) => (
                          <option key={i+1} value={i+1}>{i+1}월</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Day */}
                    <div className="text-center">
                      <label className="text-xs font-medium">일</label>
                      <select 
                        value={customTime.day}
                        onChange={(e) => updateStartTime('day', parseInt(e.target.value))}
                        className="w-full h-12 text-center border rounded bg-background"
                      >
                        {Array.from({length: 31}, (_, i) => (
                          <option key={i+1} value={i+1}>{i+1}일</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Hour */}
                    <div className="text-center">
                      <label className="text-xs font-medium">시</label>
                      <select 
                        value={customTime.hour}
                        onChange={(e) => updateStartTime('hour', parseInt(e.target.value))}
                        className="w-full h-12 text-center border rounded bg-background"
                      >
                        {Array.from({length: 24}, (_, i) => (
                          <option key={i} value={i}>{i.toString().padStart(2, '0')}시</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Minute */}
                    <div className="text-center">
                      <label className="text-xs font-medium">분</label>
                      <select 
                        value={customTime.minute}
                        onChange={(e) => updateStartTime('minute', parseInt(e.target.value))}
                        className="w-full h-12 text-center border rounded bg-background"
                      >
                        {Array.from({length: 60}, (_, i) => (
                          <option key={i} value={i}>{i.toString().padStart(2, '0')}분</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* End Time Picker */}
                <div className="space-y-4">
                  <Label>종료 시간 설정 (한국시간)</Label>
                  <div className="grid grid-cols-4 gap-2 p-4 border rounded-lg bg-accent/20">
                    {/* Month */}
                    <div className="text-center">
                      <label className="text-xs font-medium">월</label>
                      <select 
                        value={endTime.month}
                        onChange={(e) => updateEndTime('month', parseInt(e.target.value))}
                        className="w-full h-12 text-center border rounded bg-background"
                      >
                        {Array.from({length: 12}, (_, i) => (
                          <option key={i+1} value={i+1}>{i+1}월</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Day */}
                    <div className="text-center">
                      <label className="text-xs font-medium">일</label>
                      <select 
                        value={endTime.day}
                        onChange={(e) => updateEndTime('day', parseInt(e.target.value))}
                        className="w-full h-12 text-center border rounded bg-background"
                      >
                        {Array.from({length: 31}, (_, i) => (
                          <option key={i+1} value={i+1}>{i+1}일</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Hour */}
                    <div className="text-center">
                      <label className="text-xs font-medium">시</label>
                      <select 
                        value={endTime.hour}
                        onChange={(e) => updateEndTime('hour', parseInt(e.target.value))}
                        className="w-full h-12 text-center border rounded bg-background"
                      >
                        {Array.from({length: 24}, (_, i) => (
                          <option key={i} value={i}>{i.toString().padStart(2, '0')}시</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Minute */}
                    <div className="text-center">
                      <label className="text-xs font-medium">분</label>
                      <select 
                        value={endTime.minute}
                        onChange={(e) => updateEndTime('minute', parseInt(e.target.value))}
                        className="w-full h-12 text-center border rounded bg-background"
                      >
                        {Array.from({length: 60}, (_, i) => (
                          <option key={i} value={i}>{i.toString().padStart(2, '0')}분</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Quick Test Buttons */}
                <div className="space-y-2">
                  <Label>빠른 테스트</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
                        const endKst = new Date(kst.getTime() + 60 * 1000); // 1분 후
                        
                        setCustomTime({
                          month: kst.getMonth() + 1,
                          day: kst.getDate(),
                          hour: kst.getHours(),
                          minute: kst.getMinutes()
                        });
                        
                        setEndTime({
                          month: endKst.getMonth() + 1,
                          day: endKst.getDate(),
                          hour: endKst.getHours(),
                          minute: endKst.getMinutes()
                        });
                      }}
                      variant="outline"
                      size="sm"
                    >
                      ⚡ 1분 테스트
                    </Button>
                    
                    <Button 
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
                        const endKst = new Date(kst.getTime() + 5 * 60 * 1000); // 5분 후
                        
                        setCustomTime({
                          month: kst.getMonth() + 1,
                          day: kst.getDate(),
                          hour: kst.getHours(),
                          minute: kst.getMinutes()
                        });
                        
                        setEndTime({
                          month: endKst.getMonth() + 1,
                          day: endKst.getDate(),
                          hour: endKst.getHours(),
                          minute: endKst.getMinutes()
                        });
                      }}
                      variant="outline"
                      size="sm"
                    >
                      🔄 5분 테스트
                    </Button>
                  </div>
                </div>

                {newContest.startDate && newContest.endDate && (
                  <div className="text-sm text-muted-foreground p-3 bg-accent rounded">
                    <div className="font-medium text-center">콘테스트 일정 (한국시간)</div>
                    <div className="text-center mt-1">{getKSTDisplay()}</div>
                  </div>
                )}
                
                <Button 
                  onClick={() => createContestMutation.mutate(newContest)}
                  disabled={createContestMutation.isPending || !newContest.title || !newContest.startDate || !newContest.endDate}
                  className="w-full"
                  size="lg"
                >
                  {createContestMutation.isPending ? "Creating..." : "🚀 Create & Start Contest"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* All Contests */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>All Contests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contestsData?.contests?.map((contest: Contest) => (
                  <div key={contest.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-semibold">{contest.title}</h4>
                      <p className="text-sm text-muted-foreground">{contest.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={
                          contest.status === 'active' ? 'default' :
                          contest.status === 'archived' ? 'secondary' : 'outline'
                        }>
                          {contest.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Created: {new Date(contest.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {contest.status === 'draft' && (
                        <Button 
                          onClick={() => startContestMutation.mutate(contest.id)}
                          disabled={startContestMutation.isPending}
                          size="sm"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      )}
                      {contest.status === 'active' && (
                        <Button 
                          onClick={() => endContestMutation.mutate(contest.id)}
                          disabled={endContestMutation.isPending}
                          variant="destructive"
                          size="sm"
                        >
                          <Square className="h-4 w-4 mr-1" />
                          End
                        </Button>
                      )}
                      {contest.status === 'archived' && (
                        <Badge variant="secondary">
                          <Archive className="h-3 w-3 mr-1" />
                          Archived
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}