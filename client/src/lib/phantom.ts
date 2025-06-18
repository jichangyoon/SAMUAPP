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
      // Use Solana RPC API directly to avoid Web3.js dependency issues
      const response = await fetch('https://api.mainnet-beta.solana.com', {
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

      const data = await response.json();
      
      if (data.result?.value?.length === 0) {
        return 0; // No SAMU tokens found
      }

      // Get the token amount from the first account
      const tokenAccount = data.result.value[0];
      const tokenAmount = tokenAccount.account.data.parsed.info.tokenAmount;
      
      // Return the UI amount (already converted from smallest unit)
      return parseFloat(tokenAmount.uiAmount || '0');
    } catch (error) {
      console.error('Error fetching SAMU balance:', error);
      return 0;
    }
  }

  async getNftCount(): Promise<number> {
    if (!this._connected || !this._publicKey) return 0;

    try {
      // Get all token accounts for the wallet using direct RPC call
      const response = await fetch('https://api.mainnet-beta.solana.com', {
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
              programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
            },
            {
              encoding: 'jsonParsed',
            },
          ],
        }),
      });

      const data = await response.json();
      
      if (!data.result?.value) {
        return 0;
      }

      let nftCount = 0;
      for (const account of data.result.value) {
        const tokenInfo = account.account.data.parsed.info;
        const tokenAmount = tokenInfo.tokenAmount;
        
        // Check if it's an NFT (amount = 1, decimals = 0)
        if (tokenAmount.decimals === 0 && parseFloat(tokenAmount.amount) === 1) {
          nftCount++;
        }
      }

      return nftCount;
    } catch (error) {
      console.error('Error fetching NFT count:', error);
      return 0;
    }
  }
}

export const phantomWallet = new RealPhantomWallet();
