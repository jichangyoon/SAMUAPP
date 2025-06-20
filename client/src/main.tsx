import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// 전역 오류 핸들러 - 필요한 오류만 선별적으로 차단
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.message || '';
  if (reason.includes('Privy') || reason.includes('iframe') || reason.includes('wallet')) {
    console.warn('지갑 관련 Promise rejection 차단됨:', reason);
    event.preventDefault();
  }
});

// 전역 오류 핸들러
window.addEventListener('error', (event) => {
  const message = event.error?.message || '';
  if (message.includes('fetch') || 
      message.includes('Failed to fetch') ||
      message.includes('Privy') ||
      message.includes('iframe')) {
    console.warn('네트워크/지갑 오류 차단됨:', message);
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
