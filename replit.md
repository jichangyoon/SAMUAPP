# SAMU Meme Contest Application

## Overview

This is a full-stack web application designed as a Meme Incubator on Solana, where users submit memes, vote using SAMU tokens, and winning memes are converted into merchandise. The project's vision is to evolve memecoins into Intellectual Property on Solana, generating revenue through merchandise sales that are then distributed as SOL rewards. It features a dual-token model (SAMU for voting, SOL for rewards), an on-chain voting system, an escrow-based reward distribution mechanism, and a gamified global logistics map.

## User Preferences

Preferred communication style: Simple, everyday language. Korean language preferred for communication.
User is a non-technical founder managing the app with AI assistance.
This is a web app — not a mobile app. No mobile app packaging or mobile-first framing. Responsive web design is fine, but the product identity is a web application.

## Project Roadmap & Vision

**Core Concept: Meme Incubator**
- The app's mission is to help memecoins evolve into IP (Intellectual Property) on Solana.
- Pipeline: Meme Contest → Goods (via Printful) → Ecosystem Rewards (SOL)

**Dual Token Model:**
- **SAMU Token** = Governance/Voting (community votes on memes by transferring SAMU tokens to treasury, community membership + voting rights)
- **SOL** = Merchandise Payment + Rewards (goods shop payment, rewards distributed in SOL from goods profits)

