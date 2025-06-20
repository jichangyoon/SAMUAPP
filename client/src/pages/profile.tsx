import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { User, Vote, Trophy, Upload, Zap, Settings, Camera, Save, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface ProfileProps {
  samuBalance: number;
  solBalance: number;
}

export default function Profile({ samuBalance, solBalance }: ProfileProps) {
  const { user } = usePrivy();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  // 지갑 주소 가져오기
  const walletAddress = user?.linkedAccounts?.find(account => account.type === 'wallet')?.address || '';

  // 로컬 스토리지에서 프로필 정보 가져오기
  const getStoredProfile = () => {
    const stored = localStorage.getItem(`profile_${user?.id}`);
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      displayName: user?.email?.address?.split('@')[0] || 'User',
      profileImage: ''
    };
  };

  // 컴포넌트 마운트 시 저장된 프로필 정보 로드
  useState(() => {
    const storedProfile = getStoredProfile();
    setDisplayName(storedProfile.displayName);
    setProfileImage(storedProfile.profileImage);
  });

  // 이미지 업로드 핸들러
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 프로필 저장
  const handleSaveProfile = () => {
    const profileData = {
      displayName,
      profileImage: imagePreview || profileImage
    };
    
    localStorage.setItem(`profile_${user?.id}`, JSON.stringify(profileData));
    
    if (imagePreview) {
      setProfileImage(imagePreview);
      setImagePreview('');
    }
    
    setIsEditing(false);
    
    toast({
      title: "Profile Updated",
      description: "Your profile has been saved successfully.",
    });

    // 쿼리 캐시 무효화
    queryClient.invalidateQueries({
      queryKey: ['profile', user?.id]
    });

    // 홈 페이지의 헤더 데이터도 업데이트
    queryClient.setQueryData(['userProfile'], {
      displayName,
      image: imagePreview || profileImage
    });
  };

  // 편집 취소
  const handleCancelEdit = () => {
    const storedProfile = getStoredProfile();
    setDisplayName(storedProfile.displayName || user?.email?.address?.split('@')[0] || 'User');
    setProfileImage(storedProfile.profileImage || '');
    setImagePreview('');
    setIsEditing(false);
  };

  // 사용자가 만든 밈들 가져오기
  const { data: allMemes = [] } = useQuery<any[]>({
    queryKey: ['/api/memes'],
  });

  // 사용자가 투표한 밈들 가져오기  
  const { data: userVotes = [] } = useQuery<any[]>({
    queryKey: ['/api/votes', walletAddress],
    enabled: !!walletAddress,
  });

  // 투표력 데이터 가져오기
  const { data: votingPowerData } = useQuery<any>({
    queryKey: ['/api/voting-power', walletAddress],
    enabled: !!walletAddress,
  });

  // 필터링된 사용자 밈들
  const myMemes = allMemes.filter((meme: any) => meme.authorWallet === walletAddress);

  const totalVotesReceived = myMemes.reduce((sum: number, meme: any) => sum + meme.votes, 0);
  const contestProgress = 75; // 임시 값, 실제로는 콘테스트 기간 계산

  // 투표력 계산
  const votingPower = votingPowerData?.remainingPower ?? Math.floor(samuBalance * 0.8);
  const totalVotingPower = votingPowerData?.totalPower ?? samuBalance;
  const usedVotingPower = votingPowerData?.usedPower ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background border-b border-border py-1">
        <div className="flex items-center justify-between px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-foreground hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-lg font-bold text-foreground">My Profile</h1>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* 사용자 기본 정보 */}
        <Card className="bg-gradient-to-r from-primary/20 to-primary/10 border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={imagePreview || profileImage} />
                  <AvatarFallback className="bg-primary/20 text-primary text-lg">
                    {displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <label className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer hover:bg-primary/80">
                    <Camera className="h-3 w-3" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your display name"
                    />
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{displayName}</h3>
                    <p className="text-sm text-muted-foreground">{user?.email?.address}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button
                      onClick={handleSaveProfile}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                    <Button onClick={handleCancelEdit} variant="outline" size="sm">
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    size="sm"
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{samuBalance.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">SAMU Tokens</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{solBalance.toFixed(4)}</div>
                <div className="text-sm text-muted-foreground">SOL Balance</div>
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
        <Tabs defaultValue="memes" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="memes" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              My Memes
            </TabsTrigger>
            <TabsTrigger value="votes" className="flex items-center gap-2">
              <Vote className="h-4 w-4" />
              My Votes
            </TabsTrigger>
            <TabsTrigger value="power" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Voting Power
            </TabsTrigger>
          </TabsList>

          <TabsContent value="memes" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">My Memes ({myMemes.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {myMemes.length > 0 ? (
                  <div className="space-y-4">
                    {myMemes.map((meme: any) => (
                      <div key={meme.id} className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                        <img 
                          src={meme.imageUrl} 
                          alt={meme.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">{meme.title}</h4>
                          <p className="text-sm text-muted-foreground">{meme.description}</p>
                        </div>
                        <Badge variant="secondary" className="text-primary">
                          {meme.votes} votes
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No memes uploaded yet</p>
                    <p className="text-sm">Start creating to see your memes here!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="votes" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">My Votes ({userVotes.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {userVotes.length > 0 ? (
                  <div className="space-y-4">
                    {userVotes.map((vote: any) => {
                      const meme = allMemes.find((m: any) => m.id === vote.memeId);
                      return meme ? (
                        <div key={vote.id} className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                          <img 
                            src={meme.imageUrl} 
                            alt={meme.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground">{meme.title}</h4>
                            <p className="text-sm text-muted-foreground">by {meme.authorName}</p>
                          </div>
                          <Badge variant="secondary" className="text-green-400">
                            +{vote.votingPower} power
                          </Badge>
                        </div>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Vote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No votes cast yet</p>
                    <p className="text-sm">Start voting to see your activity here!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="power" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg text-foreground flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Voting Power Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{totalVotingPower.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Total Power</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{usedVotingPower.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Used Power</div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Remaining Power</span>
                    <span className="text-sm font-medium text-foreground">
                      {votingPower.toLocaleString()} / {totalVotingPower.toLocaleString()}
                    </span>
                  </div>
                  <Progress 
                    value={(votingPower / totalVotingPower) * 100} 
                    className="h-2"
                  />
                </div>
                
                <div className="text-sm text-muted-foreground bg-accent/50 p-3 rounded-lg">
                  <p>• Voting power is based on your SAMU token balance</p>
                  <p>• Each vote consumes voting power</p>
                  <p>• Power resets when the contest ends</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}