import React, { useState, useEffect, useCallback } from "react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { User, Vote, Trophy, Upload, Zap, Settings, Camera, Save, ArrowLeft, Copy, Send, Trash2, MoreVertical, MessageCircle, Image as ImageIcon, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { SendTokensSimple } from "@/components/send-tokens-simple";
import { MemeDetailModal } from "@/components/meme-detail-modal";
import { MediaDisplay } from "@/components/media-display";

const Profile = React.memo(() => {
  const { user, authenticated } = usePrivy();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedMeme, setSelectedMeme] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [memeToDelete, setMemeToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAllMemes, setShowAllMemes] = useState(false);
  const [showAllVotes, setShowAllVotes] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [showCommentDeleteDialog, setShowCommentDeleteDialog] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<any>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);
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
      if (!res.ok) throw new Error('Failed to fetch profile');
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
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    enabled: !!walletAddress,
  });

  // Voting power data
  const { data: votingPowerData } = useQuery({
    queryKey: ['voting-power', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      const res = await fetch(`/api/voting-power/${walletAddress}`);
      if (!res.ok) throw new Error('Failed to fetch voting power');
      return res.json();
    },
    enabled: !!walletAddress,
  });

  // 스마트 캐시 동기화 함수
  const handleRefresh = useCallback(async () => {
    if (!walletAddress) return;
    
    toast({
      title: "Refreshing...",
      description: "Fetching latest data",
      duration: 1000
    });

    try {
      // 1단계: 핵심 투표 관련 데이터 우선 새로고침
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['voting-power', walletAddress] }),
        queryClient.invalidateQueries({ queryKey: ['user-votes', walletAddress] })
      ]);

      // 2단계: 밈 데이터 새로고침 (투표 수 반영)
      await queryClient.invalidateQueries({ queryKey: ['all-memes'] });

      // 3단계: 사용자 통계 및 프로필 새로고침
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user-stats', walletAddress] }),
        queryClient.invalidateQueries({ queryKey: ['user-profile', walletAddress] }),
        queryClient.invalidateQueries({ queryKey: ['user-memes', walletAddress] }),
        queryClient.invalidateQueries({ queryKey: ['user-comments', walletAddress] })
      ]);

      // 4단계: 토큰 잔액 새로고침
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['samu-balance', walletAddress] }),
        queryClient.invalidateQueries({ queryKey: ['sol-balance', walletAddress] })
      ]);

      toast({
        title: "Refreshed successfully",
        description: "All data has been updated",
        duration: 1200
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Refresh completed",
        description: "Some data may still be updating",
        duration: 1200
      });
    }
  }, [walletAddress, queryClient, toast]);

  // User memes
  const { data: userMemes = [] } = useQuery({
    queryKey: ['user-memes', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      const res = await fetch(`/api/users/${walletAddress}/memes`);
      if (!res.ok) throw new Error('Failed to fetch memes');
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
      if (!res.ok) throw new Error('Failed to fetch votes');
      return res.json();
    },
    enabled: !!walletAddress,
  });

  // User comments
  const { data: userComments = [] } = useQuery({
    queryKey: ['user-comments', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      const res = await fetch(`/api/users/${walletAddress}/comments`);
      if (!res.ok) throw new Error('Failed to fetch comments');
      return res.json();
    },
    enabled: !!walletAddress,
  });

  // All memes data to match with user votes (including archived)
  const { data: memesResponse } = useQuery({
    queryKey: ['all-memes'],
    queryFn: async () => {
      const res = await fetch('/api/memes/all'); // Get ALL memes (current + archived)
      if (!res.ok) throw new Error('Failed to fetch all memes');
      return res.json();
    },
  });

  const allMemes = memesResponse?.memes || [];

  // Balance fetching
  const { data: samuData } = useQuery({
    queryKey: ['samu-balance', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return { balance: 0 };
      const res = await fetch(`/api/samu-balance/${walletAddress}`);
      if (!res.ok) throw new Error('Failed to fetch SAMU balance');
      return res.json();
    },
    enabled: !!walletAddress,
  });

  const { data: solData } = useQuery({
    queryKey: ['sol-balance', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return { balance: 0 };
      const res = await fetch(`/api/sol-balance/${walletAddress}`);
      if (!res.ok) throw new Error('Failed to fetch SOL balance');
      return res.json();
    },
    enabled: !!walletAddress,
  });

  // Fetch current active contest for status display
  const { data: activeContest } = useQuery({
    queryKey: ["/api/admin/current-contest"],
    staleTime: 30 * 1000, // 30초 캐시
  });

  // Profile data now comes from database, not localStorage

  // Update profile function
  const updateProfile = React.useCallback(async (name: string, imageUrl?: string) => {
    try {

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

        // Simple cache invalidation for profile updates
        queryClient.invalidateQueries({ queryKey: ['user-profile', walletAddress] });

        // Update local state immediately 
        setDisplayName(name);
        if (imageUrl) {
          setProfileImage(imageUrl);
        }

        // Dispatch profile update event for immediate sync across app
        window.dispatchEvent(new CustomEvent('profileUpdated', {
          detail: { 
            displayName: name, 
            profileImage: imageUrl || profileImage,
            avatarUrl: imageUrl || profileImage
          }
        }));

        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }, [walletAddress, profileImage, queryClient]);

  // Load profile data from database, not localStorage
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || user?.email?.address?.split('@')[0] || 'User');
      setProfileImage(userProfile.avatarUrl || '');

    } else {
      setDisplayName(user?.email?.address?.split('@')[0] || 'User');
      setProfileImage('');
    }
  }, [userProfile, user?.email?.address]);

  // Listen for external profile updates (from other components)
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      const { displayName: newName, avatarUrl } = event.detail;
      if (newName) setDisplayName(newName);
      if (avatarUrl) setProfileImage(avatarUrl);

      // Only refetch if profile data changed (not for voting power updates)
      if (newName || avatarUrl) {
        queryClient.refetchQueries({ queryKey: ['user-profile', walletAddress] });
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
    };
  }, [walletAddress, queryClient]);

  // Handle image file selection (preview only, no upload)
  const handleImageChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

    // Validate file size (3MB limit)
    if (file.size > 3 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 3MB",
        variant: "destructive"
      });
      return;
    }

    // Create preview only - don't upload yet
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
    setSelectedFile(file);
  }, [toast]);


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

    setIsSaving(true);
    let finalImageUrl = profileImage;

    // Upload image if a new file is selected
    if (selectedFile) {
      try {
        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('walletAddress', walletAddress);

        // Upload to R2 cloud storage with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃

        const response = await fetch('/api/uploads/profile', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.profileUrl) {
          finalImageUrl = result.profileUrl;
          setProfileImage(result.profileUrl);
        } else {
          throw new Error('Upload response invalid');
        }

      } catch (error) {
        const errorMessage = error instanceof Error && error.name === 'AbortError' 
          ? "Upload timeout. Please try again." 
          : "Failed to upload profile image. Please try again.";

        toast({
          title: "Upload Failed",
          description: errorMessage,
          variant: "destructive"
        });
        setIsSaving(false);
        return;
      }
    }

    // Save profile changes
    const success = await updateProfile(displayName.trim(), finalImageUrl);

    if (success) {
      setIsEditing(false);
      setImagePreview('');
      setSelectedFile(null);

      // Clean up preview URL
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }

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

    setIsSaving(false);
  }, [displayName, profileImage, selectedFile, walletAddress, imagePreview, toast, queryClient, updateProfile]);

  // Cancel editing - 메모리 정리 포함
  const handleCancelEdit = React.useCallback(() => {
    // Clean up image preview URL if exists
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }

    // Reset to database values
    if (userProfile) {
      setDisplayName(userProfile.displayName || user?.email?.address?.split('@')[0] || 'User');
      setProfileImage(userProfile.avatarUrl || '');
    } else {
      setDisplayName(user?.email?.address?.split('@')[0] || 'User');
      setProfileImage('');
    }
    setImagePreview('');
    setSelectedFile(null);
    setIsEditing(false);
    setIsSaving(false);
  }, [userProfile, user?.email?.address, imagePreview]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      // Clean up any remaining object URLs
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Delete meme function
  const handleDeleteMeme = useCallback(async (meme: any) => {
    if (!walletAddress) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/memes/${meme.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          authorWallet: walletAddress
        })
      });

      if (response.ok) {
        // Invalidate related queries to refresh the data
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['user-memes', walletAddress] }),
          queryClient.invalidateQueries({ queryKey: ['memes'] }),
          queryClient.invalidateQueries({ queryKey: ['user-stats', walletAddress] })
        ]);

        toast({
          title: "Meme Deleted",
          description: "Your meme has been successfully deleted."
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete meme');
      }
    } catch (error) {

      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete meme. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setMemeToDelete(null);
    }
  }, [walletAddress, toast, queryClient]);

  // Delete comment function - simplified approach
  const handleDeleteComment = useCallback(async (comment: any) => {
    if (!walletAddress) return;

    setIsDeletingComment(true);

    try {
      const response = await fetch(`/api/nfts/${comment.nftId}/comments/${comment.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userWallet: walletAddress
        })
      });

      if (response.ok) {
        // Simple cache invalidation
        queryClient.invalidateQueries({ queryKey: ['user-comments', walletAddress] });
        queryClient.invalidateQueries({ queryKey: ['nft-comments'] });

        toast({
          title: "Comment Deleted",
          description: "Your comment has been successfully deleted."
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete comment');
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete comment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeletingComment(false);
      setShowCommentDeleteDialog(false);
      setCommentToDelete(null);
    }
  }, [walletAddress, toast, queryClient]);

  // Calculate statistics from user data - useMemo로 최적화
  const stats = React.useMemo(() => {
    const currentSamuBalance = samuData?.balance || 0;
    const currentSolBalance = solData?.balance || 0;

    const totalMemesCreated = userStats?.totalMemes || 0;
    const totalVotesReceived = userStats?.totalMemesVotes || 0;
    const totalVotesCast = userStats?.totalVotesCast || 0;
    const totalVotingPowerUsed = userStats?.totalVotingPowerUsed || 0;
    const remainingVotingPower = votingPowerData?.remainingPower || 0;
    const totalVotingPower = votingPowerData?.totalPower || 0;
    
    // Calculate real contest progress based on active contest
    let contestProgress = 0;
    let contestStatus = 'No active contest';
    
    if (activeContest) {
      const now = new Date();
      const startTime = new Date(activeContest.startTime);
      const endTime = new Date(activeContest.endTime);
      const totalDuration = endTime.getTime() - startTime.getTime();
      const elapsed = now.getTime() - startTime.getTime();
      
      if (activeContest.status === 'archived' || activeContest.status === 'ended') {
        // Contest has been archived or ended
        contestProgress = 100;
        contestStatus = 'Contest ended';
      } else if (activeContest.status === 'active') {
        if (elapsed < 0) {
          // Contest hasn't started yet
          contestProgress = 0;
          contestStatus = 'Contest starts soon';
        } else if (elapsed > totalDuration) {
          // Contest has ended
          contestProgress = 100;
          contestStatus = 'Contest ended';
        } else {
          // Contest is active
          contestProgress = Math.min(100, Math.round((elapsed / totalDuration) * 100));
          contestStatus = `${activeContest.title} - Active`;
        }
      } else {
        // Other states (draft, etc.)
        contestProgress = 0;
        contestStatus = 'Contest not active';
      }
    }

    return {
      currentSamuBalance,
      currentSolBalance,
      totalMemesCreated,
      totalVotesReceived,
      totalVotesCast,
      totalVotingPowerUsed,
      remainingVotingPower,
      totalVotingPower,
      contestProgress,
      contestStatus,
    };
  }, [samuData, solData, userStats, activeContest]);

  // User's memes, votes, and comments - useMemo로 최적화
  const { myMemes, myVotes, myComments } = React.useMemo(() => ({
    myMemes: userMemes || [],
    myVotes: userVoteHistory || [],
    myComments: userComments || []
  }), [userMemes, userVoteHistory, userComments]);

  // Display limited memes with More button
  const displayedMemes = React.useMemo(() => {
    return showAllMemes ? myMemes : myMemes.slice(0, 5);
  }, [myMemes, showAllMemes]);

  // Display limited votes with More button
  const displayedVotes = React.useMemo(() => {
    return showAllVotes ? myVotes : myVotes.slice(0, 5);
  }, [myVotes, showAllVotes]);

  // Display limited comments with More button
  const displayedComments = React.useMemo(() => {
    return showAllComments ? myComments : myComments.slice(0, 5);
  }, [myComments, showAllComments]);

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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-foreground hover:bg-accent"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
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
                  <AvatarImage 
                    src={imagePreview || profileImage} 
                    key={profileImage} 
                  />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                    {displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isEditing && user && (
                  <label className={`absolute -bottom-0.5 -right-0.5 bg-primary text-primary-foreground rounded-full p-1 ${isSaving ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-primary/80'}`}>
                    <Camera className="h-2.5 w-2.5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      disabled={isSaving}
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
                      disabled={isSaving}
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
              <div className="flex gap-1 shrink-0">
                {isEditing ? (
                  <>
                    <Button
                      onClick={handleSaveProfile}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-xs px-2 h-7"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={handleCancelEdit} 
                      variant="outline" 
                      size="sm" 
                      className="text-xs px-2 h-7"
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    size="sm"
                    className="text-xs px-2 h-7 min-w-0"
                    disabled={!user || isSaving}
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="text-center bg-accent/30 rounded-lg p-2">
                <div className="text-sm font-bold text-primary">{stats.currentSamuBalance.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">SAMU</div>
              </div>
              <div className="text-center bg-accent/30 rounded-lg p-2">
                <div className="text-sm font-bold text-purple-400">{stats.currentSolBalance.toFixed(4)}</div>
                <div className="text-xs text-muted-foreground">SOL</div>
              </div>
              <div 
                className="text-center bg-accent/30 rounded-lg p-2 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['voting-power', walletAddress] });
                }}
              >
                <div className="text-sm font-bold text-green-400">{stats.remainingVotingPower.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Voting Power</div>
              </div>
              <div className="text-center bg-accent/30 rounded-lg p-2">
                <div className="text-sm font-bold text-blue-400">{stats.totalMemesCreated}</div>
                <div className="text-xs text-muted-foreground">Memes</div>
              </div>
            </div>

            <div className="text-center bg-accent/30 rounded-lg p-2 mt-2">
              <div className="text-sm font-bold text-yellow-400">{stats.totalVotesReceived}</div>
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
                <SendTokensSimple 
                  walletAddress={walletAddress}
                  samuBalance={stats.currentSamuBalance}
                  solBalance={stats.currentSolBalance}
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
                <span className="text-foreground font-medium">{stats.contestProgress}%</span>
              </div>
              <div className="w-full bg-accent rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stats.contestProgress}%` }}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {stats.contestStatus}
              </div>
              {activeContest && activeContest.status === 'active' && (
                <div className="text-xs text-muted-foreground">
                  Voting power will be restored when the contest ends
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 탭 메뉴 */}
        <Tabs defaultValue="memes" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="memes" className="flex flex-col items-center gap-1 p-3 text-xs">
              <Trophy className="h-4 w-4" />
              <span>My Memes</span>
            </TabsTrigger>
            <TabsTrigger value="votes" className="flex flex-col items-center gap-1 p-3 text-xs">
              <Vote className="h-4 w-4" />
              <span>My Votes</span>
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex flex-col items-center gap-1 p-3 text-xs">
              <MessageCircle className="h-4 w-4" />
              <span>Comments</span>
            </TabsTrigger>
            <TabsTrigger 
              value="power" 
              className="flex flex-col items-center gap-1 p-3 text-xs"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['voting-power', walletAddress] });
              }}
            >
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
                    {displayedMemes.map((meme: any) => (
                      <div 
                        key={meme.id} 
                        className="flex items-center gap-3 p-2 bg-accent/50 rounded-lg hover:bg-accent/70 transition-colors"
                      >
                        <div 
                          className="w-10 h-10 cursor-pointer"
                          onClick={() => {
                            setSelectedMeme(meme);
                            setIsModalOpen(true);
                          }}
                        >
                          <MediaDisplay
                            src={meme.imageUrl}
                            alt={meme.title}
                            className="w-full h-full rounded"
                            showControls={false}
                          />
                        </div>
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => {
                            setSelectedMeme(meme);
                            setIsModalOpen(true);
                          }}
                        >
                          <h4 className="font-medium text-foreground text-sm truncate">{meme.title}</h4>
                          <p className="text-xs text-muted-foreground truncate">{meme.description}</p>
                        </div>
                        <Badge variant="secondary" className="text-primary text-xs">
                          {meme.votes}
                        </Badge>
                        
                        {/* Delete button - only show for authenticated users */}
                        {authenticated && walletAddress && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 hover:bg-accent"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMemeToDelete(meme);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Meme
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                    
                    {/* More button - only show if there are more than 5 memes */}
                    {myMemes.length > 5 && (
                      <div className="flex justify-center pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAllMemes(!showAllMemes)}
                          className="text-foreground border-border hover:bg-accent"
                        >
                          {showAllMemes ? 'Show Less' : `More (${myMemes.length - 5})`}
                        </Button>
                      </div>
                    )}
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

          <TabsContent value="votes" className="flex-1 overflow-hidden">
            <Card className="border-border bg-card h-full flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="text-lg text-foreground">My Votes ({myVotes.length})</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                {myVotes.length > 0 ? (
                  <div className="space-y-2">
                    {displayedVotes.map((vote: any) => {
                      const meme = allMemes.find((m: any) => m.id === vote.memeId);
                      return meme ? (
                        <div 
                          key={vote.id} 
                          className="flex items-center gap-3 p-2 bg-accent/50 rounded-lg cursor-pointer hover:bg-accent/70 transition-colors"
                          onClick={() => {
                            setSelectedMeme(meme);
                            setIsModalOpen(true);
                          }}
                        >
                          <MediaDisplay
                            src={meme.imageUrl}
                            alt={meme.title}
                            className="w-10 h-10 rounded"
                            showControls={false}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground text-sm truncate">{meme.title}</h4>
                            <p className="text-xs text-muted-foreground truncate">by {meme.authorUsername}</p>
                          </div>
                          <Badge variant="secondary" className="text-green-400 text-xs">
                            +{vote.powerUsed || vote.votingPower}
                          </Badge>
                        </div>
                      ) : null;
                    })}
                    
                    {/* More button - only show if there are more than 5 votes */}
                    {myVotes.length > 5 && (
                      <div className="flex justify-center pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAllVotes(!showAllVotes)}
                          className="text-foreground border-border hover:bg-accent"
                        >
                          {showAllVotes ? 'Show Less' : `More (${myVotes.length - 5})`}
                        </Button>
                      </div>
                    )}
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

          <TabsContent value="comments" className="flex-1 overflow-hidden">
            <Card className="border-border bg-card h-full flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="text-lg text-foreground">My Comments ({myComments.length})</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                {myComments.length > 0 ? (
                  <div className="space-y-2">
                    {displayedComments.map((comment) => (
                      <div 
                        key={comment.id} 
                        className="flex items-start gap-3 p-2 bg-accent/50 rounded-lg hover:bg-accent/70 transition-colors cursor-pointer"
                        onClick={() => {
                          // NFT 상세 모달 열기 (향후 구현)
                          console.log('Open NFT modal for NFT ID:', comment.nftId);
                        }}
                      >
                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground text-sm">NFT #{comment.nftId}</h4>
                          <p className="text-xs text-muted-foreground truncate">{comment.comment}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        
                        {/* Delete button - only show for authenticated users */}
                        {authenticated && walletAddress && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 hover:bg-accent"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCommentToDelete(comment);
                                  setShowCommentDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Comment
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                    
                    {/* More button - only show if there are more than 5 comments */}
                    {myComments.length > 5 && (
                      <div className="flex justify-center pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAllComments(!showAllComments)}
                          className="text-foreground border-border hover:bg-accent"
                        >
                          {showAllComments ? 'Show Less' : `More (${myComments.length - 5})`}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No comments yet</p>
                    <p className="text-xs">Start commenting on NFTs to see your comments here!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="power" className="flex-1 overflow-hidden">
            <Card className="border-border bg-card h-full flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="text-lg text-foreground flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Voting Power Details
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center bg-accent/30 rounded-lg p-3">
                    <div className="text-lg font-bold text-green-400">{votingPowerData?.totalPower?.toLocaleString() || '0'}</div>
                    <div className="text-xs text-muted-foreground">Total Power</div>
                  </div>
                  <div className="text-center bg-accent/30 rounded-lg p-3">
                    <div className="text-lg font-bold text-red-400">{votingPowerData?.usedPower?.toLocaleString() || '0'}</div>
                    <div className="text-xs text-muted-foreground">Used Power</div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Remaining Power</span>
                    <span className="text-sm font-medium text-foreground">
                      {votingPowerData?.remainingPower?.toLocaleString() || '0'} / {votingPowerData?.totalPower?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <Progress 
                    value={votingPowerData?.totalPower > 0 ? (votingPowerData.remainingPower / votingPowerData.totalPower) * 100 : 0} 
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

      {/* Meme Detail Modal */}
      {selectedMeme && (
        <MemeDetailModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedMeme(null);
          }}
          meme={selectedMeme}
          canVote={false}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="left-[46%]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meme?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{memeToDelete?.title}"? This action cannot be undone and will permanently remove the meme and its associated file from cloud storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memeToDelete && handleDeleteMeme(memeToDelete)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Comment Confirmation Dialog */}
      <AlertDialog open={showCommentDeleteDialog} onOpenChange={setShowCommentDeleteDialog}>
        <AlertDialogContent className="left-[46%]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete your comment on NFT #{commentToDelete?.nftId}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingComment}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => commentToDelete && handleDeleteComment(commentToDelete)}
              disabled={isDeletingComment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingComment ? (
                <>
                  <div className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

Profile.displayName = 'Profile';

export default Profile;