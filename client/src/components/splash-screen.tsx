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
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (minTimeElapsed && preloadComplete) {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }
  }, [minTimeElapsed, preloadComplete, onComplete]);

  const containerClass = isVisible
    ? "fixed inset-0 z-50 flex items-center justify-center bg-black"
    : "fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-300 opacity-0 pointer-events-none";

  return (
    <div className={containerClass}>
      <div className="w-full sm:w-[430px] h-full sm:max-h-[900px] relative overflow-hidden">
        <img
          src={splashImage}
          alt="SAMU"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}
