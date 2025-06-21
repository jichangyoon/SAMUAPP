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

// IPFS 기반 SAMU Wolf NFT 이미지 URL 생성
const generateImageUrl = (tokenId: number): string => {
  // PINATA에 업로드된 실제 SAMU Wolf NFT 컬렉션 사용
  const ipfsCid = 'bafybeigbexzsefsou3jainsx3kn7sgcc64t246ilh5fz4qdyru73s2khai';
  
  // 가장 안정적인 IPFS 게이트웨이 사용 (Pinata 우선)
  return `https://gateway.pinata.cloud/ipfs/${ipfsCid}/${tokenId}.png`;
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