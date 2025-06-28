import { useState, useEffect } from "react";
import { ImagePreloader } from "@/utils/preloader";
import samuLogo from "@assets/samu-logo.webp";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("Loading SAMU...");

  useEffect(() => {
    const startTime = Date.now();
    const minDisplayTime = 2000; // 최소 2초 표시

    async function initializeApp() {
      try {
        const preloader = ImagePreloader.getInstance();
        
        // 1단계: 중요한 이미지들 로드
        setLoadingText("Loading critical assets...");
        setLoadingProgress(25);
        
        await preloader.loadCritical();
        setLoadingProgress(75);
        
        // 2단계: 나머지 이미지들 백그라운드 로드 시작
        setLoadingText("Preparing content...");
        setLoadingProgress(90);
        
        // 백그라운드에서 나머지 NFT 로드 (완료를 기다리지 않음)
        preloader.loadAll().catch(console.warn);
        
        setLoadingProgress(100);
        setLoadingText("Ready!");
        
        // 최소 표시 시간 보장
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
        
        setTimeout(() => {
          onComplete();
        }, remainingTime);
        
      } catch (error) {
        console.warn("Failed to preload some assets:", error);
        // 에러가 있어도 앱은 시작
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
        setTimeout(onComplete, remainingTime);
      }
    }

    initializeApp();
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
      {/* SAMU 로고 */}
      <div className="mb-8">
        <img 
          src={samuLogo} 
          alt="SAMU Logo" 
          className="w-32 h-32 object-contain"
        />
      </div>
      
      {/* 로딩 바 */}
      <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
        <div 
          className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all duration-300 ease-out"
          style={{ width: `${loadingProgress}%` }}
        />
      </div>
      
      {/* 로딩 텍스트 */}
      <p className="text-yellow-400 text-sm font-medium">
        {loadingText}
      </p>
      
      {/* 로딩 점들 */}
      <div className="flex space-x-1 mt-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"
            style={{
              animationDelay: `${i * 0.2}s`,
              animationDuration: '1s'
            }}
          />
        ))}
      </div>
    </div>
  );
}