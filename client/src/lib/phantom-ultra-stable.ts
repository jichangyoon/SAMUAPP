export interface PhantomWallet {
  publicKey: string;
  connected: boolean;
}

const SAMU_MINT = 'EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF';

class UltraStablePhantomWallet {
  private _connected = false;
  private _publicKey: string | null = null;
  private _phantom: any = null;

  constructor() {
    this.initializePhantom();
  }

  private async initializePhantom() {
    if (typeof window === 'undefined') return;
    
    // Wait for phantom to be ready
    for (let i = 0; i < 10; i++) {
      if ((window as any).solana?.isPhantom) {
        this._phantom = (window as any).solana;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private isCapacitor(): boolean {
    return !!(window as any).Capacitor;
  }

  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  async connect(): Promise<PhantomWallet> {
    try {
      console.log('팬텀 연결 시작...');
      
      // 모바일 환경에서는 딥링크 방식 사용
      if (this.isCapacitor() || this.isMobile()) {
        return await this.connectMobile();
      }
      
      // 웹 환경에서는 기존 방식 사용
      if (!this._phantom) {
        await this.initializePhantom();
        if (!this._phantom) {
          throw new Error('Phantom wallet not found');
        }
      }

      const response = await this._phantom.connect();
      this._publicKey = response.publicKey.toString();
      this._connected = true;

      console.log('연결 성공:', this._publicKey);
      return {
        publicKey: this._publicKey!,
        connected: true
      };
    } catch (error) {
      console.log('연결 실패:', error);
      throw error;
    }
  }

  private async connectMobile(): Promise<PhantomWallet> {
    console.log('모바일 팬텀 연결 시작...');
    
    // 딥링크 콜백 처리를 위한 Promise 생성
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('팬텀 연결 시간 초과'));
      }, 30000);

      // 딥링크 핸들러에 콜백 등록
      import('./deeplink-handler').then(({ deepLinkHandler }) => {
        deepLinkHandler.registerCallback('phantom', (data: any) => {
          clearTimeout(timeout);
          console.log('팬텀 딥링크 콜백 수신:', data);
          
          if (data.publicKey && data.connected) {
            this._publicKey = data.publicKey;
            this._connected = true;
            console.log('모바일 팬텀 연결 성공:', this._publicKey);
            resolve({
              publicKey: this._publicKey!,
              connected: true
            });
          } else if (data.errorCode || data.errorMessage) {
            console.log('팬텀 연결 오류:', data.errorMessage || data.errorCode);
            reject(new Error(data.errorMessage || '팬텀 연결 실패'));
          } else {
            reject(new Error('팬텀 연결 실패 - 응답 데이터 부족'));
          }
        });
      }).catch(error => {
        console.log('딥링크 핸들러 로드 실패:', error);
        reject(error);
      });

      // 팬텀 앱 열기
      const phantomUrl = this.generatePhantomConnectUrl();
      console.log('팬텀 앱 열기:', phantomUrl);
      
      if (this.isCapacitor()) {
        // Capacitor 환경에서는 window.open 사용
        window.open(phantomUrl, '_system');
      } else {
        // 일반 모바일 브라우저에서는 location 변경
        window.location.href = phantomUrl;
      }
    });
  }

  private generatePhantomConnectUrl(): string {
    const baseUrl = this.isCapacitor() ? 'samuapp://phantom-callback' : 
                    'https://meme-chain-rally-wlckddbs12345.replit.app/phantom-callback';
    
    const params = new URLSearchParams({
      dapp_encryption_public_key: 'phantom_connect_request',
      cluster: 'mainnet-beta',
      app_url: baseUrl,
      redirect_path: '/phantom-callback'
    });

    return `https://phantom.app/ul/connect?${params.toString()}`;
  }

  async disconnect(): Promise<void> {
    try {
      if (this._phantom && this._connected) {
        await this._phantom.disconnect();
      }
    } catch (error) {
      console.log('연결 해제 중 오류:', error);
    } finally {
      this._connected = false;
      this._publicKey = null;
    }
  }

  get connected(): boolean {
    return this._connected;
  }

  get publicKey(): string | null {
    return this._publicKey;
  }

  async getSamuBalance(): Promise<number> {
    if (!this._publicKey || !this._connected) {
      console.log('지갑이 연결되지 않아 잔액 조회 불가');
      return 0;
    }

    // 가장 안정적인 엔드포인트만 사용
    const endpoint = 'https://solana.publicnode.com';
    
    try {
      console.log('SAMU 잔액 조회 시작:', this._publicKey);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenAccountsByOwner',
          params: [
            this._publicKey,
            { mint: SAMU_MINT },
            { encoding: 'jsonParsed' }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log('RPC 응답 오류');
        return 0;
      }

      const data = await response.json();
      
      if (data.error || !data.result?.value) {
        console.log('토큰 계정 없음');
        return 0;
      }

      const tokenAccounts = data.result.value;
      if (tokenAccounts.length === 0) {
        console.log('SAMU 토큰 없음');
        return 0;
      }

      const balance = tokenAccounts[0].account.data.parsed.info.tokenAmount.uiAmount;
      const finalBalance = Math.floor(balance || 0);
      
      console.log('SAMU 잔액:', finalBalance);
      return finalBalance;

    } catch (error) {
      console.log('잔액 조회 실패 - 0으로 처리');
      return 0;
    }
  }
}

export const phantomWallet = new UltraStablePhantomWallet();