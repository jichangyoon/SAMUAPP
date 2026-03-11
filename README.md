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

### Global SAMU Map
An interactive world map showing all orders as markers across the globe.
- Color-coded markers: green (my revenue) vs red (other orders)
- Click any marker to see order details, shipping status, tracking links, and revenue distribution breakdown
- Per-order revenue split display (Creator 45% / Voters 40% / Platform 15%)
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
- **Atomic DB writes**: archivedContest INSERT + contest status UPDATE + memes contestId UPDATE in a single transaction

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

## Smart Contract — Phase 2

Located in `contracts/programs/samu-rewards/src/lib.rs`:
- Framework: Anchor 0.30.1 + anchor-spl
- Build/Deploy via Solana Playground (beta.solpg.io)

### Why Phase 2?
The current (Phase 1) system is server-centralized: the server calculates rewards, holds the escrow private key, and signs all payout transactions. Users must trust the server.

Phase 2 moves reward distribution on-chain, making the process **trustless and publicly verifiable**.

### Architecture (Hybrid Model)
- **Server**: Calculates revenue amounts and recipient list (off-chain, efficient)
- **Smart Contract**: Executes the actual SOL transfers on-chain (trustless, auditable)
- Users can independently verify every distribution on Solana Explorer

### Instructions

| Instruction | Caller | Description |
|---|---|---|
| `initialize` | admin (1회) | 45/40/15 비율 설정, ProgramConfig PDA 생성 |
| `deposit_profit` | server (admin keypair) | 굿즈 수익 SOL → escrow_pool PDA 예치, 비율 검증 |
| `record_allocation` | server (admin keypair) | 수령인 1명씩 allocation_record PDA 생성/업데이트 |
| `claim` | user (본인 서명) | escrow_pool → 본인 지갑으로 SOL 수령 |

### Devnet 테스트 결과

| Instruction | 상태 | 비고 |
|---|---|---|
| `initialize` | ✅ 검증 완료 | 비율 설정 PDA 생성 확인 |
| `deposit_profit` | ✅ 검증 완료 | 실제 SOL escrow PDA 이동 확인 |
| `record_allocation` | ✅ 검증 완료 | 수령인별 allocation PDA 생성 확인 |
| `claim` | ⚠️ 미검증 | Playground UI 한계 — 코드 수정 완료 (signer seeds 버그 픽스), 실제 앱 연동 시 검증 필요 |

### Phase 2 Roadmap
1. ✅ **Contract logic 완성** — `deposit_profit` + `record_allocation` + `claim` 인스트럭션
2. ✅ **Devnet 배포 성공** — Solana Playground에서 빌드/배포, 3개 인스트럭션 검증
3. ✅ **Server integration** — `server/utils/solana.ts`에 완전 통합, `isContractEnabled()` 플래그로 폴백 지원
4. ✅ **Frontend integration** — 클레임 흐름: 유저가 직접 서명 (contract mode) vs 서버 서명 (legacy mode)
5. ⏳ **Mainnet deploy** — `SAMU_REWARDS_PROGRAM_ID` Replit Secret 등록 후 즉시 활성화
6. ⏳ **End-to-end 검증** — Mainnet에서 굿즈 구매 → 배송 완료 → claim 전체 흐름 실검증

## Roadmap

### Completed (Phase 1)
- Full meme contest + voting system (SAMU SPL on-chain)
- Goods shop with SOL payment + Printful integration
- Escrow accounting (45/40/15 split, locked until delivery)
- Claim SOL payout for creators and voters (on-chain, escrow-signed)
- 30-day delivery timeout scheduler (auto-distribute unclaimed escrow)
- Printful webhook v2 (auto-trigger on delivery)
- Contest archive system (R2 + DB, atomic writes)
- SAMU Map (global order visualization)
- Solana Blinks (external voting)
- Partner community contests
- Security hardening: webhook auth, SQL injection fix, double-claim prevention, race condition fixes
- Performance: batch queries, DB indexes, N+1 elimination

