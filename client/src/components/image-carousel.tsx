import { useState, useRef, useCallback } from "react";
import { MediaDisplay } from "@/components/media-display";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
  showControls?: boolean;
  onClick?: () => void;
  autoPlayVideo?: boolean;
  containMode?: boolean;
}

export function ImageCarousel({ images, alt, className = "", showControls = false, onClick, autoPlayVideo = false, containMode = false }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!images || images.length === 0) {
    return <div className={`bg-accent flex items-center justify-center ${className}`}><span className="text-muted-foreground text-sm">No image</span></div>;
  }

  if (images.length === 1) {
    return (
      <MediaDisplay
        src={images[0]}
        alt={alt}
        className={className}
        showControls={showControls}
        onClick={onClick}
        muted={!showControls}
        loop={!showControls}
        autoPlayOnVisible={autoPlayVideo}
        containMode={containMode}
      />
    );
  }

  const goTo = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(images.length - 1, index)));
  }, [images.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex < images.length - 1) {
        goTo(currentIndex + 1);
      } else if (diff < 0 && currentIndex > 0) {
        goTo(currentIndex - 1);
      }
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`} ref={containerRef}>
      <div
        className="flex transition-transform duration-300 ease-out h-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {images.map((src, idx) => (
          <div key={idx} className="min-w-full h-full flex-shrink-0">
            <MediaDisplay
              src={src}
              alt={`${alt} ${idx + 1}`}
              className="w-full h-full"
              showControls={showControls && idx === currentIndex}
              onClick={onClick}
              muted={true}
              loop={true}
              autoPlayOnVisible={autoPlayVideo && idx === currentIndex}
              containMode={containMode}
            />
          </div>
        ))}
      </div>

      {currentIndex > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); goTo(currentIndex - 1); }}
          className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-1 text-white hover:bg-black/70 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {currentIndex < images.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goTo(currentIndex + 1); }}
          className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-1 text-white hover:bg-black/70 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
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
