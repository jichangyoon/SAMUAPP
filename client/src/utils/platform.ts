import { Capacitor } from '@capacitor/core';

// 플랫폼 감지 및 네이티브 기능 유틸리티
export class Platform {
  // 네이티브 앱인지 확인
  static isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  // 웹 앱인지 확인
  static isWeb(): boolean {
    return Capacitor.getPlatform() === 'web';
  }

  // Android 앱인지 확인
  static isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android';
  }

  // iOS 앱인지 확인
  static isIOS(): boolean {
    return Capacitor.getPlatform() === 'ios';
  }

  // 모바일 브라우저인지 확인 (웹 환경에서)
  static isMobileBrowser(): boolean {
    if (this.isNative()) return false;
    
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  // 데스크톱 브라우저인지 확인 (웹 환경에서)
  static isDesktopBrowser(): boolean {
    return this.isWeb() && !this.isMobileBrowser();
  }

  // 현재 플랫폼 정보 반환
  static getPlatformInfo(): {
    platform: string;
    isNative: boolean;
    isWeb: boolean;
    isMobile: boolean;
  } {
    return {
      platform: Capacitor.getPlatform(),
      isNative: this.isNative(),
      isWeb: this.isWeb(),
      isMobile: this.isNative() || this.isMobileBrowser()
    };
  }

  // 네이티브 기능 사용 가능 여부 확인
  static hasNativeFeature(feature: 'camera' | 'filesystem' | 'share' | 'preferences'): boolean {
    if (!this.isNative()) return false;
    
    // 기본적으로 네이티브 환경에서는 모든 기능 사용 가능
    return true;
  }

  // 개발 환경 여부 확인
  static isDevelopment(): boolean {
    return import.meta.env.DEV;
  }

  // 프로덕션 환경 여부 확인
  static isProduction(): boolean {
    return import.meta.env.PROD;
  }
}