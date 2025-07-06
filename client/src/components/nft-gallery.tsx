import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Image as ImageIcon } from "lucide-react";
import { SAMU_NFTS, type StaticNft } from "@/data/nft-data";
import { NftDetailModal } from "@/components/nft-detail-modal";

export function NftGallery() {
  const [selectedNft, setSelectedNft] = useState<StaticNft | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle NFT click to open modal
  const handleNftClick = (nft: StaticNft) => {
    setSelectedNft(nft);
    setIsModalOpen(true);
  };

  // Check URL for selected NFT parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const selectedId = params.get('selected');
    if (selectedId) {
      const nftId = parseInt(selectedId);
      const nft = SAMU_NFTS.find(n => n.id === nftId);
      if (nft) {
        handleNftClick(nft);
        // Clear the URL parameter after opening modal
        window.history.replaceState(null, '', '/#nft');
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <ImageIcon className="h-6 w-6 text-yellow-400" />
        <h1 className="text-xl font-bold text-yellow-400">SAMU Wolf NFT Collection</h1>
      </div>

      {/* NFT Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {SAMU_NFTS.map((nft) => (
          <Card 
            key={nft.id} 
            className="bg-gray-900 border-gray-800 cursor-pointer transition-all duration-200 hover:bg-gray-800 hover:border-yellow-400/50"
            onClick={() => handleNftClick(nft)}
          >
            <CardContent className="p-3">
              <div className="aspect-square rounded-lg overflow-hidden mb-3">
                <img
                  src={nft.imageUrl}
                  alt={nft.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-white text-sm truncate">{nft.title}</h3>
                <p className="text-xs text-gray-400">
                  #{nft.tokenId.toString().padStart(3, '0')}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* NFT Detail Modal */}
      <NftDetailModal
        selectedNft={selectedNft}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedNft(null);
        }}
      />
    </div>
  );
}