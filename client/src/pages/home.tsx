import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from "react";
import { useQuery } from "@tanstack/react-query";
import { WalletConnect } from "@/components/wallet-connect";
import { MemeDetailModal } from "@/components/meme-detail-modal";
import { ContestTab } from "@/components/contest-tab";
import { ArchiveTab } from "@/components/archive-tab";
import { RewardsTab } from "@/components/rewards-tab";

const UploadForm = lazy(() => import("@/components/upload-form").then(m => ({ default: m.UploadForm })));
const GoodsShop = lazy(() => import("@/components/goods-shop").then(m => ({ default: m.GoodsShop })));

import { usePrivy } from '@privy-io/react-auth';
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { useUniversalSignTransaction } from "@/hooks/use-universal-sign-transaction";
import { Transaction } from '@solana/web3.js';
import { getSharedConnection } from "@/lib/solana";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, ArrowUp, Share2, Twitter, Send, Trophy, ShoppingBag, Archive, Users, RefreshCw, Coins } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Meme } from "@shared/schema";
const samuLogoImg = "data:image/webp;base64,UklGRrIDAABXRUJQVlA4IKYDAADQEgCdASpQAFAAPpE+mUilo6KhKln8OLASCWYA0TgXrXRmdtx5gNz/6hP0AOlMrPON272fiOF2VZYytZuMn0Y88z0x7A36y9bP0cEKXAQU/gsM8DKs3633nJ48B5/uohDLug0w3H/i7C7dYNpmJK7xPJRHlIYkOa4JRrFvpPYEFz6hjw6qvEwYoMBWg2irraumyNEu3rSc1jPrL9yRZgAA/voqy//ow//ww//ww/fS+6FwLNffePf8nJGwjZT7KWSoFZjdokFdm2fH4jK6MqqY57bqf87zfhZjrde8+2g5772UOVMW6e7YxVXpI+yInlxJOMQrHFjypJJybZAx8g9Ynv9gkEE2nRyzPWrnvM9TWhyEYAeRLlC5YmXFU236WDXQeKKqfl2xgN5MeDAJSi50JTBXUiw4v55B9NVc4ra0n6bAev6XBzlJX43kNyfDKxDdxTNFyAa2JetdizMdRqHF5ezA3q9q2YxbU1O2lCBrkAvVkGV8Hc/gEl0GzaJXBjeMIwTSD2PhYXMfw61r7w6f+O27yvE8pZwYuKt6GISmUR/5LYVbaS2JFCSxcZqDS2rhCtBr0CCvpCJeHlPt8+5vcCAlY0Fjh/47AAWvnDrW+iFdD+9YNEdj0wHiegU7pYhEhzFXWPTxCfE+dq4wVdKOm3U79dBXFl9o8yxG8Fb2VQRb9bxdt5Ost+uCdOTxtY3uftXHdrrF3tQwM6vXmX81acxszGMtH/p/pUVTC3spr8eA2KrfUrQh4Wp9Txr2mecQtNk5zu4fbjpLj6FQ5POFrQJtnB8TOV3dXDZ/H1Cv9rSdAPq4rLOWeIlgQLqKf53zpidyUpvCllPIgWFq25wSoetN3ajg4zsx0ipGbq0Jx9w/sqf739zdCKlUJRXuJ3cd7rn2r/aJRECcgjyd0GJ/wh8XWekubLKAOo8LEOH6KbtZUXd5vICIbHpmK1CvbjA31FLfbP5e7a9x0zp4lQXVPTMuk4Tdgu2am5thtVv1WG6EyiecbqQcMNaskYPuaItffxhrUU3ycV7047RQF1hdc6boITPBjCZ7ziMfiKlk9tCWpNw9wSJKc6IvjJTcFnoWmQKwgbtpsIRb6QvzBFnujuUMWEo2wCY/PqjAbbaqOjBSzo2unAVIQ6efDIq8m//zObjrAEjakgD6WpLG/3/B3F8/hY2lxfgbHeSYqIsfnliOdyZ5+UsJasyam+SZlrF0wegeXYv5uNqsMAp7fPl5my3MgAAA";
import { useSamuBalance } from "@/hooks/use-samu-balance";

