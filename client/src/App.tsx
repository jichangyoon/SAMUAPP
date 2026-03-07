import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState, memo } from 'react';

import Home from "@/pages/home";
import Profile from "@/pages/profile";
import { Partners } from "@/pages/partners";
import { PartnerContest } from "@/pages/partner-contest";
import { Admin } from "@/pages/admin";
import NotFound from "@/pages/not-found";
import { SplashScreen } from "@/components/splash-screen";
import { getDeviceId } from "./utils/deviceFingerprint";

// Global error handler for Privy iframe issues
window.addEventListener('error', (event) => {
  const target = event.target as HTMLElement;
  if (event.message?.includes('Privy iframe') || target?.tagName === 'IFRAME') {
    event.preventDefault();
    return false;
  }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('Privy') || event.reason?.message?.includes('iframe')) {
    event.preventDefault();
  }
});

const Router = memo(() => {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/connected" component={Home} />
      <Route path="/profile" component={Profile} />
      <Route path="/partners" component={Partners} />
      <Route path="/partner/:partnerId">
        {(params) => <PartnerContest partnerId={params.partnerId} />}
      </Route>
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
});

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [preloadComplete, setPreloadComplete] = useState(false);
  const [deviceIdReady, setDeviceIdReady] = useState(false);

  // Set dark mode as default and preload images
  useEffect(() => {
    document.documentElement.classList.add('dark');
    
    // Initialize device ID first, then preload images
    const initializeApp = async () => {
      try {
        // 1. 디바이스 ID 먼저 초기화
        await getDeviceId();
        setDeviceIdReady(true);
        
        // 2. 이미지 프리로드
        const imagesToPreload = [
          // Partner logos
          '/src/assets/wagus-logo.webp',
          '/src/assets/doctorbird-logo.webp',
          // SAMU logo
          '/src/assets/samu-logo.webp'
        ];
        
        // Load all images with Promise.all to wait for completion
        const imagePromises = imagesToPreload.map(src => {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve; // Continue even if some images fail
            img.src = src;
          });
        });
        
        try {
          await Promise.all(imagePromises);
          setPreloadComplete(true);
        } catch {
          setPreloadComplete(true);
        }
      } catch (error) {
        console.warn('앱 초기화 실패:', error);
        setDeviceIdReady(true);
        setPreloadComplete(true);
      }
    };
    
    initializeApp();
  }, []);

  // Show splash screen on first load
  if (showSplash || !deviceIdReady) {
    return (
      <SplashScreen 
        onComplete={() => setShowSplash(false)} 
        preloadComplete={preloadComplete && deviceIdReady}
      />
    );
  }

  return (
    <TooltipProvider>
      <Toaster />
      <Router />
    </TooltipProvider>
  );
}

export default App;
