import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { usePrivy } from '@privy-io/react-auth';
import { useQuery } from "@tanstack/react-query";
import { UploadForm } from "@/components/upload-form";
import { User, Vote, Trophy, Upload, Zap } from "lucide-react";

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  samuBalance: number;
}

export function UserProfile({ isOpen, onClose, samuBalance, votingPower }: UserProfileProps) {
  const { user } = usePrivy();
  
  // 사용자가 만든 밈들 가져오기
  const { data: allMemes = [] } = useQuery<any[]>({
    queryKey: ['/api/memes'],
  });

  // 사용자가 투표한 밈들 가져오기  
  const { data: userVotes = [] } = useQuery<any[]>({
    queryKey: ['/api/votes', user?.wallet?.address],
    enabled: !!user?.wallet?.address,
  });

  const walletAddress = user?.wallet?.address || user?.linkedAccounts?.find(account => account.type === 'wallet')?.address || '';
  const displayAddress = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '';
  
  // 필터링된 사용자 밈들
  const myMemes = allMemes.filter((meme: any) => meme.authorWallet === walletAddress);
  
  const totalVotesReceived = myMemes.reduce((sum: number, meme: any) => sum + meme.votes, 0);
  const contestProgress = 75; // 임시 값, 실제로는 콘테스트 기간 계산

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl text-foreground flex items-center gap-2">
            <User className="h-6 w-6" />
            My SAMU Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 사용자 기본 정보 */}
          <Card className="bg-gradient-to-r from-primary/20 to-primary/10 border-border">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{samuBalance.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">SAMU Tokens</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{votingPower.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Voting Power</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{myMemes.length}</div>
                  <div className="text-sm text-muted-foreground">Memes Created</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{totalVotesReceived}</div>
                  <div className="text-sm text-muted-foreground">Votes Received</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 콘테스트 진행 상황 */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Contest Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Contest Progress</span>
                  <span className="text-foreground font-medium">{contestProgress}%</span>
                </div>
                <div className="w-full bg-accent rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${contestProgress}%` }}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Voting power will be restored when the contest ends
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 탭 메뉴 */}
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Meme
              </TabsTrigger>
              <TabsTrigger value="my-memes" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                My Memes
              </TabsTrigger>
              <TabsTrigger value="voting-history" className="flex items-center gap-2">
                <Vote className="h-4 w-4" />
                Voting History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-6">
              <UploadForm onSuccess={onClose} />
            </TabsContent>

            <TabsContent value="my-memes" className="mt-6">
              <div className="space-y-4">
                {myMemes.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">You haven't created any memes yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  myMemes.map((meme: any) => (
                    <Card key={meme.id} className="border-border bg-card">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <img
                            src={meme.imageUrl}
                            alt={meme.title}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h4 className="font-bold text-foreground">{meme.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{meme.description}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <Badge variant="secondary">
                                <Zap className="h-3 w-3 mr-1" />
                                {meme.votes} votes
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Created: {new Date(meme.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="voting-history" className="mt-6">
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Voting history feature coming soon!</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Track your voting activity and power usage here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}