import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Buffer polyfill for browser environment
import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
  (window as any).global = window;
}

createRoot(document.getElementById("root")!).render(<App />);
