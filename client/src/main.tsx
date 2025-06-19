import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// 전역 오류 핸들러 - unhandled promise rejection 방지
window.addEventListener('unhandledrejection', (event) => {
  // 네트워크 관련 오류는 조용히 처리
  if (event.reason?.message?.includes('fetch') || 
      event.reason?.name === 'TypeError' ||
      event.reason?.message?.includes('Failed to fetch')) {
    console.log('네트워크 요청 실패 - 안전하게 처리됨');
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
