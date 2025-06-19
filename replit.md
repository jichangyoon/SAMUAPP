# SAMU Meme Contest Application

## Overview

This is a full-stack web application for a SAMU (Solana meme token) contest platform where users can submit memes, vote using their token holdings, and compete for prizes. The application features a mobile-first design with React frontend, Express.js backend, and PostgreSQL database using Drizzle ORM.

## System Architecture

The application follows a modern full-stack architecture with clear separation of concerns:

- **Frontend**: React with TypeScript, built using Vite
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for client-side routing
- **File Uploads**: Multer for handling image uploads

## Key Components

### Frontend Architecture
- **Component Structure**: Modular React components using shadcn/ui design system
- **Styling**: Tailwind CSS with custom SAMU brand colors (yellows, grays, browns, oranges)
- **Forms**: React Hook Form with Zod validation
- **State Management**: TanStack Query for API calls and caching
- **Mobile-First**: Responsive design optimized for mobile devices
- **Navigation**: Dual-tab system separating Meme Contest and Goods Shop functionality
- **Commerce Integration**: Shopping cart system with SAMU token-based payments

### Backend Architecture
- **API Structure**: RESTful endpoints for memes and voting
- **Database Layer**: Drizzle ORM with PostgreSQL dialect
- **File Handling**: In-memory storage with base64 encoding for images
- **Middleware**: Express middleware for logging and error handling
- **Development Setup**: Vite integration for hot reloading in development

### Database Schema
- **Memes Table**: Stores meme data (title, description, image URL, author info, vote count)
- **Votes Table**: Tracks individual votes with voting power and voter wallet addresses
- **Schema Validation**: Drizzle-Zod integration for type-safe database operations

## Data Flow

1. **User Authentication**: Real Phantom wallet integration with mainnet SAMU token detection
2. **Meme Submission**: Users upload images with metadata via form submission
3. **Voting System**: Token holders vote with power based on actual SAMU holdings only
4. **Real-time Updates**: TanStack Query manages data fetching and cache invalidation
5. **Image Storage**: Base64 encoded images stored directly in database (MVP approach)
6. **Goods Shop**: Hall of Fame memes converted to purchasable merchandise with SAMU token payments
7. **Web2 Integration**: Physical goods fulfillment pipeline for real-world merchandise delivery

## External Dependencies

### Frontend Dependencies
- **UI Framework**: React 18 with TypeScript
- **Component Library**: Radix UI primitives via shadcn/ui
- **Styling**: Tailwind CSS with PostCSS
- **Form Management**: React Hook Form with Hookform Resolvers
- **Data Fetching**: TanStack React Query
- **Routing**: Wouter (lightweight React router)

### Backend Dependencies
- **Server Framework**: Express.js with TypeScript support
- **Database**: Drizzle ORM with Neon serverless PostgreSQL
- **File Upload**: Multer for multipart form handling
- **Session Management**: Connect-pg-simple for PostgreSQL session store
- **Validation**: Zod schemas for type validation

### Development Tools
- **Build Tool**: Vite with React plugin
- **TypeScript**: Full TypeScript support across frontend and backend
- **Database Migrations**: Drizzle Kit for schema management
- **Development Server**: TSX for TypeScript execution

## Deployment Strategy

The application is configured for deployment on Replit with the following setup:

- **Environment**: Node.js 20 with PostgreSQL 16 module
- **Build Process**: Vite builds frontend to `dist/public`, esbuild bundles server
- **Production Mode**: Serves static files and API from single Express server
- **Database**: Uses Neon serverless PostgreSQL via DATABASE_URL environment variable
- **Port Configuration**: Runs on port 5000 (development) / 80 (production)

## Changelog

