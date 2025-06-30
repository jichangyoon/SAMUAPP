// Complete Node.js polyfills for Solana Web3.js compatibility
if (typeof window !== 'undefined') {
  // Global polyfills
  (window as any).global = window;
  (window as any).process = { 
    env: { NODE_ENV: 'production' },
    nextTick: (cb: Function) => setTimeout(cb, 0),
    browser: true,
    version: 'v18.0.0'
  };
  
  // Crypto polyfill for getRandomValues
  if (!window.crypto) {
    (window as any).crypto = {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      }
    };
  }
  
  // Complete Buffer polyfill implementation
  class BufferPolyfill extends Uint8Array {
    static isBuffer(obj: any): boolean {
      return obj instanceof BufferPolyfill;
    }
    
    static from(data: any, encoding?: string): BufferPolyfill {
      if (typeof data === 'string') {
        if (encoding === 'base64') {
          const binaryString = atob(data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return new BufferPolyfill(bytes);
        } else if (encoding === 'hex') {
          const bytes = new Uint8Array(data.length / 2);
          for (let i = 0; i < data.length; i += 2) {
            bytes[i / 2] = parseInt(data.substr(i, 2), 16);
          }
          return new BufferPolyfill(bytes);
        } else {
          const encoder = new TextEncoder();
          const bytes = encoder.encode(data);
          return new BufferPolyfill(bytes);
        }
      }
      if (data instanceof ArrayBuffer) {
        return new BufferPolyfill(data);
      }
      if (Array.isArray(data)) {
        return new BufferPolyfill(data);
      }
      if (data instanceof Uint8Array) {
        return new BufferPolyfill(data);
      }
      return new BufferPolyfill(data);
    }
    
    static alloc(size: number, fill?: any): BufferPolyfill {
      const buf = new BufferPolyfill(size);
      if (fill !== undefined) {
        if (typeof fill === 'number') {
          buf.fill(fill);
        } else if (typeof fill === 'string') {
          const fillBytes = new TextEncoder().encode(fill);
          for (let i = 0; i < size; i++) {
            buf[i] = fillBytes[i % fillBytes.length];
          }
        }
      }
      return buf;
    }
    
    static allocUnsafe(size: number): BufferPolyfill {
      return new BufferPolyfill(size);
    }
    
    static concat(list: BufferPolyfill[], totalLength?: number): BufferPolyfill {
      if (!totalLength) {
        totalLength = list.reduce((acc, buf) => acc + buf.length, 0);
      }
      const result = new BufferPolyfill(totalLength);
      let offset = 0;
      for (const buf of list) {
        result.set(buf, offset);
        offset += buf.length;
      }
      return result;
    }
    
    toString(encoding: string = 'utf8'): string {
      if (encoding === 'hex') {
        return Array.from(this).map(b => b.toString(16).padStart(2, '0')).join('');
      } else if (encoding === 'base64') {
        let binary = '';
        for (let i = 0; i < this.length; i++) {
          binary += String.fromCharCode(this[i]);
        }
        return btoa(binary);
      } else {
        const decoder = new TextDecoder(encoding);
        return decoder.decode(this);
      }
    }
    
    constructor(data: any) {
      if (typeof data === 'number') {
        super(data);
      } else if (data instanceof ArrayBuffer) {
        super(data);
      } else if (Array.isArray(data)) {
        super(data);
      } else if (data instanceof Uint8Array) {
        super(data);
      } else {
        super(0);
      }
    }
  }
  
  // Set Buffer globally
  (window as any).Buffer = BufferPolyfill;
  
  // Additional polyfills for Solana Web3.js
  if (typeof (window as any).setImmediate === 'undefined') {
    (window as any).setImmediate = (fn: Function) => setTimeout(fn, 0);
  }
}

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

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
