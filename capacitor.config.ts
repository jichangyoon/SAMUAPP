import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.samu.memecontest',
  appName: 'SAMU',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    url: 'https://meme-chain-rally-wlckddbs12345.replit.app'
  },
  plugins: {
    App: {
      deepLink: {
        scheme: 'samuapp'
      }
    }
  }
};

export default config;
