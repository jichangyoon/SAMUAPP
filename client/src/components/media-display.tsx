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
    // onClick이 있으면 모달 열기 (상세보기)
    if (onClick) {
      onClick();
    } else {
      // onClick이 없으면 컨트롤 토글 (업로드 미리보기 등)
      e.stopPropagation();
      setShowVideoControls(!showVideoControls);
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
          controls={showVideoControls}
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
        
        {/* 모바일 앱에서는 오버레이 컨트롤 제거 - 네이티브 controls만 사용 */}
        
        {/* 모바일용 심플 비디오 표시 */}
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-medium">
          VIDEO
        </div>
        
        {/* 모바일용 심플 플레이 버튼 - 컨트롤이 숨겨져 있을 때만 */}
        {!isPlaying && !showVideoControls && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 rounded-full p-4">
              <Play className="h-8 w-8 text-white fill-white" />
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