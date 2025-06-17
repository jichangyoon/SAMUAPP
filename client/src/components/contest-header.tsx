import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ContestHeader() {
  // Mock contest data - in a real app this would come from an API
  const contestData = {
    timeLeft: "2d 14h",
    prizePool: "10,000",
    totalEntries: 47,
    status: "Live"
  };

  return (
    <Card className="samu-card-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-[hsl(201,30%,25%)]">SAMU Meme Contest</h1>
          <Badge className="bg-[hsl(30,100%,50%)] text-white">
            {contestData.status}
          </Badge>
        </div>
        
        <p className="text-gray-600 text-sm mb-3">
          Submit your best SAMU memes and vote using your token holdings. The most voted meme wins!
        </p>
        
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-lg font-bold text-[hsl(201,30%,25%)]">
              {contestData.timeLeft}
            </div>
            <div className="text-xs text-gray-500">Time Left</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-lg font-bold text-[hsl(30,100%,50%)]">
              {contestData.prizePool}
            </div>
            <div className="text-xs text-gray-500">Prize Pool</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-lg font-bold text-[hsl(25,60%,35%)]">
              {contestData.totalEntries}
            </div>
            <div className="text-xs text-gray-500">Entries</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
