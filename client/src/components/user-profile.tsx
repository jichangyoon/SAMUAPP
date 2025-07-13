import { useState, useMemo, useEffect } from "react";
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
import { NativeStorage } from "@/utils/native-storage";

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  samuBalance: number;
  solBalance: number;
}

export function UserProfile({ isOpen, onClose, samuBalance, solBalance }: UserProfileProps) {
  const { user } = usePrivy();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get wallet address first
  const solanaWallet = user?.linkedAccounts?.find(account => 
    account.type === 'wallet' && account.chainType === 'solana'
  );
  const walletAddress = solanaWallet && 'address' in solanaWallet ? solanaWallet.address : '';

  // Load profile data from native storage or use defaults
  const getStoredProfile = async () => {
    try {
      const stored = await NativeStorage.getItem(`privy_profile_${user?.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { displayName: parsed.displayName || '', profileImage: '' };
      }
      return { displayName: '', profileImage: '' };
    } catch {
      return { displayName: '', profileImage: '' };
    }
  };

  const [storedProfile, setStoredProfile] = useState({ displayName: '', profileImage: '' });

  // Fetch user profile from database
  const { data: userProfile } = useQuery({
    queryKey: ['/api/users/profile', walletAddress],
    queryFn: () => walletAddress ? fetch(`/api/users/profile/${walletAddress}`).then(res => res.json()) : null,
    enabled: !!walletAddress
  });

  // Profile editing states
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [nameError, setNameError] = useState('');
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);

  // Load stored profile on mount
  useEffect(() => {
    const loadStoredProfile = async () => {
      if (user?.id) {
        const stored = await getStoredProfile();
        setStoredProfile(stored);
      }
    };
    loadStoredProfile();
  }, [user?.id]);

  // Update local state when userProfile loads
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || userProfile.username || user?.email?.address?.split('@')[0] || 'User');
      setProfileImage(userProfile.avatarUrl || '');
    } else {
      setDisplayName(storedProfile?.displayName || user?.email?.address?.split('@')[0] || 'User');
      setProfileImage('');
    }
  }, [userProfile, user?.email?.address, user?.id, storedProfile]);

  const displayAddress = useMemo(() => walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '', [walletAddress]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async ({ name, image }: { name: string; image: string }) => {
      const updateData: any = {};
      if (name) updateData.displayName = name;
      if (image) updateData.avatarUrl = image;

      const response = await fetch(`/api/users/profile/${walletAddress}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/profile'] });
      
      // Update native storage for display name only
      if (user?.id) {
        NativeStorage.setItem(`privy_profile_${user.id}`, JSON.stringify({
          displayName: displayName
        }));
      }

      // Dispatch custom events for header synchronization
      window.dispatchEvent(new CustomEvent('profileUpdated', { 
        detail: { displayName: displayName } 
      }));
      if (profileImage) {
        window.dispatchEvent(new CustomEvent('imageUpdated', { 
          detail: { avatarUrl: profileImage } 
        }));
      }
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[90vh] bg-black border-yellow-500/20">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-yellow-400">Profile</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <Card className="bg-black border-yellow-500/20">
              <CardContent className="p-2 text-center">
                <div className="text-yellow-400 text-xs">SAMU</div>
                <div className="text-white text-sm font-bold">{samuBalance.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="bg-black border-yellow-500/20">
              <CardContent className="p-2 text-center">
                <div className="text-yellow-400 text-xs">SOL</div>
                <div className="text-white text-sm font-bold">{solBalance.toFixed(4)}</div>
              </CardContent>
            </Card>
            <Card className="bg-black border-yellow-500/20">
              <CardContent className="p-2 text-center">
                <div className="text-yellow-400 text-xs">Votes</div>
                <div className="text-white text-sm font-bold">0</div>
              </CardContent>
            </Card>
            <Card className="bg-black border-yellow-500/20">
              <CardContent className="p-2 text-center">
                <div className="text-yellow-400 text-xs">Memes</div>
                <div className="text-white text-sm font-bold">0</div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-black border-yellow-500/20 mb-4">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm">Profile Info</CardTitle>
                {user && (
                  <Button
                    onClick={() => setIsEditing(!isEditing)}
                    size="sm"
                    className="bg-yellow-500 text-black hover:bg-yellow-400 text-xs px-2 py-1 h-6"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage 
                    src={profileImage} 
                    alt={displayName}
                    key={profileImage}
                  />
                  <AvatarFallback className="bg-yellow-500 text-black text-sm">
                    {displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium text-sm truncate">{displayName}</div>
                  <div className="text-gray-400 text-xs font-mono">{displayAddress}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="memes" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-900">
              <TabsTrigger value="memes" className="text-xs data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
                <div className="flex flex-col items-center">
                  <Trophy className="h-3 w-3" />
                  <span>My Memes</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="votes" className="text-xs data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
                <div className="flex flex-col items-center">
                  <Vote className="h-3 w-3" />
                  <span>My Votes</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="wallet" className="text-xs data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
                <div className="flex flex-col items-center">
                  <Send className="h-3 w-3" />
                  <span>Send</span>
                </div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="memes" className="space-y-2">
              <div className="text-center text-gray-400 py-8 text-sm">
                No memes submitted yet
              </div>
            </TabsContent>

            <TabsContent value="votes" className="space-y-2">
              <div className="text-center text-gray-400 py-8 text-sm">
                No votes cast yet
              </div>
            </TabsContent>

            <TabsContent value="wallet" className="space-y-4">
              <div className="text-center text-gray-400 py-8 text-sm">
                Token transfer feature coming soon
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}