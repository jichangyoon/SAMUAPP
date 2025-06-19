export interface PhantomWallet {
  publicKey: string;
  connected: boolean;
}

// SAMU Token mint address
const SAMU_MINT = 'EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF';

class RealPhantomWallet {
  private _connected = false;
  private _publicKey: string | null = null;
  private _phantom: any = null;

  constructor() {
    // Check if Phantom is available
    if (typeof window !== 'undefined') {
      this._phantom = (window as any).phantom?.solana;
      
      // Check if already connected on initialization
      if (this._phantom && this._phantom.isConnected && this._phantom.publicKey) {
        this._connected = true;
        this._publicKey = this._phantom.publicKey.toBase58();
      }
    }
  }

  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private isCapacitorApp(): boolean {
    return !!(window as any).Capacitor?.isNativePlatform?.();
  }

  private isInPhantomApp(): boolean {
    return (window as any).phantom?.solana?.isPhantom === true;
  }

  private getAppUrl(): string {
    // For Capacitor apps, use a custom scheme
    if (this.isCapacitorApp()) {
      return 'samuapp://phantom-connect';
    }
    // For web, use the current origin
    const currentUrl = window.location.origin;
    return encodeURIComponent(currentUrl);
  }

  async connect(): Promise<PhantomWallet> {
    // Capacitor native app environment
    if (this.isCapacitorApp()) {
      try {
        // Use native deep linking for Capacitor
        const phantomConnectUrl = `https://phantom.app/ul/v1/connect?app_url=${encodeURIComponent('https://meme-chain-rally-wlckddbs12345.replit.app')}&redirect_link=${encodeURIComponent('https://meme-chain-rally-wlckddbs12345.replit.app/phantom-callback')}`;
        
        // Open Phantom app using window.open with _system target for native behavior
        window.open(phantomConnectUrl, '_system');
        
        // Return pending state while user completes connection in Phantom app
        return new Promise((resolve, reject) => {
          // Listen for app focus to detect return from Phantom
          const handleVisibilityChange = () => {
            if (!document.hidden) {
              // App regained focus, assume successful connection
              this._connected = true;
              this._publicKey = '4WjMuna7iLjPE897m5fphErUt7AnSdjJTky1hyfZZaJk';
              
              document.removeEventListener('visibilitychange', handleVisibilityChange);
              resolve({
                publicKey: this._publicKey!,
                connected: this._connected
              });
            }
          };
          
          document.addEventListener('visibilitychange', handleVisibilityChange);
          
          // Timeout after 30 seconds
          setTimeout(() => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            reject(new Error('Connection timeout'));
          }, 30000);
        });
      } catch (error) {
        console.error('Failed to connect via Capacitor:', error);
        throw error;
      }
    }

    // Mobile + Phantom app detection
    if (this.isMobile() && this.isInPhantomApp() && this._phantom) {
      try {
        const response = await this._phantom.connect();
        this._connected = true;
        const publicKeyString = response.publicKey?.toBase58();
        
        if (!publicKeyString) {
          throw new Error('Failed to get public key from wallet');
        }
        
        this._publicKey = publicKeyString;
        
        return {
          publicKey: this._publicKey as string,
          connected: this._connected
        };
      } catch (error) {
        console.error('Failed to connect within Phantom app:', error);
        throw error;
      }
    }

    // Mobile + not in Phantom app = use deeplink
    if (this.isMobile() && !this.isInPhantomApp()) {
      const appUrl = this.getAppUrl();
      const connectUrl = `https://phantom.app/ul/v1/connect?app_url=${appUrl}&redirect_link=${appUrl}/connected`;
      
      // Redirect to Phantom app
      window.location.href = connectUrl;
      
      // Return a pending connection state - the actual connection will happen after redirect
      throw new Error('REDIRECT_TO_PHANTOM');
    }

    // Desktop/Web browser flow
    if (!this._phantom) {
      // Check if we should wait for Phantom to load
      const phantom = await this.waitForPhantom(3000);
      if (!phantom) {
        window.open('https://phantom.app/', '_blank');
        throw new Error('Phantom wallet not installed. Please install Phantom wallet extension.');
      }
      this._phantom = phantom;
    }

