export const privyConfig = {
  appId: 'cmc3cduly00mrjs0nuj2jyuz8',
  config: {
    loginMethods: ['wallet', 'email'],
    appearance: {
      theme: 'light' as const,
      accentColor: '#676FFF',
      logo: undefined
    },
    embeddedWallets: {
      createOnLogin: 'users-without-wallets' as const
    }
  }
};