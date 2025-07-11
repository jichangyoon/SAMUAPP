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
import { User, Vote, Trophy, Upload, Zap, Settings, Camera, Save, ArrowLeft, Copy, Send, Trash2, MoreVertical, MessageCircle, Image as ImageIcon } from "lucide-react";
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
  const [showCommentDeleteDialog, setShowCommentDeleteDialog] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<any>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);
  // 지갑 주소 가져오기 (홈과 동일한 로직)
  const walletAccounts = user?.linkedAccounts?.filter(account => account.type === 'wallet') || [];
  const solanaWallet = walletAccounts.find(w => w.chainType === 'solana');
  const selectedWalletAccount = solanaWallet || walletAccounts[0];
  const walletAddress = selectedWalletAccount?.address || '';

  // User profile data - 글로벌 기본값 사용으로 최적화
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

  // User statistics - 자주 변경되므로 짧은 캐시
  const { data: userStats } = useQuery({
    queryKey: ['user-stats', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      const res = await fetch(`/api/users/${walletAddress}/stats`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    enabled: !!walletAddress,
    staleTime: 2 * 60 * 1000, // 2분 캐시 (통계는 자주 변경됨)
  });

  // User memes - 글로벌 기본값 사용
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

  // User votes - 짧은 캐시로 최신 데이터 유지
  const { data: userVoteHistory = [] } = useQuery({
    queryKey: ['user-votes', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      const res = await fetch(`/api/users/${walletAddress}/votes`);
      if (!res.ok) throw new Error('Failed to fetch votes');
      return res.json();
    },
    enabled: !!walletAddress,
    staleTime: 2 * 60 * 1000, // 2분 캐시
  });

  // User comments - 짧은 캐시로 최신 데이터 유지
  const { data: userComments = [] } = useQuery({
    queryKey: ['user-comments', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      const res = await fetch(`/api/users/${walletAddress}/comments`);
      if (!res.ok) throw new Error('Failed to fetch comments');
      return res.json();
    },
    enabled: !!walletAddress,
    staleTime: 2 * 60 * 1000, // 2분 캐시
  });

  // All memes data to match with user votes
  const { data: memesResponse } = useQuery({
    queryKey: ['memes'],
    queryFn: async () => {
      const res = await fetch('/api/memes?limit=1000'); // Get all memes for profile
      if (!res.ok) throw new Error('Failed to fetch memes');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5분 캐시
  });

  const allMemes = memesResponse?.memes || [];

  // Balance fetching - 짧은 캐시로 최신 잔고 유지
  const { data: samuData } = useQuery({
    queryKey: ['samu-balance', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return { balance: 0 };
      const res = await fetch(`/api/samu-balance/${walletAddress}`);
      if (!res.ok) throw new Error('Failed to fetch SAMU balance');
      return res.json();
    },
    enabled: !!walletAddress,
    staleTime: 60 * 1000, // 1분 캐시 (잔고는 자주 확인)
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
    staleTime: 60 * 1000, // 1분 캐시
  });

  // 저장된 프로필 가져오기 - useMemo로 최적화
  const getStoredProfile = React.useMemo(() => {
    if (!user?.id) return { displayName: '', profileImage: '' };

    const stored = localStorage.getItem(`profile_${user?.id}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {

      }
    }
    return { displayName: '', profileImage: '' };
  }, [user?.id]);

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

        // Comprehensive cache clearing and invalidation
        await Promise.all([
          // Clear all profile-related queries
          queryClient.removeQueries({ queryKey: ['user-profile', walletAddress] }),
          queryClient.removeQueries({ queryKey: ['user-profile-header', walletAddress] }),
          queryClient.removeQueries({ queryKey: [`/api/users/profile/${walletAddress}`] }),
          
          // Invalidate all related queries
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              const key = query.queryKey[0] as string;
              return key.includes('user-profile') || key.includes(walletAddress) || key.includes('memes');
            }
          })
        ]);

        // Force immediate refetch with no cache
        await queryClient.refetchQueries({ 
          queryKey: ['user-profile', walletAddress],
          type: 'active'
        });

        // Update local state immediately with cache busting
        setDisplayName(name);
        if (imageUrl) {
          // Add timestamp to force image reload
          const imageUrlWithTimestamp = `${imageUrl}?t=${Date.now()}`;
          setProfileImage(imageUrlWithTimestamp);
        }

        // Dispatch profile update event for immediate sync across app
        window.dispatchEvent(new CustomEvent('profileUpdated', {
          detail: { 
            displayName: name, 
            profileImage: imageUrl ? `${imageUrl}?t=${Date.now()}` : profileImage,
            avatarUrl: imageUrl ? `${imageUrl}?t=${Date.now()}` : profileImage
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

      // Force refetch to ensure data consistency
      queryClient.refetchQueries({ queryKey: ['user-profile', walletAddress] });
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

  // Delete comment function with optimistic updates
  const handleDeleteComment = useCallback(async (comment: any) => {
    if (!walletAddress) return;

    setIsDeletingComment(true);
    
    // Get current comments data for potential rollback
    const currentComments = queryClient.getQueryData(['user-comments', walletAddress]) as any[];
    
    // Optimistically update the cache (remove the comment immediately)
    if (currentComments) {
      const optimisticComments = currentComments.filter(c => c.id !== comment.id);
      queryClient.setQueryData(['user-comments', walletAddress], optimisticComments);
    }

    try {
      const response = await fetch(`/api/nfts/comments/${comment.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userWallet: walletAddress
        })
      });

      if (response.ok) {
        // Comprehensive cache invalidation and refresh
        await Promise.all([
          // Invalidate all related queries
          queryClient.invalidateQueries({ queryKey: ['user-comments', walletAddress] }),
          queryClient.invalidateQueries({ queryKey: ['nft-comments'] }),
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              const key = query.queryKey[0] as string;
              return key.includes('user-comments') || key.includes('nft-comments');
            }
          })
        ]);

        toast({
          title: "Comment Deleted",
          description: "Your comment has been successfully deleted."
        });
      } else {
        // Rollback on failure
        if (currentComments) {
          queryClient.setQueryData(['user-comments', walletAddress], currentComments);
        }
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete comment');
      }
    } catch (error) {
      // Rollback on error
      if (currentComments) {
        queryClient.setQueryData(['user-comments', walletAddress], currentComments);
      }
      
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
    const remainingVotingPower = userStats?.remainingVotingPower || Math.floor(currentSamuBalance * 0.8);
    const totalVotingPower = userStats?.samuBalance || currentSamuBalance;
    const contestProgress = 75; // Contest period calculation placeholder

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
    };
  }, [samuData, solData, userStats]);

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
                  <AvatarImage 
                    src={imagePreview || (profileImage ? `${profileImage}?t=${Date.now()}` : '')} 
                    key={`${profileImage}-${Date.now()}`} 
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
              <div className="text-center bg-accent/30 rounded-lg p-2">
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
                Voting power will be restored when the contest ends
              </div>
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
                    {myVotes.map((vote: any) => {
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

          <TabsContent value="comments" className="flex-1 overflow-hidden">
            <Card className="border-border bg-card h-full flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="text-lg text-foreground">My Comments ({myComments.length})</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                {myComments.length > 0 ? (
                  <div className="space-y-2">
                    {myComments.map((comment) => (
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
                    <div className="text-lg font-bold text-green-400">{stats.totalVotingPower.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Total Power</div>
                  </div>
                  <div className="text-center bg-accent/30 rounded-lg p-3">
                    <div className="text-lg font-bold text-red-400">{stats.totalVotingPowerUsed.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Used Power</div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Remaining Power</span>
                    <span className="text-sm font-medium text-foreground">
                      {stats.remainingVotingPower.toLocaleString()} / {stats.totalVotingPower.toLocaleString()}
                    </span>
                  </div>
                  <Progress 
                    value={stats.totalVotingPower > 0 ? (stats.remainingVotingPower / stats.totalVotingPower) * 100 : 0} 
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