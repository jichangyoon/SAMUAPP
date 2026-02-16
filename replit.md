# SAMU Meme Contest Application

## Overview

This is a full-stack web application for a SAMU (Solana meme token) contest platform. Users can submit memes, vote using their token holdings, and compete for prizes. The application features a goods shop for merchandise, an NFT gallery, and a system for partner communities to host their own contests.

## User Preferences

Preferred communication style: Simple, everyday language. Korean language preferred for communication.
User is a non-technical founder managing the app with AI assistance.
This is a web app — not a mobile app. No mobile app packaging or mobile-first framing. Responsive web design is fine, but the product identity is a web application.

## Project Roadmap & Vision (Confirmed Feb 2026)

**Core Concept: Meme Incubator**
- The app's mission is to help memecoins evolve into IP (Intellectual Property) on Solana.
- Pipeline: Meme Contest → NFT → Goods (via Printful) → Ecosystem Rewards (SAMU)

**Dual Token Model:**
- **SAMU Token** = Governance/Voting/Rewards (community votes on memes using SAMU tokens, ecosystem rewards distributed in SAMU)
- **SOL** = Merchandise Payment (goods shop payment only)
- SAMU provides community membership + voting rights + ecosystem rewards, SOL is for goods purchases.

**Voting System (Implemented - Phase 2: On-chain):**
- SAMU token direct voting (users spend SAMU to vote, not just hold)
- Minimum vote: 1 SAMU
- No upper limit on voting amount (capped by user's SAMU balance)
- Voting amount determines reward share proportion for that contest round
- Real on-chain SAMU transfers to treasury wallet via SPL token transfer (both in-app and Blinks)
- Backend `/api/memes/prepare-transaction` builds serialized SPL transfer tx, frontend signs via Privy `useSignTransaction`
- Treasury wallet: 4WjMuna7iLjPE897m5fphErUt7AnSdjJTky1hyfZZaJk
- Anti-abuse: on-chain transaction costs (SOL gas fees) naturally prevent multi-account abuse
- Blinks (external voting via Solana Actions) also uses real SPL token transfer with on-chain verification
- Shared `verifyTransaction` function validates both in-app and Blinks votes (preTokenBalances/postTokenBalances check)
- DB schema: votes table uses `samuAmount` + `txSignature` (replaced old votingPower/powerUsed columns)
- Duplicate vote prevention via `getVoteByTxSignature` check

**Ecosystem Rewards Model (Implemented - Tracking/Calculation):**
- Meme Creator: 30% (permanent reward for creating the IP)
- Voters: 30% (proportional to voting amount in that contest round - all voters, not just winners)
- NFT Holder: 25% (whoever holds the winning meme's NFT, tradeable)
- Platform: 15% (operational costs)
- Revenue sources: Goods sales (Printful), NFT sales
- Reward currency: SAMU tokens (ecosystem contribution rewards, not investment returns)
- DB tables: `revenues` (contest revenue records), `revenue_shares` (individual distribution records)
- API: `/api/revenue/` - create revenue, distribute, query by contest/wallet
- Admin can create revenue entries and trigger distribution calculation
- Users see real-time vote share % during active contests
- Archive shows reward distribution details after contest ends
- Profile stats tab shows total earnings and per-contest breakdown
- Actual SAMU transfer not yet automated (manual for now)

**IP Pipeline (To Be Implemented):**
1. Meme contest with SAMU voting
2. Contest ends → Top 3 memes selected
3. Winning memes minted as NFTs (1st, 2nd, 3rd place)
4. NFT holders can trade NFTs (trading = transferring reward rights)
5. Winning meme designs turned into goods via Printful
6. SAMU token rewards distributed per ecosystem rewards model above

**Authentication (To Be Updated):**
- Current: Privy (email login + embedded Solana wallet)
- Planned: Add Phantom wallet direct login alongside Privy
- Goal: Existing Solana users can connect Phantom directly, new users use email

**Technical Approach:**
- Phase 1: Server-based (TypeScript) - all voting, reward tracking, distribution via app server + DB
- Phase 2: Smart contract (Rust/Anchor on Solana) - automate reward distribution on-chain
- Server-first approach allows easy iteration on revenue ratios and logic before locking into contracts

**Hackathon Goals:**
- Target: Solana hackathons (e.g. Colosseum)
- Category: Consumer Applications
- Differentiator: Community-curated meme IP incubator with full pipeline (vote → NFT → goods → revenue share)
- Reference projects: Pudgy Penguins (IP→goods), Steemit (voter revenue share), Threadless (community voting→merchandise)

**Known Issues Fixed:**
- Duplicate contest archiving prevented via DB unique constraint on archivedContests.originalContestId
- Race condition between interval checker and setTimeout scheduler resolved with 3-layer protection (status check, pre-insert check, DB unique constraint)
- Goods shop SOL payment: fixed wallet address bug (was using Ethereum 0x address instead of Solana base58)

## System Architecture

The application uses a modern full-stack architecture with a React frontend, an Express.js backend, and a PostgreSQL database.

**UI/UX Decisions:**
- **Responsive Web Design**: Works well on both desktop and mobile browsers.
- **Styling**: Tailwind CSS with shadcn/ui components, custom SAMU brand colors (yellows, grays, browns, oranges), and a default black dark theme.
- **Navigation**: 5-tab bottom navigation (Contest, Archive, NFT, Goods, Partners) with icon and text labels.
- **Modals**: Drawer-style modals using Vaul components.
- **Typography**: Poppins font family used throughout the application.
- **Image Optimization**: WebP format used for all images (NFTs, logos, merchandise) for performance. Lazy loading implemented for NFT gallery.

**Technical Implementations:**
- **Frontend**: React 18 with TypeScript, Vite for tooling, TanStack Query for server state management, Wouter for routing, React Hook Form with Zod for forms.
- **Backend**: Express.js with TypeScript, RESTful API endpoints.
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations.
- **Authentication**: Privy for universal Web3 authentication, supporting email-only login with automatic Solana embedded wallet creation.
- **Token Handling**: Integration with Solana RPC endpoints for real-time SAMU and SOL token balance display and transfer capabilities.
- **File Uploads**: Cloudflare R2 for secure cloud storage of images and videos (up to 10MB), with automatic archiving for contest entries.
- **Contest Management**: Admin panel for creating, starting, and ending contests, with automatic archiving and voting power recalculation.
- **Voting System**: On-chain SAMU SPL token transfer to treasury. Both in-app and Blinks use the same verification logic.
- **User Profiles**: Comprehensive user profiles with editable display names, profile pictures (stored on R2), personal statistics, and meme/vote history.
- **Media Handling**: Support for both image (JPEG, PNG, GIF, WebP) and video (MP4, MOV, AVI, WebM) uploads and display.

**Feature Specifications:**
- **Meme Contest**: Users can submit memes, view entries in card or grid view, and vote.
- **Goods Shop**: Kiss-Cut Sticker merchandise from contest-winning memes via Printful. SOL payment flow: estimate shipping → pay SOL to Treasury → on-chain verification → Printful order creation. Product ID 358, 4 size variants.
- **NFT Gallery**: Displays 164 SAMU Wolf NFTs with commenting system, lazy loading.
- **Archive**: Stores past contest results, winners, and memes.
- **Partners**: Allows other meme coin communities to host their own isolated contests.
- **Hall of Fame**: Displays winners from archived contests.
- **Solana Blinks (External Voting)**: Enables voting on memes from outside the app via Solana Actions. Users can share Blink URLs on X (Twitter), Discord, etc., and holders can vote directly using their Phantom or other Solana wallets without logging into the app.

**Solana Blinks API:**
- **Endpoint**: `/api/actions/vote/:memeId` - GET returns action metadata, POST builds SPL transfer tx, POST `/confirm` verifies on-chain
- **actions.json**: Located at domain root for Blink client discovery
- **Vote Options**: 1, 5, 10, or custom SAMU amount (1-100)
- **Flow**: Blink URL shared → Wallet detects → User clicks vote → Wallet signs SPL transfer → On-chain verification → Vote recorded in DB

## External Dependencies

- **Cloud Storage**: Cloudflare R2
- **Database**: PostgreSQL (with Drizzle ORM)
- **Authentication**: Privy
- **Solana Interaction**: Solana RPC endpoints, @solana/actions (Blinks SDK), @solana/spl-token
- **UI Components**: shadcn/ui (built on Radix UI primitives)
- **Styling**: Tailwind CSS
- **Frontend Tooling**: Vite, TypeScript
- **Backend Framework**: Express.js
- **Form Management**: React Hook Form, Zod (for validation)
- **Data Fetching/State Management**: TanStack Query
- **Routing**: Wouter
- **File Upload Middleware**: Multer (for server-side file handling before R2 upload)
- **Date/Time**: `date-fns` (implied by KST timezone support)
