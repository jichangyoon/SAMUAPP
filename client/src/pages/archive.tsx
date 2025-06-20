import React from "react";
import { WalletConnect } from "@/components/wallet-connect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, Users, TrendingUp } from "lucide-react";

// 과거 밈콘테스트 데이터 (향후 API로 교체 가능)
const pastContests = [
  {
    id: 1,
    title: "1차 SAMU 밈콘테스트",
    period: "2024년 12월",
    status: "완료",
    participants: 156,
    totalVotes: 2340,
    winner: {
      title: "TO THE MOON",
      author: "SamuLover",
      votes: 89
    },
    thumbnailUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjU5RTBCIi8+CjxwYXRoIGQ9Ik0zMiAxNkMyNCAxNiAxNiAyNCAxNiAzMkMxNiA0MCAyNCA0OCAzMiA0OEM0MCA0OCA0OCA0MCA0OCAzMkM0OCAyNCA0MCAxNiAzMiAxNloiIGZpbGw9IiNGRkZGRkYiLz4KPHBhdGggZD0iTTMyIDI0QzI4IDI0IDI0IDI4IDI0IDMyQzI0IDM2IDI4IDQwIDMyIDQwQzM2IDQwIDQwIDM2IDQwIDMyQzQwIDI4IDM2IDI0IDMyIDI0WiIgZmlsbD0iIzAwMDAwMCIvPgo8L3N2Zz4K"
  },
  {
    id: 2,
    title: "2차 SAMU 밈콘테스트",
    period: "2025년 1월",
    status: "진행중",
    participants: 89,
    totalVotes: 1205,
    winner: null,
    thumbnailUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRUY0NDQ0Ii8+CjxwYXRoIGQ9Ik0zMiAxNkMyNCAxNiAxNiAyNCAxNiAzMkMxNiA0MCAyNCA0OCAzMiA0OEM0MCA0OCA0OCA0MCA0OCAzMkM0OCAyNCA0MCAxNiAzMiAxNloiIGZpbGw9IiNGRkZGRkYiLz4KPHBhdGggZD0iTTI4IDI4SDM2VjM2SDI4VjI4WiIgZmlsbD0iIzAwMDAwMCIvPgo8L3N2Zz4K"
  }
];

export default function Archive() {
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Archive className="w-6 h-6 text-yellow-400" />
            <h1 className="text-xl font-bold">아카이브</h1>
          </div>
          <WalletConnect />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold mb-2">과거 밈콘테스트</h2>
            <p className="text-gray-400 text-sm">지금까지 진행된 SAMU 밈콘테스트들</p>
          </div>

          {pastContests.map((contest) => (
            <Card key={contest.id} className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <img 
                      src={contest.thumbnailUrl}
                      alt={contest.title}
                      className="w-8 h-8 rounded"
                    />
                    <span>{contest.title}</span>
                  </CardTitle>
                  <Badge 
                    variant={contest.status === "완료" ? "default" : "secondary"}
                  >
                    {contest.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4 text-sm text-gray-300">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{contest.period}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{contest.participants}명 참여</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>{contest.totalVotes} 투표</span>
                  </div>
                </div>

                {contest.winner && (
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium text-yellow-400">우승작</span>
                    </div>
                    <div className="text-sm">
                      <div className="font-semibold">{contest.winner.title}</div>
                      <div className="text-gray-400">
                        by {contest.winner.author} • {contest.winner.votes} 투표
                      </div>
                    </div>
                  </div>
                )}

                {!contest.winner && contest.status === "진행중" && (
                  <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
                    <div className="text-sm text-yellow-400">
                      현재 진행중인 콘테스트입니다
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {pastContests.length === 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="text-center py-12">
                <Archive size={48} className="text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">아직 완료된 콘테스트가 없습니다</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}