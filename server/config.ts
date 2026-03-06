
export const config = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',
  
  // Solana
  SAMU_TOKEN_MINT: 'EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF',
  SAMU_DECIMALS: 1_000_000,
  RPC_ENDPOINTS: [
    'https://api.mainnet-beta.solana.com',
    'https://rpc.ankr.com/solana'
  ],
  
  // Upload limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  
  // Server
  PORT: parseInt(process.env.PORT || '5000'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Voting
  VOTING_RESET_INTERVAL: 24 * 60 * 60 * 1000, // 24시간 (밀리초)
  
  // Admin
  ADMIN_EMAILS: (process.env.ADMIN_EMAILS || "shon.shon89@gmail.com,shon89@gmail.com").split(',').map(email => email.trim().toLowerCase()),

  // Wallets
  TREASURY_WALLET: process.env.TREASURY_WALLET_ADDRESS || "4WjMuna7iLjPE897m5fphErUt7AnSdjJTky1hyfZZaJk",
  ESCROW_WALLET: process.env.ESCROW_WALLET_ADDRESS || "ojzHLw6QxUqprnEjk4gfQM3QXS1RKHWjTLXzZS543cg",

  // Printful
  PRINTFUL: {
    STORE_ID: "17717241",
    STICKER_PRODUCT_ID: 358,
  },

  // Revenue Shares
  REVENUE_SHARES: {
    CREATOR: 0.45,
    VOTERS: 0.40,
    PLATFORM: 0.15,
  },
} as const;
