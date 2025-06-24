import { useState, useEffect } from "react";
import * as React from "react";
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
import { User, Vote, Trophy, Upload, Zap, Settings, Camera, Save, ArrowLeft, Copy, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { SendTokens } from "@/components/send-tokens";

const Profile = React.memo(() => {
  const { user } = usePrivy();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  // 지갑 주소 가져오기 (홈과 동일한 로직)
  const walletAccounts = user?.linkedAccounts?.filter(account => account.type === 'wallet') || [];
  const solanaWallet = walletAccounts.find(w => w.chainType === 'solana');
  const selectedWalletAccount = solanaWallet || walletAccounts[0];
  const walletAddress = selectedWalletAccount?.address || '';

  // User profile data
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      const res = await fetch(`/api/users/profile/${walletAddress}`);
      return res.json();
    },
    enabled: !!walletAddress,
  });

  // User statistics
  const { data: userStats } = useQuery({
    queryKey: ['user-stats', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      const res = await fetch(`/api/users/${walletAddress}/stats`);
      return res.json();
    },
    enabled: !!walletAddress,
  });

  // User memes
  const { data: userMemes = [] } = useQuery({
    queryKey: ['user-memes', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      const res = await fetch(`/api/users/${walletAddress}/memes`);
      return res.json();
    },
    enabled: !!walletAddress,
  });

  // User votes
  const { data: userVoteHistory = [] } = useQuery({
    queryKey: ['user-votes', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      const res = await fetch(`/api/users/${walletAddress}/votes`);
      return res.json();
    },
    enabled: !!walletAddress,
  });

  // Balance fetching with React Query - 중복 요청 방지
  const { data: samuData } = useQuery({
    queryKey: ['samu-balance', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return { balance: 0 };
      const res = await fetch(`/api/samu-balance/${walletAddress}`);
      return res.json();
    },
    enabled: !!walletAddress,
    staleTime: 30000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  const { data: solData } = useQuery({
    queryKey: ['sol-balance', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return { balance: 0 };
      const res = await fetch(`/api/sol-balance/${walletAddress}`);
      return res.json();
    },
    enabled: !!walletAddress,
    staleTime: 30000, // 30초 동안 캐시 유지
    refetchInterval: false, // 자동 갱신 비활성화
    refetchOnWindowFocus: false, // 창 포커스 시 갱신 비활성화
  });

  // 저장된 프로필 가져오기 - useMemo로 최적화
  const getStoredProfile = React.useMemo(() => {
    if (!user?.id) return { displayName: '', profileImage: '' };

    const stored = localStorage.getItem(`profile_${user?.id}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Failed to parse stored profile:', error);
      }
    }
    return { displayName: '', profileImage: '' };
  }, [user?.id]);

  // Load profile data from database, not localStorage
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || user?.email?.address?.split('@')[0] || 'User');
      setProfileImage(userProfile.avatarUrl || '');
      // console.log('Profile loaded from database:', { displayName: userProfile.displayName, avatarUrl: userProfile.avatarUrl });
    } else {
      setDisplayName(user?.email?.address?.split('@')[0] || 'User');
      setProfileImage('');
    }
  }, [userProfile, user?.email?.address]);

  // Handle image upload to R2
  const handleImageChange = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('=== PROFILE IMAGE UPLOAD STARTED (Profile Page) ===');
    console.log('File selected:', { name: file.name, size: file.size, type: file.type });

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPEG, PNG, GIF, WebP)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    try {
      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
      };
      reader.readAsDataURL(file);

      // Upload to R2
      const formData = new FormData();
      formData.append('image', file);
      formData.append('walletAddress', walletAddress); // Include wallet address for old image cleanup

      console.log('Starting profile image upload to /api/uploads/profile');
      const response = await fetch('/api/uploads/profile', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Profile image upload failed');
      }

      const result = await response.json();

      if (result.success && result.profileUrl) {
        // Update profile image with R2 URL
        setProfileImage(result.profileUrl);
        
        // Update database with new profile data
        await updateProfile(displayName, result.profileUrl);
        
        // Force immediate header sync
        console.log('Dispatching image update event:', { displayName, profileImage: result.profileUrl });
        window.dispatchEvent(new CustomEvent('profileUpdated', {
          detail: { 
            displayName, 
            profileImage: result.profileUrl,
            avatarUrl: result.profileUrl
          }
        }));
        
        // Force query invalidation for immediate header update
        queryClient.invalidateQueries({ queryKey: ['user-profile-header', walletAddress] });
        
        toast({
          title: "Profile Image Updated",
          description: "Your profile image has been uploaded successfully"
        });
      }

    } catch (error) {
      console.error('Profile image upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload profile image. Please try again.",
        variant: "destructive"
      });
    }
  }, [displayName, toast]);

  // Update profile function
  const updateProfile = async (name: string, imageUrl?: string) => {
    try {
      console.log('Updating profile:', { walletAddress, displayName: name, avatarUrl: imageUrl || profileImage });
      
      const response = await fetch(`/api/users/profile/${walletAddress}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          displayName: name,
          avatarUrl: imageUrl || profileImage
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Profile update successful:', result);
        
        // Invalidate specific profile queries
        queryClient.invalidateQueries({ queryKey: ['user-profile-header', walletAddress] });
        queryClient.invalidateQueries({ queryKey: [`/api/users/profile/${walletAddress}`] });
        
        // Force immediate header update
        console.log('Dispatching profile update event:', { displayName: name, profileImage: imageUrl || profileImage });
        window.dispatchEvent(new CustomEvent('profileUpdated', {
          detail: { 
            displayName: name, 
            profileImage: imageUrl || profileImage,
            avatarUrl: imageUrl || profileImage
          }
        }));
        
        return true;
      } else {
        const errorData = await response.json();
        console.error('Profile update failed:', response.status, errorData);
        return false;
      }
    } catch (error) {
      console.error('Profile update error:', error);
      return false;
    }
  };

  // Save profile changes
  const handleSaveProfile = React.useCallback(async () => {
    if (!displayName.trim()) {
      toast({
        title: "Invalid Name",
        description: "Display name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    console.log('Saving profile with name:', displayName.trim());
    const success = await updateProfile(displayName.trim(), profileImage);
    
    if (success) {
      setIsEditing(false);
      setImagePreview('');
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully."
      });
    } else {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  }, [displayName, profileImage, walletAddress, toast, queryClient, updateProfile]);

  // Cancel editing
  const handleCancelEdit = React.useCallback(() => {
    // Reset to database values
    if (userProfile) {
      setDisplayName(userProfile.displayName || user?.email?.address?.split('@')[0] || 'User');
      setProfileImage(userProfile.avatarUrl || '');
    } else {
      setDisplayName(user?.email?.address?.split('@')[0] || 'User');
      setProfileImage('');
    }
    setImagePreview('');
    setIsEditing(false);
  }, [userProfile, user?.email?.address]);



  // Calculate statistics from user data
  const currentSamuBalance = samuData?.balance || 0;
  const currentSolBalance = solData?.balance || 0;
  
  // User statistics calculations
  const totalMemesCreated = userStats?.totalMemes || 0;
  const totalVotesReceived = userStats?.totalMemesVotes || 0;
  const totalVotesCast = userStats?.totalVotesCast || 0;
  const totalVotingPowerUsed = userStats?.totalVotingPowerUsed || 0;
  const remainingVotingPower = userStats?.remainingVotingPower || Math.floor(currentSamuBalance * 0.8);
  const totalVotingPower = userStats?.samuBalance || currentSamuBalance;
  const contestProgress = 75; // Contest period calculation placeholder
  
  // User's memes and votes
  const myMemes = userMemes || [];
  const myVotes = userVoteHistory || [];

  return (
    <div 
      className="min-h-screen bg-background text-foreground transition-transform duration-300 ease-out"
      onTouchStart={(e) => {
        const touch = e.touches[0];
        (e.currentTarget as any).touchStartX = touch.clientX;
        (e.currentTarget as any).touchStartTime = Date.now();
      }}
      onTouchMove={(e) => {
        const touch = e.touches[0];
        const touchStartX = (e.currentTarget as any).touchStartX;
        const deltaX = touch.clientX - touchStartX;
        
        // Only apply transform for right swipe
        if (deltaX > 0) {
          const progress = Math.min(deltaX / 150, 1);
          (e.currentTarget as HTMLElement).style.transform = `translateX(${deltaX * 0.3}px)`;
          (e.currentTarget as HTMLElement).style.opacity = String(1 - progress * 0.2);
        }
      }}
      onTouchEnd={(e) => {
        const touch = e.changedTouches[0];
        const touchStartX = (e.currentTarget as any).touchStartX;
        const touchStartTime = (e.currentTarget as any).touchStartTime;
        const touchEndX = touch.clientX;
        const deltaX = touchEndX - touchStartX;
        const deltaTime = Date.now() - touchStartTime;
        
        // Reset transform
        (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
        (e.currentTarget as HTMLElement).style.opacity = '1';
        
        // Swipe right (left to right) to go back with velocity check
        if (deltaX > 100 && deltaTime < 300) {
          navigate("/");
        }
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card shadow-sm border-b border-border">
        <div className="max-w-md mx-auto px-4 py-1">
          <div className="flex items-center justify-between">
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
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* 사용자 기본 정보 */}
        <Card className="bg-gradient-to-r from-primary/20 to-primary/10 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={imagePreview || profileImage} />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                    {displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isEditing && user && (
                  <label className="absolute -bottom-0.5 -right-0.5 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer hover:bg-primary/80">
                    <Camera className="h-2.5 w-2.5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
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
                    <h3 className="text-sm font-bold text-foreground">{displayName}</h3>
                    <p className="text-xs text-muted-foreground">
                      {user?.email?.address || "Guest User - Please login to edit profile"}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button
                      onClick={handleSaveProfile}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-xs"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button onClick={handleCancelEdit} variant="outline" size="sm" className="text-xs">
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    disabled={!user}
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="text-center bg-accent/30 rounded-lg p-2">
                <div className="text-sm font-bold text-primary">{currentSamuBalance.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">SAMU</div>
              </div>
              <div className="text-center bg-accent/30 rounded-lg p-2">
                <div className="text-sm font-bold text-purple-400">{currentSolBalance.toFixed(4)}</div>
                <div className="text-xs text-muted-foreground">SOL</div>
              </div>
              <div className="text-center bg-accent/30 rounded-lg p-2">
                <div className="text-sm font-bold text-green-400">{remainingVotingPower.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Voting Power</div>
              </div>
              <div className="text-center bg-accent/30 rounded-lg p-2">
                <div className="text-sm font-bold text-blue-400">{totalMemesCreated}</div>
                <div className="text-xs text-muted-foreground">Memes</div>
              </div>
            </div>

            <div className="text-center bg-accent/30 rounded-lg p-2 mt-2">
              <div className="text-sm font-bold text-yellow-400">{totalVotesReceived}</div>
              <div className="text-xs text-muted-foreground">Total Votes Received</div>
            </div>

            {/* 지갑 주소 섹션 */}
            {walletAddress && (
              <div className="mt-3 bg-accent/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-foreground">Wallet Address</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(walletAddress);
                      toast({ title: "Copied!", description: "Wallet address copied to clipboard" });
                    }}
                    className="h-6 px-2 text-xs hover:bg-accent"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-xs font-mono text-foreground break-all bg-background/50 rounded p-2">
                  {walletAddress}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {selectedWalletAccount?.chainType === 'solana' ? 'Solana Network' : 'Ethereum Network'}
                </div>
              </div>
            )}

            {/* 송금 기능 */}
            {walletAddress && user && (
              <div className="mt-3">
                <SendTokens 
                  walletAddress={walletAddress}
                  samuBalance={currentSamuBalance}
                  solBalance={currentSolBalance}
                  chainType={selectedWalletAccount?.chainType || 'solana'}
                />
              </div>
            )}
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
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="memes" className="flex flex-col items-center gap-1 p-3 text-xs">
              <Trophy className="h-4 w-4" />
              <span>My Memes</span>
            </TabsTrigger>
            <TabsTrigger value="votes" className="flex flex-col items-center gap-1 p-3 text-xs">
              <Vote className="h-4 w-4" />
              <span>My Votes</span>
            </TabsTrigger>
            <TabsTrigger value="power" className="flex flex-col items-center gap-1 p-3 text-xs">
              <Zap className="h-4 w-4" />
              <span>Power</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="memes" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">My Memes ({myMemes.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {myMemes.length > 0 ? (
                  <div className="space-y-2">
                    {myMemes.map((meme: any) => (
                      <div key={meme.id} className="flex items-center gap-3 p-2 bg-accent/50 rounded-lg">
                        <img 
                          src={meme.imageUrl} 
                          alt={meme.title}
                          className="w-10 h-10 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground text-sm truncate">{meme.title}</h4>
                          <p className="text-xs text-muted-foreground truncate">{meme.description}</p>
                        </div>
                        <Badge variant="secondary" className="text-primary text-xs">
                          {meme.votes}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No memes uploaded yet</p>
                    <p className="text-xs">Start creating to see your memes here!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="votes" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">My Votes ({myVotes.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {myVotes.length > 0 ? (
                  <div className="space-y-2">
                    {myVotes.map((vote: any) => {
                      const meme = myMemes.find((m: any) => m.id === vote.memeId);
                      return meme ? (
                        <div key={vote.id} className="flex items-center gap-3 p-2 bg-accent/50 rounded-lg">
                          <img 
                            src={meme.imageUrl} 
                            alt={meme.title}
                            className="w-10 h-10 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground text-sm truncate">{meme.title}</h4>
                            <p className="text-xs text-muted-foreground truncate">by {meme.authorName}</p>
                          </div>
                          <Badge variant="secondary" className="text-green-400 text-xs">
                            +{vote.votingPower}
                          </Badge>
                        </div>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Vote className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No votes cast yet</p>
                    <p className="text-xs">Start voting to see your activity here!</p>
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
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center bg-accent/30 rounded-lg p-3">
                    <div className="text-lg font-bold text-green-400">{totalVotingPower.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Total Power</div>
                  </div>
                  <div className="text-center bg-accent/30 rounded-lg p-3">
                    <div className="text-lg font-bold text-red-400">{totalVotingPowerUsed.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Used Power</div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Remaining Power</span>
                    <span className="text-sm font-medium text-foreground">
                      {remainingVotingPower.toLocaleString()} / {totalVotingPower.toLocaleString()}
                    </span>
                  </div>
                  <Progress 
                    value={totalVotingPower > 0 ? (remainingVotingPower / totalVotingPower) * 100 : 0} 
                    className="h-2"
                  />
                </div>

                <div className="text-xs text-muted-foreground bg-accent/50 p-3 rounded-lg space-y-1">
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
});

Profile.displayName = 'Profile';

export default Profile;