# SAMU - Meme Incubator on Solana

> Evolving memes into IP. Community-curated meme pipeline: **Contest → Merchandise → Ecosystem Rewards**

SAMU is a web-based meme incubator platform on Solana where community-voted memes evolve into intellectual property (IP). Holders vote with SAMU tokens, winning memes become merchandise, and SOL rewards flow back to creators and voters proportionally.

## Live App

[samu.ink](https://samu.ink)

## How It Works

```
1. Meme Contest      →  Community submits & votes on memes using SAMU tokens
2. Contest Archive   →  Past contests preserved with full stats & reward data
3. Merchandise       →  Admin selects winning designs → turned into goods via Printful (Kiss-Cut Stickers)
4. Ecosystem Rewards →  SOL rewards distributed to creators & voters proportionally
```

## Dual Token Model

| Token | Role | Usage |
|-------|------|-------|
| **SAMU** | Governance & Voting | Vote on memes by transferring SAMU to treasury (on-chain SPL transfer), community membership + voting rights |
| **SOL** | Merchandise Payment & Rewards | Pay for goods in the shop. Goods revenue distributed in SOL to creators, voters, and platform |

## Ecosystem Rewards Distribution

| Recipient | Share | Description |
|-----------|-------|-------------|
| Meme Creators | 45% | Vote-proportional — all creators receive shares based on votes received |
| All Voters | 40% | Proportional to SAMU spent voting per contest round |
| Platform | 15% | Operational costs |

- Revenue source: Goods sales (Printful merchandise)
- Reward currency: SOL (from goods profits)
- Instant distribution: Goods payment splits SOL directly on-chain (Creator 45% + Treasury 55%)
- Voter claim system: Per-contest reward pool using "Reward Per Share" mechanism (DeFi pattern), voters claim anytime via profile

## Key Features

### Global SAMU Map — Gamified Logistics
The standout feature: a world map that turns boring shipping logistics into a community experience.
- Interactive world map showing all orders as pulsing dots traveling across the globe
- Fulfillment center → destination route visualization with animated dotted lines
- SAMU character storytelling: "SAMU is traveling to Seoul!", "SAMU arrived in NYC!"
- Color-coded markers: green (my revenue) vs red (other orders)
- Click any dot to see order details, shipping status, tracking links, and revenue distribution breakdown
- Per-order revenue split display (Creator 45% / Voters 40% / Platform 15%)
- Personal revenue estimation per order ("My Estimated Revenue: +0.0042 SOL")
- Stats dashboard: total orders, in-transit, delivered, countries reached
- 30-second auto-refresh for near real-time updates
- Printful fulfillment center mapping (Japan, US, Europe, Australia, Brazil, Mexico)

### On-Chain Voting (SAMU SPL Transfer)
- Real SAMU SPL token transfers to treasury wallet
- Minimum vote: 1 SAMU, no upper limit (capped by user balance)
- Voting amount determines reward share proportion
- Anti-abuse: on-chain gas fees naturally prevent multi-account manipulation
- On-chain transaction verification (preTokenBalances/postTokenBalances)
- Duplicate vote prevention via transaction signature check

### Solana Blinks (External Voting)
- Vote on memes from X (Twitter), Discord, or any Blink-compatible app
- No login required — connect Phantom or any Solana wallet directly
- Same on-chain verification as in-app voting
- Shareable Blink URLs for each meme entry
- Vote options: 1, 5, 10, or custom SAMU amount (1-100)

### Goods Shop (SOL Payment)
- Kiss-Cut Sticker merchandise from winning meme designs via Printful
- Real-time SOL/USD pricing via CoinGecko
- International shipping with localized address forms
- Multi-instruction Solana TX: splits SOL directly to Creator wallet (45%) + Treasury (55%)
- Full on-chain payment verification before Printful order creation

### Contest Archive System
- Parallel file processing (10 concurrent) with retry logic for large-scale archiving (1000+ memes)
- "Archiving" status with loading UI during archive process
- Contest status flow: draft → active → ended → archiving → archived
- Error recovery: reverts to "ended" status for admin retry
- Instagram-style silent video autoplay in grid view

### Rewards Dashboard
- Pie chart visualization of reward distribution (Creator/Voter/Platform)
- Per-user reward share display (shows 0% for users with no earnings)
- Creator breakdown by votes received
- Voter breakdown by SAMU spent
- Distribution history with status tracking

### Voter Claim System
- Per-contest reward pools with "Reward Per Share" calculation
- Claim button in profile page
- Full claim history tracking
- Claimable amount display per contest

### Partner Communities
- Other meme coin communities can host their own isolated contests
- Each partner gets a dedicated contest space with independent voting

### Hall of Fame & Archive
- Complete history of past contests with winners and statistics
- Reward distribution details per archived contest
- Media preserved on Cloudflare R2 with fault-tolerant archiving

### Admin Panel
- Contest management: create, start, end, archive contests
- IP tracking for suspicious activity detection (backend)
- IP blocking system for abuse prevention (backend)
- Login logging with device/IP tracking (backend)

### User Profiles
- Editable display names and profile pictures (stored on R2)
- Personal statistics: memes submitted, votes cast, votes received
- Meme history and vote history per contest
- Voter reward claims tab

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Express.js, TypeScript, RESTful API |
| Database | PostgreSQL, Drizzle ORM |
| Auth | Privy (email login + embedded Solana wallet, Solana-only mode) |
| Blockchain | Solana, @solana/web3.js, @solana/spl-token, Solana Actions (Blinks) |
| Storage | Cloudflare R2 (images, videos, profile pictures) |
| Merchandise | Printful API (Kiss-Cut Stickers) |
| Pricing | CoinGecko API (SOL/USD real-time) |
| Smart Contract | Anchor 0.30.1 + anchor-spl (Phase 2) |

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
│  Contests · Votes · Goods · Rewards         │
│  Archive · Blinks · Partners · Admin        │
└──────┬───────────┬──────────────┬───────────┘
       │           │              │
┌──────▼───┐ ┌─────▼─────┐ ┌─────▼─────┐
│PostgreSQL│ │ Solana RPC │ │Cloudflare │
│(Drizzle) │ │  (Helius)  │ │    R2     │
└──────────┘ └─────┬─────┘ └───────────┘
                   │
            ┌──────▼──────┐
            │  Printful   │
            │    API      │
            └─────────────┘
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `contests` | Active contest management (status, timing, settings) |
| `memes` | Submitted meme entries with media URLs |
| `votes` | On-chain vote records (SAMU amount + tx signature) |
| `archivedContests` | Completed contest snapshots with preserved data |
| `users` | User profiles with wallet addresses |
| `orders` | Goods purchase records |
| `goods` | Merchandise catalog |
| `goodsRevenueDistributions` | Per-sale SOL distribution records |
| `voterRewardPool` | Per-contest cumulative voter rewards |
| `voterClaimRecords` | Individual voter claim history |
| `escrowDeposits` | Escrow vault for delivery-based fund release (schema ready, logic planned) |
| `partnerMemes` / `partnerVotes` | Partner community contest data |
| `loginLogs` / `blockedIps` | Security tracking |

## Solana Integration

- **SAMU Token**: `EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF`
- **Treasury & Escrow Wallets**: Configured via environment variables (not exposed in repo)
- **Blinks Endpoint**: `GET/POST /api/actions/vote/:memeId`

## Smart Contract (Phase 2)

Located in `contracts/programs/samu-rewards/src/lib.rs`:
- Framework: Anchor 0.30.1 + anchor-spl
- Build/Deploy via Solana Playground (beta.solpg.io)
- Features: initialize config, update share ratios, lock config, batch distribute rewards (up to 50), transfer admin
- Hybrid model: server calculates revenue/recipients, smart contract executes on-chain distribution

## Planned Features

- **Escrow System**: SOL payment → escrow vault → delivery confirmed → funds released to reward pools
- **Printful Webhooks**: Real-time shipping status updates → SAMU Map live tracking + escrow unlock on delivery
- **SAMU Map Gamification**: Delivery progress = reward unlock progress, SAMU character animations (sleeping at customs, celebrating on delivery)
- **Phantom Direct Login**: Connect Phantom wallet directly alongside Privy email login

## Inspiration

- **Pudgy Penguins** — IP → Physical goods pipeline
- **Steemit** — Voter ecosystem rewards model
- **Threadless** — Community voting → Merchandise creation

## License

MIT License
