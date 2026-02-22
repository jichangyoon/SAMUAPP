import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { useEffect, useState, memo } from 'react';

const solanaConnectors = toSolanaWalletConnectors();
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
    // Silent error handling for production
    event.preventDefault();
    return false;
  }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('Privy') || event.reason?.message?.includes('iframe')) {
    // Silent error handling for production
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
          // Goods shop image
          '/src/assets/samu-shirt.webp',
          // SAMU logo
          '/src/assets/samu-logo.webp'
        ];
        
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
    <PrivyProvider
      appId="cmc3cduly00mrjs0nuj2jyuz8"
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#fbbf24',
          walletChainType: 'solana-only',
        },
        loginMethods: ['email'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
        solanaClusters: [{
          name: 'mainnet-beta',
          rpcUrl: `https://rpc.helius.xyz/?api-key=${import.meta.env.VITE_HELIUS_API_KEY}`
        }]
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
