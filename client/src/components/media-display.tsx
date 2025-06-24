import { useState, useRef, useEffect } from "react";
import { Play } from "lucide-react";

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
  loop = true,
  onClick 
}: MediaDisplayProps) {
  const [showVideoControls, setShowVideoControls] = useState(showControls);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // props 변경시 state 업데이트
  useEffect(() => {
    setShowVideoControls(showControls);
  }, [showControls]);

  const mediaType = src.includes('.mp4') || src.includes('.mov') || src.includes('.avi') || src.includes('.webm') ? 'video' : 'image';

  
  const handleVideoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onClick) {
      onClick();
    } else {
      setShowVideoControls(!showVideoControls);
    }
  };
  
  if (mediaType === 'video') {
    return (
      <div className={`relative group ${className}`}>
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-cover cursor-pointer"
          autoPlay={autoPlay && showVideoControls}
          muted={showVideoControls ? muted : true}
          loop={showVideoControls ? loop : false}
          playsInline
          preload="metadata"
          controls={showVideoControls}
          controlsList="nodownload"
          disablePictureInPicture
          lang="en"
          onClick={handleVideoClick}
          onLoadedMetadata={() => {
            // 썸네일 생성을 위해 첫 프레임으로 이동
            if (videoRef.current && !showVideoControls) {
              videoRef.current.currentTime = 0.1;
            }
          }}
        />
        {/* 컨트롤이 없을 때만 표시 */}
        {!showVideoControls && (
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