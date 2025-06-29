import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Buffer 폴리필 설정
import { Buffer } from 'buffer';
(globalThis as any).Buffer = Buffer;
(globalThis as any).global = globalThis;
(globalThis as any).process = { env: {} };

// 메모리 효율적인 전역 오류 핸들러
const IGNORED_PATTERNS = ['Privy', 'iframe', 'wallet', 'fetch', 'Failed to fetch'];

const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
  const reason = event.reason?.message || '';
  if (IGNORED_PATTERNS.some(pattern => reason.includes(pattern))) {
    console.warn('지갑 관련 Promise rejection 차단됨');
    event.preventDefault();
  }
};

const handleError = (event: ErrorEvent) => {
  const message = event.error?.message || '';
  if (IGNORED_PATTERNS.some(pattern => message.includes(pattern))) {
    console.warn('네트워크/지갑 오류 차단됨');
    event.preventDefault();
  }
};

window.addEventListener('unhandledrejection', handleUnhandledRejection, { passive: true });
window.addEventListener('error', handleError, { passive: true });

createRoot(document.getElementById("root")!).render(<App />);
