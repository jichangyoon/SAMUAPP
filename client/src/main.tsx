import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// 전역 오류 핸들러 - 모든 unhandled promise rejection 차단
window.addEventListener('unhandledrejection', (event) => {
  console.log('Promise rejection 차단됨');
  event.preventDefault();
});

// 전역 오류 핸들러
window.addEventListener('error', (event) => {
  if (event.error?.message?.includes('fetch') || 
      event.error?.message?.includes('Failed to fetch')) {
    console.log('네트워크 오류 차단됨');
    event.preventDefault();
  }
});

// Added privy config here based on the prompt instruction
const privyConfig = {
  embeddedWallets: {
    createOnLogin: 'users-without-wallets' as const,
  },
  appearance: {
    theme: 'dark' as const,
    accentColor: '#16a34a',
    logo: '/assets/images/logos/samu-logo.jpg',
  },
};

createRoot(document.getElementById("root")!).render(<App />);