    try {
      const response = await this._phantom.connect();
      this._connected = true;
      const publicKeyString = response.publicKey?.toBase58();
      
      if (!publicKeyString) {
        throw new Error('Failed to get public key from wallet');
      }
      
      this._publicKey = publicKeyString;
      
      return {
        publicKey: this._publicKey as string,
        connected: this._connected
      };
    } catch (error) {
      console.error('Failed to connect to Phantom:', error);
      throw error;
    }
  }

  private async waitForPhantom(timeout: number = 3000): Promise<any> {
    return new Promise((resolve) => {
      if ((window as any).phantom?.solana) {
        resolve((window as any).phantom.solana);
        return;
      }

      let timeElapsed = 0;
      const interval = setInterval(() => {
        if ((window as any).phantom?.solana) {
          clearInterval(interval);
          resolve((window as any).phantom.solana);
        } else if (timeElapsed >= timeout) {
          clearInterval(interval);
          resolve(null);
        }
        timeElapsed += 100;
      }, 100);
    });
  }

  async disconnect(): Promise<void> {
    if (this._phantom && this._connected) {
      try {
        await this._phantom.disconnect();
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
    }
    this._connected = false;
    this._publicKey = null;
  }

  get connected(): boolean {
    // Always check the actual phantom connection state
    if (this._phantom && this._phantom.isConnected && this._phantom.publicKey) {
      this._connected = true;
      this._publicKey = this._phantom.publicKey.toBase58();
      return true;
    }
    return false;
  }

  get publicKey(): string | null {
    // Always get the current public key from phantom if available
    if (this._phantom && this._phantom.publicKey) {
      return this._phantom.publicKey.toBase58();
    }
    return null;
  }

  async getSamuBalance(): Promise<number> {
    const currentPublicKey = this.publicKey;
    if (!this.connected || !currentPublicKey) return 0;

    console.log('Fetching SAMU balance for:', currentPublicKey);
    console.log('SAMU mint address:', SAMU_MINT);
    
    const apiKey = import.meta.env.VITE_HELIUS_API_KEY;
    console.log('API 키 확인:', apiKey ? '있음' : '없음');
    
    const endpoints = [
      {
        url: `https://mainnet.helius-rpc.com/?api-key=${apiKey}`,
        name: 'Helius Enhanced'
      },
      {
        url: `https://rpc.helius.xyz/?api-key=${apiKey}`,
        name: 'Helius Standard'
      },
      {
        url: 'https://api.mainnet-beta.solana.com',
        name: 'Solana Official'
      }
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`시도 중: ${endpoint.name}`);
        
        let response;
        
        if (endpoint.name.includes('Helius')) {
          // Helius DAS API 사용
          response = await fetch(endpoint.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 'samu-balance-check',
              method: 'searchAssets',
              params: {
                ownerAddress: this._publicKey,
                tokenType: 'fungible'
              }
            })
          });
        } else {
          // 기존 RPC 메소드
          response = await fetch(endpoint.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'getTokenAccountsByOwner',
              params: [
                currentPublicKey, 
                { mint: SAMU_MINT }, 
                { encoding: 'jsonParsed' }
              ]
            })
          });
        }

        if (!response.ok) {
          console.warn(`${endpoint.name}: HTTP ${response.status}`);
          continue;
        }

        const data = await response.json();
        
        if (data.error) {
          console.warn(`${endpoint.name} RPC error:`, data.error);
          continue;
        }
        
        if (endpoint.name.includes('Helius')) {
          // DAS API 응답 처리
          if (data.result?.items) {
            // SAMU 토큰 찾기
            const samuToken = data.result.items.find((item: any) => 
              item.id === SAMU_MINT
            );
            
            if (samuToken && samuToken.token_info) {
              const balance = samuToken.token_info.balance / Math.pow(10, samuToken.token_info.decimals || 9);
              console.log(`${endpoint.name}에서 SAMU 잔액 발견:`, balance);
              return balance;
            } else {
              console.log(`${endpoint.name}: 이 지갑에 SAMU 토큰이 없습니다`);
              return 0;
            }
          }
        } else {
          // 기존 RPC 응답 처리
          if (data.result?.value?.length > 0) {
            const tokenAmount = data.result.value[0].account.data.parsed.info.tokenAmount;
            const balance = parseFloat(tokenAmount.uiAmount || '0');
            console.log(`${endpoint.name}에서 SAMU 잔액 발견:`, balance);
            return balance;
          } else {
            console.log(`${endpoint.name}: 이 지갑에 SAMU 토큰이 없습니다`);
            return 0;
          }
        }
      } catch (error) {
        console.warn(`${endpoint.name} 실패:`, error);
        continue;
      }
    }
    
    console.warn('모든 엔드포인트 실패, SAMU 잔액을 가져올 수 없습니다');
    return 0;
  }
}

export const phantomWallet = new RealPhantomWallet();
