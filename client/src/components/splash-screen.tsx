import { useEffect, useState } from 'react';
import splashImage from '../assets/splash-screen.jpg';

interface SplashScreenProps {
  onComplete: () => void;
  preloadComplete?: boolean;
}

export function SplashScreen({ onComplete, preloadComplete = false }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    // Ensure minimum 2 seconds display time
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Complete splash when both conditions are met
    if (minTimeElapsed && preloadComplete) {
      setIsVisible(false);
      // Allow fade out animation to complete
      setTimeout(onComplete, 300);
    }
  }, [minTimeElapsed, preloadComplete, onComplete]);

  if (!isVisible) {
    return (
      <div className="fixed inset-0 z-50 transition-opacity duration-300 opacity-0 pointer-events-none">
        <img
          src={splashImage}
          alt="SAMU"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50">
      <img
        src={splashImage}
        alt="SAMU"
        className="w-full h-full object-cover"
      />
    </div>
  );
}