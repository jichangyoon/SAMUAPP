import { PrivyProvider } from '@privy-io/react-auth';

export const privyConfig = {
  appId: 'cm4dqzh9s0000108lfw123456', // Privy App ID (임시)
  config: {
    loginMethods: ['wallet'],
    appearance: {
      theme: 'light',
      accentColor: '#FF6B00', // SAMU 브랜드 컬러
      logo: 'https://meme-chain-rally-wlckddbs12345.replit.app/assets/samu-logo.png'
    },
    embeddedWallets: {
      createOnLogin: 'users-without-wallets'
    },
    defaultChain: {
      id: 101, // Solana Mainnet
      name: 'Solana',
      network: 'mainnet',
      nativeCurrency: {
        name: 'SOL',
        symbol: 'SOL',
        decimals: 9
      },
      rpcUrls: {
        default: {
          http: ['https://api.mainnet-beta.solana.com']
        }
      }
    }
  }
};