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

// 로컬 이미지 URL 생성 - 즉시 로딩을 위한 최적화
const generateImageUrl = (tokenId: number): string => {
  // 로컬 정적 파일 사용으로 빠른 로딩 보장
  return `/assets/nfts/${tokenId}.png`;
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