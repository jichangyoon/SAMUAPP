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

  async connect(): Promise<PhantomWallet> {
    if (!this._phantom) {
      // If Phantom is not installed, open installation page
      window.open('https://phantom.app/', '_blank');
      throw new Error('Phantom wallet not installed. Please install Phantom wallet extension.');
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
      throw new Error('Failed to connect to Phantom wallet');
    }
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
    return this._connected && this._phantom?.isConnected;
  }

  get publicKey(): string | null {
    return this._publicKey;
  }

  async getSamuBalance(): Promise<number> {
    if (!this._connected || !this._publicKey) return 0;

    console.log('Fetching SAMU balance for:', this._publicKey);
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
                this._publicKey, 
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
