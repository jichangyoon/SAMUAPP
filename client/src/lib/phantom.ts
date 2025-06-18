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
    
    // Since RPC services are failing, we'll use a direct approach
    // This function will attempt to connect through multiple methods
    
    const methods = [
      // Method 1: Try Helius with proper endpoint
      async () => {
        const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${import.meta.env.VITE_HELIUS_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getParsedTokenAccountsByOwner',
            params: [
              this._publicKey, 
              { mint: SAMU_MINT }, 
              { encoding: 'jsonParsed' }
            ]
          })
        });
        return await response.json();
      },
      
      // Method 2: Use QuickNode public endpoint
      async () => {
        const response = await fetch('https://api.mainnet-beta.solana.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getParsedTokenAccountsByOwner',
            params: [this._publicKey, { mint: SAMU_MINT }, { encoding: 'jsonParsed' }]
          })
        });
        return await response.json();
      },
      
      // Method 3: Use GenesysGo endpoint
      async () => {
        const response = await fetch('https://ssc-dao.genesysgo.net/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getParsedTokenAccountsByOwner',
            params: [this._publicKey, { mint: SAMU_MINT }, { encoding: 'jsonParsed' }]
          })
        });
        return await response.json();
      }
    ];

    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`Trying method ${i + 1}...`);
        const data = await methods[i]();
        
        if (data.error) {
          console.warn(`Method ${i + 1} failed:`, data.error);
          continue;
        }
        
        if (data.result?.value?.length > 0) {
          // All methods should return parsed token account data
          const tokenAmount = data.result.value[0].account.data.parsed.info.tokenAmount;
          const balance = parseFloat(tokenAmount.uiAmount || '0');
          console.log(`SAMU balance found via method ${i + 1}:`, balance);
          return balance;
        } else {
          console.log(`Method ${i + 1}: No SAMU tokens found`);
          return 0;
        }
      } catch (error) {
        console.warn(`Method ${i + 1} failed:`, error);
        continue;
      }
    }
    
    // If all methods fail, throw error
    throw new Error('Unable to fetch SAMU balance from any RPC endpoint');
  }
}

export const phantomWallet = new RealPhantomWallet();
