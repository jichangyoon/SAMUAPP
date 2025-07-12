import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePrivy } from '@privy-io/react-auth';
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Upload } from "lucide-react";
import { MediaDisplay } from "@/components/media-display";
import { getMediaType } from "@/utils/media-utils";

const uploadSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().max(500, "Description too long").optional(),
  image: z.any().refine((files) => files?.length > 0, "Image is required"),
});

interface UploadFormProps {
  onSuccess: () => void;
  onClose?: () => void;
  partnerId?: string;
}

export function UploadForm({ onSuccess, onClose, partnerId }: UploadFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { authenticated, user } = usePrivy();
  
  // Get wallet using same logic as WalletConnect component - prioritize Solana
  const walletAccounts = user?.linkedAccounts?.filter(account => account.type === 'wallet') || [];
  const solanaWallet = walletAccounts.find(w => w.chainType === 'solana');
  const selectedWalletAccount = solanaWallet || walletAccounts[0];
  const walletAddress = selectedWalletAccount?.address || '';
  const { toast } = useToast();

  // Get current active contest for auto-assignment
  const { data: currentContest } = useQuery({
    queryKey: ['/api/admin/current-contest'],
    queryFn: async () => {
      const response = await fetch('/api/admin/current-contest');
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !partnerId, // Only fetch for main contest, not partner contests
  });

  const form = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/avi', 'video/webm'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image (JPEG, PNG, GIF, WebP) or video (MP4, MOV, AVI, WebM)",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive"
        });
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
      setSelectedFile(null);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    // Add timeout to fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch('/api/uploads/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
  
      if (!result.fileUrl) {
        throw new Error('No file URL received from server');
      }

      return result.fileUrl; // R2 URL is returned directly
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Upload timeout - file may be too large or connection too slow');
      }
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network connection failed - please check your internet');
      }
      
      throw new Error(error.message || 'Upload failed - please try again');
    }
  };

  const onSubmit = async (values: z.infer<typeof uploadSchema>) => {
    if (!walletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to submit a meme.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const file = values.image[0];
      
      // Upload file to server
      const imageUrl = await uploadFile(file);
      
      const memeData = {
        title: values.title,
        description: values.description || "",
        imageUrl,
        authorWallet: walletAddress,
        authorUsername: user?.email?.address || walletAddress.slice(0, 8) + '...' + walletAddress.slice(-4),
        contestId: currentContest?.id || null // Auto-assign to current active contest
      };

      // Create optimistic meme for immediate UI update
      const tempId = Date.now(); // Temporary ID
      const optimisticMeme = {
        id: tempId,
        ...memeData,
        votes: 0,
        createdAt: new Date().toISOString(),
        authorAvatarUrl: null
      };

      // Optimistically update the UI immediately
      queryClient.setQueryData(['/api/memes'], (oldData: any) => {
        if (!oldData) return { memes: [optimisticMeme], pagination: { page: 1, limit: 7, total: 1, hasMore: false, totalPages: 1 } };
        return {
          ...oldData,
          memes: [optimisticMeme, ...oldData.memes],
          pagination: {
            ...oldData.pagination,
            total: oldData.pagination.total + 1
          }
        };
      });

      const endpoint = partnerId 
        ? `/api/partners/${partnerId}/memes`
        : "/api/memes";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(memeData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit meme');
      }

      // Success - invalidate queries to get real data from server
      queryClient.invalidateQueries({ queryKey: ['/api/memes'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });

      // Dispatch event to notify home page of new meme upload
      window.dispatchEvent(new CustomEvent('memeUploaded'));

      toast({
        title: "Meme Submitted!",
        description: "Your meme has been added to the contest.",
        duration: 1200,
      });

      form.reset();
      setPreview(null);
      onSuccess();
      onClose?.();
    } catch (error: any) {
      // Rollback optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['/api/memes'] });

      toast({
        title: "Upload Failed",
        description: error.message || "Failed to submit meme. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg text-primary">Submit Your Meme</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Meme Image</FormLabel>
                  <FormControl>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors duration-200">
                      {preview ? (
                        <div className="space-y-4">
                          <div className="max-w-full max-h-48 mx-auto">
                            {selectedFile && getMediaType(selectedFile.name) === 'video' ? (
                              <video
                                src={preview}
                                className="max-w-full max-h-48 rounded-lg"
                                controls
                                muted
                                preload="metadata"
                                style={{ backgroundColor: '#000' }}
                                onLoadedMetadata={(e) => {
                                  const video = e.target as HTMLVideoElement;
                                  video.currentTime = 0.1; // Generate thumbnail
                                }}
                              >
                                Your browser does not support video playback.
                              </video>
                            ) : (
                              <img
                                src={preview}
                                alt="Preview"
                                className="max-w-full max-h-48 rounded-lg"
                              />
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setPreview(null);
                              setSelectedFile(null);
                              field.onChange([]);
                            }}
                          >
                            Remove {selectedFile && getMediaType(selectedFile.name) === 'video' ? 'Video' : 'Image'}
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                          <p className="text-muted-foreground text-sm mb-2">
                            Upload image or video (max 5MB)<br />
                            Drag & drop your meme or click to browse
                          </p>
                          <label htmlFor="file-upload" className="cursor-pointer">
                            <Button
                              type="button"
                              className="bg-primary hover:bg-primary/90 text-primary-foreground pointer-events-none"
                            >
                              Choose File
                            </Button>
                          </label>
                        </>
                      )}
                      <Input
                        id="file-upload"
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={(e) => {
                          field.onChange(e.target.files);
                          handleImageChange(e);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter meme title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a description for your meme"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isUploading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3"
            >
              {isUploading ? "Submitting..." : "Submit Meme"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
