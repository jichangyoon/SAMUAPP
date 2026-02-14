
import { Router } from "express";

const router = Router();

router.get("/samu-balance/:wallet", async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=5');
    
    const walletAddress = req.params.wallet;
    
    if (!walletAddress || walletAddress.startsWith('0x')) {
      return res.json({ balance: 0 });
    }

    const SAMU_TOKEN_MINT = 'EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF';
    const HELIUS_API_KEY = process.env.VITE_HELIUS_API_KEY;
    const RPC_ENDPOINTS = [
      `https://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`,
      'https://api.mainnet-beta.solana.com',
      'https://rpc.ankr.com/solana'
    ];

    for (const endpoint of RPC_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Math.floor(Math.random() * 1000),
            method: 'getTokenAccountsByOwner',
            params: [
              walletAddress,
              { mint: SAMU_TOKEN_MINT },
              { encoding: 'jsonParsed' },
            ],
          }),
        });

        if (!response.ok) continue;

        const data = await response.json();
        if (data.error) continue;

        const tokenAccounts = data.result?.value || [];
        if (tokenAccounts.length === 0) {
          return res.json({ balance: 0 });
        }

        const tokenAccount = tokenAccounts[0];
        const balance = tokenAccount?.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0;
        
        return res.json({ balance });
      } catch (error) {
        continue;
      }
    }
    
    res.json({ balance: 0 });
  } catch (error) {
    res.status(500).json({ balance: 0 });
  }
});

router.get('/sol-balance/:walletAddress', async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=5');
    
    const { walletAddress } = req.params;
    
    if (!walletAddress || walletAddress.startsWith('0x')) {
      return res.json({ balance: 0 });
    }

    const HELIUS_API_KEY = process.env.VITE_HELIUS_API_KEY;
    const RPC_ENDPOINTS = [
      `https://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`,
      'https://api.mainnet-beta.solana.com',
      'https://rpc.ankr.com/solana'
    ];

    for (const endpoint of RPC_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Math.floor(Math.random() * 1000),
            method: 'getBalance',
            params: [walletAddress],
          }),
        });

        if (!response.ok) continue;

        const data = await response.json();
        if (data.error) continue;

        const lamports = data.result?.value || 0;
        const solBalance = lamports / 1000000000;
        
        return res.json({ balance: solBalance });
      } catch (error) {
        continue;
      }
    }
    
    res.json({ balance: 0 });
  } catch (error) {
    res.status(500).json({ balance: 0 });
  }
});

router.get('/treasury-wallet', async (req, res) => {
  const treasuryWallet = process.env.TREASURY_WALLET_ADDRESS;
  if (!treasuryWallet) {
    return res.status(500).json({ error: "Treasury wallet not configured" });
  }
  res.json({ address: treasuryWallet });
});

export { router as walletRouter };
