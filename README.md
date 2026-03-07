# SAMU - Meme Incubator on Solana

> Evolving memes into IP. Community-curated meme pipeline: **Contest → Merchandise → Ecosystem Rewards**

SAMU is a web-based meme incubator platform on Solana where community-voted memes evolve into intellectual property (IP). Holders vote with SAMU tokens, winning memes become merchandise, and SOL rewards flow back to creators and voters proportionally.

## Live App

[samu.ink](https://samu.ink)

## How It Works

```
1. Meme Contest      →  Community submits & votes on memes using SAMU tokens
2. Contest Archive   →  Past contests preserved with full stats & reward data (publicly viewable, no login required)
3. Merchandise       →  Admin selects winning designs → turned into goods via Printful (Kiss-Cut Stickers)
4. Ecosystem Rewards →  SOL rewards claimable by creators & voters proportionally
```

## Dual Token Model

| Token | Role | Usage |
|-------|------|-------|
| **SAMU** | Governance & Voting | Vote on memes by transferring SAMU to treasury (on-chain SPL transfer), community membership + voting rights |
| **SOL** | Merchandise Payment & Rewards | Pay for goods in the shop. Goods revenue distributed in SOL to creators, voters, and platform |

## Ecosystem Rewards Distribution

| Recipient | Share | Description |
|-----------|-------|-------------|
| Meme Creators | 45% | Vote-proportional — shares based on votes received by their memes |
| All Voters | 40% | Proportional to SAMU spent voting per contest round |
| Platform | 15% | Operational costs |

- Revenue source: Goods sales (Printful merchandise)
- Reward currency: SOL (from goods profits)
- Payment splitting: Goods payment splits SOL directly on-chain at time of purchase
- Claim system: Both creators and voters claim SOL via profile Rewards tab
  - Voters: per-contest DeFi reward pool ("Reward Per Share" mechanism)
  - Creators: per-sale distribution rows, accumulated and claimable
- Total Earned display: Cumulative value that never decreases after claiming

## Key Features

### Activity Dashboard
A personal stats page showing each user's full participation summary.
- **Creator section**: Contests participated, memes submitted, total SAMU received, "Pipeline" badge showing how many memes became goods
- **Voter section**: Contests voted in, total votes cast, total SAMU spent
- **Earnings section**: Creator SOL earned / Voter SOL earned / Total Earned (cumulative — does not decrease after claiming)

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
- 60-second auto-refresh for near real-time updates
- Printful fulfillment center mapping (Japan, US, Europe, Australia, Brazil, Mexico)
- Geocoded order locations: accurate lat/lng from postal code via OpenStreetMap Nominatim API
- Lazy-loaded bundle — map JS only loads when Rewards tab is visited

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
- Vote options: 100, 1,000, or 10,000 SAMU

### Goods Shop (SOL Payment)
- Kiss-Cut Sticker merchandise from winning meme designs via Printful
- Real-time SOL/USD pricing via CoinGecko
- International shipping with localized address forms
- Multi-instruction Solana TX: splits SOL at point of payment (production cost → treasury, profit → escrow)
- Full on-chain payment verification before Printful order creation
- Escrow vault: profit locked in escrow until delivery confirmed, then distributed 45/40/15
- Automatic distribution trigger: Printful `shipment_delivered` webhook → `distributeEscrowProfit` (v2 webhook)

### Contest Archive System
- Publicly viewable — no login required to browse past contests and memes
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

### Claim System (Creator + Voter)
- Both creators and voters claim SOL via profile Rewards tab
- **Voters**: per-contest DeFi reward pool (`total_shares = 100`, "Reward Per Share" pattern). `voterEarned = claimable + totalClaimed` — cumulative, claim-invariant
- **Creators**: SOL allocated per sale via `creatorRewardDistributions` rows, proportional to votes received. `creatorEarned` = all rows summed — cumulative, claim-invariant
- Total Earned = creatorEarned + voterEarned (never decreases after claiming)
- **On-chain payout**: Claim button triggers real Solana TX — escrow wallet signs and sends SOL directly to user wallet. Platform covers gas. User only clicks once. `voterClaimRecords` prevents double-claiming.

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
- **My Memes tab**: contest-grouped view with total SAMU received per contest
- **My Votes tab**: vote history grouped by contest
- **Rewards tab**: unified claimable/earned summary with claim button
- **Activity tab**: Creator stats / Voter stats / Earnings dashboard

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Express.js, TypeScript, RESTful API |
| Database | PostgreSQL, Drizzle ORM |
| Auth | Privy (email login + embedded Solana wallet, Solana-only mode) |
| Blockchain | Solana, @solana/web3.js, @solana/spl-token, Solana Actions (Blinks) |
| Storage | Cloudflare R2 (images, videos, profile pictures) |
| Map | react-leaflet + CartoDB dark tiles |
| Geocoding | OpenStreetMap Nominatim API (free, no key required) |
| Merchandise | Printful API (Kiss-Cut Stickers, product ID 358) |
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
| `orders` | Goods purchase records with geocoded lat/lng |
| `goods` | Merchandise catalog |
| `goodsRevenueDistributions` | Per-sale SOL distribution summary records |
| `creatorRewardDistributions` | Per-sale, per-creator SOL allocation records |
| `voterRewardPool` | Per-contest cumulative voter rewards (DeFi reward-per-share) |
| `voterClaimRecords` | Individual voter claim position tracking |
| `escrowDeposits` | Escrow vault — profit locked until delivery, then released |
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

## Roadmap

### Completed
- **Claim SOL Payout (Creator + Voter)**: On-chain transfer from escrow wallet → user wallet. Server signs with escrow private key, platform covers gas. Double-claim prevention via DB.
- **30-Day Delivery Timeout Scheduler**: Auto-distributes escrow profits for orders with no Printful webhook after 30 days. Runs every 6 hours (`server/delivery-timeout-scheduler.ts`).

### In Progress
- **Escrow Refund**: Auto-refund flow for failed/cancelled Printful orders

### Planned
- **SAMU Map Gamification**: Delivery progress = reward unlock progress bar, SAMU character animations
- **Phantom Direct Login**: Connect Phantom wallet alongside Privy email login

### Phase 2
- **Smart Contract Migration**: Move reward distribution fully on-chain via Rust/Anchor

## Inspiration

- **Pudgy Penguins** — IP → Physical goods pipeline
- **Steemit** — Voter ecosystem rewards model
- **Threadless** — Community voting → Merchandise creation

## License

MIT License
