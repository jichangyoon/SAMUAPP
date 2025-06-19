export const privyConfig = {
  appId: 'cmc3cduly00mrjs0nuj2jyuz8',
  config: {
    loginMethods: ['wallet' as const],
    appearance: {
      theme: 'light' as const,
      accentColor: '#676FFF' as const
    },
    embeddedWallets: {
      createOnLogin: 'users-without-wallets' as const
    }
  }
};