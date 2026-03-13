import { useState, useRef, useEffect } from "react";
import { MediaDisplay } from "@/components/media-display";
import { getMediaType } from "@/utils/media-utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

function CarouselVideoSlide({ src, autoPlay }: { src: string; autoPlay: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (autoPlay) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [autoPlay]);

  return (
    <video
      ref={videoRef}
      src={src}
      className="w-full h-full object-contain"
      muted
      loop
      playsInline
      autoPlay={autoPlay}
    />
  );
}

interface ImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
  showControls?: boolean;
  onClick?: () => void;
  autoPlayVideo?: boolean;
  containMode?: boolean;
  instagramMode?: boolean;
  naturalSizing?: boolean;
}

export function ImageCarousel({ images, alt, className = "", showControls = false, onClick, autoPlayVideo = false, containMode = false, instagramMode = false, naturalSizing = false }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const dragDirectionLocked = useRef<'horizontal' | 'vertical' | null>(null);

  if (!images || images.length === 0) {
    return <div className={`bg-accent flex items-center justify-center ${className}`}><span className="text-muted-foreground text-sm">No image</span></div>;
  }

  if (images.length === 1) {
    return (
      <MediaDisplay
        src={images[0]}
        alt={alt}
        className={className}
        showControls={instagramMode ? false : showControls}
        onClick={onClick}
        muted={!showControls}
        loop={!showControls}
        autoPlayOnVisible={autoPlayVideo}
        containMode={containMode}
        instagramMode={instagramMode}
        naturalSizing={naturalSizing}
      />
    );
  }

  const goTo = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(images.length - 1, index)));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndX.current = e.touches[0].clientX;
    dragDirectionLocked.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dragDirectionLocked.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        dragDirectionLocked.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
      }
      return;
    }
    if (dragDirectionLocked.current === 'horizontal') {
      touchEndX.current = e.touches[0].clientX;
      setDragOffset(dx);
      setIsDragging(true);
    }
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const wasHorizontal = dragDirectionLocked.current === 'horizontal';
    setIsDragging(false);
    setDragOffset(0);
    dragDirectionLocked.current = null;
    if (wasHorizontal && Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < images.length - 1) goTo(currentIndex + 1);
      else if (diff < 0 && currentIndex > 0) goTo(currentIndex - 1);
    }
  };

  return (
    <div
      className={`relative bg-black overflow-hidden touch-pan-y ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={onClick}
    >
      {/* 슬라이딩 트랙: 컨테이너와 같은 크기, translateX로 이동 */}
      <div
        className="relative w-full h-full"
        style={{
          transform: `translateX(calc(-${currentIndex * 100}% + ${dragOffset}px))`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {images.map((src, idx) => (
          <div
            key={idx}
            className="absolute top-0 w-full h-full bg-black"
            style={{ left: `${idx * 100}%` }}
          >
            {getMediaType(src) === 'video' ? (
              instagramMode ? (
                <MediaDisplay
                  src={src}
                  alt={`${alt} ${idx + 1}`}
                  className="w-full h-full"
                  instagramMode={true}
                  containMode={containMode}
                  autoPlayOnVisible={idx === currentIndex}
                />
              ) : (
                <CarouselVideoSlide src={src} autoPlay={autoPlayVideo && idx === currentIndex} />
              )
            ) : (
              <img
                src={src}
                alt={`${alt} ${idx + 1}`}
                className="w-full h-full object-contain"
              />
            )}
          </div>
        ))}
      </div>

      {currentIndex > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); goTo(currentIndex - 1); }}
          className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-1 text-white hover:bg-black/70 transition-colors z-10"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {currentIndex < images.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goTo(currentIndex + 1); }}
          className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-1 text-white hover:bg-black/70 transition-colors z-10"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={(e) => { e.stopPropagation(); goTo(idx); }}
            className={`rounded-full transition-all duration-200 ${
              idx === currentIndex ? 'w-2 h-2 bg-white' : 'w-1.5 h-1.5 bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function MultiImageBadge({ count }: { count: number }) {
  if (count <= 1) return null;
  return (
    <div className="absolute top-2 right-2 bg-black/70 rounded-md px-1.5 py-0.5 flex items-center gap-0.5 z-10 pointer-events-none">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="14" height="14" rx="2" />
        <rect x="8" y="2" width="14" height="14" rx="2" />
      </svg>
      <span className="text-white text-[10px] font-semibold">{count}</span>
    </div>
  );
}
