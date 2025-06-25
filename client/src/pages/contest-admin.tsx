import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus } from "lucide-react";
import type { Contest } from "@shared/schema";

export function ContestAdmin() {
  const { toast } = useToast();

  // Get current active contest
  const { data: activeContest } = useQuery<Contest>({
    queryKey: ["/api/admin/current-contest"],
  });

  // Create new contest mutation
  const createNewContestMutation = useMutation({
    mutationFn: async () => {
      const nextContestNumber = await getNextContestNumber();
      return apiRequest("POST", "/api/admin/contests", {
        title: `Contest #${nextContestNumber}`,
        description: `SAMU Meme Contest #${nextContestNumber}`,
        prizePool: "10,000 SAMU",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-contest"] });
      toast({ title: "New contest created successfully" });
    },
    onError: (error) => {
      console.error("Create contest error:", error);
      toast({ title: "Failed to create contest", variant: "destructive" });
    },
  });

  // Start contest mutation
  const startContestMutation = useMutation({
    mutationFn: async (contestId: number) => {
      return apiRequest("POST", `/api/admin/contests/${contestId}/start`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-contest"] });
      toast({ title: "Contest started successfully" });
    },
    onError: (error) => {
      console.error("Start contest error:", error);
      toast({ title: "Failed to start contest", variant: "destructive" });
    },
  });

  async function getNextContestNumber(): Promise<number> {
    const response = await fetch("/api/admin/archived-contests");
    const archivedContests = await response.json();
    return archivedContests.length + 1;
  }

  const hasActiveContest = activeContest && activeContest.status === "active";

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-center">Contest Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Current Contest Status */}
          <div className="text-center">
            {hasActiveContest ? (
              <div className="space-y-2">
                <div className="text-lg font-semibold text-green-400">
                  Contest Active: {activeContest.title}
                </div>
                <div className="text-sm text-muted-foreground">
                  {activeContest.description}
                </div>
                <div className="text-sm text-yellow-400">
                  Prize Pool: {activeContest.prizePool || "TBD"}
                </div>
              </div>
            ) : (
              <div className="text-lg text-muted-foreground">
                No active contest
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {!hasActiveContest && (
              <Button
                onClick={() => createNewContestMutation.mutate()}
                disabled={createNewContestMutation.isPending}
                className="w-full flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {createNewContestMutation.isPending ? "Creating..." : "Create New Contest"}
              </Button>
            )}

            {activeContest && activeContest.status === "draft" && (
              <Button
                onClick={() => startContestMutation.mutate(activeContest.id)}
                disabled={startContestMutation.isPending}
                className="w-full"
              >
                {startContestMutation.isPending ? "Starting..." : "Start Contest"}
              </Button>
            )}
          </div>

          {/* Instructions */}
          <div className="text-sm text-muted-foreground text-center space-y-1">
            <p>Quick contest management:</p>
            <p>• Create new contest when none is active</p>
            <p>• Access full admin panel for advanced controls</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}