import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowUp, Share2, Twitter, Send, Calendar, Trophy } from "lucide-react";
import { useState } from "react";
import type { Meme } from "@shared/schema";

interface MemeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  meme: Meme;
  onVote?: () => void;
  canVote?: boolean;
}

export function MemeDetailModal({ isOpen, onClose, meme, onVote, canVote = false }: MemeDetailModalProps) {
  const [showShareDialog, setShowShareDialog] = useState(false);
  


  const shareToTwitter = () => {
    const text = `Check out this awesome meme: "${meme.title}" by ${meme.authorUsername} 🔥`;
    const url = window.location.href;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
  };

  const shareToTelegram = () => {
    const text = `Check out this awesome meme: "${meme.title}" by ${meme.authorUsername}`;
    const url = window.location.href;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank');
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="h-[92vh] bg-black text-white border-gray-800">
        <DrawerHeader className="border-b border-gray-800 pb-4">
          <DrawerTitle className="text-xl font-bold text-white">
            {meme.title}
          </DrawerTitle>
          <DrawerDescription className="text-gray-400">
            Meme details and information
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Meme Image */}
          <div className="w-full max-w-md mx-auto">
            <img
              src={meme.imageUrl}
              alt={meme.title}
              className="w-full rounded-lg object-cover"
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
                  <div className="font-semibold text-white">{meme.authorUsername}</div>
                  <div className="text-sm text-gray-400">Creator</div>

                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-yellow-400">
                  <Trophy className="h-4 w-4" />
                  <span className="font-bold">{meme.votes.toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-400">Total Votes</div>
              </div>
            </div>

            {meme.description && (
              <div>
                <h3 className="font-semibold text-white mb-2">Description</h3>
                <p className="text-gray-300">{meme.description}</p>
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
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-black font-semibold"
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
        <DrawerContent className="bg-black border-gray-800 max-h-[92vh] h-[50vh]">
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
    </Drawer>
  );
}