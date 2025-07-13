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
        // 로딩 전 플레이스홀더
        <div className="w-full h-full bg-card border border-border flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center mb-2 mx-auto">
              <span className="text-primary font-bold text-sm">
                #{nft.tokenId.toString().padStart(3, '0')}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Loading...</div>
          </div>
        </div>
      )}
    </div>
  );
}