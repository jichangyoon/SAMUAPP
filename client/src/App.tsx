import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PrivyProvider } from '@privy-io/react-auth';
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/connected" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <PrivyProvider
      appId="cmc3cduly00mrjs0nuj2jyuz8"
      config={{
        appearance: {
          theme: 'light',
          accentColor: '#f59e0b'
        },
        loginMethods: ['wallet', 'email'],
        embeddedWallets: {
          createOnLogin: 'off',
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
        // Disable Ethereum chain support to prevent ETH wallet creation
        supportedChains: [],
        supportedChains: [
          {
            id: 1,
            name: 'Ethereum',
            network: 'ethereum',
            nativeCurrency: {
              name: 'Ether',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: {
              default: {
                http: ['https://mainnet.infura.io/v3/'],
              },
            },
            blockExplorers: {
              default: {
                name: 'Etherscan',
                url: 'https://etherscan.io',
              },
            },
          },
        ],

        mfa: {
          noPromptOnMfaRequired: false
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

export default App;
