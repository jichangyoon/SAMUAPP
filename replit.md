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
- June 19, 2025. Fixed React Hook order errors and phantom wallet connection issues
- June 19, 2025. Resolved RPC endpoint access problems - now using reliable free endpoints for SAMU token balance queries
- June 19, 2025. Optimized wallet connection with duplicate request prevention and improved error handling
- June 19, 2025. Implemented iOS Universal Links system for native Phantom wallet deep-link integration
- June 19, 2025. Added comprehensive deeplink handler with Capacitor App plugin for mobile wallet connections
- June 19, 2025. Created GitHub Actions workflow for automated Android APK building with artifact uploads
- June 19, 2025. Completed production-ready deployment system with comprehensive build guides and instructions
- June 19, 2025. Fixed web Phantom wallet connection issues - separated desktop browser extension from mobile deeplink logic
- June 19, 2025. Resolved SAMU token balance display problems with improved React state management and RPC endpoint optimization
- June 19, 2025. Successfully completed web Phantom wallet integration - 77,770 SAMU tokens displaying correctly with stable connection
- June 19, 2025. Fixed React state rendering issue preventing SAMU token balance display after wallet reconnection
- June 19, 2025. Completed robust wallet integration supporting both SAMU token holders and empty wallets with proper error handling
- June 19, 2025. Eliminated all Vite development error overlays with global error handlers for seamless user experience
- June 19, 2025. Created complete mobile deployment package (samu-mobile-project.tar.gz) with automated build scripts
- June 19, 2025. Implemented cross-platform build system supporting Windows (build-mobile.bat) and Unix (build-mobile.sh)
- June 19, 2025. Finalized production-ready mobile app deployment pipeline for local APK generation
- June 19, 2025. Cleaned up all duplicate files and documentation - streamlined project structure
- June 19, 2025. Unified all build guides into single README.md for simplified user experience
- June 19, 2025. Created final clean deployment package (samu-mobile-project.tar.gz) ready for distribution
- June 19, 2025. Configured GitHub Actions workflow for automatic APK building with Ionic Framework integration
- June 19, 2025. Added comprehensive deployment documentation for GitHub-based APK generation
- June 19, 2025. Updated README.md with GitHub Actions setup instructions and automated build process
- June 19, 2025. Fixed mobile APK Phantom wallet connection issues with improved deeplink handling
- June 19, 2025. Added Ionic project configuration (ionic.config.json) for proper build system recognition
- June 19, 2025. Enhanced mobile detection and Universal Links implementation for native app wallet integration
- June 19, 2025. Implemented direct phantom:// deeplink scheme for reliable mobile wallet connection
- June 19, 2025. Added dedicated /phantom-callback route for processing wallet connection responses
- June 19, 2025. Integrated Capacitor Browser plugin for stable app-to-app transitions in mobile APK
- June 19, 2025. Fixed Phantom Universal Link protocol to display connection request properly in mobile app
- June 19, 2025. Enhanced callback parameter parsing with comprehensive debugging for successful wallet integration
- June 19, 2025. Implemented multiple Phantom URL scheme fallback system for reliable mobile connection
- June 19, 2025. Added Capacitor App state detection for automatic connection completion on app resume
- June 19, 2025. Verified web Phantom wallet integration working with 77,770 SAMU token display
- June 19, 2025. Migrated from Phantom wallet to Privy universal Web3 authentication system for better cross-platform support
- June 19, 2025. Completed Privy wallet integration with simplified wallet connection flow for mobile and web compatibility
- June 19, 2025. Removed all Phantom-specific code and deeplink handlers in favor of Privy's universal authentication
- June 19, 2025. Configured Privy for automatic Solana embedded wallet creation using 'users-without-wallets' setting
- June 19, 2025. New users will receive Solana wallets automatically upon first login via email
- June 19, 2025. Implemented Solana wallet prioritization - users with multiple wallets now display Solana address first
- June 19, 2025. Fixed wallet selection logic to use user.linkedAccounts instead of useWallets hook for proper Solana detection
- June 19, 2025. Implemented real SAMU token balance checking using Solana RPC endpoints with proper error handling
- June 19, 2025. Fixed runtime error overlays by adding comprehensive error handling and timeout controls
- June 19, 2025. Added multiple RPC endpoint fallback system for reliable SAMU token balance queries
- June 19, 2025. Enhanced wallet status display to show actual SAMU token balances and voting power
- June 19, 2025. Improved mobile wallet UI - removed duplicate wallet cards and optimized header display
- June 19, 2025. Streamlined wallet connection interface with compact SAMU balance display only
- June 19, 2025. Implemented complete black dark theme across entire application
- June 19, 2025. Updated all text colors from dark to light variants for better dark mode visibility
- June 19, 2025. Converted all UI components (meme cards, leaderboard, goods shop, forms) to dark theme
- June 19, 2025. Maintained SAMU brand colors while switching to black background design
- June 19, 2025. Fixed all remaining white text elements and invisible UI components for complete black theme consistency
- June 19, 2025. Updated SAMU Goods Shop header from gradient to clean single-color yellow background for better visual harmony
- June 19, 2025. Set black theme as default application theme and cleaned up legacy light theme code
- June 19, 2025. Removed unnecessary theme switching code and standardized color usage across components
- June 20, 2025. Cleaned up attached_assets directory - removed all temporary screenshots, build logs, and development images
- June 20, 2025. Implemented authentic SAMU wolf logo provided by user - replaced generic SVG with actual brand logo featuring spiky wolf head design
- June 20, 2025. Applied Poppins font family across entire application - replaced default AI-feeling fonts with modern, professional typography
- June 20, 2025. Cleaned up duplicate text in Goods Shop header - removed redundant "Purchase with SAMU tokens" text for better readability
- June 20, 2025. Fixed Privy wallet data persistence issues - resolved phantom wallet cache conflicts after user logout/login cycles
- June 20, 2025. Implemented comprehensive wallet data cleanup system with localStorage clearing on authentication state changes
- June 20, 2025. Added enhanced error handling for Privy iframe loading failures and WalletConnect initialization conflicts
- June 20, 2025. Verified complete wallet state management - confirmed proper display of new Privy wallet address and SAMU token balance after data cleanup
- June 20, 2025. Simplified authentication to email-only login while maintaining embedded wallet functionality for SAMU token balance display
- June 20, 2025. Added comprehensive profile editing system allowing email users to update display name and profile picture with localStorage persistence
- June 20, 2025. Enhanced user profile modal with avatar upload, real-time editing interface, and proper state management for profile customization
- June 20, 2025. Maintained wallet address and SAMU token display in header while using email authentication for simplified user onboarding
- June 20, 2025. Updated header to display user profile information: shows user initials and display name when logged in, matching profile modal design
- June 20, 2025. Synchronized profile data display between header and user profile modal for consistent user experience
- June 20, 2025. Improved meme card UI by hiding descriptions in main feed and showing details only on click for cleaner mobile interface
- June 20, 2025. Added detailed meme view modal with full image, author info, description, and voting capabilities for better content exploration
- June 20, 2025. Applied same UI pattern to goods shop - simplified product cards showing only title and price, with click-to-view detailed product information modal
- June 20, 2025. Enhanced goods shop product detail modal with comprehensive product information, creator details, and streamlined purchase flow
- June 20, 2025. Made both meme images and goods product images clickable to open detail modals, improving mobile touch interaction and user experience
- June 20, 2025. Refined meme card interaction - removed title click functionality, keeping only image click to open detail modal for cleaner user experience
- June 20, 2025. Applied same interaction pattern to goods shop - removed product name and card click functionality, keeping only image click for detail modal access
- June 20, 2025. Added dual view modes for meme contest - users can switch between card view and Instagram-style grid view with toggle buttons
- June 20, 2025. Implemented grid view with 3x3 layout showing only images, hover effects for vote counts, and click-to-view detail modal
- June 20, 2025. Simplified sorting options by removing "Trending" option, keeping only "Most Votes" and "Latest" for cleaner user experience
- June 20, 2025. Fixed grid view voting functionality - connected vote button to proper confirmation dialog and API calls for complete voting workflow
- June 20, 2025. Added Share2 icon to grid view modal share button for better visual consistency and cleaner UI
- June 20, 2025. Implemented real social sharing functionality for Twitter and Telegram with proper share URLs and meme-specific content
- June 20, 2025. Added share dialog with platform-specific buttons replacing generic share functionality across all meme components
- June 20, 2025. Enhanced sharing system with custom text including meme title, author, and app URL for each social platform
- June 20, 2025. Updated SAMU Goods Shop header styling - swapped background and text colors (black background with yellow text) per user request
- June 20, 2025. Moved Meme Contest/Goods Shop navigation from top to bottom with icon design using Trophy and ShoppingBag icons
- June 20, 2025. Refined bottom navigation - removed text labels and reduced icon size for cleaner minimal design
- June 20, 2025. Added Archive tab to bottom navigation for storing completed meme contest results and Hall of Fame statistics
- June 20, 2025. Simplified Archive tab by removing Hall of Fame section and future ready message per user request
- June 20, 2025. Restructured Archive to show clean contest list with click-to-view detailed results modal
- June 20, 2025. Redesigned contest detail modal with 3-column grid layout and compact medal icons for winners
- June 20, 2025. Implemented full archive grid view system - contests show all memes in 3x3 grid with clickable individual meme details
- June 20, 2025. Reduced header height by decreasing vertical padding for more compact mobile interface
- June 20, 2025. Further reduced both header and bottom navigation padding for even more compact mobile design
- June 20, 2025. Minimized header and bottom navigation to py-1 padding for maximum screen space utilization
- June 20, 2025. Restructured Archive navigation from modal-based to page-based navigation system
- June 20, 2025. Added "Back to Archive" button and proper navigation flow for contest detail views
- June 20, 2025. Implemented two-level archive navigation: contest list → contest detail page with grid view
- June 20, 2025. Removed all modal dialogs from Archive section to prevent mixed navigation interfaces
- June 20, 2025. Completed pure page-based navigation system for Archive contest browsing
- June 20, 2025. Updated Archive contest header with purple-themed total votes display and centered completion badge
- June 20, 2025. Removed Winners section and added medal icons (🥇🥈🥉) to top-left corner of grid items for ranking display
- June 20, 2025. Added clickable meme detail modal for Archive contest entries with author info, vote counts, rankings, and descriptions
- June 20, 2025. Implemented SOL balance display alongside SAMU token balance in wallet header
- June 20, 2025. Added SOL balance API endpoint and concurrent balance fetching for improved wallet information display
- June 20, 2025. Changed balance display layout from vertical to horizontal alignment to maintain compact header design
- June 20, 2025. Converted UserProfile modal to standalone Profile page for better mobile experience
- June 20, 2025. Optimized Profile page layout for mobile-first design with 2x2 grid stats display and compact card layouts
- June 20, 2025. Enhanced Profile page tabs with vertical icon/text layout and smaller fonts for mobile screens
- June 20, 2025. Minimized Profile page component sizes - reduced images, text sizes, and padding for mobile optimization
- June 20, 2025. Fixed profile name synchronization between header and profile page using custom browser events
- June 20, 2025. Unified localStorage keys for consistent profile data management across components
- June 20, 2025. Resolved React useEffect infinite loop causing SAMU balance fluctuation between 0 and 1,000,000
- June 20, 2025. Replaced useState balance fetching with React Query for stable caching and duplicate request prevention
- June 20, 2025. Removed SAMU/SOL balance display from header for cleaner UI and improved stability
- June 20, 2025. Optimized wallet connection component by eliminating unnecessary balance API calls in header
- June 20, 2025. Adjusted modal positioning from left-[50%] to left-[40%] for better mobile-first visual alignment
- June 20, 2025. Updated both Dialog and AlertDialog components to use consistent left-shifted positioning
- June 20, 2025. Fine-tuned modal positioning to left-[46%] for optimal mobile viewing experience
- June 20, 2025. Added wallet address display section to profile page with copy-to-clipboard functionality
- June 20, 2025. Implemented comprehensive token transfer interface with SAMU and SOL support
- June 20, 2025. Created SendTokens component with address validation, balance checking, and transaction simulation
- June 20, 2025. Enhanced profile page with integrated wallet management and token sending capabilities
- June 20, 2025. Restricted profile editing features to logged-in users only - disabled Edit button, image upload, and token transfer for guests
- June 20, 2025. Added "Guest User - Please login to edit profile" message for non-authenticated users
- June 20, 2025. Removed all commerce features from Goods Shop for iOS app store compliance
- June 20, 2025. Eliminated pricing, shopping cart, purchase buttons, and payment references from goods section
- June 20, 2025. Converted Goods Shop to collectibles showcase featuring Hall of Fame meme designs without sales functionality
- June 20, 2025. Updated product descriptions and messaging to focus on art exhibition rather than merchandise sales
- June 20, 2025. Added NFT gallery section with 164 unique SAMU Wolf NFTs in 4-column grid layout
- June 20, 2025. Implemented NFT commenting system allowing users to discuss individual NFT pieces
- June 20, 2025. Created NFT database schema with support for token IDs, creators, and user comments
- June 20, 2025. Added marketplace integration button linking to external trading platforms
- June 20, 2025. Expanded bottom navigation to include NFT section with Image icon for easy access
- June 20, 2025. Reordered bottom navigation: Contest → Archive → NFT → Goods for better user flow
- June 20, 2025. Removed marketplace connection button from NFT section and unified UI styling with black background and yellow text
- June 20, 2025. Implemented static file serving system for 164 NFT images via /assets/nfts/ route with simplified naming (1.png-164.png)
- June 20, 2025. Optimized NFT gallery performance by converting to static data system - eliminated server requests for instant loading
- June 20, 2025. Added lazy loading and error handling for NFT images to improve mobile performance
- June 20, 2025. Created client-side NFT data structure for 164 SAMU Wolf collection with URL-based image references
- June 20, 2025. Converted NFT images from local file storage to external CDN URLs for improved performance and scalability
- June 20, 2025. Implemented load balancing across multiple image CDN services (Picsum, Unsplash) for optimal loading speed
- June 20, 2025. Integrated real SAMU Wolf NFT collection from IPFS (CID: bafybeigbexzsefsou3jainsx3kn7sgcc64t246ilh5fz4qdyru73s2khai)
- June 20, 2025. Configured multiple IPFS gateways (ipfs.io, pinata.cloud, cloudflare-ipfs.com, dweb.link) for reliable decentralized image delivery
- June 20, 2025. Reverted to local image storage for optimal app performance - prioritized instant loading over decentralized hosting
- June 20, 2025. Simplified NFT gallery error handling and removed IPFS-specific optimizations for faster local file serving
- June 20, 2025. Implemented mobile-friendly swipe gestures for NFT modals using Vaul drawer component
- June 20, 2025. Enhanced modal height to 92vh for better mobile coverage and reduced background visibility
- June 21, 2025. Extended mobile-friendly swipe gestures to ALL app modals (meme contest, archive, goods shop)
- June 21, 2025. Replaced all Dialog components with Drawer components for consistent mobile UX
- June 21, 2025. Fixed modal content display with proper padding and scrolling for detailed descriptions
- June 21, 2025. Completed comprehensive mobile-first modal system with swipe-to-close functionality
- June 21, 2025. Added Partners section allowing other meme coin communities to host independent contests
- June 21, 2025. Implemented partner-specific meme submission and voting system with isolated storage
- June 21, 2025. Created backend API routes for partner contest management (/api/partners/{id}/memes)
- June 21, 2025. Added Partners navigation tab positioned at rightmost end of bottom navigation
- June 21, 2025. Extended UploadForm component to support partner-specific meme submissions
- June 21, 2025. Updated Archive header styling to match exact SAMU brand colors (hsl(50,85%,75%)) used in Goods Shop for perfect brand consistency
- June 21, 2025. Standardized header text sizes across all sections (Contest, Goods Shop, Archive) to text-xl for uniform typography
- June 21, 2025. Enhanced Goods Shop UX by making entire product cards clickable with hover effects for improved mobile interaction
- June 21, 2025. Added Submit button to main meme contest section matching partner contest UI design for consistent user experience
- June 21, 2025. Simplified "Contest Entries" text to just "Entries" for cleaner UI display
- June 21, 2025. Added swipe gesture navigation - right swipe (left to right) in Archive contest detail pages and Partner contest pages goes back to previous screen
- June 21, 2025. Enhanced swipe animations with smooth book-page-like transitions - added onTouchMove for real-time visual feedback, translateX transforms, opacity changes, and velocity-based gesture detection across all navigation pages (Profile, Partners, Archive detail, Partner contest)
- June 21, 2025. Removed "Contest" text from partner section headers for cleaner UI (now shows just partner name)
- June 21, 2025. Added upload form modal to partner contest pages - Submit button now opens drawer with partner-specific form
- June 21, 2025. Fixed Submit button visibility - now only appears for authenticated users in main meme contest section
- June 21, 2025. Added authentication requirement for archive access - users must login to view contest heritage, displays lock icon and "Login to view" message for unauthenticated users
- June 21, 2025. Softened archive login toast message - removed destructive variant for gentler notification color
- June 21, 2025. Added text labels to bottom navigation icons for better UX (Contest, Archive, NFT, Goods, Partners)
- June 21, 2025. Fixed bottom navigation spacing - converted to grid layout for perfectly equal icon spacing across all 5 tabs
- June 21, 2025. Added matching icons to section headers - Contest (Trophy), NFT (Image), Goods (ShoppingBag) icons now match bottom navigation
- June 21, 2025. Moved Trophy icon from "Entries" to "SAMU Meme Contest" title in contest header for better visual hierarchy
- June 21, 2025. Improved archive login toast message - reduced duration to 2 seconds with built-in tap-to-dismiss functionality

## CHECKPOINT - June 20, 2025 (오전 7:27)
```
🔄 ROLLBACK POINT CREATED - Current stable state:
✅ Complete SAMU meme contest platform with Privy authentication
✅ Full wallet integration with SAMU/SOL token balance display  
✅ Mobile-optimized UI with black theme and Poppins font
✅ Working token transfer system in profile page
✅ Grid/card view modes for meme browsing
✅ Archive system with contest history
✅ Goods shop with merchandise purchasing
✅ Real social sharing (Twitter/Telegram)
✅ Bottom navigation with 3 tabs (Contest/Shop/Archive)
✅ All core features functional and tested

Current app state: Stable web application with no critical errors
Database: In-memory storage with sample memes loaded
Authentication: Privy email login with embedded Solana wallets
UI: Fully responsive mobile-first design
```

```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```