// Backup of working profile page before server integration
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

function Profile() {
  const { user, authenticated } = usePrivy();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  // Get wallet address
  const walletAccounts = user?.linkedAccounts?.filter(account => account.type === 'wallet') || [];
  const selectedWalletAccount = walletAccounts[0];
  const walletAddress = (selectedWalletAccount as any)?.address || '';

  // Load profile data from localStorage
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

  // Load profile on mount
  useEffect(() => {
    const storedProfile = getStoredProfile;
    setDisplayName(storedProfile.displayName || user?.email?.address?.split('@')[0] || 'User');
    setProfileImage(storedProfile.profileImage || '');
  }, [getStoredProfile, user?.email?.address]);

  // Handle image change
  const handleImageChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Save profile
  const handleSaveProfile = React.useCallback(() => {
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

    // Notify home page
    window.dispatchEvent(new CustomEvent('profileUpdated', {
      detail: profileData
    }));
  }, [displayName, imagePreview, profileImage, user?.id, toast]);

  // Cancel edit
  const handleCancelEdit = React.useCallback(() => {
    setIsEditing(false);
    setImagePreview('');
    const storedProfile = getStoredProfile;
    setDisplayName(storedProfile.displayName || user?.email?.address?.split('@')[0] || 'User');
    setProfileImage(storedProfile.profileImage || '');
  }, [getStoredProfile, user?.email?.address]);

  // Mock data for testing
  const currentSamuBalance = 1000000;
  const currentSolBalance = 5.5;
  const totalMemesCreated = 12;
  const totalVotesReceived = 345;
  const totalVotesCast = 89;
  const totalVotingPowerUsed = 25000;
  const remainingVotingPower = 750000;
  const totalVotingPower = 1000000;
  const contestProgress = 75;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-4 max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="p-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold">Profile</h1>
          <div className="w-8" />
        </div>

        {/* Profile Card */}
        <Card className="mb-4">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={imagePreview || profileImage} />
                  <AvatarFallback className="bg-yellow-400 text-black text-sm font-bold">
                    {displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <label className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1 cursor-pointer">
                    <Camera className="h-3 w-3 text-black" />
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
                    disabled={!authenticated}
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Card>
            <CardContent className="p-2 text-center">
              <div className="text-lg font-bold text-yellow-400">{currentSamuBalance.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">SAMU Balance</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 text-center">
              <div className="text-lg font-bold text-blue-400">{currentSolBalance}</div>
              <div className="text-xs text-muted-foreground">SOL Balance</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 text-center">
              <div className="text-lg font-bold text-green-400">{totalMemesCreated}</div>
              <div className="text-xs text-muted-foreground">Memes Created</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 text-center">
              <div className="text-lg font-bold text-purple-400">{totalVotesReceived}</div>
              <div className="text-xs text-muted-foreground">Votes Received</div>
            </CardContent>
          </Card>
        </div>

        {/* Wallet Address */}
        {walletAddress && (
          <Card className="mb-4">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Wallet Address</div>
                  <div className="text-sm font-mono">{`${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(walletAddress);
                    toast({ title: "Copied!", description: "Wallet address copied to clipboard" });
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Send Tokens */}
        {authenticated && walletAddress && (
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Send className="h-4 w-4" />
                Send Tokens
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <SendTokens
                walletAddress={walletAddress}
                samuBalance={currentSamuBalance}
                solBalance={currentSolBalance}
                chainType="solana"
              />
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="stats" className="text-xs">Stats</TabsTrigger>
            <TabsTrigger value="memes" className="text-xs">Memes</TabsTrigger>
            <TabsTrigger value="votes" className="text-xs">Votes</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-2">
            <Card>
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Voting Power Used</span>
                    <span>{totalVotingPowerUsed.toLocaleString()}</span>
                  </div>
                  <Progress value={(totalVotingPowerUsed / totalVotingPower) * 100} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {remainingVotingPower.toLocaleString()} remaining of {totalVotingPower.toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="memes" className="space-y-2">
            <Card>
              <CardContent className="p-3 text-center text-muted-foreground text-sm">
                No memes created yet
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="votes" className="space-y-2">
            <Card>
              <CardContent className="p-3 text-center text-muted-foreground text-sm">
                No votes cast yet
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default Profile;