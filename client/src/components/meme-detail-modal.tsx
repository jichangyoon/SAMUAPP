import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowUp, Share2, Twitter, Send, Calendar, Trophy, ChevronDown, ChevronUp, Users, Loader2 } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MediaDisplay } from "@/components/media-display";
import { ImageCarousel } from "@/components/image-carousel";
import { UserInfoModal } from "@/components/user-info-modal";
import { NativeShare } from "@/utils/native-share";
import type { Meme } from "@shared/schema";

interface MemeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  meme: Meme;
  onVote?: () => void;
  canVote?: boolean;
}

// 특정 유저들에게 다른 역할 부여
const getUserRole = (walletAddress: string, username: string) => {
  // 지갑 주소 기반 역할 설정
  const specialRoles: { [key: string]: string } = {
    // Dev 역할 - 개발자들
    'xfSWSv7y3SqELDe8Xs5neNCmjULpc6hwhvz5ohSrXa8': 'Dev',
    
    // Admin 역할
    // 'admin_wallet_address': 'Admin',
    
    // Moderator 역할 - 운영진들  
    // 'mod_wallet_address_1': 'Moderator',
    // 'mod_wallet_address_2': 'Moderator',
  };

  // 유저명 기반 역할 설정
  const specialUsernames: { [key: string]: string } = {
    // 예시: 특정 유저명에 역할 부여
    // 'admin_user': 'Admin',
    // 'dev_user': 'Dev', 
    // 'mod_user': 'Moderator',
  };

  // 지갑 주소 우선 확인
  if (specialRoles[walletAddress]) {
    return specialRoles[walletAddress];
  }

  // 유저명 확인
  if (specialUsernames[username]) {
    return specialUsernames[username];
  }

  // 기본값
  return 'Creator';
};

interface Voter {
  walletAddress: string;
  username: string;
  avatarUrl: string | null;
  totalSamu: number;
  votedAt: string;
}

export function MemeDetailModal({ isOpen, onClose, meme, onVote, canVote = false }: MemeDetailModalProps) {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showVoters, setShowVoters] = useState(false);
  const [selectedVoterWallet, setSelectedVoterWallet] = useState<string | null>(null);
  const [selectedVoterName, setSelectedVoterName] = useState<string>("");

  const { data: votersData, isLoading: votersLoading, isError: votersError, refetch: refetchVoters } = useQuery<{ voters: Voter[]; totalVoters: number }>({
    queryKey: [`/api/memes/${meme.id}/voters`],
    enabled: isOpen && showVoters,
    staleTime: 30000,
  });



  const shareToTwitter = () => {
    // Use production URL for Blinks
    const baseUrl = 'https://samu.ink';
    const blinksUrl = `https://dial.to/?action=solana-action:${baseUrl}/api/actions/vote/${meme.id}`;
    const text = `Vote for "${meme.title}" on SAMU Meme Contest! 🔥 #SAMU #Blinks`;
    NativeShare.shareToTwitter(text, blinksUrl);
  };

  const shareToTelegram = () => {
    const text = `Check out this awesome meme: "${meme.title}" by ${meme.authorUsername}`;
    NativeShare.shareToTelegram(text);
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90dvh] bg-black text-white border-gray-800">
        <DrawerHeader className="border-b border-gray-800 pb-4">
          <DrawerTitle className="text-xl font-bold text-white">
            {meme.title}
          </DrawerTitle>
          <DrawerDescription className="text-gray-400">
            {meme.description || "Check out this meme"}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Meme Media */}
          <div className="w-full max-w-md mx-auto">
            <ImageCarousel
              images={[meme.imageUrl, ...(meme.additionalImages || [])]}
              alt={meme.title}
              className="w-full rounded-lg overflow-hidden"
              instagramMode={true}
              containMode={true}
            />
          </div>

          {/* Meme Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    src={(meme as any).authorAvatarUrl} 
                    alt={meme.authorUsername}
                    key={`${meme.id}-${(meme as any).authorAvatarUrl}`}
                  />
                  <AvatarFallback className="bg-gray-700 text-white">
                    {meme.authorUsername.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <button 
                    onClick={() => setShowUserModal(true)}
                    className="font-semibold text-white cursor-pointer text-left"
                  >
                    {meme.authorUsername}
                  </button>
                  <div className="text-sm text-gray-400">{getUserRole(meme.authorWallet, meme.authorUsername)}</div>
                </div>
              </div>
              <button
                onClick={() => setShowVoters(!showVoters)}
                className="text-right cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-1 text-yellow-400">
                  <Trophy className="h-4 w-4" />
                  <span className="font-bold">{meme.votes.toLocaleString()}</span>
                  {showVoters ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                </div>
                <div className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                  <Users className="h-3 w-3" />
                  <span>Tap to see voters</span>
                </div>
              </button>
            </div>

            {showVoters && (
              <div className="bg-gray-900/50 rounded-lg border border-gray-800 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-800 flex items-center gap-2">
                  <Users className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm font-semibold text-white">Voters</span>
                  {votersData && (
                    <Badge variant="secondary" className="bg-gray-800 text-gray-300 text-xs">
                      {votersData.totalVoters}
                    </Badge>
                  )}
                </div>
                {votersLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : votersError ? (
                  <div className="text-center py-4 space-y-2">
                    <div className="text-sm text-red-400">Failed to load voters</div>
                    <Button
                      onClick={() => refetchVoters()}
                      variant="ghost"
                      size="sm"
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Retry
                    </Button>
                  </div>
                ) : votersData && votersData.voters.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto divide-y divide-gray-800/50">
                    {votersData.voters.map((voter, idx) => (
                      <div
                        key={voter.walletAddress}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-800/30 cursor-pointer"
                        onClick={() => {
                          setSelectedVoterWallet(voter.walletAddress);
                          setSelectedVoterName(voter.username);
                        }}
                      >
                        <span className="text-xs text-gray-500 w-5 text-right font-mono">{idx + 1}</span>
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={voter.avatarUrl || undefined} alt={voter.username} />
                          <AvatarFallback className="bg-gray-700 text-white text-xs">
                            {voter.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate underline decoration-gray-600">{voter.username}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(voter.votedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-yellow-400">{voter.totalSamu.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">SAMU</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-gray-500">No votes yet</div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>Created {new Date(meme.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {canVote && onVote && (
              <Button
                onClick={onVote}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                Vote
              </Button>
            )}
            <Button
              onClick={() => setShowShareDialog(true)}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </DrawerContent>

      {/* Share Dialog */}
      <Drawer open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DrawerContent className="bg-black border-gray-800 max-h-[90dvh]">
          <DrawerHeader>
            <DrawerTitle className="text-white">Share Meme</DrawerTitle>
            <DrawerDescription className="text-gray-400">
              Share "{meme.title}" with your friends
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="p-4 space-y-3">
            <Button
              onClick={shareToTwitter}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Twitter className="h-4 w-4 mr-2" />
              Share on Twitter
            </Button>
            
            <Button
              onClick={shareToTelegram}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              Share on Telegram
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* User Info Modal - Meme Author */}
      <UserInfoModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        walletAddress={meme.authorWallet}
        username={meme.authorUsername}
      />

      {/* User Info Modal - Voter */}
      {selectedVoterWallet && (
        <UserInfoModal
          isOpen={!!selectedVoterWallet}
          onClose={() => setSelectedVoterWallet(null)}
          walletAddress={selectedVoterWallet}
          username={selectedVoterName}
        />
      )}
    </Drawer>
  );
}