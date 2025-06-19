// Advanced overlay blocking system
export function initOverlayBlocker() {
  // Block Vite's HMR error overlay
  const blockViteOverlay = () => {
    const style = document.createElement('style');
    style.textContent = `
      vite-error-overlay, 
      #vite-error-overlay,
      [data-vite-dev-id],
      .vite-error-overlay,
      #react-error-overlay {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        z-index: -9999 !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  };

  // Override error handling methods
  const overrideErrorMethods = () => {
    // Block console errors that trigger overlays
    const originalError = console.error;
    console.error = (...args) => {
      // Log but don't trigger overlay
      if (!args.some(arg => typeof arg === 'string' && arg.includes('[plugin:runtime-error-plugin]'))) {
        originalError.apply(console, args);
      }
    };

    // Override window.onerror
    window.onerror = () => false;
    
    // Override unhandled promise rejections
    window.onunhandledrejection = (event) => {
      event.preventDefault();
      return false;
    };
  };

  // Monitor and remove overlays
  const removeOverlays = () => {
    const selectors = [
      'vite-error-overlay',
      '#vite-error-overlay', 
      '[data-vite-dev-id]',
      '.vite-error-overlay',
      '#react-error-overlay',
      '[class*="error-overlay"]',
      '[id*="error-overlay"]'
    ];
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.remove();
      });
    });
  };

  // Initialize all blocking mechanisms
  blockViteOverlay();
  overrideErrorMethods();
  
  // Continuous monitoring
  const monitor = setInterval(removeOverlays, 50);
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    clearInterval(monitor);
  });

  return () => clearInterval(monitor);
}