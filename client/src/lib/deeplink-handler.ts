// iOS Universal Links 및 딥링크 처리를 위한 핸들러
export class DeepLinkHandler {
  private static instance: DeepLinkHandler;
  private callbacks: Map<string, (data: any) => void> = new Map();

  static getInstance(): DeepLinkHandler {
    if (!DeepLinkHandler.instance) {
      DeepLinkHandler.instance = new DeepLinkHandler();
    }
    return DeepLinkHandler.instance;
  }

  constructor() {
    this.initializeListeners();
  }

  private initializeListeners() {
    // Capacitor 환경에서 딥링크 이벤트 처리
    if ((window as any).Capacitor?.isNativePlatform()) {
      try {
        // 동적 import로 Capacitor App 플러그인 로드
        const loadCapacitorApp = async () => {
          const { App } = await import('@capacitor/app');
          App.addListener('appUrlOpen', (event: any) => {
            console.log('딥링크 수신:', event.url);
            this.handleDeepLink(event.url);
          });
        };
        loadCapacitorApp().catch(error => {
          console.log('Capacitor App 플러그인 로드 실패:', error);
        });
      } catch (error) {
        console.log('Capacitor 환경 확인 실패:', error);
      }
    }

    // 웹 환경에서 URL 변경 감지
    window.addEventListener('popstate', () => {
      this.handleWebUrlChange();
    });
  }

  private handleDeepLink(url: string) {
    try {
      const urlObj = new URL(url);
      
      // 팬텀 콜백 처리
      if (urlObj.pathname.includes('phantom-callback')) {
        const phantomData = this.parsePhantomCallback(urlObj);
        this.executeCallback('phantom', phantomData);
      }
    } catch (error) {
      console.error('딥링크 파싱 오류:', error);
    }
  }

  private handleWebUrlChange() {
    const url = window.location.href;
    const urlObj = new URL(url);
    
    if (urlObj.pathname.includes('phantom-callback') || urlObj.search.includes('phantom')) {
      const phantomData = this.parsePhantomCallback(urlObj);
      this.executeCallback('phantom', phantomData);
    }
  }

  private parsePhantomCallback(urlObj: URL): any {
    const params = new URLSearchParams(urlObj.search);
    const fragment = urlObj.hash.substring(1);
    const fragmentParams = new URLSearchParams(fragment);
    
    // 팬텀 딥링크 응답 파라미터 파싱
    const publicKey = params.get('publicKey') || 
                     fragmentParams.get('publicKey') ||
                     params.get('phantom_encryption_public_key') ||
                     fragmentParams.get('phantom_encryption_public_key');
    
    return {
      publicKey: publicKey,
      connected: !!(publicKey && !params.get('errorCode') && !fragmentParams.get('errorCode')),
      session: params.get('session') || fragmentParams.get('session'),
      errorCode: params.get('errorCode') || fragmentParams.get('errorCode'),
      errorMessage: params.get('errorMessage') || fragmentParams.get('errorMessage'),
      data: params.get('data') || fragmentParams.get('data')
    };
  }

  registerCallback(type: string, callback: (data: any) => void) {
    this.callbacks.set(type, callback);
  }

  private executeCallback(type: string, data: any) {
    const callback = this.callbacks.get(type);
    if (callback) {
      callback(data);
    }
  }

  // Public method for external callback execution
  public triggerCallback(type: string, data: any) {
    this.executeCallback(type, data);
  }

  // 팬텀 Universal Link 생성
  generatePhantomConnectUrl(baseUrl: string): string {
    const redirectUrl = `${baseUrl}/phantom-callback`;
    const connectUrl = `https://phantom.app/ul/v1/connect?app_url=${encodeURIComponent(baseUrl)}&redirect_link=${encodeURIComponent(redirectUrl)}`;
    
    return connectUrl;
  }

  // iOS에서 안전한 딥링크 열기
  openDeepLink(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).Capacitor?.isNativePlatform()) {
        // Capacitor 환경에서는 시스템 브라우저 사용
        if (/iPhone|iPad/.test(navigator.userAgent)) {
          // iOS에서는 location.href 사용이 더 안정적
          window.location.href = url;
        } else {
          // Android에서는 window.open 사용
          window.open(url, '_system');
        }
        resolve();
      } else {
        // 웹 환경에서는 새 창으로 열기
        const opened = window.open(url, '_blank');
        if (opened) {
          resolve();
        } else {
          reject(new Error('팝업이 차단되었습니다'));
        }
      }
    });
  }
}

export const deepLinkHandler = DeepLinkHandler.getInstance();