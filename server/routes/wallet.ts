
import { Router } from "express";
import { votingPowerManager } from "../voting-power";

const router = Router();

// Get SAMU token balance for a wallet
router.get("/samu-balance/:wallet", async (req, res) => {
  try {
    // 캐시 헤더 설정 (30초)
    res.set('Cache-Control', 'public, max-age=30');
    
    const walletAddress = req.params.wallet;
    
    // Return 0 for non-Solana addresses
    if (!walletAddress || walletAddress.startsWith('0x')) {
      return res.json({ balance: 0 });
    }

    const SAMU_TOKEN_MINT = 'EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF';
    const RPC_ENDPOINTS = [
      'https://rpc.ankr.com/solana',
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
    // 캐시 헤더 설정 (30초)
    res.set('Cache-Control', 'public, max-age=30');
    
    const { walletAddress } = req.params;
    
    if (!walletAddress || walletAddress.startsWith('0x')) {
      return res.json({ balance: 0 });
    }

    const RPC_ENDPOINTS = [
      'https://rpc.ankr.com/solana',
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
    let votingPower = votingPowerManager.getVotingPower(walletAddress);
    
    // If no voting power data exists, initialize it
    if (!votingPower) {
      // Get SAMU balance to initialize voting power
      const SAMU_TOKEN_MINT = 'EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF';
      const RPC_ENDPOINTS = [
        'https://rpc.ankr.com/solana',
        'https://rpc.ankr.com/solana'
      ];

      let samuBalance = 0;
      for (const endpoint of RPC_ENDPOINTS) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

          if (response.ok) {
            const data = await response.json();
            if (!data.error) {
              const tokenAccounts = data.result?.value || [];
              if (tokenAccounts.length > 0) {
                samuBalance = tokenAccounts[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0;
                break;
              }
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      votingPower = votingPowerManager.initializeVotingPower(walletAddress, samuBalance);
    }
    
    res.json(votingPower);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get voting power' });
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
