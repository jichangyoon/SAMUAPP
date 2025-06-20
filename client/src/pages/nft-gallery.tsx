import React from "react";
import { WalletConnect } from "@/components/wallet-connect";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Image, Trophy, ExternalLink, Info } from "lucide-react";

export default function NFTGallery() {
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Image className="w-6 h-6 text-yellow-400" />
            <h1 className="text-xl font-bold">NFT 전시관</h1>
          </div>
          <WalletConnect />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="space-y-6">
          {/* Info Section */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-2">SAMU NFT 컬렉션</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    SAMU는 현재 164장의 Compressed NFT를 보유하고 있으며, 
                    밈콘테스트 우승작들을 NFT 컬렉션에 추가할 예정입니다.
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-400">
                    <span>• 기존 NFT: 164장</span>
                    <span>• 형태: Compressed NFT</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Status */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="text-center py-8">
                <div className="mb-4">
                  <Image className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">전시관 준비중</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    NFT 전시 시스템을 구현하고 있습니다
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">기존 NFT 컬렉션 연동</span>
                      <Badge variant="secondary" className="bg-yellow-600">예정</Badge>
                    </div>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">우승작 NFT 민팅</span>
                      <Badge variant="secondary" className="bg-yellow-600">예정</Badge>
                    </div>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">갤러리 뷰어</span>
                      <Badge variant="secondary" className="bg-yellow-600">개발중</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Future Features */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span>예정된 기능</span>
              </h3>
              
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span>기존 164장 NFT 갤러리 뷰</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span>밈콘테스트 우승작 NFT 변환</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span>NFT 상세 정보 및 메타데이터</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span>Solana 익스플로러 연동</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}