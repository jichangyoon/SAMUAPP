import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PrivyProvider } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import * as React from 'react';
import Home from "@/pages/home";
import Profile from "@/pages/profile";
import { Partners } from "@/pages/partners";
import { PartnerContest } from "@/pages/partner-contest";
import { Admin } from "@/pages/admin";
import NotFound from "@/pages/not-found";


// Global error handler for Privy iframe issues
window.addEventListener('error', (event) => {
  const target = event.target as HTMLElement;
  if (event.message?.includes('Privy iframe') || target?.tagName === 'IFRAME') {
    console.warn('Privy iframe error handled:', event.message);
    event.preventDefault();
    return false;
  }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('Privy') || event.reason?.message?.includes('iframe')) {
    console.warn('Privy promise rejection handled:', event.reason);
    event.preventDefault();
  }
});

const Router = React.memo(() => {
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

  // Set dark mode as default and preload images
  useEffect(() => {
    document.documentElement.classList.add('dark');
    
    // Preload critical images for instant loading
    const preloadImages = async () => {
      const imagesToPreload = [
        // Partner logos
        '/client/src/assets/wagus.webp',
        '/client/src/assets/doctorbird.webp',
        // Goods shop image
        '/client/src/assets/shirt.webp',
        // SAMU logo
        '/client/src/assets/samu-logo.webp'
      ];
      
      // Preload NFT images (first 20 for immediate visibility)
      for (let i = 1; i <= 20; i++) {
        imagesToPreload.push(`/client/src/assets/nfts/${i}.webp`);
      }
      
      // Load all images with Promise.all to wait for completion
      const imagePromises = imagesToPreload.map(src => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = resolve; // Continue even if some images fail
          img.src = src;
        });
      });
      
      try {
        await Promise.all(imagePromises);
        setPreloadComplete(true);
      } catch (error) {
        // Continue even if preload fails
        setPreloadComplete(true);
      }
    };
    
    preloadImages();
  }, []);

  // Auto-hide splash after preload completes with minimum 2s display
  useEffect(() => {
    if (preloadComplete && showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [preloadComplete, showSplash]);

  // Show splash screen on first load
  if (showSplash) {

    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
        <div className="mb-8">
          <div className="w-32 h-32 bg-yellow-400 rounded-full flex items-center justify-center text-black text-4xl font-bold">
            SAMU
          </div>
        </div>
        <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
          <div 
            className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all duration-300 ease-out"
            style={{ width: preloadComplete ? '100%' : '25%' }}
          />
        </div>
        <p className="text-yellow-400 text-sm font-medium">
          {preloadComplete ? 'Ready!' : 'Loading critical assets...'}
        </p>
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

  return (
    <PrivyProvider
      appId="cmc3cduly00mrjs0nuj2jyuz8"
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#fbbf24',
        },
        loginMethods: ['email'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

export default App;
