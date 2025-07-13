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
    staleTime: 0, // 실시간 업데이트를 위해 캐시 비활성화
  });

  // Fetch current memes count for active contest
  const { data: memesResponse } = useQuery({
    queryKey: ['/api/memes'],
    staleTime: 30 * 1000, // 30초 캐시
  });

  // Calculate entries count based on contest status
  const getCurrentEntriesCount = () => {
    if (!activeContest || activeContest.status !== "active") {
      return 0; // No active contest = 0 entries
    }
    // Active contest: count memes with contestId matching active contest OR null (current contest memes)
    const memes = (memesResponse as any)?.memes || [];
    return memes.filter((meme: any) => 
      meme.contestId === activeContest.id || meme.contestId === null
    ).length;
  };

  // 1초마다 현재 시간 업데이트 (활성 콘테스트가 있을 때만)
  useEffect(() => {
    if (activeContest?.status === "active") {
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [activeContest?.status]);

  const contestData = {
    timeLeft: activeContest?.endTime && activeContest?.status === "active" ? 
      calculateTimeLeft(new Date(activeContest.endTime)) : null,
    prizePool: activeContest?.prizePool || "TBA",
    totalEntries: getCurrentEntriesCount(),
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
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-primary flex items-center min-w-0 flex-1">
            <Trophy className="h-5 w-5 mr-2 flex-shrink-0" />
            <span className="truncate">SAMU Meme Contest</span>
          </h1>
          <Badge className={`${contestData.status === "Live" ? "bg-green-500/20 text-green-400" : 
                            contestData.status === "Not Started" ? "bg-yellow-500/20 text-yellow-400" : 
                            "bg-red-500/20 text-red-400"} flex-shrink-0 ml-2`}>
            {contestData.status}
          </Badge>
        </div>
        
        <p className="text-muted-foreground text-sm mb-4">
          Submit your best SAMU memes and vote with your voting power. The most voted meme wins!
        </p>
        
        {/* Time Left - Only show if contest is active */}
        {contestData.timeLeft && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-2 mb-4 text-center">
            <div className="text-lg font-bold text-green-400">
              {contestData.timeLeft}
            </div>
            <div className="text-xs text-green-300/80">Time Remaining</div>
          </div>
        )}
        
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
