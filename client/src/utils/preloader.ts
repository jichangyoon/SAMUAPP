// 중요한 이미지들을 미리 로드하는 프리로더 시스템
import wagusLogo from "@assets/wagus.webp";
import doctorBirdLogo from "@assets/doctorbird.webp";
import goodsShopImage from "@assets/shirt.webp";

// NFT 이미지 URL 생성
const nftImageUrls = Array.from({ length: 164 }, (_, i) => 
  `/client/src/assets/nfts/${i + 1}.webp`
);

// 파트너 로고 URL들
const partnerLogos = [wagusLogo, doctorBirdLogo];

// 굿즈샵 이미지
const goodsImages = [goodsShopImage];

// 이미지 프리로드 함수
function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

// 중요한 이미지들 프리로드 (첫 20개 NFT + 파트너 로고 + 굿즈)
export async function preloadCriticalImages(): Promise<void> {
  const criticalImages = [
    ...nftImageUrls.slice(0, 20), // 첫 20개 NFT만 우선 로드
    ...partnerLogos,
    ...goodsImages
  ];

  try {
    await Promise.all(criticalImages.map(preloadImage));
    console.log('Critical images preloaded successfully');
  } catch (error) {
    console.warn('Some critical images failed to preload:', error);
  }
}

// 나머지 NFT 이미지들 백그라운드 로드
export async function preloadRemainingNFTs(): Promise<void> {
  const remainingNFTs = nftImageUrls.slice(20);
  
  // 배치로 나누어서 점진적 로드 (한 번에 10개씩)
  const batchSize = 10;
  for (let i = 0; i < remainingNFTs.length; i += batchSize) {
    const batch = remainingNFTs.slice(i, i + batchSize);
    try {
      await Promise.all(batch.map(preloadImage));
    } catch (error) {
      console.warn(`Failed to preload NFT batch ${i/batchSize + 1}:`, error);
    }
    // 브라우저가 숨을 쉴 수 있도록 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// 전체 프리로딩 관리
export class ImagePreloader {
  private static instance: ImagePreloader;
  private criticalLoaded = false;
  private allLoaded = false;

  static getInstance(): ImagePreloader {
    if (!ImagePreloader.instance) {
      ImagePreloader.instance = new ImagePreloader();
    }
    return ImagePreloader.instance;
  }

  async loadCritical(): Promise<void> {
    if (this.criticalLoaded) return;
    
    await preloadCriticalImages();
    this.criticalLoaded = true;
  }

  async loadAll(): Promise<void> {
    if (this.allLoaded) return;
    
    await this.loadCritical();
    await preloadRemainingNFTs();
    this.allLoaded = true;
  }

  getCriticalLoadStatus(): boolean {
    return this.criticalLoaded;
  }

  getAllLoadStatus(): boolean {
    return this.allLoaded;
  }
}