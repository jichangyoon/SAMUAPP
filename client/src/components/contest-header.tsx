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
    <div className="contest-header-container relative">
      {/* Background cards for stacked effect */}
      <div className="absolute inset-0 bg-gray-800 border border-gray-600 rounded-lg transform translate-x-2 translate-y-2"></div>
      <div className="absolute inset-0 bg-gray-700 border border-gray-500 rounded-lg transform translate-x-1 translate-y-1"></div>
      
      {/* Main card */}
      <Card className="relative border-gray-400 bg-gray-900 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-yellow-400">SAMU Meme Contest</h1>
            <Badge className="bg-yellow-600 text-black">
              {contestData.status}
            </Badge>
          </div>
          
          <p className="text-gray-300 text-sm mb-3">
            Submit your best SAMU memes and vote with your voting power. The most voted meme wins!
          </p>
          
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-800 rounded-lg p-2 border border-gray-600">
              <div className="text-lg font-bold text-white">
                {contestData.timeLeft}
              </div>
              <div className="text-xs text-gray-400">Time Left</div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-2 border border-gray-600">
              <div className="text-lg font-bold text-yellow-400">
                {contestData.prizePool}
              </div>
              <div className="text-xs text-gray-400">Prize Pool</div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-2 border border-gray-600">
              <div className="text-lg font-bold text-white">
                {contestData.totalEntries}
              </div>
              <div className="text-xs text-gray-400">Entries</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
