import { useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { getMediaType } from "@/utils/media-utils";
import { Button } from "@/components/ui/button";

interface MediaDisplayProps {
  src: string;
  alt: string;
  className?: string;
  showControls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  onClick?: () => void;
}

export function MediaDisplay({ 
  src, 
  alt, 
  className = "", 
  showControls = true,
  autoPlay = false,
  muted = true,
  loop = true,
  onClick 
}: MediaDisplayProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const [thumbnailGenerated, setThumbnailGenerated] = useState(false);
  const [showVideoControls, setShowVideoControls] = useState(true);
  
  const mediaType = getMediaType(src);
  
  const handleVideoPlay = () => {
    if (videoRef) {
      if (isPlaying) {
        videoRef.pause();
      } else {
        videoRef.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef) {
      videoRef.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };
  
  const handleVideoClick = (e: React.MouseEvent) => {
    // If there's an onClick handler, call it, otherwise toggle play/pause
    if (onClick) {
      onClick();
    } else {
      e.stopPropagation();
      handleVideoPlay();
    }
  };
  
  if (mediaType === 'video') {
    return (
      <div className={`relative group ${className}`}>
        <video
          ref={setVideoRef}
          src={src}
          className="w-full h-full object-cover cursor-pointer"
          autoPlay={autoPlay}
          muted={isMuted}
          loop={loop}
          playsInline
          preload="metadata"
          poster=""
          controls={showControls && showVideoControls}
          onClick={handleVideoClick}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onLoadedMetadata={() => {
            // Force thumbnail generation immediately when metadata loads
            if (videoRef && !thumbnailGenerated) {
              videoRef.currentTime = 0.1; // Seek to 0.1 seconds for thumbnail
              setThumbnailGenerated(true);
            }
          }}
          onLoadedData={() => {
            // Backup thumbnail generation
            if (videoRef && !thumbnailGenerated) {
              setTimeout(() => {
                videoRef.currentTime = 0.1;
                setThumbnailGenerated(true);
              }, 50);
            }
          }}
        >
          <source src={src} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {showControls && (
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="bg-black/50 text-white hover:bg-black/70"
                onClick={(e) => {
                  e.stopPropagation();
                  handleVideoPlay();
                }}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="secondary"
                size="sm"
                className="bg-black/50 text-white hover:bg-black/70"
                onClick={handleMuteToggle}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
        
        {/* Video indicator badge */}
        <div className="absolute top-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded-sm font-medium">
          VIDEO
        </div>
        
        {/* Play button overlay for better mobile UX - only show when controls are hidden or when video controls are hidden */}
        {!isPlaying && (!showControls || !showVideoControls) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/50 rounded-full p-3">
              <Play className="h-6 w-6 text-white fill-white" />
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Default to image display
  return (
    <img
      src={src}
      alt={alt}
      className={`w-full h-full object-cover ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      loading="lazy"
    />
  );
}