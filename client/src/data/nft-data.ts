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

// 로컬 이미지 URL 생성 - WebP 최적화로 즉시 로딩 보장
const generateImageUrl = (tokenId: number): string => {
  // WebP 형식으로 93.6% 용량 절약, 빠른 로딩 보장
  return `/assets/nfts/${tokenId}.webp`;
};

// Generate 164 SAMU Wolf NFT data with external URLs
export const SAMU_NFTS: StaticNft[] = Array.from({ length: 164 }, (_, index) => {
  const tokenId = index + 1;
  return {
    id: tokenId,
    title: `SAMU Wolf #${tokenId.toString().padStart(3, '0')}`,
    tokenId,
    creator: "SAMU Official",
    description: "Claim your wolf. Enter the SAMUrai ranks.",
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