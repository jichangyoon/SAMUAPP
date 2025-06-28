import { useEffect, useState } from 'react';
import samuLogo from '../assets/samu-logo.webp';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Show splash for minimum 2 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Allow fade out animation to complete
      setTimeout(onComplete, 300);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center transition-opacity duration-300 opacity-0 pointer-events-none">
        <div className="text-center">
          <img
            src={samuLogo}
            alt="SAMU"
            className="w-24 h-24 mx-auto mb-4 animate-pulse"
          />
          <h1 className="text-2xl font-bold text-yellow-400 mb-2">SAMU</h1>
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="text-center">
        <img
          src={samuLogo}
          alt="SAMU"
          className="w-24 h-24 mx-auto mb-4 animate-pulse"
        />
        <h1 className="text-2xl font-bold text-yellow-400 mb-2">SAMU</h1>
        <div className="flex justify-center space-x-1">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
}