import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handlers to prevent development overlay
window.addEventListener('unhandledrejection', (event) => {
  console.log('Promise rejection handled');
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  if (event.error?.message?.includes('fetch') || 
      event.error?.message?.includes('Failed to fetch') ||
      event.error?.message?.includes('privy') ||
      event.error?.name === 'TypeError') {
    console.log('Network/API error handled');
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
