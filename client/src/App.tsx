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
import wagusLogo from "@/assets/wagus-logo.webp";
import doctorbirdLogo from "@/assets/doctorbird-logo.webp";

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

  useEffect(() => {
    document.documentElement.classList.add('dark');

    const initializeApp = async () => {
      try {
        await getDeviceId();
        setDeviceIdReady(true);

        const imagesToPreload = [wagusLogo, doctorbirdLogo];

        const imagePromises = imagesToPreload.map(src => {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve;
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
