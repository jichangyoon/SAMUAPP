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
import { Upload } from "lucide-react";

const uploadSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().max(500, "Description too long").optional(),
  image: z.any().refine((files) => files?.length > 0, "Image is required"),
});

interface UploadFormProps {
  onSuccess: () => void;
}

export function UploadForm({ onSuccess }: UploadFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const { authenticated, user } = usePrivy();
  
  // Get wallet using same logic as WalletConnect component - prioritize Solana
  const walletAccounts = user?.linkedAccounts?.filter(account => account.type === 'wallet') || [];
  const solanaWallet = walletAccounts.find(w => w.chainType === 'solana');
  const selectedWalletAccount = solanaWallet || walletAccounts[0];
  const walletAddress = selectedWalletAccount?.address || '';
  const { toast } = useToast();

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
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
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
      const formData = new FormData();
      formData.append('title', values.title);
      formData.append('description', values.description || '');
      formData.append('image', values.image[0]);
      formData.append('authorWallet', walletAddress);
      formData.append('authorUsername', walletAddress.slice(0, 8) + '...' + walletAddress.slice(-4));

      const response = await fetch('/api/memes', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload meme');
      }

      toast({
        title: "Meme Submitted!",
        description: "Your meme has been added to the contest.",
      });

      form.reset();
      setPreview(null);
      onSuccess();
    } catch (error: any) {
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
                          <img
                            src={preview}
                            alt="Preview"
                            className="max-w-full max-h-48 mx-auto rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setPreview(null);
                              field.onChange([]);
                            }}
                          >
                            Remove Image
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                          <p className="text-muted-foreground text-sm mb-2">
                            Drag & drop your meme or click to browse
                          </p>
                          <Button
                            type="button"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          >
                            Choose File
                          </Button>
                        </>
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          field.onChange(e.target.files);
                          handleImageChange(e);
                        }}
                        ref={(e) => {
                          if (e) {
                            const button = e.parentElement?.querySelector('button:last-child');
                            button?.addEventListener('click', () => e.click());
                          }
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
              className="w-full bg-[hsl(30,100%,50%)] hover:bg-[hsl(15,100%,60%)] text-white font-semibold py-3"
            >
              {isUploading ? "Submitting..." : "Submit Meme"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
