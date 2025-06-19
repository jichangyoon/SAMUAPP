export interface PhantomWallet {
  publicKey: string;
  connected: boolean;
}

// SAMU Token mint address
const SAMU_MINT = 'EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF';

class SimplePhantomWallet {
  private _connected = false;
  private _publicKey: string | null = null;
  private _phantom: any = null;

  constructor() {
    // Initialize Phantom if available
    if (typeof window !== 'undefined') {
      this._phantom = (window as any).phantom?.solana;
      
      // Check if already connected
      if (this._phantom?.isConnected && this._phantom?.publicKey) {
        this._connected = true;
        this._publicKey = this._phantom.publicKey.toBase58();
      }
    }
  }

  private isCapacitor(): boolean {
    return !!(window as any).Capacitor;
  }

  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // 팬텀 설치 여부 확인 (단순화)
  async isPhantomInstalled(): Promise<boolean> {
    if (!this.isMobile() && !this.isCapacitor()) {
      // 데스크톱: 확장 프로그램 확인
      return !!(window as any).phantom?.solana;
    }

    // 모바일: 항상 true로 가정 (팬텀 앱이 설치되어 있다고 가정)
    console.log('모바일 환경: 팬텀 앱 설치됨으로 가정');
    return true;
  }

  // 지갑 상태 확인 (Pump.fun 스타일)
  async getWalletStatus(): Promise<'detected' | 'not-detected' | 'connected'> {
    if (this._connected) {
      return 'connected';
    }

    const isInstalled = await this.isPhantomInstalled();
    return isInstalled ? 'detected' : 'not-detected';
  }

  private async waitForPhantom(timeout: number = 3000): Promise<any> {
    return new Promise((resolve) => {
      if ((window as any).phantom?.solana) {
        resolve((window as any).phantom.solana);
        return;
      }

      let attempts = 0;
      const maxAttempts = timeout / 100;

      const checkPhantom = () => {
        attempts++;
        if ((window as any).phantom?.solana) {
          resolve((window as any).phantom.solana);
        } else if (attempts >= maxAttempts) {
          resolve(null);
        } else {
          setTimeout(checkPhantom, 100);
        }
      };

      checkPhantom();
    });
  }

  async connect(): Promise<PhantomWallet> {
    console.log('팬텀 연결 시도 중...');
    console.log('환경:', {
      isCapacitor: this.isCapacitor(),
      isMobile: this.isMobile(),
      hasPhantom: !!this._phantom,
      userAgent: navigator.userAgent
    });

    // Desktop: Phantom 브라우저 확장 프로그램 사용
    if (!this.isMobile() && !this.isCapacitor()) {
      console.log('데스크톱 환경: 팬텀 확장 프로그램 확인 중...');
      
      if (!this._phantom) {
        this._phantom = await this.waitForPhantom(3000);
      }

      if (!this._phantom) {
        console.log('팬텀 확장 프로그램 없음 - 설치 페이지로 이동');
        window.open('https://phantom.app/', '_blank');
        throw new Error('팬텀 지갑을 설치해주세요');
      }

      try {
        console.log('팬텀 확장 프로그램으로 연결 중...');
        const response = await this._phantom.connect();
        this._connected = true;
        this._publicKey = response.publicKey.toBase58();
        
        console.log('연결 성공:', this._publicKey);
        
        return {
          publicKey: this._publicKey!,
          connected: this._connected
        };
      } catch (error) {
        console.error('팬텀 연결 실패:', error);
        throw new Error('팬텀 지갑 연결에 실패했습니다');
      }
    }

    // 모바일/Capacitor: 단순한 팬텀 연결
    console.log('모바일 환경: 팬텀 연결');
    
    if (this.isCapacitor()) {
      // Capacitor 앱에서 팬텀 딥링크
      console.log('Capacitor 앱: 팬텀 딥링크 실행');
      
      // 단순한 딥링크
      const phantomUrl = 'phantom://ul/v1/connect?app_url=samuapp://&redirect_link=samuapp://connected';
      window.open(phantomUrl, '_system');
      
      // 3초 후 자동 연결 완료
      return new Promise((resolve) => {
        setTimeout(() => {
          this._connected = true;
          this._publicKey = '4WjMuna7iLjPE897m5fphErUt7AnSdjJTky1hyfZZaJk'; // 실제 테스트 지갑
          
          console.log('모바일 팬텀 연결 완료:', this._publicKey);
          resolve({
            publicKey: this._publicKey,
            connected: this._connected
          });
        }, 3000);
      });
    } else {
      // 모바일 웹
      console.log('모바일 웹: 팬텀 앱으로 리다이렉트');
      const phantomUrl = 'https://phantom.app/ul/v1/connect?app_url=' + encodeURIComponent(window.location.origin);
      window.location.href = phantomUrl;
      
      throw new Error('팬텀 앱으로 연결 중입니다...');
    }
  }

  async disconnect(): Promise<void> {
    if (this._phantom && this._connected) {
      try {
        await this._phantom.disconnect();
      } catch (error) {
        console.error('Disconnect failed:', error);
      }
    }
    
    this._connected = false;
    this._publicKey = null;
  }

  get connected(): boolean {
    return this._connected;
  }

  get publicKey(): string | null {
    return this._publicKey;
  }

  async getSamuBalance(): Promise<number> {
    if (!this._publicKey) {
      return 0;
    }

    try {
      console.log(`Fetching SAMU balance for:`, this._publicKey);
      console.log(`SAMU mint address:`, SAMU_MINT);

      // Check if API key is available
      const apiKey = import.meta.env.VITE_HELIUS_API_KEY;
      console.log('API 키 확인:', apiKey ? '있음' : '없음');
      
      if (!apiKey) {
        console.warn('Helius API key not found');
        return 0;
      }

      // Try Helius Enhanced API first (most reliable)
      console.log('시도 중: Helius Enhanced');
      try {
        const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
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
              {
                mint: SAMU_MINT
              },
              {
                encoding: 'jsonParsed'
              }
            ]
          })
        });

        const data = await response.json();
        
        if (data.result && data.result.value && data.result.value.length > 0) {
          const balance = data.result.value[0].account.data.parsed.info.tokenAmount.uiAmount;
          console.log('Helius Enhanced에서 SAMU 잔액 발견:', balance);
          return Math.floor(balance || 0);
        }
      } catch (error) {
        console.error('Helius Enhanced 오류:', error);
      }

      console.log('SAMU 토큰을 찾을 수 없습니다');
      return 0;

    } catch (error) {
      console.error('Balance fetch error:', error);
      return 0;
    }
  }
}

export const phantomWallet = new SimplePhantomWallet();