### Phase 2 (Devnet 부분 검증 완료 — Mainnet 대기 중)
- ✅ **Smart Contract 개발 완료**: `samu-rewards` Anchor 프로그램 (deposit_profit / record_allocation / claim)
- ✅ **Devnet 배포 성공**: Solana Playground에서 빌드/배포, initialize + deposit_profit + record_allocation 검증
- ⚠️ **claim 코드 수정 완료**: signer seeds `contest_id_bytes` 로컬 바인딩 버그 픽스 — Playground UI 한계로 테스트 미완
- ✅ **서버 통합 완료**: `isContractEnabled()` 플래그로 완전 하위 호환
- ✅ **프론트엔드 통합 완료**: 컨트랙트 모드/레거시 모드 자동 분기
- ⏳ **Mainnet 배포**: `SAMU_REWARDS_PROGRAM_ID` 시크릿 등록 시 즉시 활성화
- ⏳ **End-to-end 검증**: Mainnet에서 굿즈 구매 → 배송 완료 → claim 전체 흐름 실검증

### Backlog (Low Priority / On Hold)
- Escrow Refund: Auto-refund for failed/cancelled Printful orders
- SAMU Map Gamification: Delivery progress animations, SAMU character storytelling
- Phantom Direct Login: Requires Privy paid plan upgrade

---

## Long-term Vision

SAMU is built as a multi-phase protocol — starting as a meme contest app and evolving into a fully decentralized IP creation and licensing platform on Solana.

```
Phase 1 → Meme Incubator App          (✅ Complete)
Phase 2 → On-chain Escrow             (⚙️  In Progress)
Phase 3 → IP Equity NFT               (📐 Designed)
Phase 4 → Community Factory Program   (🔭 Planned)
Phase 5 → License NFT Marketplace     (🔭 Planned)
Phase 6 → Solana SVM Appchain         (🔭 Planned)
```

### Phase 1 — Meme Incubator App ✅
React/Vite + Express + PostgreSQL + Printful + Privy embedded wallet. Meme contest → SPL token voting → winning goods production → server-side escrow reward distribution. Voting is already substantively on-chain (SPL token transfers).

### Phase 2 — On-chain Escrow (Anchor) ⚙️
Replace the server-held escrow with a PDA-controlled Anchor smart contract. Instructions: `initialize`, `deposit_profit`, `record_allocation`, `claim`. Devnet verification complete. Mainnet deployment is the key remaining milestone. First full end-to-end cycle (contest → goods sale → SOL distribution) not yet completed.

### Phase 3 — Dynamic IP Equity NFT
Metaplex Core-based. Express community contribution as an NFT-represented IP equity stake, linked to a revenue PDA. Each meme that wins a contest mints an IP NFT — the NFT holder receives a proportional cut of future licensing and merchandise revenue. High implementation complexity.

### Phase 4 — Community Factory Program
A permissionless on-chain program that allows anyone to launch a new meme community with its own contest, token, and reward pool — without admin approval. Transforms SAMU from an app into a protocol. Each community gets isolated contest spaces, independent voting, and its own SPL token integration.

### Phase 5 — License NFT Marketplace
IP licenses are tokenized as NFTs and traded on an open marketplace. Brands, creators, and developers can acquire usage rights to SAMU-originated IP for merchandise, games, media, and more. Revenue flows in USDC back to IP NFT holders.

### Phase 6 — Solana SVM Appchain
A dedicated application-specific chain built on Sonic SVM or MagicBlock stack. Enables custom transaction fee logic, native meme IP state management, and seamless composability with the broader Solana ecosystem — at scale.

---

## Inspiration

- **Pudgy Penguins** — IP → Physical goods pipeline
- **Steemit** — Voter ecosystem rewards model
- **Threadless** — Community voting → Merchandise creation

## License

MIT License