```
Changelog:
- June 17, 2025. Initial setup
- June 17, 2025. Added comprehensive Leaderboard with current rankings, top creators, and Hall of Fame
- June 18, 2025. Added Goods Shop feature with SAMU token-based purchasing system
- June 18, 2025. Implemented Hall of Fame meme-to-merchandise pipeline
- June 18, 2025. Updated navigation to separate Meme Contest and Goods Shop sections
- June 18, 2025. Converted all UI text to English for international accessibility
- June 18, 2025. Implemented real Phantom wallet integration with SAMU token detection (EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF)
- June 18, 2025. Simplified voting system to use SAMU tokens only (removed NFT complexity)
- June 18, 2025. Fixed server port binding issue and RPC endpoint runtime errors
- June 18, 2025. Improved error handling for Solana token balance queries
- June 18, 2025. Fixed wallet connection state synchronization issues after logout/login cycles
- June 18, 2025. Enhanced phantom wallet integration with real-time connection state tracking
- June 18, 2025. Resolved SAMU token balance display issue - now showing correct 47.7B tokens
- June 18, 2025. Completed stable wallet auto-reconnection with delayed initialization for Phantom readiness
- June 18, 2025. Added Capacitor integration for native Android/iOS app generation
- June 18, 2025. Successfully converted web application to Android app with complete project structure
- June 18, 2025. Implemented comprehensive mobile Phantom wallet integration with deeplink support
- June 18, 2025. Added Pump.fun-style mobile wallet connection flow for Capacitor-wrapped app
- June 18, 2025. Completed mobile-first wallet connection system supporting both in-app and deeplink flows
- June 18, 2025. Created downloadable Android project package (samu-android-project.tar.gz) for local APK building
- June 18, 2025. Fixed Tailwind CSS path configuration issue that temporarily broke UI styling
- June 18, 2025. Implemented complete app store deployment system with GitHub Actions auto-build
- June 18, 2025. Created comprehensive deployment guide for Google Play Store and direct APK distribution
- June 18, 2025. Configured Android build system for production-ready APK generation
- June 19, 2025. Fixed Java 17 compatibility issues in Android build configuration for stable APK generation
- June 19, 2025. Added attached_assets folder with SAMU logo images to complete project package
- June 19, 2025. Created final production-ready project bundle (samu-complete-with-assets.tar.gz) with all dependencies
- June 19, 2025. Fixed Theme.SplashScreen missing style error in Android build configuration
- June 19, 2025. Added Android colors.xml with SAMU brand colors for stable APK generation
- June 19, 2025. Fixed duplicate ic_launcher_background resource conflict in Android build system
- June 19, 2025. Upgraded Android API from 34 to 35 for androidx.core library compatibility
- June 19, 2025. Forced Java 17 compatibility across all Android modules to resolve Capacitor build conflicts
- June 19, 2025. Configured production APK to use deployed server URL (meme-chain-rally-wlckddbs12345.replit.app)
- June 19, 2025. Resolved localhost connection errors in Android APK for real device functionality
- June 19, 2025. Implemented native Phantom wallet deep-link integration for mobile APK functionality
- June 19, 2025. Added Capacitor Browser plugin and Android manifest deep-link configuration
- June 19, 2025. Fixed web-view Phantom connection issues with native app integration system
- June 19, 2025. Resolved Vite build error with @capacitor/browser dynamic import causing APK build failures
- June 19, 2025. Replaced Capacitor Browser plugin with window.open for stable native deep-link functionality
- June 19, 2025. Successfully completed buildable Android project with native Phantom wallet integration
- June 19, 2025. Implemented complete mobile phantom wallet connection with native deeplink support
- June 19, 2025. Added app foreground detection for automatic wallet connection completion
- June 19, 2025. Created final production-ready mobile APK with full Web3 functionality
- June 19, 2025. Implemented Pump.fun-style phantom wallet detection system with real-time app installation checking
- June 19, 2025. Added iframe-based phantom app detection using visibility API for mobile environments
- June 19, 2025. Created complete mobile Web3 UX matching industry-standard applications like Pump.fun
- June 19, 2025. Simplified phantom wallet detection and connection for reliable mobile APK deployment
- June 19, 2025. Created final complete project package with all components for production mobile app
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```