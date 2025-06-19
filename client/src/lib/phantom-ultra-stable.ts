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