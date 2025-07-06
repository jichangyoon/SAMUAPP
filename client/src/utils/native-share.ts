import { Share } from '@capacitor/share';

// 네이티브 공유 유틸리티 - 웹과 네이티브 앱 모두 지원
export class NativeShare {
  // 기본 공유 (텍스트 + URL)
  static async share(options: { title: string; text: string; url?: string }): Promise<boolean> {
    try {
      await Share.share({
        title: options.title,
        text: options.text,
        url: options.url || window.location.href
      });
      return true;
    } catch (error) {
      // 네이티브 Share API 실패 시 웹 Share API 또는 수동 공유 폴백
      return this.fallbackShare(options);
    }
  }

  // 트위터 공유
  static async shareToTwitter(text: string, url?: string): Promise<void> {
    const shareUrl = url || window.location.href;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    
    try {
      // 네이티브 앱에서는 Capacitor Browser API 사용
      if (this.isNativeApp()) {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: twitterUrl });
      } else {
        // 웹에서는 새 창으로 열기
        window.open(twitterUrl, '_blank');
      }
    } catch (error) {
      // 폴백: 웹 방식으로 열기
      window.open(twitterUrl, '_blank');
    }
  }

  // 텔레그램 공유
  static async shareToTelegram(text: string, url?: string): Promise<void> {
    const shareUrl = url || window.location.href;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    
    try {
      // 네이티브 앱에서는 Capacitor Browser API 사용
      if (this.isNativeApp()) {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: telegramUrl });
      } else {
        // 웹에서는 새 창으로 열기
        window.open(telegramUrl, '_blank');
      }
    } catch (error) {
      // 폴백: 웹 방식으로 열기
      window.open(telegramUrl, '_blank');
    }
  }

  // 네이티브 앱 환경 체크
  private static isNativeApp(): boolean {
    return typeof window !== 'undefined' && 
           (window as any).Capacitor && 
           (window as any).Capacitor.isNativePlatform();
  }

  // 폴백 공유 방법
  private static fallbackShare(options: { title: string; text: string; url?: string }): boolean {
    try {
      // 웹 Share API 사용 시도
      if (navigator.share) {
        navigator.share({
          title: options.title,
          text: options.text,
          url: options.url || window.location.href
        });
        return true;
      }
      
      // 클립보드 복사 폴백
      const shareText = `${options.text}\n${options.url || window.location.href}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareText);
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }
}