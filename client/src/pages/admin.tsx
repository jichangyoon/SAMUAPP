import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Play, Square, Archive, Plus, Clock, Trophy } from "lucide-react";
import type { Contest, ArchivedContest } from "@shared/schema";

export function Admin() {
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newContest, setNewContest] = useState({
    title: "",
    description: "",
    prizePool: "",
    startTime: "",
    endTime: ""
  });

  // Fetch current contests
  const { data: contests = [], isLoading } = useQuery<Contest[]>({
    queryKey: ["/api/admin/contests"],
  });

  // Fetch archived contests
  const { data: archivedContests = [] } = useQuery<ArchivedContest[]>({
    queryKey: ["/api/admin/archived-contests"],
  });

  // Create contest mutation
  const createContestMutation = useMutation({
    mutationFn: async (contestData: typeof newContest) => {
      return apiRequest("/api/admin/contests", {
        method: "POST",
        body: contestData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contests"] });
      setShowCreateForm(false);
      setNewContest({ title: "", description: "", prizePool: "", startTime: "", endTime: "" });
      toast({ title: "Contest created successfully" });
    },
  });

  // Start contest mutation
  const startContestMutation = useMutation({
    mutationFn: async (contestId: number) => {
      return apiRequest(`/api/admin/contests/${contestId}/start`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contests"] });
      toast({ title: "Contest started successfully" });
    },
  });

  // End contest mutation
  const endContestMutation = useMutation({
    mutationFn: async (contestId: number) => {
      return apiRequest(`/api/admin/contests/${contestId}/end`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/archived-contests"] });
      toast({ title: "Contest ended and archived successfully" });
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
        <div className="text-center py-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Contest Admin Panel</h1>
          <p className="text-muted-foreground">Manage SAMU meme contests</p>
        </div>

        {/* Create Contest Section */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Contest
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showCreateForm ? (
              <Button onClick={() => setShowCreateForm(true)} className="w-full">
                Create New Contest
              </Button>
            ) : (
              <div className="space-y-4">
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Start Time (optional)</label>
                    <Input
                      type="datetime-local"
                      value={newContest.startTime}
                      onChange={(e) => setNewContest(prev => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">End Time (optional)</label>
                    <Input
                      type="datetime-local"
                      value={newContest.endTime}
                      onChange={(e) => setNewContest(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
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
            )}
          </CardContent>
        </Card>

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
                          <span className="text-muted-foreground">Start: </span>
                          <span>{contest.startTime ? new Date(contest.startTime).toLocaleString() : "Manual"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">End: </span>
                          <span>{contest.endTime ? new Date(contest.endTime).toLocaleString() : "Manual"}</span>
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
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
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