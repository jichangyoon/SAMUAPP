# SAMU Meme Contest Application

## Overview

This is a full-stack web application for a SAMU (Solana meme token) contest platform. Users can submit memes, vote using their token holdings, and compete for prizes. The application features a mobile-first design, a goods shop for merchandise, an NFT gallery, and a system for partner communities to host their own contests.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application uses a modern full-stack architecture with a React frontend, an Express.js backend, and a PostgreSQL database.

**UI/UX Decisions:**
- **Mobile-First Design**: Responsive design optimized for mobile devices.
- **Styling**: Tailwind CSS with shadcn/ui components, custom SAMU brand colors (yellows, grays, browns, oranges), and a default black dark theme.
- **Navigation**: 5-tab bottom navigation (Contest, Archive, NFT, Goods, Partners) with icon and text labels. Swipe gestures are used for navigation on mobile.
- **Modals**: All app modals (meme details, profile info, etc.) use mobile-friendly swipe gestures with Vaul drawer components.
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
- **Voting System**: Users have a base voting power, plus additional power based on SAMU token holdings. Votes are cast using voting power, not directly tokens.
- **User Profiles**: Comprehensive user profiles with editable display names, profile pictures (stored on R2), personal statistics, and meme/vote history.
- **Media Handling**: Support for both image (JPEG, PNG, GIF, WebP) and video (MP4, MOV, AVI, WebM) uploads and display, with mobile-friendly controls and thumbnails.

**Feature Specifications:**
- **Meme Contest**: Users can submit memes, view entries in card or grid view, and vote.
- **Goods Shop**: Showcases Hall of Fame meme designs as collectibles (no commerce functionality for iOS compliance).
- **NFT Gallery**: Displays 164 SAMU Wolf NFTs with commenting system, lazy loading.
- **Archive**: Stores past contest results, winners, and memes.
- **Partners**: Allows other meme coin communities to host their own isolated contests.
- **Hall of Fame**: Displays winners from archived contests.

## External Dependencies

- **Cloud Storage**: Cloudflare R2
- **Database**: PostgreSQL (with Drizzle ORM)
- **Authentication**: Privy
- **Solana Interaction**: Solana RPC endpoints
- **UI Components**: shadcn/ui (built on Radix UI primitives)
- **Styling**: Tailwind CSS
- **Frontend Tooling**: Vite, TypeScript
- **Backend Framework**: Express.js
- **Form Management**: React Hook Form, Zod (for validation)
- **Data Fetching/State Management**: TanStack Query
- **Routing**: Wouter
- **File Upload Middleware**: Multer (for server-side file handling before R2 upload)
- **Date/Time**: `date-fns` (implied by KST timezone support)
- **Image Processing**: Sharp (used for WebP optimization during development, not runtime dependency for client)