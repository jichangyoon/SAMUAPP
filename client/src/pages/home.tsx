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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSamuTokenBalance } from "@/lib/solana";
import type { Meme } from "@shared/schema";
import samuLogoImg from "/assets/images/logos/samu-logo.jpg";

export default function Home() {
  const [sortBy, setSortBy] = useState("votes");
  const [currentTab, setCurrentTab] = useState("contest");
  const [samuBalance, setSamuBalance] = useState<number>(0);
  const [balanceStatus, setBalanceStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showUserProfile, setShowUserProfile] = useState(false);
  
  // Privy authentication
  const { authenticated, user } = usePrivy();
  
  // Get wallet info from Privy
  const walletAccounts = user?.linkedAccounts?.filter(account => account.type === 'wallet') || [];
  const solanaWallet = walletAccounts.find(w => w.chainType === 'solana');
  const selectedWalletAccount = solanaWallet || walletAccounts[0];
  
  const isConnected = authenticated && !!selectedWalletAccount;
  const walletAddress = selectedWalletAccount?.address || '';
  const isSolana = selectedWalletAccount?.chainType === 'solana';
  
  // Debug Privy state
  useEffect(() => {
    console.log('🔍 Privy State Debug:', {
      authenticated,
      userExists: !!user,
      walletAccounts: walletAccounts.length,
      hasSelectedWallet: !!selectedWalletAccount,
      isConnected,
      walletAddress: walletAddress || 'none',
      chainType: selectedWalletAccount?.chainType || 'none'
    });
  }, [authenticated, user, isConnected, walletAddress]);

  // Complete data cleanup on wallet change
  useEffect(() => {
    if (!authenticated) {
      console.log('🧹 User not authenticated - clearing all data');
      setSamuBalance(0);
      setBalanceStatus('idle');
      // Clear any cached wallet data
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.includes('phantom') || key.includes('wallet') || key.includes('samu')) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('Failed to clear localStorage:', error);
      }
    }
  }, [authenticated]);

  // Fetch SAMU balance for Solana wallets
  useEffect(() => {
    if (isConnected && walletAddress && isSolana) {
      console.log('💰 Fetching SAMU balance for:', walletAddress);
      setBalanceStatus('loading');
      // Clear previous balance immediately
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
              <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center samu-wolf-logo overflow-hidden">
                <img 
                  src={samuLogoImg} 
                  alt="SAMU Wolf" 
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="text-lg font-bold text-primary">SAMU</span>
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
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-32 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="votes">Most Votes</SelectItem>
                          <SelectItem value="latest">Latest</SelectItem>
                          <SelectItem value="trending">Trending</SelectItem>
                        </SelectContent>
                      </Select>
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
    </div>
  );
}