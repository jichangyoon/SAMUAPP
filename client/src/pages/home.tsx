import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { WalletConnect } from "@/components/wallet-connect";
import { ContestHeader } from "@/components/contest-header";
import { UploadForm } from "@/components/upload-form";
import { MemeCard } from "@/components/meme-card";
import { Leaderboard } from "@/components/leaderboard";
import { GoodsShop } from "@/components/goods-shop";
import { UserProfile } from "@/components/user-profile";
import { usePrivy } from '@privy-io/react-auth';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Grid3X3, List, ArrowUp, Share2, Twitter, Send, Trophy, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getSamuTokenBalance } from "@/lib/solana";
import type { Meme } from "@shared/schema";
import samuLogoImg from "/assets/images/logos/samu-logo.jpg";

export default function Home() {
  const [sortBy, setSortBy] = useState("votes");
  const [currentTab, setCurrentTab] = useState("contest");
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
  
  // Load profile data when user changes
  useEffect(() => {
    if (authenticated && user?.id) {
      try {
        const stored = localStorage.getItem(`privy_profile_${user.id}`);
        const profile = stored ? JSON.parse(stored) : {};
        setProfileData({
          displayName: profile.displayName || 'User',
          profileImage: profile.profileImage || ''
        });
      } catch {
        setProfileData({ displayName: 'User', profileImage: '' });
      }
    } else {
      setProfileData({ displayName: 'User', profileImage: '' });
    }
  }, [authenticated, user?.id]);

  const displayName = authenticated ? profileData.displayName : 'SAMU';
  const profileImage = profileData.profileImage;

  // Grid view voting function
  const handleGridVote = async (meme: Meme) => {
    if (!isConnected || !walletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to vote.",
        variant: "destructive",
      });
      return;
    }

    const votingPower = 1; // Simplified for now
    setIsVoting(true);
    
    try {
      await apiRequest("POST", `/api/memes/${meme.id}/vote`, {
        voterWallet: walletAddress,
        votingPower,
      });

      toast({
        title: "Vote Submitted!",
        description: `Your vote with ${votingPower} voting power has been recorded.`,
      });
      
      setSelectedMeme(null);
      refetch(); // Refresh the memes list
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit vote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };

  const shareToTwitter = (meme: Meme) => {
    const text = `Check out this amazing meme "${meme.title}" by ${meme.authorUsername} on SAMU Contest! 🚀`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank');
  };

  const shareToTelegram = (meme: Meme) => {
    const text = `Check out this amazing meme "${meme.title}" by ${meme.authorUsername} on SAMU Contest! 🚀 ${window.location.href}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Fetch SAMU balance when wallet changes
  useEffect(() => {
    if (isConnected && walletAddress && isSolana) {
      console.log('💰 Fetching SAMU balance for:', walletAddress);
      setBalanceStatus('loading');
      setSamuBalance(0);

      getSamuTokenBalance(walletAddress)
        .then((balance: any) => {
          console.log('✅ SAMU balance fetched:', balance);
          setSamuBalance(balance);
          setBalanceStatus('success');
        })
        .catch((error: any) => {
          console.error('❌ Error fetching SAMU balance:', error);
          setSamuBalance(0);
          setBalanceStatus('error');
        });
    } else if (!isConnected) {
      console.log('⏸️ Wallet not connected - clearing balance data');
      setSamuBalance(0);
      setBalanceStatus('idle');
    }
  }, [isConnected, walletAddress, isSolana]);

  const { data: memes = [], isLoading, refetch } = useQuery<Meme[]>({
    queryKey: ['/api/memes'],
  });

  const sortedMemes = [...memes].sort((a: any, b: any) => {
    if (sortBy === "votes") return b.votes - a.votes;
    if (sortBy === "latest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return 0;
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={samuLogoImg} alt="SAMU Logo" className="w-8 h-8 rounded-full" />
              <h1 className="text-lg font-bold text-foreground">SAMU</h1>
            </div>
            <button
              onClick={() => setShowUserProfile(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent/80 transition-colors"
            >
              {profileImage ? (
                <img 
                  src={profileImage} 
                  alt="Profile" 
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-foreground">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-sm font-medium text-foreground">{displayName}</span>
              {authenticated && (
                <>
                  <span className="text-xs text-muted-foreground">|</span>
                  <span className="text-xs text-primary font-medium">
                    {samuBalance > 0 ? `${samuBalance.toLocaleString()} SAMU` : 'No SAMU'}
                  </span>
                </>
              )}
            </button>
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="max-w-md mx-auto px-4 pb-20">
        {currentTab === "contest" && (
          <Tabs defaultValue="contest-main" className="w-full">
            <div className="bg-card border-b border-border mb-4 mt-4">
              <TabsList className="grid w-full grid-cols-2 h-10">
                <TabsTrigger value="contest-main" className="text-sm">Contest</TabsTrigger>
                <TabsTrigger value="leaderboard" className="text-sm">Leaderboard</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="contest-main" className="mt-0">
              <div className="space-y-4">
                {/* Contest Header */}
                <ContestHeader />

                {/* Meme Gallery */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-foreground">Contest Entries</h2>
                    <div className="flex items-center space-x-2">
                      <div className="flex bg-accent rounded-lg p-1">
                        <button
                          onClick={() => setViewMode('card')}
                          className={`p-1.5 rounded ${viewMode === 'card' ? 'bg-background shadow-sm' : ''}`}
                        >
                          <List className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setViewMode('grid')}
                          className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-background shadow-sm' : ''}`}
                        >
                          <Grid3X3 className="h-4 w-4" />
                        </button>
                      </div>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-32 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="votes">Most Votes</SelectItem>
                          <SelectItem value="latest">Latest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                          <div className="aspect-square bg-accent" />
                          <CardContent className="p-4">
                            <div className="h-4 bg-accent rounded mb-2" />
                            <div className="h-3 bg-accent rounded w-3/4" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <>
                      {viewMode === 'card' ? (
                        <div className="space-y-4">
                          {sortedMemes.map((meme) => (
                            <MemeCard 
                              key={meme.id} 
                              meme={meme} 
                              onVote={() => refetch()}
                              canVote={isConnected}
                            />
                          ))}
                          
                          {sortedMemes.length === 0 && (
                            <Card>
                              <CardContent className="p-8 text-center">
                                <p className="text-muted-foreground">No memes submitted yet. Be the first!</p>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-1">
                          {sortedMemes.map((meme) => (
                            <button
                              key={meme.id}
                              onClick={() => {
                                setSelectedMeme(meme);
                              }}
                              className="relative aspect-square bg-accent hover:opacity-90 transition-opacity group overflow-hidden"
                            >
                              <img 
                                src={meme.imageUrl} 
                                alt={meme.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="text-white text-xs font-medium text-center">
                                  <div>{meme.votes} votes</div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Upload Section */}
                {isConnected && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3 text-foreground">Submit Your Meme</h3>
                    <UploadForm onSuccess={() => refetch()} />
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="leaderboard">
              <Leaderboard />
            </TabsContent>
          </Tabs>
        )}
        
        {currentTab === "goods" && (
          <div className="mt-4">
            <GoodsShop />
          </div>
        )}
      </div>

      {/* Instagram-style Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="max-w-md mx-auto grid grid-cols-2 h-16">
          <button
            onClick={() => setCurrentTab("contest")}
            className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
              currentTab === "contest" 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trophy className="h-5 w-5" />
            <span className="text-xs font-medium">Contest</span>
          </button>
          <button
            onClick={() => setCurrentTab("goods")}
            className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
              currentTab === "goods" 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingBag className="h-5 w-5" />
            <span className="text-xs font-medium">Shop</span>
          </button>
        </div>
      </nav>

      {/* User Profile Modal */}
      <UserProfile 
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
        samuBalance={samuBalance}
      />

      {/* Grid View Detail Modal */}
      {selectedMeme && (
        <Dialog open={!!selectedMeme} onOpenChange={() => setSelectedMeme(null)}>
          <DialogContent className="max-w-md mx-4 bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">{selectedMeme.title}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="aspect-square rounded-lg overflow-hidden">
                <img 
                  src={selectedMeme.imageUrl} 
                  alt={selectedMeme.title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-foreground">
                    {selectedMeme.authorUsername.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-foreground">{selectedMeme.authorUsername}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedMeme.votes.toLocaleString()} votes
                  </div>
                </div>
              </div>
              
              {selectedMeme.description && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Description</h4>
                  <p className="text-muted-foreground">{selectedMeme.description}</p>
                </div>
              )}
              
              <div className="flex space-x-2 pt-2">
                <Button
                  onClick={() => setShowVoteDialog(true)}
                  disabled={!isConnected}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Vote
                </Button>
                <Button
                  onClick={() => setShowShareDialog(true)}
                  variant="outline"
                  size="sm"
                  className="px-4"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Grid View Vote Confirmation Dialog */}
      {selectedMeme && (
        <Dialog open={showVoteDialog} onOpenChange={setShowVoteDialog}>
          <DialogContent className="max-w-sm mx-4 bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Confirm Your Vote</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                You're about to vote for "{selectedMeme.title}" by {selectedMeme.authorUsername}
              </DialogDescription>
            </DialogHeader>
            
            <div className="bg-accent rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Your voting power:</span>
                <span className="font-semibold text-primary">1</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Based on your SAMU token balance: {samuBalance.toLocaleString()}
              </div>
            </div>

            <DialogFooter className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowVoteDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowVoteDialog(false);
                  handleGridVote(selectedMeme);
                }}
                disabled={isVoting}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isVoting ? "Voting..." : "Confirm Vote"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Share Dialog */}
      {selectedMeme && (
        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent className="max-w-sm mx-4 bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Share Meme</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Share "{selectedMeme.title}" on social platforms
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col gap-3 py-4">
              <Button
                onClick={() => {
                  shareToTwitter(selectedMeme);
                  setShowShareDialog(false);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <Twitter className="h-4 w-4" />
                Share on X
              </Button>
              <Button
                onClick={() => {
                  shareToTelegram(selectedMeme);
                  setShowShareDialog(false);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Share on Telegram
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}