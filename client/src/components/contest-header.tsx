import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

export function ContestHeader() {
  // Mock contest data - in a real app this would come from an API
  const contestData = {
    timeLeft: "2d 14h",
    prizePool: "10,000",
    totalEntries: 47,
    status: "Live"
  };

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-primary flex items-center">
            <Trophy className="h-5 w-5 mr-2" />
            SAMU Meme Contest
          </h1>
          <Badge className="bg-primary text-primary-foreground">
            {contestData.status}
          </Badge>
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
