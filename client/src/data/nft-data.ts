// Static NFT data for high-performance loading
// This approach eliminates server requests and provides instant loading

export interface StaticNft {
  id: number;
  title: string;
  tokenId: number;
  creator: string;
  description: string;
  imageUrl: string;
  createdAt: string;
}

// URL 기반 이미지 생성 함수
const generateImageUrl = (tokenId: number): string => {
  // 여러 CDN 서비스를 순환 사용하여 로드 분산
  const cdnServices = [
    'https://picsum.photos/400/400?random=',
    'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=400&fit=crop&crop=entropy&seed=',
    'https://source.unsplash.com/400x400/?wolf,art&sig='
  ];
  
  const selectedCdn = cdnServices[tokenId % cdnServices.length];
  return `${selectedCdn}${tokenId}`;
};

// Generate 164 SAMU Wolf NFT data with external URLs
export const SAMU_NFTS: StaticNft[] = Array.from({ length: 164 }, (_, index) => {
  const tokenId = index + 1;
  return {
    id: tokenId,
    title: `SAMU Wolf #${tokenId.toString().padStart(3, '0')}`,
    tokenId,
    creator: "SAMU Official",
    description: `Unique SAMU Wolf NFT with legendary traits and community significance. Part of the exclusive 164-piece collection featuring artistic wolf designs with special characteristics.`,
    imageUrl: generateImageUrl(tokenId),
    createdAt: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString() // Random date within last 30 days
  };
});

// Fast lookup by token ID
export const getNftByTokenId = (tokenId: number): StaticNft | undefined => {
  return SAMU_NFTS.find(nft => nft.tokenId === tokenId);
};

// Get NFTs with pagination for better performance
export const getPaginatedNfts = (page: number = 1, pageSize: number = 20): StaticNft[] => {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return SAMU_NFTS.slice(startIndex, endIndex);
};

export const TOTAL_NFTS = SAMU_NFTS.length;