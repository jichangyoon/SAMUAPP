
export const config = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',
  
  // Solana
  SAMU_TOKEN_MINT: 'EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF',
  RPC_ENDPOINTS: [
    'https://rpc.ankr.com/solana',
    'https://rpc.ankr.com/solana'
  ],
  
  // Upload limits
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  
  // Server
  PORT: parseInt(process.env.PORT || '5000'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Voting
  VOTING_RESET_INTERVAL: 24 * 60 * 60 * 1000, // 24시간 (밀리초)
  
  // Admin
  ADMIN_EMAILS: process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [],
} as const;
