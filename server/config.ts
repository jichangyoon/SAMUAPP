
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
  // If set, ALL admin API calls must also supply this secret via x-admin-secret header.
  // Leave unset to keep email-only auth (backward compatible).
  ADMIN_SECRET: process.env.ADMIN_SECRET || "",

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

  // Phase 2: Smart Contract
  // Solana Playground에서 배포 후 이 env var를 설정하면 컨트랙트 모드 활성화.
  // 미설정 시 기존 escrow 지갑 방식으로 동작 (하위 호환).
  SAMU_REWARDS_PROGRAM_ID: process.env.SAMU_REWARDS_PROGRAM_ID || "",
} as const;
