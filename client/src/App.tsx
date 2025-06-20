import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { useEffect } from 'react';
import * as React from 'react';
import Home from "@/pages/home";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";

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

const AuthenticatedApp = React.memo(() => {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/connected" component={Home} />
      <Route path="/profile" component={Profile} />
      <Route component={NotFound} />
    </Switch>
  );
});

const AppContent = React.memo(() => {
  const { authenticated, ready } = usePrivy();
  
  if (!ready) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-yellow-400 font-['Poppins']">Loading...</div>
      </div>
    );
  }
  
  if (!authenticated) {
    return <Login />;
  }
  
  return <AuthenticatedApp />;
});

function App() {
  // Set dark mode as default
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

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
          <AppContent />
        </TooltipProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

export default App;