export default function Home() {
  const samuBalanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentTab, setCurrentTab] = useState("contest");
  const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null);
  const [votingMeme, setVotingMeme] = useState<Meme | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);

  const [showVoteDialog, setShowVoteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [voteAmount, setVoteAmount] = useState(1);
  const [voteInputValue, setVoteInputValue] = useState('1');
  const [, setLocation] = useLocation();

  const { authenticated, user } = usePrivy();
  const { toast } = useToast();

  const solConnection = useMemo(() => getSharedConnection(), []);

  const { walletAddress, isConnected } = useWalletAddress();
  const signTransaction = useUniversalSignTransaction(walletAddress);

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-header', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      const res = await fetch(`/api/users/profile/${walletAddress}`);
      return res.json();
    },
    enabled: !!walletAddress && authenticated,
    staleTime: 30000,
  });

  const { data: samuBalanceData } = useSamuBalance(walletAddress);
  const samuBalance = samuBalanceData?.balance || 0;

  const [profileOverride, setProfileOverride] = useState<{ displayName: string; profileImage: string } | null>(null);

  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      setProfileOverride({
        displayName: event.detail.displayName,
        profileImage: event.detail.profileImage || event.detail.avatarUrl || ''
      });
    };

    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
  }, []);

  useEffect(() => {
    if (userProfile && profileOverride) {
      setProfileOverride(null);
    }
  }, [userProfile]);

  const displayName = !authenticated
    ? 'SAMU'
    : profileOverride?.displayName
      || userProfile?.displayName
      || (userProfile === undefined ? '' : (user?.email?.address?.split('@')[0] || 'User'));
  const profileImage = profileOverride?.profileImage || userProfile?.avatarUrl || '';

  useEffect(() => {
    if (samuBalance && voteAmount > samuBalance) {
      setVoteAmount(Math.min(1, samuBalance));
    }
  }, [samuBalance, voteAmount]);

  useEffect(() => {
    return () => {
      if (samuBalanceTimerRef.current) clearTimeout(samuBalanceTimerRef.current);
    };
  }, []);

  const handleVoteUpdate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/memes'], exact: false });
    if (samuBalanceTimerRef.current) clearTimeout(samuBalanceTimerRef.current);
    samuBalanceTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['samu-balance'] });
      samuBalanceTimerRef.current = null;
    }, 5000);
  }, [queryClient]);

  const executeOnChainVote = useCallback(async (memeId: number, amount: number): Promise<string> => {
    const prepareRes = await fetch('/api/memes/prepare-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voterWallet: walletAddress, samuAmount: amount })
    });

    if (!prepareRes.ok) {
      const err = await prepareRes.json();
      throw new Error(err.message || 'Failed to prepare transaction');
    }

    const { transaction: serializedTx } = await prepareRes.json();
    const transaction = Transaction.from(Buffer.from(serializedTx, 'base64'));

    const signedTx = await signTransaction(transaction, solConnection);
    const txSignature = await solConnection.sendRawTransaction(signedTx.serialize());

    await solConnection.confirmTransaction(txSignature, 'confirmed');

    return txSignature;
  }, [walletAddress, signTransaction, solConnection]);

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  const shareToTwitter = useCallback((meme: Meme) => {
    const text = `Check out this awesome meme: "${meme.title}" by ${meme.authorUsername} 🔥`;
    const url = window.location.href;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
  }, []);

  const shareToTelegram = useCallback((meme: Meme) => {
    const text = `Check out this awesome meme: "${meme.title}" by ${meme.authorUsername}`;
    const url = window.location.href;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank');
  }, []);

  useEffect(() => {
    const handleMemeUpload = () => {
      queryClient.refetchQueries({ queryKey: ['/api/memes'], type: 'active' });
    };

    window.addEventListener('memeUploaded', handleMemeUpload);
    return () => window.removeEventListener('memeUploaded', handleMemeUpload);
  }, [queryClient]);

  const handleMemeClick = useCallback((meme: Meme) => {
    setSelectedMeme(meme);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-card shadow-sm border-b border-border">
        <div className="max-w-md mx-auto px-4 py-1">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setLocation('/profile')}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity min-w-0 flex-shrink"
            >
              {authenticated ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : displayName ? (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-bold text-sm">
                          {displayName.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 animate-pulse" />
                    )}
                  </div>
                  {displayName ? (
                    <span className="text-lg font-bold text-primary truncate">{displayName}</span>
                  ) : (
                    <div className="h-5 w-20 bg-primary/10 rounded animate-pulse" />
                  )}
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-transparent flex items-center justify-center samu-wolf-logo overflow-hidden flex-shrink-0">
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
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="text-foreground hover:bg-accent"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <WalletConnect />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">

          <TabsContent value="contest" className="mt-4 space-y-4 pb-24">
            <ContestTab
              isConnected={isConnected}
              walletAddress={walletAddress}
              onVoteUpdate={handleVoteUpdate}
              onMemeClick={handleMemeClick}
              onSubmitMeme={() => setShowUploadForm(true)}
            />
          </TabsContent>

          <TabsContent value="archive" className="mt-4 space-y-4 pb-24">
            <ArchiveTab walletAddress={walletAddress} />
          </TabsContent>

          <TabsContent value="goods" className="mt-4 space-y-4 pb-24">
            <Suspense fallback={<div className="min-h-[200px]" />}>
              <GoodsShop />
            </Suspense>
          </TabsContent>

          <TabsContent value="rewards" className="mt-4 space-y-4 pb-24">
            <RewardsTab walletAddress={walletAddress} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="max-w-md mx-auto px-4 py-1">
          <div className="grid grid-cols-5 gap-0">
            <button
              onClick={() => setCurrentTab("contest")}
              className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-lg transition-colors ${
                currentTab === "contest"
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Trophy className="h-4 w-4" />
              <span className="text-[10px] mt-0.5">Contest</span>
            </button>
            <button
              onClick={() => setCurrentTab("archive")}
              className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-lg transition-colors ${
                currentTab === "archive"
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Archive className="h-4 w-4" />
              <span className="text-[10px] mt-0.5">Archive</span>
            </button>
            <button
              onClick={() => setCurrentTab("goods")}
              className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-lg transition-colors ${
                currentTab === "goods"
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="text-[10px] mt-0.5">Goods</span>
            </button>
            <button
              onClick={() => setCurrentTab("rewards")}
              className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-lg transition-colors ${
                currentTab === "rewards"
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Coins className="h-4 w-4" />
              <span className="text-[10px] mt-0.5">Rewards</span>
            </button>
            <button
              onClick={() => setLocation("/partners")}
              className="flex flex-col items-center justify-center py-2 px-0.5 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            >
              <Users className="h-4 w-4" />
              <span className="text-[10px] mt-0.5">Partners</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid View Meme Detail Modal */}
      {selectedMeme && (
        <MemeDetailModal
          isOpen={!!selectedMeme}
          onClose={() => setSelectedMeme(null)}
          meme={selectedMeme}
          onVote={() => {
            setVotingMeme(selectedMeme);
            setSelectedMeme(null);
            setShowVoteDialog(true);
          }}
          canVote={isConnected}
        />
      )}

      {/* Grid View Vote Confirmation Drawer */}
      {votingMeme && (
        <Drawer open={showVoteDialog} onOpenChange={setShowVoteDialog}>
          <DrawerContent className="bg-card border-border max-h-[85dvh]">
            <DrawerHeader>
              <DrawerTitle className="text-foreground">Confirm Your Vote</DrawerTitle>
              <DrawerDescription className="text-muted-foreground">
                You're about to vote for "{votingMeme.title}" by {votingMeme.authorUsername}
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4 pb-4 overflow-y-auto flex-1">
              <div className="bg-accent rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Your SAMU balance:</span>
                  <span className="font-semibold text-primary">{samuBalance.toLocaleString()}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Enter the amount of SAMU you want to vote with
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="vote-amount" className="text-sm font-medium text-foreground">
                    SAMU Amount: {voteAmount.toLocaleString()}
                  </Label>
                  <div className="mt-2">
                    <Slider
                      id="vote-amount"
                      min={1}
                      max={Math.max(1, samuBalance)}
                      step={1}
                      value={[voteAmount]}
                      onValueChange={(value) => { setVoteAmount(value[0]); setVoteInputValue(value[0].toString()); }}
                      className="w-full"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>1</span>
                    <span>{samuBalance.toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="vote-input" className="text-sm font-medium text-foreground">
                    Or enter amount directly:
                  </Label>
                  <Input
                    id="vote-input"
                    type="number"
                    min={1}
                    max={samuBalance}
                    value={voteInputValue}
                    onChange={(e) => {
                      setVoteInputValue(e.target.value);
                      const parsed = parseInt(e.target.value);
                      if (!isNaN(parsed) && parsed >= 1) {
                        setVoteAmount(Math.min(samuBalance, parsed));
                      }
                    }}
                    onBlur={() => {
                      const parsed = parseInt(voteInputValue);
                      const clamped = Math.max(1, Math.min(samuBalance, isNaN(parsed) ? 1 : parsed));
                      setVoteInputValue(clamped.toString());
                      setVoteAmount(clamped);
                    }}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <DrawerFooter className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowVoteDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!votingMeme || !walletAddress) return;

                  if (samuBalance < voteAmount) {
                    toast({
                      title: "Insufficient SAMU Balance",
                      description: `You need ${voteAmount} SAMU but only have ${samuBalance.toLocaleString()}.`,
                      variant: "destructive",
                    });
                    return;
                  }

                  setIsVoting(true);

                  try {
                    toast({
                      title: "Preparing transaction...",
                      description: `Sending ${voteAmount.toLocaleString()} SAMU to treasury`,
                      duration: 5000
                    });

                    const txSignature = await executeOnChainVote(votingMeme.id, voteAmount);

                    await apiRequest("POST", `/api/memes/${votingMeme.id}/vote`, {
                      voterWallet: walletAddress,
                      samuAmount: voteAmount,
                      txSignature
                    });

                    toast({
                      title: "Vote Submitted!",
                      description: `Sent ${voteAmount.toLocaleString()} SAMU on-chain. Tx: ${txSignature.slice(0, 8)}...`,
                      duration: 3000
                    });

                    setShowVoteDialog(false);
                    setVotingMeme(null);

                    setTimeout(() => {
                      queryClient.invalidateQueries({ queryKey: ['samu-balance', walletAddress] });
                    }, 5000);
                    queryClient.invalidateQueries({ queryKey: ['/api/memes'] });
                    queryClient.invalidateQueries({ queryKey: ['user-votes'] });
                    queryClient.invalidateQueries({ queryKey: ['user-stats'] });
                  } catch (error: any) {
                    const msg = error.message || "Failed to submit vote.";
                    toast({
                      title: "Voting Failed",
                      description: msg.includes("User rejected") ? "Transaction was cancelled." : msg,
                      variant: "destructive",
                      duration: 3000
                    });
                  } finally {
                    setIsVoting(false);
                  }
                }}
                disabled={isVoting}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isVoting ? "Voting..." : "Confirm Vote"}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}

      {/* Share Drawer */}
      {selectedMeme && (
        <Drawer open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DrawerContent className="bg-card border-border max-h-[90dvh]">
            <DrawerHeader>
              <DrawerTitle className="text-foreground">Share Meme</DrawerTitle>
              <DrawerDescription className="text-muted-foreground">
                Share "{selectedMeme.title}" on social platforms
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4 pb-4 overflow-y-auto flex-1 flex flex-col gap-3">
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
          </DrawerContent>
        </Drawer>
      )}

      {/* Upload Form Drawer */}
      <Drawer
        open={showUploadForm}
        onOpenChange={setShowUploadForm}
        shouldScaleBackground={false}
      >
        <DrawerContent className="bg-card border-border max-h-[85dvh]">
          <DrawerHeader className="py-2">
            <DrawerTitle className="text-foreground text-base">Submit New Meme</DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-6 overflow-y-auto flex-1">
            <Suspense fallback={<div className="flex justify-center py-8"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
              <UploadForm
                onClose={() => setShowUploadForm(false)}
                onSuccess={() => {
                  setShowUploadForm(false);
                  queryClient.refetchQueries({ queryKey: ['/api/memes'], type: 'active' });
                }}
              />
            </Suspense>
          </div>
        </DrawerContent>
      </Drawer>

    </div>
  );
}
