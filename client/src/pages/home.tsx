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
import { User, Grid3X3, List } from "lucide-react";
import { getSamuTokenBalance } from "@/lib/solana";
import type { Meme } from "@shared/schema";
import samuLogoImg from "/assets/images/logos/samu-logo.jpg";

export default function Home() {
  const [sortBy, setSortBy] = useState("votes");
  const [currentTab, setCurrentTab] = useState("contest");
  const [viewMode, setViewMode] = useState<'card' | 'grid'>('card');
  const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null);
  const [samuBalance, setSamuBalance] = useState<number>(0);
  const [balanceStatus, setBalanceStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showUserProfile, setShowUserProfile] = useState(false);
  
  // Privy authentication
  const { authenticated, user } = usePrivy();
  
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
        <div className="max-w-md mx-auto px-4 py-3">
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



      {/* Main Navigation */}
      <nav className="max-w-md mx-auto px-4 py-3 bg-card border-b border-border">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-10">
            <TabsTrigger value="contest" className="text-sm">Meme Contest</TabsTrigger>
            <TabsTrigger value="goods" className="text-sm">Goods Shop</TabsTrigger>
          </TabsList>
          
          <TabsContent value="contest" className="mt-4">
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
          
          <TabsContent value="goods" className="mt-4">
            <GoodsShop />
          </TabsContent>
        </Tabs>
      </nav>

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
                  onClick={() => {
                    setSelectedMeme(null);
                    // Trigger vote logic here if needed
                  }}
                  disabled={!isConnected}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  Vote
                </Button>
                <Button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: selectedMeme.title,
                        text: selectedMeme.description ?? "",
                        url: window.location.href,
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="px-4"
                >
                  Share
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}