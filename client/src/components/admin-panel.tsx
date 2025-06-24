import { useState } from "react";
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

  const walletAddress = user?.linkedAccounts?.find(
    account => account.type === 'wallet' && account.chainType === 'solana'
  )?.address;

  console.log('AdminPanel - isOpen:', isOpen, 'walletAddress:', walletAddress);

  // Check admin status
  const { data: adminData } = useQuery({
    queryKey: ['/api/users/admin/check', walletAddress],
    enabled: !!walletAddress,
  });

  console.log('AdminPanel - adminData:', adminData);

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
      return apiRequest(`/api/users/admin/contests`, {
        method: 'POST',
        body: JSON.stringify({
          ...contestData,
          createdBy: walletAddress
        })
      });
    },
    onSuccess: () => {
      toast({ title: "Contest created successfully" });
      setNewContest({ title: "", description: "", startDate: "", endDate: "" });
      queryClient.invalidateQueries({ queryKey: ['/api/users/admin/contests'] });
    },
    onError: () => {
      toast({ title: "Failed to create contest", variant: "destructive" });
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

  console.log('AdminPanel render check:', { isOpen, walletAddress, adminData });

  if (!isOpen) return null;

  // 디버깅을 위해 임시로 관리자 체크 비활성화
  // if (!adminData?.isAdmin) {
  //   return (
  //     <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  //       <Card className="w-96 mx-4">
  //         <CardHeader>
  //           <CardTitle className="flex items-center gap-2">
  //             <Settings className="h-5 w-5" />
  //             Admin Access Required
  //           </CardTitle>
  //         </CardHeader>
  //         <CardContent>
  //           <p className="text-muted-foreground mb-4">
  //             You need admin privileges to access this panel.
  //           </p>
  //           <Button onClick={onClose} className="w-full">
  //             Close
  //           </Button>
  //         </CardContent>
  //       </Card>
  //     </div>
  //   );
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
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newContest.description}
                    onChange={(e) => setNewContest(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Contest description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={newContest.startDate}
                      onChange={(e) => setNewContest(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={newContest.endDate}
                      onChange={(e) => setNewContest(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>
                <Button 
                  onClick={() => createContestMutation.mutate(newContest)}
                  disabled={createContestMutation.isPending || !newContest.title}
                  className="w-full"
                >
                  Create Contest
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