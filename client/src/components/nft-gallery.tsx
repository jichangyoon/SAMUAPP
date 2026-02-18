import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { LazyNftImage } from "@/components/lazy-nft-image";
import { Image as ImageIcon, ExternalLink } from "lucide-react";
import { SAMU_NFTS, type StaticNft } from "@/data/nft-data";
import nftOwnersData from "@/data/nft-owners.json";

export function NftGallery() {
  const [selectedNft, setSelectedNft] = useState<StaticNft | null>(null);

  const getNftOwner = (nftId: number) => {
    return nftOwnersData[nftId.toString() as keyof typeof nftOwnersData] || null;
  };

  const nfts = SAMU_NFTS;

  return (
    <div className="space-y-4 pb-24">
      <Card className="bg-black border-0">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ImageIcon className="h-5 w-5 text-[hsl(50,85%,75%)]" />
            <h2 className="text-xl font-bold text-[hsl(50,85%,75%)]">SAMU Wolf Collection</h2>
          </div>
          <p className="text-sm text-[hsl(50,85%,75%)]/90">
            164 unique SAMU Wolf NFTs with legendary traits
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-2">
        {nfts.map((nft) => (
          <button
            key={nft.id}
            onClick={() => setSelectedNft(nft)}
            className="aspect-square bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors group"
          >
            <LazyNftImage
              nft={nft}
              className="w-full h-full"
            />
          </button>
        ))}
      </div>

      {selectedNft && (
        <Drawer open={!!selectedNft} onOpenChange={() => setSelectedNft(null)}>
          <DrawerContent className="bg-card border-border max-h-[90dvh]">
            <DrawerHeader>
              <DrawerTitle className="text-foreground">{selectedNft.title}</DrawerTitle>
              <DrawerDescription className="text-muted-foreground">
                Created by {selectedNft.creator}
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4 pb-4 space-y-4 overflow-y-auto">
              <div className="aspect-square rounded-lg overflow-hidden">
                <img
                  src={selectedNft.imageUrl}
                  alt={selectedNft.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Token ID:</span>
                  <span className="text-foreground font-mono">#{selectedNft.tokenId.toString().padStart(3, '0')}</span>
                </div>
                
                {(() => {
                  const owner = getNftOwner(selectedNft.tokenId);
                  return owner ? (
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-muted-foreground">Owned by:</span>
                      <button
                        onClick={() => {
                          const username = owner.owner.replace('@', '');
                          const xAppUrl = `twitter://user?screen_name=${username}`;
                          const webUrl = owner.url;
                          
                          if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
                            import('@capacitor/browser').then(({ Browser }) => {
                              Browser.open({ url: xAppUrl }).catch(() => {
                                Browser.open({ url: webUrl });
                              });
                            }).catch(() => {
                              window.open(webUrl, '_blank');
                            });
                          } else {
                            const iframe = document.createElement('iframe');
                            iframe.style.display = 'none';
                            iframe.src = xAppUrl;
                            document.body.appendChild(iframe);
                            
                            setTimeout(() => {
                              document.body.removeChild(iframe);
                              window.open(webUrl, '_blank');
                            }, 1000);
                          }
                        }}
                        className="text-foreground hover:text-primary cursor-pointer flex items-center gap-1 transition-colors"
                      >
                        {owner.owner}
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  ) : null;
                })()}
                
                {selectedNft.description && (
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground">{selectedNft.description}</p>
                  </div>
                )}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
