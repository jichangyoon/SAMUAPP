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

    try {
      console.log('Fetching SAMU balance for:', this._publicKey);
      console.log('SAMU mint address:', SAMU_MINT);
      
      // Use authenticated RPC endpoints for reliable token balance queries
      const rpcEndpoints = [
        `https://rpc.helius.xyz/?api-key=${import.meta.env.VITE_HELIUS_API_KEY}`,
        'https://api.mainnet-beta.solana.com',
        'https://solana-api.syndica.io/access-token/demo',
        'https://solana.blockdaemon.com/mainnet/rpd-0/native'
      ];
      
      let response;
      let lastError;
      
      for (const endpoint of rpcEndpoints) {
        try {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'getParsedTokenAccountsByOwner',
              params: [
                this._publicKey,
                {
                  mint: SAMU_MINT,
                },
                {
                  encoding: 'jsonParsed',
                },
              ],
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('SAMU balance response from', endpoint, ':', data);
            
            if (!data.error) {
              // Success - process the result
              if (!data.result || !data.result.value || data.result.value.length === 0) {
                console.log('No SAMU token accounts found');
                return 0;
              }

              const tokenAccount = data.result.value[0];
              const tokenAmount = tokenAccount.account.data.parsed.info.tokenAmount;
              
              console.log('Token amount data:', tokenAmount);
              
              const balance = parseFloat(tokenAmount.uiAmount || '0');
              console.log('Final SAMU balance:', balance);
              
              return balance;
            } else {
              lastError = data.error;
              console.warn('RPC Error from', endpoint, ':', data.error);
              continue;
            }
          } else {
            lastError = { message: `HTTP ${response.status}` };
            console.warn('HTTP Error from', endpoint, ':', response.status);
            continue;
          }
        } catch (err) {
          lastError = err;
          console.warn('Network error from', endpoint, ':', err);
          continue;
        }
      }
      
      // If we get here, all endpoints failed
      console.error('All RPC endpoints failed. Last error:', lastError);
      
      // Show user-friendly error message
      console.warn('Unable to fetch SAMU balance due to RPC issues. Please check your wallet manually or try again later.');
      
      // Return 0 to indicate unable to fetch balance (not that user has 0 tokens)
      return 0;
      
    } catch (error) {
      console.error('Error fetching SAMU balance:', error);
      return 0;
    }
  }
}

export const phantomWallet = new RealPhantomWallet();
