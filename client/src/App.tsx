// Buffer polyfill setup is handled in main.tsx

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
import { SplashScreen } from "@/components/splash-screen";

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
        '/src/assets/wagus-logo.webp',
        '/src/assets/doctorbird-logo.webp',
        // Goods shop image
        '/src/assets/samu-shirt.webp',
        // SAMU logo
        '/src/assets/samu-logo.webp'
      ];
      
      // Preload NFT images (first 20 for immediate visibility)
      for (let i = 1; i <= 20; i++) {
        imagesToPreload.push(`/assets/nfts/${i}.webp`);
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

  // Show splash screen on first load
  if (showSplash) {
    return (
      <SplashScreen 
        onComplete={() => setShowSplash(false)} 
        preloadComplete={preloadComplete}
      />
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
        loginMethods: ['email', 'wallet'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
        externalWallets: {
          solana: {
            connectionOptions: {
              skipPreflight: true,
            },
          },
        },
        solanaClusters: [
          {
            name: 'mainnet-beta',
            rpcUrl: 'https://api.mainnet-beta.solana.com'
          }
        ]
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
