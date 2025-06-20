import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import type { Nft } from "@shared/schema";

export default function NFTs() {
  const { data: nfts = [], isLoading } = useQuery<Nft[]>({
    queryKey: ['/api/nfts'],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="text-center">Loading NFTs...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-primary">SAMU NFT Collection</h1>
          <p className="text-muted-foreground text-sm">
            164개의 독특한 SAMU NFT 컬렉션을 둘러보세요
          </p>
          <Button
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
            onClick={() => window.open('https://opensea.io', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            거래소에서 구매하기
          </Button>
        </div>
      </div>

      {/* NFT Grid */}
      <div className="max-w-md mx-auto px-4">
        <div className="grid grid-cols-3 gap-2">
          {nfts.map((nft) => (
            <Link key={nft.id} href={`/nft/${nft.id}`}>
              <div className="aspect-square bg-card rounded-lg overflow-hidden hover:scale-105 transition-transform cursor-pointer border border-border">
                <img
                  src={nft.imageUrl}
                  alt={nft.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}