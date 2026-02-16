# SAMU - Meme Incubator on Solana

> Evolving memes into IP. Community-curated meme pipeline: **Contest → NFT → Merchandise → Revenue Share**

SAMU is a web-based meme incubator platform on Solana where community-voted memes evolve into intellectual property (IP). Holders vote with SAMU tokens, winning memes become NFTs, NFT designs become merchandise, and revenue flows back to creators, voters, and NFT holders.

## Live App

🌐 **[samu.ink](https://samu.ink)**

## How It Works

```
1. Meme Contest    →  Community submits & votes on memes using SAMU tokens
2. NFT Minting     →  Top 3 winning memes minted as NFTs (tradeable)
3. Merchandise     →  Winning designs turned into goods via Printful
4. Revenue Share   →  Sales revenue distributed in SOL to all participants
```

## Dual Token Model

| Token | Role | Usage |
|-------|------|-------|
| **SAMU** | Governance & Voting | Vote on memes by transferring SAMU to treasury (on-chain) |
| **SOL** | Revenue & Settlement | Pay for merchandise, receive revenue share |

## Revenue Distribution

| Recipient | Share | Description |
|-----------|-------|-------------|
| Meme Creator | 30% | Permanent reward for creating the IP |
| All Voters | 30% | Proportional to voting amount per contest round |
| NFT Holder | 25% | Tradeable — buy the NFT, earn the revenue |
| Platform | 15% | Operational costs |

## Key Features

### On-Chain Voting
- Real SAMU SPL token transfers to treasury wallet
- Voting amount determines your revenue share proportion
- Anti-abuse: on-chain gas fees naturally prevent multi-account manipulation
- Transaction verified on-chain (preTokenBalances/postTokenBalances)

### Solana Blinks (External Voting)
- Vote on memes from X (Twitter), Discord, or any Blink-compatible app
- No login required — connect Phantom or any Solana wallet directly
- Same on-chain verification as in-app voting
- Shareable Blink URLs for each meme entry

### Goods Shop (SOL Payment)
- Kiss-Cut Sticker merchandise from winning meme designs
- Real-time SOL/USD pricing via CoinGecko
- International shipping to 20+ countries with localized address forms
- Full on-chain payment verification before Printful order creation

### NFT Gallery
- 164 SAMU Wolf NFT collection with commenting system
- Lazy loading for performance

### Partner Communities
- Other meme coin communities can host their own isolated contests
- Each partner gets a dedicated contest space

### Contest Archive & Hall of Fame
- Complete history of past contests with winners and statistics
- Revenue distribution details per contest

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Express.js, TypeScript |
| Database | PostgreSQL, Drizzle ORM |
| Auth | Privy (email login + embedded Solana wallet) |
| Blockchain | Solana, @solana/web3.js, @solana/spl-token, Solana Actions (Blinks) |
| Storage | Cloudflare R2 |
| Merchandise | Printful API |
| Pricing | CoinGecko API (SOL/USD) |

## Architecture

```
┌─────────────────────────────────────────────┐
│                 Frontend                     │
│         React + Vite + Tailwind             │
│      Privy Auth · Solana Wallet SDK         │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│              Express.js API                  │
│   Contests · Votes · Goods · Revenue · NFT  │
│   Blinks (Solana Actions) · Admin Panel     │
└──────┬───────────┬──────────────┬───────────┘
       │           │              │
┌──────▼───┐ ┌─────▼─────┐ ┌─────▼─────┐
│PostgreSQL│ │ Solana RPC │ │Cloudflare │
│(Drizzle) │ │ (Helius)   │ │    R2     │
└──────────┘ └───────────┘ └───────────┘
```

## Solana Integration

- **SAMU Token**: `EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF`
- **Treasury Wallet**: `4WjMuna7iLjPE897m5fphErUt7AnSdjJTky1hyfZZaJk`
- **Blinks Endpoint**: `GET/POST /api/actions/vote/:memeId`

## Inspiration

- **Pudgy Penguins** — NFT IP → Physical goods pipeline
- **Steemit** — Voter revenue sharing model
- **Threadless** — Community voting → Merchandise creation

## License

MIT License
