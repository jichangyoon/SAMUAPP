import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

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

createRoot(document.getElementById("root")!).render(<App />);
