import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePrivy } from '@privy-io/react-auth';
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Upload, X, Images } from "lucide-react";
import { getMediaType } from "@/utils/media-utils";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/avi', 'video/webm'];

const uploadSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().max(500, "Description too long").optional(),
});

interface SelectedMedia {
  file: File;
  preview: string;
}

interface UploadFormProps {
  onSuccess: () => void;
  onClose?: () => void;
  partnerId?: string;
}

export function UploadForm({ onSuccess, onClose, partnerId }: UploadFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<SelectedMedia[]>([]);
  const selectedFilesRef = useRef(selectedFiles);
  selectedFilesRef.current = selectedFiles;

  useEffect(() => {
    return () => {
      selectedFilesRef.current.forEach(f => URL.revokeObjectURL(f.preview));
    };
  }, []);

  const { authenticated, user } = usePrivy();
  
  const walletAccounts = user?.linkedAccounts?.filter(account => account.type === 'wallet') || [];
  const solanaWallet = walletAccounts.find(w => w.chainType === 'solana');
  const selectedWalletAccount = solanaWallet || walletAccounts[0];
  const walletAddress = selectedWalletAccount?.address || '';
  const { toast } = useToast();

  const { data: currentContest } = useQuery({
    queryKey: ['/api/admin/current-contest'],
    queryFn: async () => {
      const response = await fetch('/api/admin/current-contest');
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !partnerId,
  });

  const form = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_FILES - selectedFiles.length;
    
    if (files.length > remaining) {
      toast({
        title: "Too many files",
        description: `You can add ${remaining} more (max ${MAX_FILES} total)`,
        variant: "destructive"
      });
    }

    const validFiles = files.slice(0, remaining).filter(file => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({ title: "Invalid file type", description: `${file.name} is not supported`, variant: "destructive" });
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({ title: "File too large", description: `${file.name} exceeds 5MB`, variant: "destructive" });
        return false;
      }
      return true;
    });

    const newMedia: SelectedMedia[] = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setSelectedFiles(prev => [...prev, ...newMedia]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

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
      if (!result.fileUrl) throw new Error('No file URL received');
      return result.fileUrl;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') throw new Error('Upload timeout');
      throw new Error(error.message || 'Upload failed');
    }
  };

  const onSubmit = async (values: z.infer<typeof uploadSchema>) => {
    if (!walletAddress) {
      toast({ title: "Wallet Required", description: "Please connect your wallet to submit a meme.", variant: "destructive" });
      return;
    }
    if (selectedFiles.length === 0) {
      toast({ title: "Image Required", description: "Please select at least one image.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        setUploadProgress(Math.round(((i) / selectedFiles.length) * 100));
        const url = await uploadFile(selectedFiles[i].file);
        uploadedUrls.push(url);
      }
      setUploadProgress(100);

      const memeData = {
        title: values.title,
        description: values.description || "",
        imageUrl: uploadedUrls[0],
        additionalImages: uploadedUrls.slice(1),
        authorWallet: walletAddress,
        authorUsername: user?.email?.address || walletAddress.slice(0, 8) + '...' + walletAddress.slice(-4),
        contestId: currentContest?.id || null,
      };

      const endpoint = partnerId ? `/api/partners/${partnerId}/memes` : "/api/memes";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memeData),
      });

      if (!response.ok) throw new Error('Failed to submit meme');

      const newMeme = await response.json();

      if (!partnerId) {
        const addMemeToCache = (old: any) => {
          if (!old?.memes) return old;
          return { ...old, memes: [newMeme, ...old.memes] };
        };
        queryClient.setQueryData(['/api/memes', { sortBy: 'latest' }], addMemeToCache);
        queryClient.setQueryData(['/api/memes', { sortBy: 'votes' }], addMemeToCache);
      }

      queryClient.invalidateQueries({ queryKey: ['/api/memes'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      window.dispatchEvent(new CustomEvent('memeUploaded'));

      toast({ title: "Meme Submitted!", description: "Your meme has been added to the contest.", duration: 1200 });
      form.reset();
      selectedFiles.forEach(f => URL.revokeObjectURL(f.preview));
      setSelectedFiles([]);
      onSuccess();
      onClose?.();
    } catch (error: any) {
      queryClient.invalidateQueries({ queryKey: ['/api/memes'], exact: false });
      toast({ title: "Upload Failed", description: error.message || "Failed to submit meme. Please try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Card className="border-border bg-card border-0 shadow-none">
      <CardContent className="p-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormItem>
              <FormLabel className="text-foreground">Meme Image</FormLabel>
              <div className="border-2 border-dashed border-border rounded-lg p-3 text-center hover:border-primary transition-colors duration-200">
                {selectedFiles.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {selectedFiles.map((media, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-accent group">
                          {getMediaType(media.file.name) === 'video' ? (
                            <video
                              src={media.preview}
                              className="w-full h-full object-cover"
                              muted
                              preload="metadata"
                              onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).currentTime = 0.1; }}
                            />
                          ) : (
                            <img src={media.preview} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3.5 w-3.5 text-white" />
                          </button>
                          {idx === 0 && selectedFiles.length > 1 && (
                            <div className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 rounded font-semibold">
                              COVER
                            </div>
                          )}
                        </div>
                      ))}
                      {selectedFiles.length < MAX_FILES && (
                        <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                          <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                          <span className="text-[10px] text-muted-foreground">Add</span>
                          <input
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            className="hidden"
                            onChange={handleFilesSelect}
                          />
                        </label>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Images className="h-3 w-3" />
                      <span>{selectedFiles.length}/{MAX_FILES}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground text-sm mb-2">
                      Upload images or videos (max {MAX_FILES}, 5MB each)<br />
                      Drag & drop or click to browse
                    </p>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Button type="button" className="bg-primary hover:bg-primary/90 text-primary-foreground pointer-events-none">
                        Choose Files
                      </Button>
                    </label>
                    <input
                      id="file-upload"
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={handleFilesSelect}
                    />
                  </>
                )}
              </div>
            </FormItem>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter meme title" 
                      {...field}
                      onFocus={(e) => {
                        setTimeout(() => {
                          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 300);
                      }}
                    />
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
                      onFocus={(e) => {
                        setTimeout(() => {
                          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 300);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isUploading || selectedFiles.length === 0}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3"
            >
              {isUploading ? `Uploading... ${uploadProgress}%` : "Submit Meme"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
