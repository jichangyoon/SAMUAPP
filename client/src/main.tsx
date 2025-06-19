import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initOverlayBlocker } from "./overlay-blocker";

// Initialize comprehensive overlay blocking
initOverlayBlocker();

createRoot(document.getElementById("root")!).render(<App />);
