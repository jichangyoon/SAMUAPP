import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePrivy } from '@privy-io/react-auth';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadForm } from "@/components/upload-form";
import { User, Vote, Trophy, Upload, Zap, Settings, Camera, Save, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  samuBalance: number;
  solBalance: number;
}

export const UserProfile = React.memo(({ isOpen, onClose, samuBalance, solBalance }: UserProfileProps) => {
  const { user } = usePrivy();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load profile data from localStorage or use defaults
  const getStoredProfile = () => {
    try {
      const stored = localStorage.getItem(`privy_profile_${user?.id}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const storedProfile = getStoredProfile();

  // Profile editing states
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(
    storedProfile.displayName || user?.email?.address?.split('@')[0] || 'User'
  );
  const [profileImage, setProfileImage] = useState(storedProfile.profileImage || '');
  const [imagePreview, setImagePreview] = useState<string>('');

  // Solana 지갑 주소만 가져오기
  const solanaWallet = user?.linkedAccounts?.find(account => 
    account.type === 'wallet' && account.chainType === 'solana'
  );
  const walletAddress = solanaWallet?.address || '';
  const displayAddress = useMemo(() => walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '', [walletAddress]);

  // Update profile mutation - using API call since Privy doesn't expose updateUser directly
  const updateProfileMutation = useMutation({
    mutationFn: async ({ name, image }: { name: string; image: string }) => {
      // Store profile data in localStorage as a fallback since Privy's updateUser isn't available
      const profileData = { displayName: name, profileImage: image };
      localStorage.setItem(`privy_profile_${user?.id}`, JSON.stringify(profileData));
      return profileData;
    },
    onSuccess: (data) => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      setIsEditing(false);
      // Update local state to reflect changes immediately
      setDisplayName(data.displayName);
      setProfileImage(data.profileImage);
      setImagePreview('');
    },
    onError: (error) => {
      console.error('Profile update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle image upload to R2
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

    // Validate file size (5MB limit for profile images)
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
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to R2 profile bucket
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/uploads/profile', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Profile image upload failed');
      }

      const result = await response.json();
      setProfileImage(result.profileUrl);

      toast({
        title: "Image uploaded",
        description: "Profile image uploaded successfully",
      });
    } catch (error) {
      console.error('Profile image upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload profile image",
        variant: "destructive"
      });
      setImagePreview('');
    }
  };

  // Save profile changes
  const handleSaveProfile = () => {
    if (displayName.trim()) {
      updateProfileMutation.mutate({
        name: displayName.trim(),
        image: profileImage
      });
    }
  };

  // Reset form when editing is cancelled
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
                        disabled={updateProfileMutation.isPending}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        variant="outline"
                        size="sm"
                      >
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
});