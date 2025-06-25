import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { usePrivy } from "@privy-io/react-auth";
import type { Contest } from "@shared/schema";

export function ContestHeader() {
  const { user, authenticated } = usePrivy();
  
  // Check if user is admin - allow authenticated users to access admin panel
  const isAdmin = authenticated;
  
  // Fetch current active contest
  const { data: activeContest } = useQuery<Contest>({
    queryKey: ["/api/admin/current-contest"],
  });

  const contestData = {
    timeLeft: activeContest?.endTime ? 
      calculateTimeLeft(new Date(activeContest.endTime)) : "Manual Control",
    prizePool: activeContest?.prizePool || "TBD",
    totalEntries: 0, // Will be updated with real meme count
    status: activeContest?.status === "active" ? "Live" : 
            activeContest?.status === "draft" ? "Not Started" : "Ended"
  };

  function calculateTimeLeft(endTime: Date): string {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    
    if (diff <= 0) return "Ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}일 ${hours}시간`;
    if (hours > 0) return `${hours}시간 ${minutes}분`;
    return `${minutes}분`;
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-primary flex items-center">
            <Trophy className="h-5 w-5 mr-2" />
            SAMU Meme Contest
          </h1>
          <div className="flex items-center gap-2">
            <Badge className={`${contestData.status === "Live" ? "bg-green-500/20 text-green-400" : 
                              contestData.status === "Not Started" ? "bg-yellow-500/20 text-yellow-400" : 
                              "bg-red-500/20 text-red-400"}`}>
              {contestData.status}
            </Badge>
          </div>
        </div>
        
        <p className="text-muted-foreground text-sm mb-3">
          Submit your best SAMU memes and vote with your voting power. The most voted meme wins!
        </p>
        
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-accent rounded-lg p-2">
            <div className="text-lg font-bold text-foreground">
              {contestData.timeLeft}
            </div>
            <div className="text-xs text-muted-foreground">Time Left</div>
          </div>
          
          <div className="bg-accent rounded-lg p-2">
            <div className="text-lg font-bold text-primary">
              {contestData.prizePool}
            </div>
            <div className="text-xs text-muted-foreground">Prize Pool</div>
          </div>
          
          <div className="bg-accent rounded-lg p-2">
            <div className="text-lg font-bold text-foreground">
              {contestData.totalEntries}
            </div>
            <div className="text-xs text-muted-foreground">Entries</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
