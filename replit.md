# SAMU Meme Contest Application

## Overview
The SAMU Meme Contest Application is a Solana-based platform designed to transform memecoins into intellectual property (IP). It enables users to upload and vote for memes using SAMU tokens. Winning memes are produced as physical merchandise (stickers), with sales profits distributed in SOL. The project aims to create a self-sustaining ecosystem that rewards meme creators and voters while generating platform revenue.

## User Preferences
- 한국어로 소통 선호
- 비기술적 창업자가 AI 도움으로 관리하는 프로젝트
- 웹앱 (모바일앱 아님). 반응형 웹 디자인은 OK

## System Architecture

**Core Model:** The platform operates on a pipeline: Meme Contest → Goods (Printful) → Ecosystem Rewards (SOL). It uses a dual-token system: SAMU for voting (transferred to treasury) and SOL for merchandise payments and reward distribution.

**Key Features:**
- **Voting System:** On-chain SAMU SPL token transfers to a treasury wallet, supporting in-app voting and Solana Blinks with transaction verification.
- **Escrow, Order & Accounting:** SOL payments for merchandise are split into cost price (to Treasury) and profit. Profit is either deposited into an `escrow_pool` PDA (on-chain, transparent) in contract mode or an Escrow wallet (`ojzHLw6QxUqprnEjk4gfQM3QXS1RKHWdTLXzZS543cg`) otherwise. Profits are distributed as 45% to Creators, 40% to Voters, and 15% to the Platform.
- **Printful Webhook:** Integrates with Printful v2 webhooks to automate order status updates and trigger profit distribution upon `shipment_delivered`.
- **Reward System:**
    - **Creator Rewards (45%):** Allocated based on vote share per contest.
    - **Voter Rewards (40%):** Managed via a DeFi Reward Per Share model.
    - **Claiming:** In contract mode, users claim rewards by initiating a transaction that the server builds (`record_allocation` + `claim`), pre-signed by the admin for amount guarantee, with the user's wallet signing and paying gas. Off-contract, SOL is directly transferred from the Escrow wallet via DB.
- **SAMU Map:** Visualizes global order locations using `react-leaflet` and CartoDB, showing user-related profits and routing to Printful fulfillment centers.
- **Order Geocoding:** Uses OpenStreetMap Nominatim API for precise latitude/longitude based on postal code and country.
- **My Profile:** Provides sections for "My Memes," "My Votes," "Rewards" (earned and claimable SOL), and "Activity."
- **Archiving System:** Processes ended contests for archiving into Cloudflare R2 with parallel processing and retry mechanisms, ensuring DB atomicity.
- **Smart Contract Integration (Phase 2):** Solana program `samu-rewards` built with Anchor framework (`SAMU_REWARDS_PROGRAM_ID`).
    - **Contract Structure:** `initialize_pool` (treasury initialization), `deposit_profit` (record SOL distribution), `record_allocation` (user-payer, admin pre-signs for amount), `claim` (SOL transfer from `escrow_pool` to user).
    - **Gas Fees:** Server incurs gas twice per shipment (initialize_pool + deposit_profit). User pays gas for `record_allocation` + `claim` transaction.
    - **Payment Flow:** Profits directly deposit into `escrow_pool` PDA.
    - **Claim Flow:** Server builds a single `record_allocation` + `claim` transaction for combined Creator+Voter lamports, admin pre-signs, user signs and broadcasts, then `confirm-claim` updates the DB.
    - **Upgradeability:** Contract is upgradeable in-place via Solana Playground, preserving Program ID and existing PDA states.
    - **Server Integration:** `server/utils/solana.ts` activates contract interaction if `SAMU_REWARDS_PROGRAM_ID` is set, otherwise falls back to DB-based distribution.

**Technical Stack:**
- **Frontend:** React 18, TypeScript, Vite, TanStack Query, Wouter, React Hook Form + Zod, Tailwind CSS, shadcn/ui, Vaul.
- **Backend:** Express.js + TypeScript, RESTful API.
- **Database:** PostgreSQL + Drizzle ORM.
- **Authentication:** Privy (Solana-only, email + embedded wallet + external wallets).
- **Storage:** Cloudflare R2.
- **Map:** react-leaflet, CartoDB.
- **Geocoding:** OpenStreetMap Nominatim API.
- **Merchandise:** Printful API.
- **Pricing:** CoinGecko API.

**Future Phases (Long-term Roadmap):**
- **Phase 3 (On-chain Escrow):** Transition to cNFTs for reward distribution. Compressed NFTs (cNFTs) will be issued to creators and voters, holding their profit shares. Profit distribution will query cNFT holders via Helius DAS API.
- **Phase 4 (Community Factory Program):** Permissionless community launch program.
- **Phase 5 (License NFT Marketplace):** IP license NFT trading with USDC flow.
- **Phase 6 (Solana SVM Appchain):** Dedicated appchain based on Sonic SVM / MagicBlock.

## External Dependencies
- **Solana Blockchain:** Core infrastructure for SPL token transfers and smart contracts.
- **Privy:** User authentication (Solana-only, email, embedded, and external wallets).
- **Cloudflare R2:** Object storage for archiving contest data.
- **Printful API:** Merchandise production, order fulfillment, and webhook integration.
- **CartoDB:** Provides map tiles for the SAMU Map.
- **OpenStreetMap Nominatim API:** Geocoding order locations.
- **CoinGecko API:** Cryptocurrency pricing data.
- **Anchor:** Solana framework for smart contract development.
- **Metaplex Bubblegum:** Solana program for minting compressed NFTs (cNFTs) via state compression (Phase 3).
- **Helius DAS API:** Digital Asset Standard API for querying cNFT ownership off-chain (Phase 3).