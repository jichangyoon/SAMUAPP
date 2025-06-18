import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.samu.memecontest',
  appName: 'SAMU Meme Contest',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https'
  }
};

export default config;