**Voting System (Implemented):**
- SAMU token direct voting (users spend SAMU to vote, not just hold)
- Minimum vote: 1 SAMU, no upper limit (capped by user's SAMU balance)
- Voting amount determines reward share proportion for that contest round
- Real on-chain SAMU transfers to treasury wallet via SPL token transfer (both in-app and Blinks)
- Backend `/api/memes/prepare-transaction` builds serialized SPL transfer tx, frontend signs via Privy `useSignTransaction`
- Treasury wallet: 4WjMuna7iLjPE897m5fphErUt7AnSdjJTky1hyfZZaJk
- Anti-abuse: on-chain transaction costs (SOL gas fees) naturally prevent multi-account abuse
- Blinks (external voting via Solana Actions) also uses real SPL token transfer with on-chain verification
- Shared `verifyTransaction` function validates both in-app and Blinks votes (preTokenBalances/postTokenBalances check)
- DB schema: votes table uses `samuAmount` + `txSignature`
- Duplicate vote prevention via `getVoteByTxSignature` check

**Escrow System (Implemented - Admin Manual Distribution):**
- Goods payment creates multi-instruction Solana TX splitting SOL into two destinations:
  - **Production cost** (Printful product + shipping) → Treasury wallet (immediate)
  - **Profit** (sale price - production cost) → Escrow wallet (locked until distribution)
- Escrow wallet: ojzHLw6QxUqprnEjk4gfQM3QXS1RKHWjTLXzZS543cg
- Each escrow deposit is tracked per-order in DB with `contestId`, so distribution uses the correct contest's voting ratios
- `distributeEscrowProfit` splits profit: Creator 45% (computed vote-proportionally for all creators, but DB records primary creator wallet only), Voters 40% (to per-contest voter reward pool), Platform 15%
- Escrow status flow: `locked` → `distributed` (or `refunded` for failures)
- Admin API: `/api/goods/admin/distribute-escrow/:orderId` triggers manual distribution
- Admin API: `/api/goods/admin/escrow-deposits` lists all escrow deposits
- Public API: `/api/goods/escrow/contest/:contestId` shows escrow info + creator breakdown
- DB table: `escrowDeposits` (orderId, contestId, totalSol, costSol, profitSol, escrowTxSignature, status, distributedAt)
- **Currently admin-manual**: Admin clicks distribute after verifying delivery. Automated webhook-based distribution is planned.

**Ecosystem Rewards Model (Implemented - Escrow + Voter Claims):**
- Meme Creator: 45% (vote-proportional — ALL creators receive shares based on votes their memes received)
- Voters: 40% (proportional to SAMU spent voting in that contest round)
- Platform: 15% (operational costs)
- Revenue sources: Goods sales (Printful)
- Reward currency: SOL (from goods profits via escrow)
- **Voter Claim System**: Voter 40% deposited to per-contest reward pool using "Reward Per Share" mechanism (DeFi pattern). Voters claim anytime via profile page.
- DB tables: `goodsRevenueDistributions`, `voterRewardPool`, `voterClaimRecords`, `revenues`, `revenue_shares`
- API: `/api/rewards/dashboard`, `/api/rewards/voter-pool/:contestId`, `/api/rewards/claimable/:contestId/:walletAddress`, `/api/rewards/claim/:contestId`, `/api/rewards/my-claims/:walletAddress`
- Rewards Dashboard UI in "Rewards" tab with pie chart, summary cards, distribution history
- Profile "Claims" tab shows claimable amounts + claim button + claim history
- RewardInfoChart shows "Your share: 0.0%" for users with no earnings (not hidden)

**Global SAMU Map (Implemented):**
- Interactive world map using `react-simple-maps` showing all orders as pulsing animated dots
- Fulfillment center → destination route visualization with animated dotted lines
- 6 Printful fulfillment centers: Japan, US (Charlotte), Europe (Riga), Australia (Brisbane), Brazil (Rio), Mexico (Tijuana)
- Region-based fulfillment routing (Asia→Japan, Europe→Riga, Oceania→Australia, etc.)
- SAMU character storytelling: "SAMU is traveling to Seoul!", "SAMU arrived in NYC!"
- Color-coded markers: green (my revenue) vs red (other orders)
- Click dot → full-screen detail with order info, tracking links, revenue distribution breakdown
- Per-order revenue split display (Creator 45% / Voters 40% / Platform 15%)
- Personal revenue estimation per order
- Stats dashboard: total orders, in-transit, delivered, countries reached
- 30-second auto-refresh via TanStack Query refetchInterval
- API: `/api/rewards/map?wallet=<address>`

**Archive System (Hardened):**
- Parallel file processing: 10 concurrent R2 operations per batch
- Retry logic: 2 retries with exponential backoff for transient R2 errors
- Contest status flow: draft → active → ended → archiving → archived
- "Archiving" status with frontend loading UI during archive process
- Error recovery: reverts to "ended" status for admin retry
- Instagram-style silent video autoplay in both contest and archive grid views
- Handles 1000-2000 memes reliably

**IP Pipeline:**
1. Meme contest with SAMU voting
2. Contest ends → Admin selects winning memes
3. Winning meme designs turned into goods via Printful (Kiss-Cut Stickers)
4. SOL rewards distributed via escrow per contest voting ratios

**Authentication:**
- Privy (email login + embedded Solana wallet), configured with `walletChainType: 'solana-only'`
- External Solana wallet connectors enabled (Phantom etc.) via `externalWallets.solana.connectors`
- Planned: Add Phantom wallet direct login alongside Privy email

**Technical Approach:**
- Phase 1: Server-based (TypeScript) - all voting, reward tracking, escrow distribution via app server + DB (CURRENT)
- Phase 2: Smart contract (Rust/Anchor on Solana) - automate reward distribution on-chain (PLANNED)

**Smart Contract (contracts/ folder):**
- Location: `contracts/programs/samu-rewards/src/lib.rs`
- Framework: Anchor 0.30.1 + anchor-spl
- Build/Deploy: Use Solana Playground (beta.solpg.io) — not built within Replit
- Guide: `contracts/DEPLOYMENT_GUIDE.md`
- Hybrid model: server calculates revenue/recipients, smart contract executes on-chain distribution

**Hackathon Goals:**
- Target: Solana hackathons (e.g. Colosseum)
- Category: Consumer Applications
- Differentiator: Community-curated meme IP incubator with full pipeline (vote → goods → revenue share)

**Planned Features (Not Yet Implemented):**
- **Printful Webhook Integration**: Real-time shipping status updates triggering automatic escrow distribution on delivery confirmation. Currently admin-manual.
- **SAMU Map Gamification**: Delivery progress = reward unlock progress, SAMU character animations (sleeping at customs, celebrating on delivery)
- **Escrow Refund Handling**: Automated refund flow for failed/canceled orders
- **Phantom Direct Login**: Connect Phantom wallet directly alongside Privy email login

**Known Issues Fixed:**
- Duplicate contest archiving prevented via DB unique constraint
- Race condition resolved with 3-layer protection
- Goods shop SOL payment wallet address bug fixed
- Duplicate admin routes removed (5 routes with casing mismatches)
- MemStorage interface fully implemented with all required method stubs
- All LSP/TypeScript errors resolved (0 diagnostics)
- Privy SDK console warnings: internal SDK behaviors, cannot be eliminated

## System Architecture

The application uses a modern full-stack architecture comprising a React frontend, an Express.js backend, and a PostgreSQL database.

**UI/UX Decisions:**
- **Responsive Web Design**: Optimized for both desktop and mobile web browsers.
- **Styling**: Tailwind CSS with shadcn/ui components, custom SAMU brand colors, and a dark theme.
- **Navigation**: 5-tab bottom navigation (Contest, Archive, Goods, Rewards, Partners).
- **Modals**: Drawer-style modals using Vaul components.
- **Typography**: Poppins font family.
- **Image Optimization**: WebP format for performance.

**Technical Implementations:**
- **Frontend**: React 18, TypeScript, Vite, TanStack Query for server state, Wouter for routing, React Hook Form with Zod for forms.
- **Backend**: Express.js with TypeScript, RESTful API endpoints.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Privy for Web3 authentication (Solana-only), supporting email login with embedded Solana wallet and external wallet connectors.
- **Token Handling**: Solana RPC integration for real-time token balances and transfers.
- **File Uploads**: Cloudflare R2 for secure cloud storage of media, with automatic archiving.
- **Contest Management**: Admin panel for lifecycle management of contests (create, start, end).
- **Voting System**: On-chain SAMU SPL token transfers to a treasury wallet, verified both in-app and via Solana Blinks.
- **Escrow**: Multi-instruction Solana transactions split goods payments into production costs (to treasury) and profit (to escrow wallet) for later distribution.
- **SAMU Map**: Interactive `react-simple-maps` visualization of orders globally, showing fulfillment routes, order details, and revenue breakdown.
- **User Profiles**: Comprehensive profiles with editable details, statistics, and history.
- **Media Handling**: Supports image and video uploads, with Instagram-style autoplay for videos in grid views.
- **Security**: Backend-level IP tracking, login logging, and IP blocking.
- **Reward Distribution**: Server-based system for calculating and tracking creator, voter, and platform shares from merchandise profits, with a voter claim system. Planned future migration to Solana smart contracts using Anchor for automated on-chain distribution.

**Feature Specifications:**
- **Meme Contest**: Submission, viewing, and SAMU-based voting for memes.
- **Goods Shop**: Merchandise (Kiss-Cut Stickers) generated from winning memes via Printful, with SOL payment processing. Payment splits cost→Treasury, profit→Escrow.
- **Archive**: Stores past contest data, winners, and memes with parallel processing for efficient large-scale archiving.
- **Partners**: Enables isolated contests for other meme coin communities.
- **Hall of Fame**: Showcases winners from archived contests.
- **Rewards Dashboard**: Visualizes sales summaries, share breakdowns, and distribution history.
- **SAMU Map**: Gamified logistics map showing orders traveling across the globe with revenue info.
- **Voter Claims**: Per-contest claim system via profile page.
- **Solana Blinks (External Voting)**: Allows voting on memes directly from Solana-enabled wallets outside the app.

**Key Server Routes:**
- Contest/Memes: `server/routes/memes.ts`
- Admin: `server/routes/admin.ts`
- Goods/Escrow: `server/routes/goods.ts`
- Rewards: `server/routes/revenue.ts` + `server/routes/rewards-dashboard.ts`
- Blinks: `server/routes/actions.ts`
- Users: `server/routes/users.ts`
- Uploads: `server/routes/uploads.ts`
- Partners: `server/routes/partners.ts`
- Webhooks: `server/routes/webhook.ts` (skeleton for Printful)

**Solana Blinks API:**
- Endpoint: `/api/actions/vote/:memeId` - GET returns action metadata, POST builds SPL transfer tx, POST `/confirm` verifies on-chain
- actions.json at domain root for Blink client discovery
- Vote Options: 1, 5, 10, or custom SAMU amount (1-100)

## External Dependencies

- **Cloud Storage**: Cloudflare R2
- **Database**: PostgreSQL
- **Authentication**: Privy
- **Solana Interaction**: Solana RPC endpoints, @solana/actions, @solana/spl-token
- **UI Components**: shadcn/ui, Radix UI
- **Styling**: Tailwind CSS
- **Frontend Tooling**: Vite, TypeScript
- **Backend Framework**: Express.js
- **Form Management**: React Hook Form, Zod
- **Data Fetching/State Management**: TanStack Query
- **Routing**: Wouter
- **Map Visualization**: react-simple-maps, world-atlas
- **File Upload Middleware**: Multer
- **Merchandise Integration**: Printful API
- **Pricing Data**: CoinGecko API
