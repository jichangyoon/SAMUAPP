import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Coins, Copy, X } from "lucide-react";
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

  const { data: userProfile } = useQuery({
    queryKey: [`/api/users/profile/${walletAddress}`],
    enabled: isOpen && !!walletAddress,
  });

  const { data: userMemes = [] } = useQuery({
    queryKey: [`/api/users/${walletAddress}/memes`],
    enabled: isOpen && !!walletAddress,
  });

  const { data: userVotes = [] } = useQuery({
    queryKey: [`/api/users/${walletAddress}/votes`],
    enabled: isOpen && !!walletAddress,
  });

  const totalSamuSpent = userVotes.reduce((sum: number, vote: any) => sum + (Number(vote.samuAmount) || 0), 0);

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="h-[92vh] bg-black text-white border-gray-800">
        <DrawerHeader className="border-b border-gray-800 pb-4">
          <DrawerTitle className="sr-only">User Profile</DrawerTitle>
          <DrawerDescription className="sr-only">View user profile information, statistics, and memes</DrawerDescription>
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
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="text-2xl font-bold text-white">{userMemes.length}</div>
                <div className="text-sm text-gray-400">Memes Created</div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Coins className="h-5 w-5 text-[hsl(50,85%,75%)]" />
                </div>
                <div className="text-2xl font-bold text-white">{totalSamuSpent.toLocaleString()}</div>
                <div className="text-sm text-gray-400">SAMU Spent</div>
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
            <DrawerDescription className="sr-only">Full size profile picture view</DrawerDescription>
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