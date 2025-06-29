import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Buffer 폴리필 설정 강화
(async () => {
  try {
    const { Buffer } = await import('buffer');
    if (typeof globalThis.Buffer === 'undefined') {
      (globalThis as any).Buffer = Buffer;
    }
    if (typeof (globalThis as any).global === 'undefined') {
      (globalThis as any).global = globalThis;
    }
    if (typeof (globalThis as any).process === 'undefined') {
      (globalThis as any).process = { env: {}, browser: true };
    }
  } catch (error) {
    console.warn('Buffer polyfill 로드 실패, HTML 폴리필 사용');
  }
})();

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
