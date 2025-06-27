import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Trophy, TrendingUp, Calendar, Copy, X } from "lucide-react";
import { MemeDetailModal } from "@/components/meme-detail-modal";
import { MediaDisplay } from "@/components/media-display";
import { useToast } from "@/hooks/use-toast";
import type { Meme } from "@shared/schema";

interface UserInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  username: string;
}

export function UserInfoModal({ isOpen, onClose, walletAddress, username }: UserInfoModalProps) {
  const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null);
  const [showMemeModal, setShowMemeModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const { toast } = useToast();

  const showStatsToast = (statType: string, description: string) => {
    toast({
      title: statType,
      description: description,
      duration: 2000,
    });
  };
  const { data: userProfile } = useQuery({
    queryKey: [`/api/users/profile/${walletAddress}`],
    enabled: isOpen && !!walletAddress,
  });

  const { data: userMemes = [] } = useQuery({
    queryKey: [`/api/users/${walletAddress}/memes`],
    enabled: isOpen && !!walletAddress,
  });

  const { data: userStats } = useQuery({
    queryKey: [`/api/users/${walletAddress}/stats`],
    enabled: isOpen && !!walletAddress,
  });

  const { data: userVotes = [] } = useQuery({
    queryKey: [`/api/users/${walletAddress}/votes`],
    enabled: isOpen && !!walletAddress,
  });

  const totalVotes = userMemes.reduce((sum: number, meme: any) => sum + meme.votes, 0);
  const averageVotes = userMemes.length > 0 ? Math.round(totalVotes / userMemes.length) : 0;

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="h-[92vh] bg-black text-white border-gray-800">
        <DrawerHeader className="border-b border-gray-800 pb-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => userProfile?.avatarUrl && setShowAvatarModal(true)}
              className="cursor-pointer"
              disabled={!userProfile?.avatarUrl}
            >
              <Avatar className="h-16 w-16">
                <AvatarImage 
                  src={userProfile?.avatarUrl} 
                  alt={userProfile?.displayName || username}
                  key={userProfile?.avatarUrl}
                />
                <AvatarFallback className="bg-gray-800 text-white">
                  {(userProfile?.displayName || username)?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
            <div className="min-w-0">
              <DrawerTitle className="text-xl font-bold text-white">
                {userProfile?.displayName || username}
              </DrawerTitle>
              <div className="flex items-center gap-2 mt-1">
                <DrawerDescription className="text-gray-400 font-mono text-sm">
                  {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                </DrawerDescription>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(walletAddress);
                    toast({
                      title: "Copied!",
                      description: "Wallet address copied to clipboard.",
                    });
                  }}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card 
              className="bg-gray-900 border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors"
              onClick={() => showStatsToast("Memes Created", "전체 제출한 밈의 개수입니다. 각 밈은 투표를 받아 점수를 얻을 수 있습니다.")}
            >
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="text-2xl font-bold text-white">{userMemes.length}</div>
                <div className="text-sm text-gray-400">Memes Created</div>
              </CardContent>
            </Card>

            <Card 
              className="bg-gray-900 border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors"
              onClick={() => showStatsToast("Total Votes", "이 사용자의 모든 밈이 받은 총 투표 수입니다. 높을수록 인기가 많다는 뜻입니다.")}
            >
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                </div>
                <div className="text-2xl font-bold text-white">{totalVotes}</div>
                <div className="text-sm text-gray-400">Total Votes</div>
              </CardContent>
            </Card>

            <Card 
              className="bg-gray-900 border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors"
              onClick={() => showStatsToast("Votes Cast", "이 사용자가 다른 밈에 투표한 총 횟수입니다. 활발한 참여도를 나타냅니다.")}
            >
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <User className="h-5 w-5 text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-white">{userVotes.length}</div>
                <div className="text-sm text-gray-400">Votes Cast</div>
              </CardContent>
            </Card>

            <Card 
              className="bg-gray-900 border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors"
              onClick={() => showStatsToast("Avg Votes", "밈 하나당 평균적으로 받은 투표 수입니다. 일관성 있는 품질을 나타냅니다.")}
            >
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Calendar className="h-5 w-5 text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-white">{averageVotes}</div>
                <div className="text-sm text-gray-400">Avg Votes</div>
              </CardContent>
            </Card>
          </div>

          {/* User's Memes */}
          {userMemes.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Created Memes</h3>
              <div className="grid grid-cols-3 gap-2">
                {userMemes.map((meme: any) => (
                  <div 
                    key={meme.id} 
                    className="relative hover:opacity-80 transition-opacity"
                  >
                    <MediaDisplay
                      src={meme.imageUrl}
                      alt={meme.title}
                      className="w-full aspect-square object-cover rounded-lg"
                      showControls={false}
                      onClick={() => {
                        setSelectedMeme(meme);
                        setShowMemeModal(true);
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white p-2 rounded-b-lg">
                      <div className="text-xs font-medium truncate">{meme.title}</div>
                      <div className="text-xs text-gray-300">{meme.votes} votes</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {userVotes.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Recent Votes</h3>
              <div className="space-y-2">
                {userVotes.slice(0, 5).map((vote: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-800">
                    <div className="text-sm text-gray-300">
                      Voted on meme #{vote.memeId}
                    </div>
                    <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                      {vote.votingPower} power
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DrawerContent>

      {/* Meme Detail Modal */}
      {selectedMeme && (
        <MemeDetailModal
          isOpen={showMemeModal}
          onClose={() => setShowMemeModal(false)}
          meme={selectedMeme}
        />
      )}

      {/* Avatar Full View Modal */}
      <Drawer open={showAvatarModal} onOpenChange={setShowAvatarModal}>
        <DrawerContent className="h-[92vh] bg-black text-white border-gray-800">
          <DrawerHeader className="border-b border-gray-800 pb-4">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-xl font-bold text-white">
                Profile Picture
              </DrawerTitle>
              <Button
                onClick={() => setShowAvatarModal(false)}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </DrawerHeader>

          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
              <img 
                src={userProfile?.avatarUrl} 
                alt={userProfile?.displayName || username}
                className="w-full h-auto rounded-lg"
                style={{ maxHeight: '70vh', objectFit: 'contain' }}
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </Drawer>
  );
}