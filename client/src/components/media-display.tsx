import { useRef, useState, useEffect, useCallback } from "react";
import { Play, ImageOff, Volume2, VolumeX } from "lucide-react";
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
  containMode?: boolean;
  instagramMode?: boolean;
}

function InstagramVideoPlayer({ src, className = "", containMode = false }: { src: string; className?: string; containMode?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => {
      if (!isDragging && video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };
    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [isDragging]);

  const seekTo = useCallback((clientX: number) => {
    const bar = progressRef.current;
    const video = videoRef.current;
    if (!bar || !video || !video.duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    video.currentTime = ratio * video.duration;
    setProgress(ratio * 100);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    seekTo(e.clientX);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [seekTo]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    seekTo(e.clientX);
  }, [isDragging, seekTo]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handlePointerCancel = useCallback(() => {
    setIsDragging(false);
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  if (hasError) {
    return (
      <div className={`bg-accent flex flex-col items-center justify-center ${className}`}>
        <ImageOff className="h-8 w-8 text-muted-foreground mb-2" />
        <span className="text-xs text-muted-foreground text-center px-2">Video unavailable</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {!videoReady && (
        <div className="absolute inset-0 bg-accent animate-pulse z-10" />
      )}
      <video
        ref={videoRef}
        src={src}
        className={`w-full ${containMode ? 'object-contain' : 'h-full object-cover'} cursor-pointer transition-opacity duration-200 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        controlsList="nodownload"
        disablePictureInPicture
        onClick={togglePlay}
        onLoadedMetadata={() => setVideoReady(true)}
        onError={() => setHasError(true)}
      />
      <button
        onClick={toggleMute}
        className="absolute top-3 right-3 bg-black/60 rounded-full p-1.5 text-white hover:bg-black/80 transition-colors z-20"
      >
        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
      <div
        ref={progressRef}
        className="absolute bottom-0 left-0 right-0 h-6 flex items-end cursor-pointer z-20 touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div className="w-full h-[3px] bg-white/20 relative">
          <div
            className="absolute top-0 left-0 h-full bg-white rounded-r-full transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
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
  autoPlayOnVisible = false,
  containMode = false,
  instagramMode = false
}: MediaDisplayProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasError, setHasError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const mediaType = getMediaType(src);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const imgCallbackRef = useCallback((node: HTMLImageElement | null) => {
    imgRef.current = node;
    if (node && node.complete && node.naturalWidth > 0) {
      setImageLoaded(true);
    }
  }, []);

  useEffect(() => {
    setVideoReady(false);
    setHasError(false);
    const img = imgRef.current;
    if (img && img.src && img.complete && img.naturalWidth > 0) {
      setImageLoaded(true);
    } else {
      setImageLoaded(false);
    }
  }, [src]);

  useEffect(() => {
    if (imageLoaded || hasError || mediaType === 'video') return;
    const checkComplete = () => {
      const img = imgRef.current;
      if (img && img.complete && img.naturalWidth > 0) {
        setImageLoaded(true);
        return true;
      }
      return false;
    };
    if (checkComplete()) return;
    const t1 = setTimeout(checkComplete, 50);
    const t2 = setTimeout(checkComplete, 200);
    const t3 = setTimeout(checkComplete, 500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [src, imageLoaded, hasError, mediaType]);

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
    if (instagramMode) {
      return <InstagramVideoPlayer src={src} className={className} containMode={containMode} />;
    }

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
        ref={imgCallbackRef}
        src={src}
        alt={alt}
        className={`${containMode ? 'object-contain w-full' : 'object-cover w-full h-full'} ${onClick ? 'cursor-pointer' : ''} transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClick ? (e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        } : undefined}
        loading="eager"
        onLoad={() => setImageLoaded(true)}
        onError={() => setHasError(true)}
      />
    </div>
  );
}