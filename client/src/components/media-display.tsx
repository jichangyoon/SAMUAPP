import { useRef, useState, useEffect, useCallback } from "react";
import { Play, ImageOff } from "lucide-react";
import { getMediaType } from "@/utils/media-utils";

interface MediaDisplayProps {
  src: string;
  alt: string;
  className?: string;
  showControls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  onClick?: () => void;
  preload?: "auto" | "metadata" | "none";
  autoPlayOnVisible?: boolean;
}

export function MediaDisplay({ 
  src, 
  alt, 
  className = "", 
  showControls = false,
  autoPlay = false,
  muted = true,
  loop = false,
  onClick,
  preload = "metadata",
  autoPlayOnVisible = false
}: MediaDisplayProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [hasError, setHasError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const mediaType = getMediaType(src);

  useEffect(() => {
    setImageLoaded(false);
    setVideoReady(false);
    setHasError(false);
    requestAnimationFrame(() => {
      const img = imgRef.current;
      if (img && img.complete && img.naturalWidth > 0) {
        setImageLoaded(true);
      }
    });
  }, [src]);

  useEffect(() => {
    if (!autoPlayOnVisible || mediaType !== 'video') return;
    const videoEl = videoRef.current;
    const containerEl = containerRef.current;
    if (!videoEl || !containerEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoEl.play().catch(() => {});
          } else {
            videoEl.pause();
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(containerEl);
    return () => observer.disconnect();
  }, [autoPlayOnVisible, mediaType]);

  const handleVideoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) {
      onClick();
    }
  };
  
  if (mediaType === 'video') {
    return (
      <div ref={containerRef} className={`relative group ${className}`}>
        {!videoReady && !hasError && (
          <div className="absolute inset-0 bg-accent animate-pulse z-10" />
        )}
        <video
          ref={videoRef}
          src={src}
          className={`w-full h-full object-cover cursor-pointer transition-opacity duration-200 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          playsInline
          preload={autoPlayOnVisible ? "auto" : preload}
          controls={showControls}
          controlsList="nodownload"
          disablePictureInPicture
          lang="en"
          onClick={handleVideoClick}
          onLoadedMetadata={() => {
            setVideoReady(true);
            if (videoRef.current && !showControls) {
              videoRef.current.currentTime = 0.1;
            }
          }}
          onError={() => setHasError(true)}
        />
        {hasError && (
          <div className="absolute inset-0 bg-accent flex flex-col items-center justify-center">
            <ImageOff className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-xs text-muted-foreground text-center px-2">Video unavailable</span>
          </div>
        )}
        {!showControls && !autoPlayOnVisible && (
          <>
            <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded font-medium text-[10px]">
              VID
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/60 rounded-full p-1">
                <Play className="h-3 w-3 text-white fill-white" />
              </div>
            </div>
          </>
        )}
        {autoPlayOnVisible && (
          <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded font-medium text-[10px]">
            VID
          </div>
        )}
      </div>
    );
  }
  
  if (hasError) {
    return (
      <div className={`bg-accent flex flex-col items-center justify-center ${className}`}>
        <ImageOff className="h-8 w-8 text-muted-foreground mb-2" />
        <span className="text-xs text-muted-foreground text-center px-2">Image unavailable</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {!imageLoaded && (
        <div className="absolute inset-0 bg-accent animate-pulse" />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={`object-cover w-full h-full ${onClick ? 'cursor-pointer' : ''} transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClick ? (e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        } : undefined}
        decoding="async"
        onLoad={() => setImageLoaded(true)}
        onError={() => setHasError(true)}
      />
    </div>
  );
}