export interface PhantomWallet {
  publicKey: string;
  connected: boolean;
}

// SAMU Token mint address
const SAMU_MINT = 'EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF';

import { deepLinkHandler } from '@/lib/deeplink-handler';

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

    // Desktop 웹 환경: Phantom 브라우저 확장 프로그램만 사용
    if (!this.isMobile() && !this.isCapacitor()) {
      console.log('데스크톱 환경: 팬텀 확장 프로그램 확인 중...');
      
      // 팬텀 확장 프로그램 기다리기
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

    // 모바일 환경에서만 딥링크 사용
    console.log('모바일 환경: 팬텀 앱으로 연결 중...');
    
    const baseUrl = this.isCapacitor() ? 'samuapp://phantom-connect' : window.location.origin;
    const redirectUrl = `${baseUrl}/phantom-callback`;
    const connectUrl = `https://phantom.app/ul/v1/connect?app_url=${encodeURIComponent(baseUrl)}&redirect_link=${encodeURIComponent(redirectUrl)}`;
    
    console.log('팬텀 딥링크 URL:', connectUrl);
    console.log('리다이렉트 URL:', redirectUrl);

    if (this.isCapacitor()) {
      // Capacitor 앱에서는 딥링크 핸들러 사용
      console.log('Capacitor 앱: Universal Link로 팬텀 연결');
      
      return new Promise((resolve, reject) => {
        // 팬텀 콜백 리스너 등록
        deepLinkHandler.registerCallback('phantom', (data: any) => {
          if (data.publicKey) {
            this._connected = true;
            this._publicKey = data.publicKey;
            resolve({
              publicKey: this._publicKey!,
              connected: this._connected
            });
          } else if (data.errorCode) {
            reject(new Error(`팬텀 연결 오류: ${data.errorMessage || data.errorCode}`));
          }
        });
        
        deepLinkHandler.openDeepLink(connectUrl).catch(error => {
          reject(error);
        });
        
        setTimeout(() => {
          reject(new Error('연결 타임아웃'));
        }, 30000);
      });
    } else {
      // 모바일 웹에서는 직접 리다이렉트
      console.log('모바일 웹: 팬텀 앱으로 리다이렉트');
      window.location.href = connectUrl;
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
      console.log('공개키가 없어서 잔액 조회 불가');
      return 0;
    }

    try {
      console.log(`SAMU 잔액 조회 시작:`, this._publicKey);
      console.log(`SAMU mint 주소:`, SAMU_MINT);

      // Try multiple RPC endpoints with retry logic
      const rpcEndpoints = [
        'https://solana.drpc.org',
        'https://rpc.solanabeach.io',
        'https://solana-rpc.publicnode.com',
        'https://solana-mainnet.core.chainstack.com',
        'https://solana.publicnode.com'
      ];

      for (const endpoint of rpcEndpoints) {
        try {
          console.log(`${endpoint}로 토큰 조회 중...`);
          
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
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

          if (!response.ok) {
            console.log(`${endpoint} 응답 오류:`, response.status);
            continue;
          }

          const data = await response.json();
          
          if (data.error) {
            console.log(`${endpoint} RPC 오류:`, data.error);
            continue;
          }
          
          if (data.result && data.result.value && data.result.value.length > 0) {
            const tokenAccount = data.result.value[0];
            const balance = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
            console.log(`${endpoint}에서 SAMU 잔액 발견:`, balance);
            return Math.floor(balance || 0);
          } else {
            console.log(`${endpoint}: 토큰 계정 없음`);
          }
        } catch (error) {
          // 모든 네트워크 오류를 조용히 처리
          console.log(`${endpoint} 연결 실패`);
          continue;
        }
      }

      // If no balance found from primary endpoints, return 0
      console.log('SAMU 토큰을 찾을 수 없습니다');
      return 0;

    } catch (error) {
      console.error('SAMU 잔액 조회 전체 실패:', error);
      return 0;
    }
  }
}

export const phantomWallet = new SimplePhantomWallet();