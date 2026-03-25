import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

// TextDecoder polyfill for Solana/Privy compatibility
if (typeof global === 'undefined') {
  (globalThis as any).global = globalThis;
}

// Buffer polyfill for browser environment
import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
}

// Global error handlers for wallet and network issues
const IGNORED_PATTERNS = ['Privy', 'iframe', 'wallet', 'fetch', 'Failed to fetch', 'EmptyRanges'];

const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
  const reason = event.reason?.message || '';
  if (IGNORED_PATTERNS.some(pattern => reason.includes(pattern))) {
    event.preventDefault();
  }
};

const handleError = (event: ErrorEvent) => {
  const message = event.error?.message || event.message || '';
  if (IGNORED_PATTERNS.some(pattern => message.includes(pattern))) {
    event.preventDefault();
  }
};

window.addEventListener('unhandledrejection', handleUnhandledRejection, { passive: true });
window.addEventListener('error', handleError, true);

const solanaConnectors = toSolanaWalletConnectors({
  walletConnectProjectId: '88a9959df96940fde81441818d3b9b3d',
});

createRoot(document.getElementById("root")!).render(
  <PrivyProvider
    appId="cmc3cduly00mrjs0nuj2jyuz8"
    config={{
      appearance: {
        theme: 'dark',
        accentColor: '#fbbf24',
        walletChainType: 'solana-only',
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
      <App />
    </QueryClientProvider>
  </PrivyProvider>
);
