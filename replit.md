# SAMU Meme Contest Application

## Overview
The SAMU Meme Contest Application is a Solana-based platform that transforms memecoins into intellectual property (IP). It allows users to upload and vote for memes using SAMU tokens. Winning memes are converted into physical merchandise (stickers), and sales profits are distributed in SOL. The project aims to create a self-sustaining ecosystem that rewards meme creators and voters while generating platform revenue.

## User Preferences
- 한국어로 소통 선호
- 비기술적 창업자가 AI 도움으로 관리하는 프로젝트
- 웹앱 (모바일앱 아님). 반응형 웹 디자인은 OK

## System Architecture

**Core Model:** The platform operates on a pipeline: Meme Contest → Goods (Printful) → Ecosystem Rewards (SOL). It uses a dual-token system: SAMU for voting (transferred to treasury) and SOL for merchandise payments and reward distribution.

**Key Features:**
- **Voting System:** On-chain SAMU SPL token transfers to a treasury wallet. Supports in-app voting and Solana Blinks with transaction verification.
- **Escrow, Order & Accounting:** SOL payments for merchandise are split into cost and profit. Profits are deposited into an `escrow_pool` PDA (on-chain) in contract mode or an Escrow wallet otherwise. Profits are distributed as 45% to Creators, 40% to Voters, and 15% to the Platform.
- **Printful Webhook:** Integrates with Printful v2 webhooks to automate order status updates and trigger profit distribution upon `shipment_delivered`.
- **Reward System:**
    - **Creator Rewards (45%):** Allocated based on vote share per contest via `creator_reward_distributions` table.
    - **Voter Rewards (40%):** Managed via a DeFi Reward Per Share model using `voter_reward_pool` + `voter_claim_records` tables.
    - **Claiming:** In contract mode, users claim rewards by initiating a transaction that the server builds (`record_allocation` + `claim`) for combined Creator+Voter lamports, pre-signed by the admin, with the user's wallet signing and paying gas.
- **SAMU Map:** Visualizes global order locations using `react-leaflet` and CartoDB.
- **Order Geocoding:** Uses OpenStreetMap Nominatim API for precise latitude/longitude based on postal code and country.
- **My Profile:** Provides sections for "My Memes," "My Votes," "Rewards," and "Activity."
- **Archiving System:** Processes ended contests for archiving into Cloudflare R2 with parallel processing and retry mechanisms.
- **Smart Contract Integration (Phase 2 Upgrade):** Uses Solana program `samu-rewards` with Anchor framework. The contract handles `initialize_pool`, `deposit_profit`, `record_allocation`, and `claim` instructions. It optimizes gas fees by processing user claims in a single transaction.

**Technical Stack:**
- **Frontend:** React 18, TypeScript, Vite, TanStack Query, Wouter, React Hook Form + Zod, Tailwind CSS, shadcn/ui, Vaul.
- **Backend:** Express.js + TypeScript, RESTful API.
- **Database:** PostgreSQL + Drizzle ORM.
- **Authentication:** Privy (Solana-only, email + embedded wallet + external wallets).
- **Storage:** Cloudflare R2 for archived memes.
- **Map:** react-leaflet, CartoDB tiles.
- **Geocoding:** OpenStreetMap Nominatim API.
- **Merchandise:** Printful API (Kiss-Cut Stickers).
- **Pricing:** CoinGecko API.

**Long-term Roadmap:**
- **Phase 1: Meme Incubator App:** Current system (React + Express + Printful + Privy).
- **Phase 2: On-chain Escrow (Anchor):** Upgrade for direct profit deposit into `escrow_pool` PDA and user-initiated combined claim transactions.
- **Phase 3: Dynamic IP Equity cNFT:** Transition to cNFTs for reward distribution using Metaplex Bubblegum, with Helius DAS API for ownership lookup.
- **Phase 4: Community Factory Program:** Permissionless community launch on-chain program.
- **Phase 5: License NFT Marketplace:** IP license NFT trading platform.
- **Phase 6: Solana SVM Appchain:** Dedicated appchain based on Sonic SVM / MagicBlock.

## External Dependencies
- **Solana Blockchain:** Core infrastructure for SPL token transfers and smart contracts.
- **Privy:** Authentication service for user login.
- **Cloudflare R2:** Object storage for archiving contest data.
- **Printful API:** For merchandise production, order fulfillment, and webhook integration.
- **CartoDB:** Provides map tiles for the SAMU Map feature.
- **OpenStreetMap Nominatim API:** Used for geocoding order locations.
- **CoinGecko API:** For cryptocurrency pricing data.
- **Anchor:** Solana framework for smart contract development.
- **Metaplex Bubblegum:** Solana program for minting compressed NFTs (cNFTs) (Phase 3).
- **Helius DAS API:** For querying cNFT ownership off-chain (Phase 3).