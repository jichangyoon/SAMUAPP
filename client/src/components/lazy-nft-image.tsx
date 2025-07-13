import React from 'react';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import type { StaticNft } from '@/data/nft-data';

interface LazyNftImageProps {
  nft: StaticNft;
  className?: string;
  onClick?: () => void;
}

export function LazyNftImage({ nft, className, onClick }: LazyNftImageProps) {
  const { ref, shouldLoad } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px', // 100px 전에 미리 로드
    triggerOnce: true
  });

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      onClick={onClick}
    >
      {shouldLoad ? (
        <img
          src={nft.imageUrl}
          alt={nft.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            // 로컬 이미지 로드 실패시 SAMU 플레이스홀더 표시
            const target = e.target as HTMLImageElement;
            target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23333"/><text x="50" y="55" text-anchor="middle" fill="%23F7DC6F" font-size="10" font-family="Arial">SAMU %23${nft.tokenId}</text></svg>`;
          }}
        />
      ) : (
        // 고급 스켈레톤 UI 썸네일
        <div className="w-full h-full bg-gradient-to-br from-gray-800/80 to-gray-900/80 flex items-center justify-center relative overflow-hidden">
          {/* 쉬머 애니메이션 */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse duration-1000"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-pulse duration-1500 delay-200"></div>
          
          {/* 중앙 콘텐츠 */}
          <div className="relative text-center z-10">
            {/* SAMU 브랜드 아이콘 */}
            <div className="w-12 h-12 bg-gradient-to-br from-primary/30 to-primary/20 rounded-xl flex items-center justify-center mb-3 mx-auto border border-primary/40 shadow-lg">
              <div className="text-primary font-bold text-sm">
                #{nft.tokenId.toString().padStart(3, '0')}
              </div>
            </div>
            
            {/* 로딩 프로그레스 */}
            <div className="w-20 h-1.5 bg-gray-700/50 rounded-full mx-auto mb-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary/60 to-primary/40 rounded-full animate-pulse duration-1000" style={{width: '70%'}}></div>
            </div>
            
            {/* 브랜드 텍스트 */}
            <div className="text-xs text-primary/60 font-medium">SAMU Wolf</div>
          </div>
          
          {/* 데코레이션 요소들 */}
          <div className="absolute top-3 right-3 w-2 h-2 bg-primary/40 rounded-full animate-pulse"></div>
          <div className="absolute top-6 right-2 w-1 h-1 bg-primary/30 rounded-full animate-pulse delay-500"></div>
          <div className="absolute bottom-3 left-3 w-1.5 h-1.5 bg-primary/25 rounded-full animate-pulse delay-1000"></div>
          
          {/* 코너 그라데이션 */}
          <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-primary/10 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-6 h-6 bg-gradient-to-tr from-primary/10 to-transparent"></div>
        </div>
      )}
    </div>
  );
}