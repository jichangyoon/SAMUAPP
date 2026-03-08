# SAMU Meme Contest Application

## Overview
The SAMU Meme Contest Application is a platform designed to evolve memecoins into intellectual property (IP) on the Solana blockchain. Users can upload memes and vote for them using SAMU tokens. The winning memes are then produced as merchandise (stickers), and the sales profits are distributed in SOL. The project aims to create a self-sustaining ecosystem where meme creators and voters are rewarded, and the platform generates revenue.

## User Preferences
- 한국어로 소통 선호
- 비기술적 창업자가 AI 도움으로 관리하는 프로젝트
- 웹앱 (모바일앱 아님). 반응형 웹 디자인은 OK

## System Architecture

**Core Model:**
The platform operates on a pipeline: Meme Contest → Goods (Printful) → Ecosystem Rewards (SOL). It utilizes a dual-token system: SAMU for voting (transferred to treasury) and SOL for merchandise payments and reward distribution.

**Key Features:**
- **Voting System:** Implemented with on-chain SAMU SPL token transfers to a treasury wallet (`4WjMuna7iLjPE897m5fphErUt7AnSdjJTky1hyfZZaJk`). Supports in-app voting and Solana Blinks, with transaction verification to prevent duplicate votes.
- **Escrow, Order & Accounting:** SOL payments for merchandise are split into two parts via multi-instruction Solana transactions:
    - **Cost Price:** Transferred immediately to the Treasury.
    - **Profit:** Locked in an Escrow wallet (`ojzHLw6QxUqprnEjk4gfQM3QXS1RKHWdTLXzZS543cg`).
    Profits are distributed as 45% to Creators, 40% to Voters, and 15% to the Platform.
- **Printful Webhook:** Integrates with Printful v2 webhooks to automate order status updates and trigger profit distribution upon `shipment_delivered`. A 30-day timeout scheduler ensures distribution for delayed orders.
- **Reward System:**
    - **Creator Rewards (45%):** Allocated based on vote share per contest, recorded individually.
    - **Voter Rewards (40%):** Managed through a DeFi Reward Per Share model, accumulated in a `voterRewardPool` per contest.
    - **Claiming:** Rewards are claimed via on-chain SOL transfers from the Escrow wallet to user wallets, with the server signing transactions and covering gas fees.
- **SAMU Map:** Visualizes order locations globally using `react-leaflet` and CartoDB tiles, with color-coding for user-related profits. Includes routing to Printful fulfillment centers.
- **Order Geocoding:** Uses OpenStreetMap Nominatim API to get precise latitude/longitude for orders based on postal code and country.
- **My Profile:** Provides sections for "My Memes" (grouped by contest), "My Votes," "Rewards" (summary of earned and claimable SOL), and "Activity" (creator/voter stats and earnings).
- **Archiving System:** Processes ended contests for archiving into Cloudflare R2 with parallel processing and retry mechanisms, ensuring DB atomicity for state transitions.
- **Smart Contract Integration (Phase 2 - Devnet 테스트 중, Mainnet 대기 중):** Solana 프로그램 `samu-rewards`가 Anchor 프레임워크로 개발 완료되어 Devnet 배포 및 부분 검증 완료. Devnet 검증 결과: `initialize` ✅, `deposit_profit` ✅ (실제 SOL 이동 확인), `record_allocation` ✅, `claim` ⚠️ (Playground UI 한계로 직접 테스트 미완 — 코드 버그 수정 완료: signer seeds의 `contest_id_bytes` 로컬 바인딩 패턴 적용). 서버 코드(`server/utils/solana.ts`)에 완전 통합됨. `SAMU_REWARDS_PROGRAM_ID` env 설정 시 자동 활성화, 미설정 시 기존 DB 기반 분배로 폴백 (완전 하위 호환). **다음 단계:** Mainnet 배포 후 실제 앱에서 굿즈 구매 → 배송 완료 → claim 전체 흐름 end-to-end 검증 필요.

**Technical Stack:**
- **Frontend:** React 18, TypeScript, Vite, TanStack Query, Wouter, React Hook Form + Zod, Tailwind CSS, shadcn/ui, Vaul. Uses Poppins font and supports dark theme.
- **Backend:** Express.js + TypeScript, RESTful API.
- **Database:** PostgreSQL + Drizzle ORM.
- **Authentication:** Privy (Solana-only, email + embedded wallet + external wallets).
- **Storage:** Cloudflare R2 for archived memes.
- **Map:** react-leaflet, CartoDB tiles.
- **Geocoding:** OpenStreetMap Nominatim API.
- **Merchandise:** Printful API (Kiss-Cut Stickers).
- **Pricing:** CoinGecko API.

**Performance Optimization:** Includes targeted database queries, batch queries, lazy loading for map components, and TanStack Query's automatic deduplication.

## External Dependencies
- **Solana Blockchain:** Core infrastructure for SPL token transfers and smart contracts.
- **Privy:** Authentication service for user login (Solana-only, email, embedded, and external wallets).
- **Cloudflare R2:** Object storage for archiving contest data.
- **Printful API:** For merchandise production, order fulfillment, and webhook integration.
- **CartoDB:** Provides map tiles for the SAMU Map feature.
- **OpenStreetMap Nominatim API:** Used for geocoding order locations.
- **CoinGecko API:** For cryptocurrency pricing data.
- **Anchor:** Solana framework used for smart contract development.