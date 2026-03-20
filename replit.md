# SAMU Meme Contest Application

## Overview
The SAMU Meme Contest Application is a Solana blockchain-based platform designed to transform memecoins into intellectual property (IP). It enables users to upload and vote for memes using SAMU tokens. Winning memes are converted into merchandise (stickers), and the profits from sales are distributed in SOL. The project aims to create a self-sustaining ecosystem that rewards meme creators and voters while generating platform revenue. The long-term vision includes transitioning to cNFT-based IP equity, a permissionless community factory program, and eventually a Solana SVM Appchain for a full ecosystem.

## User Preferences
- 한국어로 소통 선호
- 비기술적 창업자가 AI 도움으로 관리하는 프로젝트
- 웹앱 (모바일앱 아님). 반응형 웹 디자인은 OK

## System Architecture

**Core Model:**
The platform operates on a pipeline: Meme Contest → Goods (Printful) → Ecosystem Rewards (SOL), utilizing a dual-token system (SAMU for voting, SOL for payments and rewards).

**Key Features:**
- **Voting System:** On-chain SAMU SPL token transfers to a treasury wallet, supporting in-app voting and Solana Blinks with transaction verification.
- **Escrow, Order & Accounting:** SOL payments for merchandise are split into cost price (to Treasury) and profit (to `escrow_pool` PDA in contract mode, or Escrow wallet otherwise). Profits are distributed as 45% to Creators, 40% to Voters, and 15% to the Platform.
- **Printful Webhook:** Integrates with Printful v2 webhooks for automated order status updates and profit distribution upon `shipment_delivered`, with a 30-day timeout scheduler.
- **Reward System:**
    - **Creator Rewards (45%):** Based on vote share per contest. Tracked via per-order, per-creator rows (`creator_reward_distributions`).
    - **Voter Rewards (40%):** Currently RPS model (`voterRewardPool`). Pre-Phase 3 migration planned → Direct Allocation (per-order rows, same as Creator) for unified tracking and explicit audit trail.
    - **Claiming:** In contract mode, users claim rewards via a single transaction combining `record_allocation` and `claim`, pre-signed by the admin for amount guarantee, with the user covering gas fees.
- **SAMU Map:** Visualizes order locations globally using `react-leaflet` and CartoDB, color-coded by user profits, including routing to Printful fulfillment centers.
- **Order Geocoding:** Uses OpenStreetMap Nominatim API for precise latitude/longitude based on postal code and country.
- **My Profile:** User dashboard showing "My Memes," "My Votes," "Rewards" (claimable SOL), and "Activity."
- **Archiving System:** Processes ended contests for archiving into Cloudflare R2 with parallel processing and retry mechanisms, ensuring DB atomicity.
- **Smart Contract Integration (Phase 2):** Solana program `samu-rewards` built with Anchor framework (`SAMU_REWARDS_PROGRAM_ID`).
    - **Contract Structure:** `initialize_pool`, `deposit_profit`, `record_allocation` (single combined amount for Creator+Voter), `claim`.
    - **Gas Fee Structure:** Fixed server gas fees for `initialize_pool` and `deposit_profit` per delivery; user pays minimal gas for `record_allocation` + `claim`.
    - **Flows:** Profit directly to `escrow_pool` PDA on payment. Claim involves server building a single transaction, admin pre-signing, and user final signing.
    - **Upgrades:** Contract upgrades are in-place, preserving Program ID and existing PDAs.
    - **Fallback:** Server-side Solana utility (`server/utils/solana.ts`) automatically activates contract mode if `SAMU_REWARDS_PROGRAM_ID` is set, otherwise falls back to DB-based distribution.

**Technical Stack:**
- **Frontend:** React 18, TypeScript, Vite, TanStack Query, Wouter, React Hook Form + Zod, Tailwind CSS, shadcn/ui, Vaul. Poppins font, dark theme support.
- **Backend:** Express.js + TypeScript, RESTful API.
- **Database:** PostgreSQL + Drizzle ORM.
- **Authentication:** Privy (Solana-only, email + embedded wallet + external wallets).
- **Storage:** Cloudflare R2 for archived memes.
- **Map:** react-leaflet, CartoDB tiles.
- **Geocoding:** OpenStreetMap Nominatim API.
- **Merchandise:** Printful API.
- **Pricing:** CoinGecko API.

**Performance Optimization:** Includes targeted DB queries, batching, lazy loading for map components, and TanStack Query deduplication.

**Phase 3 Design (cNFT for IP Equity):**
- **Model Shift:** From DB-based profit distribution to cNFT-based distribution.
- **Key Decisions:** Use cNFTs (Metaplex Bubblegum) for negligible minting cost, issued to all Creators and Voters at contest end with percentage equity metadata. cNFTs are transferable, forming the basis for future marketplaces.
- **Distribution:** Helius DAS API used to query current cNFT holders for SOL distribution, maintaining existing server-based distribution patterns.
- **Independence:** Phase 3 contract (`samu-ip-nft`) is separate from Phase 2, allowing for cross-program invocation.
- **Implementation:** Requires Merkle Tree generation for cNFT minting, Helius DAS API integration, and shifting distribution logic from DB records to cNFT holders.

**상세 기술 문서:** `.local/NOTES.md` 참조 (배포 전략, 컨트랙트 구조, Known Issues, 로드맵 등)

## External Dependencies
- **Solana Blockchain:** Core infrastructure for SPL tokens and smart contracts.
- **Privy:** User authentication.
- **Cloudflare R2:** Object storage.
- **Printful API:** Merchandise production and fulfillment.
- **CartoDB:** Map tiles.
- **OpenStreetMap Nominatim API:** Geocoding services.
- **CoinGecko API:** Cryptocurrency pricing.
- **Anchor:** Solana smart contract framework.
- **Metaplex Bubblegum:** Solana program for compressed NFTs (cNFTs) (Phase 3).
- **Helius DAS API:** Off-chain cNFT ownership querying (Phase 3).