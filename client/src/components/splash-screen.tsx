import { useEffect, useState } from 'react';
import samuLogo from '../assets/samu-logo.webp';

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
      <div className="fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 opacity-0 pointer-events-none" 
           style={{ background: 'hsl(50, 85%, 75%)' }}>
        <div className="text-center">
          <img
            src={samuLogo}
            alt="SAMU"
            className="w-32 h-32 mx-auto mb-6 animate-pulse"
          />
          <h1 className="text-3xl font-bold text-black mb-4">SAMU</h1>
          <div className="flex justify-center space-x-1">
            <div className="w-3 h-3 bg-black rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-black rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-black rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" 
         style={{ background: 'hsl(50, 85%, 75%)' }}>
      <div className="text-center">
        <img
          src={samuLogo}
          alt="SAMU"
          className="w-32 h-32 mx-auto mb-6 animate-pulse"
        />
        <h1 className="text-3xl font-bold text-black mb-4">SAMU</h1>
        <div className="flex justify-center space-x-1">
          <div className="w-3 h-3 bg-black rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-black rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-3 h-3 bg-black rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
}