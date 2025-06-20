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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Grid3X3, List, ArrowUp, Share2, Twitter, Send, Trophy, ShoppingBag, Archive } from "lucide-react";
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
  const [selectedArchiveContest, setSelectedArchiveContest] = useState<any>(null);
  const [selectedArchiveMeme, setSelectedArchiveMeme] = useState<any>(null);
  
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
        title: "Voting Failed",
        description: error.message || "Failed to submit vote. You may have already voted on this meme.",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };

  // Share functions
  const shareToTwitter = (meme: Meme) => {
    const text = `Check out this awesome meme: "${meme.title}" by ${meme.authorUsername} 🔥`;
    const url = window.location.href;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
  };

  const shareToTelegram = (meme: Meme) => {
    const text = `Check out this awesome meme: "${meme.title}" by ${meme.authorUsername}`;
    const url = window.location.href;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank');
  };

  // Fetch SAMU balance for Solana wallets
  useEffect(() => {
    if (isConnected && walletAddress && isSolana) {
      console.log('💰 Fetching SAMU balance for:', walletAddress);
      setBalanceStatus('loading');
      setSamuBalance(0);
      
      getSamuTokenBalance(walletAddress)
        .then(balance => {
          console.log('✅ SAMU balance fetched:', balance);
          setSamuBalance(balance);
          setBalanceStatus('success');
        })
        .catch(error => {
          console.warn('❌ Failed to fetch SAMU balance:', error);
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
    queryKey: ["/api/memes"],
    enabled: true,
  });

  const sortedMemes = memes.sort((a, b) => {
    if (sortBy === "votes") return b.votes - a.votes;
    if (sortBy === "latest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return b.votes - a.votes; // default to votes
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card shadow-sm border-b border-border">
        <div className="max-w-md mx-auto px-4 py-1">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setShowUserProfile(true)}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              {authenticated ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                    {profileImage ? (
                      <img 
                        src={profileImage} 
                        alt="Profile" 
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-bold text-sm">
                          {displayName.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-lg font-bold text-primary">{displayName}</span>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center samu-wolf-logo overflow-hidden">
                    <img 
                      src={samuLogoImg} 
                      alt="SAMU Wolf" 
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <span className="text-lg font-bold text-primary">SAMU</span>
                </>
              )}
            </button>
            <WalletConnect />
          </div>
        </div>
      </header>



      {/* Main Content Container */}
      <div className="max-w-md mx-auto px-4">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          
          <TabsContent value="contest" className="mt-4 space-y-4 pb-24">
            <Tabs defaultValue="contest-main" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-10">
                <TabsTrigger value="contest-main" className="text-sm">Contest</TabsTrigger>
                <TabsTrigger value="leaderboard" className="text-sm">Leaderboard</TabsTrigger>
              </TabsList>
              
              <TabsContent value="contest-main" className="mt-0">
                <main className="space-y-4 pb-20">
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
                                  // We'll create a grid detail view
                                  setSelectedMeme(meme);
                                }}
                                className="aspect-square bg-accent flex items-center justify-center hover:opacity-90 transition-opacity relative group"
                              >
                                <img
                                  src={meme.imageUrl}
                                  alt={meme.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <div className="text-white text-center">
                                    <div className="text-sm font-semibold">{meme.votes}</div>
                                    <div className="text-xs">votes</div>
                                  </div>
                                </div>
                              </button>
                            ))}
                            
                            {sortedMemes.length === 0 && (
                              <div className="col-span-3">
                                <Card>
                                  <CardContent className="p-8 text-center">
                                    <p className="text-muted-foreground">No memes submitted yet. Be the first!</p>
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {sortedMemes.length > 0 && (
                      <div className="text-center mt-6">
                        <Button variant="outline" className="bg-accent text-foreground hover:bg-accent/80 border-border">
                          Load More Memes
                        </Button>
                      </div>
                    )}
                  </div>
                </main>
              </TabsContent>
              
              <TabsContent value="leaderboard">
                <Leaderboard />
              </TabsContent>
            </Tabs>
          </TabsContent>
          
          <TabsContent value="archive" className="mt-4 space-y-4 pb-24">
            <div className="space-y-4">
              {/* Archive Header */}
              <Card className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-400/20">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Archive className="h-5 w-5 text-purple-400" />
                    <h2 className="text-lg font-bold text-purple-400">Contest Archive</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Past contest winners and memorable memes
                  </p>
                </CardContent>
              </Card>

              {/* Past Contests List */}
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-foreground">Previous Contests</h3>
                
                {/* Contest list items - clickable */}
                <button
                  onClick={() => setSelectedArchiveContest({
                    id: 1,
                    title: "Contest #1 - December 2024",
                    participants: 50,
                    totalVotes: 1247,
                    status: "Completed",
                    winner: {
                      name: "SAMU TO MARS",
                      author: "crypto_legend",
                      votes: 324
                    },
                    secondPlace: "DIAMOND PAWS",
                    thirdPlace: "PACK LEADER",
                    memes: [
                      {
                        id: 1,
                        title: "SAMU TO MARS",
                        author: "crypto_legend",
                        votes: 324,
                        rank: 1,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23F7DC6F'/%3E%3Ccircle cx='200' cy='200' r='100' fill='%23E74C3C'/%3E%3Ctext x='200' y='180' text-anchor='middle' font-family='Arial' font-size='24' font-weight='bold' fill='white'%3ESAMU%3C/text%3E%3Ctext x='200' y='220' text-anchor='middle' font-family='Arial' font-size='16' fill='white'%3ETO MARS%3C/text%3E%3C/svg%3E",
                        description: "The ultimate SAMU moon mission meme"
                      },
                      {
                        id: 2,
                        title: "DIAMOND PAWS",
                        author: "gem_hands",
                        votes: 287,
                        rank: 2,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23667BC6'/%3E%3Cpolygon points='200,100 250,150 200,200 150,150' fill='%2300BFFF'/%3E%3Ctext x='200' y='260' text-anchor='middle' font-family='Arial' font-size='20' font-weight='bold' fill='white'%3EDIAMOND%3C/text%3E%3Ctext x='200' y='290' text-anchor='middle' font-family='Arial' font-size='20' font-weight='bold' fill='white'%3EPAWS%3C/text%3E%3C/svg%3E",
                        description: "Diamond hands, diamond paws"
                      },
                      {
                        id: 3,
                        title: "PACK LEADER",
                        author: "wolf_alpha",
                        votes: 245,
                        rank: 3,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%238B4513'/%3E%3Ccircle cx='200' cy='180' r='60' fill='%23D2691E'/%3E%3Cpath d='M170 160 L200 140 L230 160 L220 180 L180 180 Z' fill='%23654321'/%3E%3Ctext x='200' y='280' text-anchor='middle' font-family='Arial' font-size='18' font-weight='bold' fill='white'%3EPACK LEADER%3C/text%3E%3C/svg%3E",
                        description: "Leading the pack to victory"
                      },
                      {
                        id: 4,
                        title: "HODL STRONG",
                        author: "diamond_wolf",
                        votes: 198,
                        rank: 4,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%232C3E50'/%3E%3Crect x='100' y='150' width='200' height='100' fill='%23F39C12'/%3E%3Ctext x='200' y='190' text-anchor='middle' font-family='Arial' font-size='16' font-weight='bold'%3EHODL%3C/text%3E%3Ctext x='200' y='220' text-anchor='middle' font-family='Arial' font-size='16' font-weight='bold'%3ESTRONG%3C/text%3E%3C/svg%3E",
                        description: "Never selling, always holding"
                      },
                      {
                        id: 5,
                        title: "MOON WOLF",
                        author: "lunar_pack",
                        votes: 156,
                        rank: 5,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%231a1a2e'/%3E%3Ccircle cx='150' cy='100' r='40' fill='%23f5f5f5'/%3E%3Ccircle cx='250' cy='200' r='50' fill='%23654321'/%3E%3Ctext x='200' y='320' text-anchor='middle' font-family='Arial' font-size='18' font-weight='bold' fill='%23f5f5f5'%3EMOON WOLF%3C/text%3E%3C/svg%3E",
                        description: "Howling at the crypto moon"
                      },
                      {
                        id: 6,
                        title: "ALPHA GAINS",
                        author: "profit_hunter",
                        votes: 134,
                        rank: 6,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%2327ae60'/%3E%3Cpath d='M200 100 L300 200 L250 250 L200 200 L150 250 L100 200 Z' fill='%23f1c40f'/%3E%3Ctext x='200' y='320' text-anchor='middle' font-family='Arial' font-size='18' font-weight='bold' fill='white'%3EALPHA GAINS%3C/text%3E%3C/svg%3E",
                        description: "Always making alpha gains"
                      },
                      {
                        id: 7,
                        title: "ROCKET WOLF",
                        author: "space_dog",
                        votes: 128,
                        rank: 7,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23FF6B6B'/%3E%3Cpolygon points='200,50 250,200 200,300 150,200' fill='%23FFE66D'/%3E%3Ccircle cx='200' cy='150' r='30' fill='%234ECDC4'/%3E%3Ctext x='200' y='350' text-anchor='middle' font-family='Arial' font-size='16' font-weight='bold' fill='white'%3EROCKET WOLF%3C/text%3E%3C/svg%3E",
                        description: "Ready for takeoff to the moon"
                      },
                      {
                        id: 8,
                        title: "DIAMOND HANDS",
                        author: "hodl_master",
                        votes: 115,
                        rank: 8,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%234A90E2'/%3E%3Cpolygon points='200,100 250,150 200,200 150,150' fill='%2300BFFF'/%3E%3Cpath d='M150 220 L200 170 L250 220 L200 270 Z' fill='%2300CED1'/%3E%3Ctext x='200' y='320' text-anchor='middle' font-family='Arial' font-size='16' font-weight='bold' fill='white'%3EDIAMOND HANDS%3C/text%3E%3C/svg%3E",
                        description: "Never selling, always holding"
                      },
                      {
                        id: 9,
                        title: "WOLF SQUAD",
                        author: "pack_unity",
                        votes: 108,
                        rank: 9,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%237B68EE'/%3E%3Ccircle cx='150' cy='150' r='30' fill='%23FFA500'/%3E%3Ccircle cx='250' cy='150' r='30' fill='%23FFA500'/%3E%3Ccircle cx='200' cy='250' r='30' fill='%23FFA500'/%3E%3Ctext x='200' y='340' text-anchor='middle' font-family='Arial' font-size='18' font-weight='bold' fill='white'%3EWOLF SQUAD%3C/text%3E%3C/svg%3E",
                        description: "Stronger together as a pack"
                      },
                      {
                        id: 10,
                        title: "SAMU VIBES",
                        author: "vibe_check",
                        votes: 97,
                        rank: 10,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23FF8A80'/%3E%3Ccircle cx='200' cy='200' r='80' fill='%23FFD740'/%3E%3Cpath d='M160 180 Q200 160 240 180' stroke='%23333' stroke-width='3' fill='none'/%3E%3Ccircle cx='180' cy='190' r='8' fill='%23333'/%3E%3Ccircle cx='220' cy='190' r='8' fill='%23333'/%3E%3Ctext x='200' y='320' text-anchor='middle' font-family='Arial' font-size='16' font-weight='bold' fill='white'%3ESAMU VIBES%3C/text%3E%3C/svg%3E",
                        description: "Good vibes only in the SAMU community"
                      },
                      {
                        id: 11,
                        title: "MOON MISSION",
                        author: "astronaut_wolf",
                        votes: 89,
                        rank: 11,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23000080'/%3E%3Ccircle cx='320' cy='80' r='40' fill='%23F5F5DC'/%3E%3Cpolygon points='200,200 250,300 150,300' fill='%23FF4500'/%3E%3Ctext x='200' y='350' text-anchor='middle' font-family='Arial' font-size='14' font-weight='bold' fill='white'%3EMOON MISSION%3C/text%3E%3C/svg%3E",
                        description: "Next stop: the moon"
                      },
                      {
                        id: 12,
                        title: "PACK POWER",
                        author: "unity_strength",
                        votes: 82,
                        rank: 12,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23DC143C'/%3E%3Cpath d='M200 50 L250 150 L350 150 L275 225 L300 325 L200 275 L100 325 L125 225 L50 150 L150 150 Z' fill='%23FFD700'/%3E%3Ctext x='200' y='360' text-anchor='middle' font-family='Arial' font-size='16' font-weight='bold' fill='white'%3EPACK POWER%3C/text%3E%3C/svg%3E",
                        description: "United we stand, divided we fall"
                      },
                      {
                        id: 13,
                        title: "CRYPTO WOLF",
                        author: "blockchain_beast",
                        votes: 76,
                        rank: 13,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23FF69B4'/%3E%3Crect x='100' y='100' width='50' height='50' fill='%23000' opacity='0.7'/%3E%3Crect x='175' y='100' width='50' height='50' fill='%23000' opacity='0.5'/%3E%3Crect x='250' y='100' width='50' height='50' fill='%23000' opacity='0.7'/%3E%3Ctext x='200' y='280' text-anchor='middle' font-family='Arial' font-size='14' font-weight='bold' fill='white'%3ECRYPTO WOLF%3C/text%3E%3C/svg%3E",
                        description: "Blockchain-powered wolf power"
                      },
                      {
                        id: 14,
                        title: "SAMU FIRE",
                        author: "flame_keeper",
                        votes: 71,
                        rank: 14,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23FF4500'/%3E%3Cpath d='M200 100 Q250 150 200 250 Q150 150 200 100' fill='%23FFD700'/%3E%3Ctext x='200' y='320' text-anchor='middle' font-family='Arial' font-size='16' font-weight='bold' fill='white'%3ESAMU FIRE%3C/text%3E%3C/svg%3E",
                        description: "Burning bright with SAMU passion"
                      },
                      {
                        id: 15,
                        title: "LUNAR PACK",
                        author: "moon_howler",
                        votes: 65,
                        rank: 15,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23191970'/%3E%3Ccircle cx='200' cy='120' r='50' fill='%23F0F8FF'/%3E%3Ccircle cx='200' cy='280' r='60' fill='%236B4226'/%3E%3Ctext x='200' y='360' text-anchor='middle' font-family='Arial' font-size='16' font-weight='bold' fill='white'%3ELUNAR PACK%3C/text%3E%3C/svg%3E",
                        description: "Howling at the moon together"
                      },
                      {
                        id: 16,
                        title: "GOLDEN WOLF",
                        author: "gold_rush",
                        votes: 59,
                        rank: 16,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23DAA520'/%3E%3Ccircle cx='200' cy='200' r='80' fill='%23FFD700'/%3E%3Ctext x='200' y='320' text-anchor='middle' font-family='Arial' font-size='14' font-weight='bold' fill='%238B4513'%3EGOLDEN WOLF%3C/text%3E%3C/svg%3E",
                        description: "Worth its weight in gold"
                      },
                      {
                        id: 17,
                        title: "SAMU STORM",
                        author: "storm_chaser",
                        votes: 54,
                        rank: 17,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%234169E1'/%3E%3Cpath d='M100 100 L300 100 L200 200 L300 300 L100 300 L200 200 Z' fill='%23FFFF00'/%3E%3Ctext x='200' y='360' text-anchor='middle' font-family='Arial' font-size='16' font-weight='bold' fill='white'%3ESAMU STORM%3C/text%3E%3C/svg%3E",
                        description: "Storm's coming, SAMU's rising"
                      },
                      {
                        id: 18,
                        title: "WILD WOLF",
                        author: "wilderness_spirit",
                        votes: 48,
                        rank: 18,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%2322665D'/%3E%3Cpath d='M100 300 Q200 100 300 300' stroke='%2390EE90' stroke-width='20' fill='none'/%3E%3Ccircle cx='200' cy='200' r='40' fill='%23A0522D'/%3E%3Ctext x='200' y='360' text-anchor='middle' font-family='Arial' font-size='16' font-weight='bold' fill='white'%3EWILD WOLF%3C/text%3E%3C/svg%3E",
                        description: "Free and wild like nature intended"
                      },
                      {
                        id: 19,
                        title: "SAMU SPIRIT",
                        author: "soul_keeper",
                        votes: 43,
                        rank: 19,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23E6E6FA'/%3E%3Ccircle cx='200' cy='200' r='100' fill='%239370DB'/%3E%3Cpath d='M200 120 Q240 200 200 280 Q160 200 200 120' fill='%23FFB6C1'/%3E%3Ctext x='200' y='340' text-anchor='middle' font-family='Arial' font-size='14' font-weight='bold' fill='%234B0082'%3ESAMU SPIRIT%3C/text%3E%3C/svg%3E",
                        description: "The spirit lives on"
                      },
                      {
                        id: 20,
                        title: "PACK UNITY",
                        author: "together_strong",
                        votes: 39,
                        rank: 20,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23FF1493'/%3E%3Ccircle cx='150' cy='200' r='30' fill='%23FFFF00'/%3E%3Ccircle cx='200' cy='150' r='30' fill='%23FFFF00'/%3E%3Ccircle cx='250' cy='200' r='30' fill='%23FFFF00'/%3E%3Ccircle cx='200' cy='250' r='30' fill='%23FFFF00'/%3E%3Ctext x='200' y='340' text-anchor='middle' font-family='Arial' font-size='16' font-weight='bold' fill='white'%3EPACK UNITY%3C/text%3E%3C/svg%3E",
                        description: "United we rise together"
                      },
                      {
                        id: 21,
                        title: "WOLF MAGIC",
                        author: "mystic_wolf",
                        votes: 35,
                        rank: 21,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%234B0082'/%3E%3Cpath d='M200 50 L250 150 L350 150 L275 225 L300 325 L200 275 L100 325 L125 225 L50 150 L150 150 Z' fill='%23FFD700'/%3E%3Cpath d='M150 150 L200 100 L250 150 L200 200 Z' fill='%23FF69B4'/%3E%3Ctext x='200' y='360' text-anchor='middle' font-family='Arial' font-size='16' font-weight='bold' fill='white'%3EWOLF MAGIC%3C/text%3E%3C/svg%3E",
                        description: "Magic happens when wolves unite"
                      },
                      {
                        id: 22,
                        title: "SAMU DREAM",
                        author: "dream_weaver",
                        votes: 32,
                        rank: 22,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%2387CEEB'/%3E%3Ccircle cx='200' cy='200' r='80' fill='%23FFC0CB' opacity='0.7'/%3E%3Ccircle cx='200' cy='200' r='60' fill='%23FFB6C1' opacity='0.7'/%3E%3Ccircle cx='200' cy='200' r='40' fill='%23FF69B4' opacity='0.7'/%3E%3Ctext x='200' y='320' text-anchor='middle' font-family='Arial' font-size='16' font-weight='bold' fill='white'%3ESAMU DREAM%3C/text%3E%3C/svg%3E",
                        description: "Dreams do come true"
                      },
                      {
                        id: 23,
                        title: "ALPHA WOLF",
                        author: "leader_born",
                        votes: 29,
                        rank: 23,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23B22222'/%3E%3Cpolygon points='200,80 250,200 200,320 150,200' fill='%23FFD700'/%3E%3Ccircle cx='200' cy='200' r='30' fill='%23000'/%3E%3Ctext x='200' y='360' text-anchor='middle' font-family='Arial' font-size='16' font-weight='bold' fill='white'%3EALPHA WOLF%3C/text%3E%3C/svg%3E",
                        description: "Born to lead the pack"
                      },
                      {
                        id: 24,
                        title: "COSMIC WOLF",
                        author: "space_traveler",
                        votes: 26,
                        rank: 24,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23000'/%3E%3Ccircle cx='100' cy='100' r='3' fill='%23FFF'/%3E%3Ccircle cx='300' cy='150' r='2' fill='%23FFF'/%3E%3Ccircle cx='150' cy='300' r='4' fill='%23FFF'/%3E%3Ccircle cx='250' cy='80' r='2' fill='%23FFF'/%3E%3Ccircle cx='200' cy='200' r='60' fill='%239370DB'/%3E%3Ctext x='200' y='320' text-anchor='middle' font-family='Arial' font-size='14' font-weight='bold' fill='white'%3ECOSMIC WOLF%3C/text%3E%3C/svg%3E",
                        description: "Traveling through the cosmos"
                      },
                      {
                        id: 25,
                        title: "SAMU HERO",
                        author: "hero_maker",
                        votes: 23,
                        rank: 25,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23FF6347'/%3E%3Cpath d='M200 50 L250 150 L350 150 L275 225 L300 325 L200 275 L100 325 L125 225 L50 150 L150 150 Z' fill='%23FFD700'/%3E%3Ctext x='200' y='360' text-anchor='middle' font-family='Arial' font-size='16' font-weight='bold' fill='white'%3ESAMU HERO%3C/text%3E%3C/svg%3E",
                        description: "Every pack needs a hero"
                      },
                      {
                        id: 26,
                        title: "WOLF WISDOM",
                        author: "wise_elder",
                        votes: 20,
                        rank: 26,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23708090'/%3E%3Ccircle cx='200' cy='150' r='60' fill='%23F5F5DC'/%3E%3Cpath d='M170 130 L200 110 L230 130 L220 150 L180 150 Z' fill='%238B4513'/%3E%3Ccircle cx='185' cy='140' r='5' fill='%23000'/%3E%3Ccircle cx='215' cy='140' r='5' fill='%23000'/%3E%3Ctext x='200' y='280' text-anchor='middle' font-family='Arial' font-size='14' font-weight='bold' fill='white'%3EWOLF WISDOM%3C/text%3E%3C/svg%3E",
                        description: "Wisdom passed down through generations"
                      },
                      {
                        id: 27,
                        title: "SAMU LEGEND",
                        author: "legend_keeper",
                        votes: 17,
                        rank: 27,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23800000'/%3E%3Crect x='100' y='100' width='200' height='200' fill='%23FFD700' transform='rotate(45 200 200)'/%3E%3Ccircle cx='200' cy='200' r='50' fill='%23FF4500'/%3E%3Ctext x='200' y='340' text-anchor='middle' font-family='Arial' font-size='14' font-weight='bold' fill='white'%3ESAMU LEGEND%3C/text%3E%3C/svg%3E",
                        description: "Legends never die"
                      },
                      {
                        id: 28,
                        title: "CYBER WOLF",
                        author: "digital_hunter",
                        votes: 14,
                        rank: 28,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23000'/%3E%3Crect x='100' y='100' width='200' height='20' fill='%2300FF00'/%3E%3Crect x='100' y='150' width='150' height='20' fill='%2300FF00'/%3E%3Crect x='100' y='200' width='180' height='20' fill='%2300FF00'/%3E%3Ccircle cx='200' cy='280' r='40' fill='%2300FFFF'/%3E%3Ctext x='200' y='360' text-anchor='middle' font-family='Arial' font-size='14' font-weight='bold' fill='%2300FF00'%3ECYBER WOLF%3C/text%3E%3C/svg%3E",
                        description: "Digital hunter in the matrix"
                      },
                      {
                        id: 29,
                        title: "ETERNAL WOLF",
                        author: "forever_wild",
                        votes: 11,
                        rank: 29,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%232F4F4F'/%3E%3Ccircle cx='200' cy='200' r='100' fill='%2366CDAA' opacity='0.6'/%3E%3Ccircle cx='200' cy='200' r='70' fill='%2320B2AA' opacity='0.7'/%3E%3Ccircle cx='200' cy='200' r='40' fill='%2348D1CC' opacity='0.8'/%3E%3Ctext x='200' y='330' text-anchor='middle' font-family='Arial' font-size='14' font-weight='bold' fill='white'%3EETERNAL WOLF%3C/text%3E%3C/svg%3E",
                        description: "Forever running wild and free"
                      },
                      {
                        id: 30,
                        title: "SAMU FINALE",
                        author: "grand_finale",
                        votes: 8,
                        rank: 30,
                        imageUrl: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23800080'/%3E%3Ccircle cx='200' cy='200' r='80' fill='%23FFD700'/%3E%3Cpath d='M200 120 L240 160 L280 200 L240 240 L200 280 L160 240 L120 200 L160 160 Z' fill='%23FF1493'/%3E%3Ctext x='200' y='340' text-anchor='middle' font-family='Arial' font-size='14' font-weight='bold' fill='white'%3ESAMU FINALE%3C/text%3E%3C/svg%3E",
                        description: "The grand finale of Contest #1"
                      }
                    ]
                  })}
                  className="w-full"
                >
                  <Card className="border-border/50 hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <h4 className="font-semibold text-foreground">Contest #1 - December 2024</h4>
                          <p className="text-sm text-muted-foreground">50 participants • 1,247 votes</p>
                        </div>
                        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-400/20">
                          Completed
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="goods" className="mt-4 space-y-4 pb-24">
            <GoodsShop />
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="max-w-md mx-auto px-4 py-1">
          <div className="flex justify-around items-center">
            <button
              onClick={() => setCurrentTab("contest")}
              className={`flex items-center justify-center p-3 rounded-lg transition-colors ${
                currentTab === "contest" 
                  ? "bg-primary/20 text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Trophy className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentTab("archive")}
              className={`flex items-center justify-center p-3 rounded-lg transition-colors ${
                currentTab === "archive" 
                  ? "bg-primary/20 text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Archive className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentTab("goods")}
              className={`flex items-center justify-center p-3 rounded-lg transition-colors ${
                currentTab === "goods" 
                  ? "bg-primary/20 text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* User Profile Modal */}
      <UserProfile 
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
        samuBalance={samuBalance}
      />

      {/* Grid View Meme Detail Modal */}
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
                onClick={() => selectedMeme && handleGridVote(selectedMeme)}
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

      {/* Archive Contest Detail Dialog */}
      {selectedArchiveContest && (
        <Dialog open={!!selectedArchiveContest} onOpenChange={() => setSelectedArchiveContest(null)}>
          <DialogContent className="max-w-md mx-4 bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">{selectedArchiveContest.title}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {selectedArchiveContest.participants} participants • {selectedArchiveContest.totalVotes.toLocaleString()} votes
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Contest Entries Grid */}
              <div>
                <h4 className="font-medium text-foreground mb-3">Contest Entries</h4>
                <div className="grid grid-cols-3 gap-1">
                  {selectedArchiveContest.memes?.map((meme: any) => (
                    <button
                      key={meme.id}
                      onClick={() => setSelectedArchiveMeme(meme)}
                      className="aspect-square bg-accent flex items-center justify-center hover:opacity-90 transition-opacity relative group"
                    >
                      <img
                        src={meme.imageUrl}
                        alt={meme.title}
                        className="w-full h-full object-cover"
                      />
                      {/* Ranking indicator */}
                      {meme.rank <= 3 && (
                        <div className="absolute top-1 left-1">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            meme.rank === 1 ? 'bg-yellow-400 text-black' :
                            meme.rank === 2 ? 'bg-gray-400 text-white' :
                            'bg-orange-400 text-white'
                          }`}>
                            {meme.rank === 1 ? '🏆' : meme.rank === 2 ? '🥈' : '🥉'}
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="text-white text-center">
                          <div className="text-sm font-semibold">{meme.votes}</div>
                          <div className="text-xs">votes</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contest Stats */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">{selectedArchiveContest.participants}</div>
                  <div className="text-xs text-muted-foreground">Participants</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">{selectedArchiveContest.totalVotes.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Total Votes</div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => setSelectedArchiveContest(null)}
                variant="outline"
                className="w-full"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Archive Meme Detail Modal */}
      {selectedArchiveMeme && (
        <Dialog open={!!selectedArchiveMeme} onOpenChange={() => setSelectedArchiveMeme(null)}>
          <DialogContent className="max-w-md mx-4 bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">{selectedArchiveMeme.title}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="aspect-square rounded-lg overflow-hidden">
                <img 
                  src={selectedArchiveMeme.imageUrl} 
                  alt={selectedArchiveMeme.title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-foreground">
                    {selectedArchiveMeme.author.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{selectedArchiveMeme.author}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedArchiveMeme.votes.toLocaleString()} votes • #{selectedArchiveMeme.rank} place
                  </div>
                </div>
                {selectedArchiveMeme.rank <= 3 && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    selectedArchiveMeme.rank === 1 ? 'bg-yellow-400 text-black' :
                    selectedArchiveMeme.rank === 2 ? 'bg-gray-400 text-white' :
                    'bg-orange-400 text-white'
                  }`}>
                    {selectedArchiveMeme.rank === 1 ? '🏆' : selectedArchiveMeme.rank === 2 ? '🥈' : '🥉'}
                  </div>
                )}
              </div>
              
              {selectedArchiveMeme.description && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Description</h4>
                  <p className="text-muted-foreground">{selectedArchiveMeme.description}</p>
                </div>
              )}
              
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Contest: {selectedArchiveContest?.title}
                </div>
                <Button
                  onClick={() => setSelectedArchiveMeme(null)}
                  variant="outline"
                  size="sm"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}