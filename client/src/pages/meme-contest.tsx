import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { WalletConnect } from "@/components/wallet-connect";
import { ContestHeader } from "@/components/contest-header";
import { UploadForm } from "@/components/upload-form";
import { MemeCard } from "@/components/meme-card";
import { Leaderboard } from "@/components/leaderboard";
import { UserProfile } from "@/components/user-profile";
import { usePrivy } from '@privy-io/react-auth';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Grid3X3, List, ArrowUp, Share2, Twitter, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getSamuTokenBalance } from "@/lib/solana";
import type { Meme } from "@shared/schema";
import samuLogoImg from "/assets/images/logos/samu-logo.jpg";

export default function MemeContest() {
  const [sortBy, setSortBy] = useState("votes");
  const [viewMode, setViewMode] = useState<'card' | 'grid'>('card');
  const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null);
  const [showVoteDialog, setShowVoteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [samuBalance, setSamuBalance] = useState<number>(0);
  const [balanceStatus, setBalanceStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showUserProfile, setShowUserProfile] = useState(false);
  
  // Privy authentication
  const { authenticated, user } = usePrivy();
  const { toast } = useToast();
  
  // Get wallet info from Privy embedded wallet
  const walletAccounts = user?.linkedAccounts?.filter(account => account.type === 'wallet') || [];
  const solanaWallet = walletAccounts.find(w => w.chainType === 'solana');
  const selectedWalletAccount = solanaWallet || walletAccounts[0];
  
  const isConnected = authenticated && !!selectedWalletAccount;
  const walletAddress = selectedWalletAccount?.address || '';
  const isSolana = selectedWalletAccount?.chainType === 'solana';

  // Profile state management
  const [profileData, setProfileData] = useState({ displayName: 'User', profileImage: '' });
  
  // Load profile data from localStorage
  useEffect(() => {
    if (user?.email) {
      const savedProfile = localStorage.getItem(`profile_${user.email}`);
      if (savedProfile) {
        setProfileData(JSON.parse(savedProfile));
      } else {
        // Set default display name from email
        const emailName = user.email?.toString().split('@')[0] || 'User';
        const defaultProfile = { displayName: emailName, profileImage: '' };
        setProfileData(defaultProfile);
        localStorage.setItem(`profile_${user.email}`, JSON.stringify(defaultProfile));
      }
    }
  }, [user?.email]);

  // Load SAMU balance
  useEffect(() => {
    let mounted = true;
    
    const loadBalance = async () => {
      if (!isConnected || !isSolana || !walletAddress) {
        console.log('⏸️ Wallet not connected - clearing balance data');
        setSamuBalance(0);
        setBalanceStatus('idle');
        return;
      }

      try {
        setBalanceStatus('loading');
        console.log(`💰 Fetching SAMU balance for wallet:`, walletAddress);
        
        const balance = await getSamuTokenBalance(walletAddress);
        
        if (mounted) {
          setSamuBalance(balance);
          setBalanceStatus('success');
          console.log('✅ SAMU balance fetched:', balance);
        }
      } catch (error) {
        console.error('❌ Failed to fetch SAMU balance:', error);
        if (mounted) {
          setSamuBalance(0);
          setBalanceStatus('error');
        }
      }
    };

    loadBalance();
    
    return () => {
      mounted = false;
    };
  }, [isConnected, isSolana, walletAddress]);

  // Fetch memes
  const { data: memes = [], refetch: refetchMemes, isLoading } = useQuery({
    queryKey: ["/api/memes"],
    enabled: true,
  });

  // Type assertion for memes data
  const typedMemes = (memes as any[]) || [];

  // Sort memes
  const sortedMemes = [...typedMemes].sort((a: any, b: any) => {
    if (sortBy === "votes") {
      return (b.votes || b.voteCount || 0) - (a.votes || a.voteCount || 0);
    } else {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const handleGridVote = async (meme: Meme) => {
    setSelectedMeme(meme);
    setShowVoteDialog(true);
  };

  const shareToTwitter = (meme: any) => {
    const authorName = meme.authorName || meme.authorUsername || 'Anonymous';
    const text = `Check out this amazing meme: "${meme.title}" by ${authorName} on SAMU Meme Contest! 🚀`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank');
  };

  const shareToTelegram = (meme: any) => {
    const authorName = meme.authorName || meme.authorUsername || 'Anonymous';
    const text = `Check out this amazing meme: "${meme.title}" by ${authorName} on SAMU Meme Contest! 🚀\n${window.location.href}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleShare = (meme: Meme) => {
    setSelectedMeme(meme);
    setShowShareDialog(true);
  };

  const handleVote = async () => {
    if (!selectedMeme || !isConnected || !walletAddress) return;

    setIsVoting(true);
    try {
      await apiRequest('POST', '/api/votes', {
        memeId: selectedMeme.id,
        voterWallet: walletAddress,
      });

      toast({
        title: "투표 완료!",
        description: `${selectedMeme.title}에 투표했습니다.`,
      });

      refetchMemes();
      setShowVoteDialog(false);
      setSelectedMeme(null);
    } catch (error) {
      console.error('Vote failed:', error);
      toast({
        title: "투표 실패",
        description: "투표 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white pb-20">
        <div className="sticky top-0 z-40 bg-black border-b border-gray-800">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <h1 className="text-xl font-bold">밈콘테스트</h1>
            </div>
            <WalletConnect />
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">로딩중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <h1 className="text-xl font-bold">밈콘테스트</h1>
          </div>
          <WalletConnect />
        </div>
      </div>

      {/* Contest Header */}
      <ContestHeader />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Upload Form */}
        {isConnected && (
          <div className="mb-6">
            <UploadForm onSuccess={refetchMemes} />
          </div>
        )}

        {/* View Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'card' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('card')}
              className="p-2"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="p-2"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="votes">인기순</SelectItem>
              <SelectItem value="latest">최신순</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Memes Display */}
        {viewMode === 'card' ? (
          <div className="space-y-4">
            {sortedMemes.map((meme) => (
              <MemeCard
                key={meme.id}
                meme={meme}
                onVote={() => handleGridVote(meme)}
                canVote={isConnected}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {sortedMemes.map((meme) => (
              <div key={meme.id} className="relative aspect-square group">
                <img
                  src={meme.imageUrl}
                  alt={meme.title}
                  className="w-full h-full object-cover rounded-lg cursor-pointer"
                  onClick={() => setSelectedMeme(meme)}
                />
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <ArrowUp className="w-6 h-6 text-white mx-auto mb-1" />
                    <span className="text-white text-sm font-bold">{meme.voteCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Leaderboard */}
        <div className="mt-8">
          <Leaderboard />
        </div>
      </div>

      {/* Meme Detail Modal */}
      {selectedMeme && !showVoteDialog && !showShareDialog && (
        <Dialog open={!!selectedMeme} onOpenChange={() => setSelectedMeme(null)}>
          <DialogContent className="bg-gray-950 border-gray-800 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">{selectedMeme.title}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <img
                src={selectedMeme.imageUrl}
                alt={selectedMeme.title}
                className="w-full rounded-lg"
              />
              
              <div className="flex items-center justify-between text-sm text-gray-300">
                <span>by {(selectedMeme as any).authorName || (selectedMeme as any).authorUsername || 'Anonymous'}</span>
                <span>{(selectedMeme as any).voteCount || (selectedMeme as any).votes || 0} 투표</span>
              </div>
              
              {selectedMeme.description && (
                <p className="text-gray-300 text-sm">{selectedMeme.description}</p>
              )}
              
              <div className="flex space-x-2">
                {isConnected && (
                  <Button
                    onClick={() => {
                      setShowVoteDialog(true);
                    }}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                  >
                    <ArrowUp className="w-4 h-4 mr-2" />
                    투표하기
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowShareDialog(true);
                  }}
                  className="border-gray-600"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Vote Dialog */}
      {showVoteDialog && selectedMeme && (
        <Dialog open={showVoteDialog} onOpenChange={setShowVoteDialog}>
          <DialogContent className="bg-gray-950 border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle>투표 확인</DialogTitle>
              <DialogDescription className="text-gray-400">
                "{selectedMeme.title}"에 투표하시겠습니까?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowVoteDialog(false)}>
                취소
              </Button>
              <Button onClick={handleVote} disabled={isVoting}>
                {isVoting ? "투표중..." : "투표하기"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Share Dialog */}
      {showShareDialog && selectedMeme && (
        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent className="bg-gray-950 border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle>공유하기</DialogTitle>
              <DialogDescription className="text-gray-400">
                "{selectedMeme.title}"을 공유해보세요
              </DialogDescription>
            </DialogHeader>
            <div className="flex space-x-4 py-4">
              <Button
                onClick={() => shareToTwitter(selectedMeme)}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Twitter className="w-4 h-4 mr-2" />
                Twitter
              </Button>
              <Button
                onClick={() => shareToTelegram(selectedMeme)}
                className="flex-1 bg-blue-500 hover:bg-blue-600"
              >
                <Send className="w-4 h-4 mr-2" />
                Telegram
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* User Profile Modal */}
      <UserProfile
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
        samuBalance={samuBalance}
      />
    </div>
  );
}