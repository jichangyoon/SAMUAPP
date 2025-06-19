import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMemeSchema, insertVoteSchema } from "@shared/schema";
import { votingPowerManager } from "./voting-power";
import multer from "multer";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all memes
  app.get("/api/memes", async (req, res) => {
    try {
      const memes = await storage.getMemes();
      res.json(memes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch memes" });
    }
  });

  // Create a new meme
  app.post("/api/memes", upload.single('image'), async (req, res) => {
    try {
      const { title, description, authorWallet, authorUsername } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ message: "Image file is required" });
      }

      // Convert file to base64 data URL for storage
      const imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

      const memeData = insertMemeSchema.parse({
        title: title || "Untitled Meme",
        description: description || "",
        imageUrl,
        authorWallet,
        authorUsername
      });

      const meme = await storage.createMeme(memeData);
      res.status(201).json(meme);
    } catch (error) {
      console.error('Error creating meme:', error);
      res.status(400).json({ message: "Failed to create meme" });
    }
  });

  // Vote on a meme
  app.post("/api/memes/:id/vote", async (req, res) => {
    try {
      const memeId = parseInt(req.params.id);
      const { voterWallet, votingPower } = req.body;

      const voteData = insertVoteSchema.parse({
        memeId,
        voterWallet,
        votingPower
      });

      // Check if user already voted
      const hasVoted = await storage.hasUserVoted(memeId, voterWallet);
      if (hasVoted) {
        return res.status(400).json({ message: "You have already voted on this meme" });
      }

      const vote = await storage.createVote(voteData);
      const updatedMeme = await storage.getMemeById(memeId);
      
      res.json({ vote, meme: updatedMeme });
    } catch (error) {
      console.error('Error voting:', error);
      res.status(400).json({ message: "Failed to vote" });
    }
  });

  // Check if user has voted on a meme
  app.get("/api/memes/:id/voted/:wallet", async (req, res) => {
    try {
      const memeId = parseInt(req.params.id);
      const voterWallet = req.params.wallet;
      
      const hasVoted = await storage.hasUserVoted(memeId, voterWallet);
      res.json({ hasVoted });
    } catch (error) {
      res.status(500).json({ message: "Failed to check vote status" });
    }
  });

  // Get SAMU token balance for a wallet
  app.get("/api/samu-balance/:wallet", async (req, res) => {
    try {
      const walletAddress = req.params.wallet;
      
      // Return 0 for non-Solana addresses
      if (!walletAddress || walletAddress.startsWith('0x')) {
        return res.json({ balance: 0 });
      }

      const SAMU_TOKEN_MINT = 'EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF';
      const RPC_ENDPOINTS = [
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

  // Voting power API routes
  app.get('/api/voting-power/:walletAddress', async (req, res) => {
    try {
      const { walletAddress } = req.params;
      let votingPower = votingPowerManager.getVotingPower(walletAddress);
      
      // If no voting power data exists, initialize it
      if (!votingPower) {
        // Get SAMU balance to initialize voting power
        const SAMU_TOKEN_MINT = 'EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF';
        const RPC_ENDPOINTS = [
          'https://api.mainnet-beta.solana.com',
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

  app.post('/api/voting-power/:walletAddress/use', async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
