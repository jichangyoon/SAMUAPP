import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.samu.memecontest',
  appName: 'SAMU',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https'
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
