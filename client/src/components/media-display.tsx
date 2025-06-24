import { useRef } from "react";
import { Play } from "lucide-react";
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
}

export function MediaDisplay({ 
  src, 
  alt, 
  className = "", 
  showControls = false,
  autoPlay = false,
  muted = true,
  loop = false,
  onClick 
}: MediaDisplayProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaType = getMediaType(src);

  const handleVideoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) {
      onClick();
    }
  };
  
  if (mediaType === 'video') {
    return (
      <div className={`relative group ${className}`}>
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-cover cursor-pointer"
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          playsInline
          preload="metadata"
          controls={showControls}
          controlsList="nodownload"
          disablePictureInPicture
          lang="en"
          onClick={handleVideoClick}
          onLoadedMetadata={() => {
            if (videoRef.current && !showControls) {
              videoRef.current.currentTime = 0.1;
            }
          }}
        />
        {!showControls && (
          <>
            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-medium">
              VIDEO
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/60 rounded-full p-4">
                <Play className="h-8 w-8 text-white fill-white" />
              </div>
            </div>
          </>
        )}
      </div>
    );
  }
  
  // 이미지 표시
  return (
    <img
      src={src}
      alt={alt}
      className={`w-full h-full object-cover ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick ? (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      } : undefined}
      loading="lazy"
    />
  );
}