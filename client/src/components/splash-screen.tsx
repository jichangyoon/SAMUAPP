import { useEffect, useState } from 'react';
import splashLogo from '../assets/splash-logo.webp';

interface SplashScreenProps {
  onComplete: () => void;
  preloadComplete?: boolean;
}

export function SplashScreen({ onComplete, preloadComplete = false }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    // Ensure minimum 2 seconds display time
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Complete splash when all conditions are met
    if (minTimeElapsed && preloadComplete && imageLoaded) {
      setIsVisible(false);
      // Allow fade out animation to complete
      setTimeout(onComplete, 300);
    }
  }, [minTimeElapsed, preloadComplete, imageLoaded, onComplete]);

  if (!isVisible) {
    return (
      <div className="fixed inset-0 z-50 transition-opacity duration-300 opacity-0 pointer-events-none">
        <img
          src={splashLogo}
          alt="SAMU Splash Screen"
          className="w-full h-full object-cover"
          onLoad={() => setImageLoaded(true)}
        />
      </div>
    );
  }

  // Show loading screen until image is loaded
  if (!imageLoaded) {
    return (
      <div className="fixed inset-0 z-50 bg-yellow-300">
        <img
          src={splashLogo}
          alt="SAMU Splash Screen"
          className="w-full h-full object-cover opacity-0"
          onLoad={() => setImageLoaded(true)}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50">
      <img
        src={splashLogo}
        alt="SAMU Splash Screen"
        className="w-full h-full object-cover"
      />
    </div>
  );
}