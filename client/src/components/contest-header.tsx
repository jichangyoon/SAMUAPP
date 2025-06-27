import { useState, useEffect } from "react";
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
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Check if user is admin - allow authenticated users to access admin panel
  const isAdmin = authenticated;
  
  // Fetch current active contest
  const { data: activeContest } = useQuery<Contest>({
    queryKey: ["/api/admin/current-contest"],
  });

  // 1초마다 현재 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const contestData = {
    timeLeft: activeContest?.endTime ? 
      calculateTimeLeft(new Date(activeContest.endTime)) : "Soon",
    prizePool: activeContest?.prizePool || "TBA",
    totalEntries: 0, // Will be updated with real meme count
    status: activeContest?.status === "active" ? "Live" : 
            activeContest?.status === "draft" ? "Not Started" : "Ended"
  };

  function calculateTimeLeft(endTime: Date): string {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    
    if (diff <= 0) return "Contest Ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (days > 1) return `${days}d ${hours}h`;
    if (days === 1) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
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
        
        <p className="text-muted-foreground text-sm mb-4">
          Submit your best SAMU memes and vote with your voting power. The most voted meme wins!
        </p>
        
        {/* Time Left - Full width at top */}
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 mb-4 text-center">
          <div className="text-lg font-bold text-green-400">
            {contestData.timeLeft}
          </div>
          <div className="text-xs text-green-300/80">Time Remaining</div>
        </div>
        
        {/* Prize Pool and Entries - Bottom row */}
        <div className="grid grid-cols-2 gap-3 text-center">
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
