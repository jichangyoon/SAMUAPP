# SAMU Meme Contest Application

## Overview

This is a full-stack web application designed as a Meme Incubator on Solana, where users submit memes, vote using SAMU tokens, and winning memes are converted into merchandise. The project's vision is to evolve memecoins into Intellectual Property on Solana, generating revenue through merchandise sales that are then distributed as SOL rewards. It features a dual-token model (SAMU for voting, SOL for rewards), an on-chain voting system, an escrow-based reward distribution mechanism, and a gamified global logistics map.

## User Preferences

Preferred communication style: Simple, everyday language. Korean language preferred for communication.
User is a non-technical founder managing the app with AI assistance.
This is a web app — not a mobile app. No mobile app packaging or mobile-first framing. Responsive web design is fine, but the product identity is a web application.

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
- **File Uploads**: Cloudflare R2 for secure cloud storage of media.
- **Contest Management**: Admin panel for lifecycle management of contests (create, start, end).
- **Voting System**: On-chain SAMU SPL token transfers to a treasury wallet, verified both in-app and via Solana Blinks.
- **Escrow**: Multi-instruction Solana transactions split goods payments into production costs (to treasury) and profit (to escrow wallet). Distribution is DB ledger only; actual on-chain SOL payout to creators/voters is pending implementation.
- **SAMU Map**: Interactive `react-leaflet` visualization with CartoDB dark tiles, geocoded order markers, fulfillment routes, and revenue breakdown. Lazy loaded.
- **Order Geocoding**: OpenStreetMap Nominatim API for accurate latitude/longitude from postal codes at order creation.
- **User Profiles**: Comprehensive profiles with editable details, statistics, and history. "My Memes" tab grouped by contest with vote stats.
- **Media Handling**: Supports image and video uploads, with Instagram-style autoplay for videos in grid views.
- **Reward Distribution**: Server-based DB ledger system for calculating creator/voter/platform shares (45% Creator, 40% Voters, 15% Platform). Voter claim system implemented at DB level; actual SOL transfers are pending implementation.
- **Archive System**: Manages past contest data, winners, and memes with parallel processing for efficient archiving.
- **Solana Blinks (External Voting)**: Allows voting on memes directly from Solana-enabled wallets outside the app via `/api/actions/vote/:memeId` endpoint.

**Performance Optimizations:**
- Targeted vote queries for map endpoint instead of full table scans.
- Lazy loading for map components.
- TanStack Query deduplicates API requests.

**Feature Specifications:**
- **Meme Contest**: Submission, viewing, and SAMU-based voting for memes.
- **Goods Shop**: Merchandise (Kiss-Cut Stickers) generated from winning memes via Printful, with SOL payment processing and payment splitting. Goods detail view shows "Origin Story".
- **Hall of Fame**: Showcases winners from archived contests.
- **Rewards Dashboard**: Visualizes sales summaries, share breakdowns, and distribution history.
- **Voter Claims**: Per-contest claim system via profile page.

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
- **Map Visualization**: react-leaflet, CartoDB tiles (OpenStreetMap)
- **Geocoding**: OpenStreetMap Nominatim API
- **File Upload Middleware**: Multer
- **Merchandise Integration**: Printful API
- **Pricing Data**: CoinGecko API