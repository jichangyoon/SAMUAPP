
import { Router } from "express";
import { votingPowerManager } from "../voting-power";

const router = Router();

// Get SAMU token balance for a wallet
router.get("/samu-balance/:wallet", async (req, res) => {
  try {
    // Cache headers for 5 seconds
    res.set('Cache-Control', 'public, max-age=5');
    
    const walletAddress = req.params.wallet;
    
    // Return 0 for non-Solana addresses
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

    // Try multiple endpoints for reliability
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
    
    // If all endpoints fail, return 0
    res.json({ balance: 0 });
  } catch (error) {
    res.status(500).json({ balance: 0 });
  }
});

// SOL balance endpoint
router.get('/sol-balance/:walletAddress', async (req, res) => {
  try {
    // Cache headers for 5 seconds
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

        // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
        const lamports = data.result?.value || 0;
        const solBalance = lamports / 1000000000;
        
        return res.json({ balance: solBalance });
      } catch (error) {
        continue;
      }
    }
    
    // If all endpoints fail, return 0
    res.json({ balance: 0 });
  } catch (error) {
    res.status(500).json({ balance: 0 });
  }
});

// Voting power API routes
router.get('/voting-power/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    // Get or initialize voting power
    let votingPower = await votingPowerManager.getVotingPower(walletAddress);
    
    if (!votingPower) {
      // If not found, get SAMU balance and initialize
      const samuRes = await fetch(`http://localhost:5000/api/samu-balance/${walletAddress}`);
      const samuData = await samuRes.json();
      votingPower = await votingPowerManager.initializeVotingPower(walletAddress, samuData.balance || 0);
    }
    
    res.json(votingPower);
  } catch (error) {
    console.error('Error fetching voting power:', error);
    res.status(500).json({ error: 'Failed to fetch voting power' });
  }
});

router.post('/voting-power/:walletAddress/use', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { powerUsed } = req.body;
    
    const success = votingPowerManager.useVotingPower(walletAddress, powerUsed);
    
    if (success) {
      const updatedPower = votingPowerManager.getVotingPower(walletAddress);
      res.json({ success: true, votingPower: updatedPower });
    } else {
      res.status(400).json({ success: false, error: 'Insufficient voting power' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to use voting power' });
  }
});

export { router as walletRouter };
