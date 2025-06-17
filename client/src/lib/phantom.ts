// Mock Phantom wallet integration for MVP
// In production, this would use the actual Phantom wallet SDK

export interface PhantomWallet {
  publicKey: string;
  connected: boolean;
}

class MockPhantomWallet {
  private _connected = false;
  private _publicKey: string | null = null;

  async connect(): Promise<PhantomWallet> {
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate mock wallet address
    this._publicKey = this.generateMockAddress();
    this._connected = true;

    return {
      publicKey: this._publicKey,
      connected: this._connected
    };
  }

  async disconnect(): Promise<void> {
    this._connected = false;
    this._publicKey = null;
  }

  get connected(): boolean {
    return this._connected;
  }

  get publicKey(): string | null {
    return this._publicKey;
  }

  private generateMockAddress(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Mock SAMU token balance
  async getSamuBalance(): Promise<number> {
    if (!this._connected) return 0;
    return Math.floor(Math.random() * 5000) + 500; // Random balance between 500-5500
  }

  // Mock NFT count
  async getNftCount(): Promise<number> {
    if (!this._connected) return 0;
    return Math.floor(Math.random() * 10); // Random NFT count 0-9
  }
}

export const phantomWallet = new MockPhantomWallet();
