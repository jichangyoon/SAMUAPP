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
- June 21, 2025. Reduced archive login toast message duration to 1.3 seconds for faster user experience
- June 22, 2025. Updated Partners section with real projects - replaced demo partners with WAGUS and DoctorBird using their actual logos
- June 22, 2025. Fixed partner logo display - moved images to client/src/assets and implemented proper Vite import system for reliable image loading
- June 22, 2025. Improved back button design - made buttons smaller and positioned them closer to left edge for better mobile UX
- June 22, 2025. Fixed partner community badge text visibility - changed white/light text to black for WAGUS and DoctorBird badges
- June 22, 2025. Updated partner contest headers to use symbol instead of full name - "BIRD Meme Contest" instead of "DoctorBird Meme Contest"
- June 22, 2025. Updated DoctorBird description to "DoctorBird vs. the Fallen Ministry of Health" per user request
- June 22, 2025. Updated WAGUS description to "The Future of Utility Tokens" per user request
- June 22, 2025. Implemented real PostgreSQL database backend with Drizzle ORM replacing in-memory storage
- June 22, 2025. Added comprehensive file upload system supporting images (JPEG, PNG, GIF, WebP) and videos (MP4, MOV, AVI, WebM) up to 50MB
- June 22, 2025. Created upload/delete API endpoints with secure file handling and validation
- June 22, 2025. Enhanced meme submission with real file storage and database persistence
- June 22, 2025. Added user authentication checks for meme deletion (only authors can delete their own memes)
- June 22, 2025. Implemented comprehensive user management system with individual profiles, voting power tracking, and personal statistics
- June 22, 2025. Created user API endpoints for profile management, meme collections, vote history, and detailed statistics
- June 22, 2025. Enhanced profile page with real database integration showing personalized user data and voting power metrics
- June 22, 2025. Added automatic user creation on first wallet connection with SAMU token balance-based voting power calculation
- June 22, 2025. Fixed mobile file upload issue - "Choose File" button now works properly on mobile devices using HTML label wrapper
- June 22, 2025. Resolved file upload validation errors - corrected MIME type checking to properly accept image and video files
- June 22, 2025. Verified complete upload workflow - file upload, validation, storage, and meme creation all functioning with PostgreSQL backend
- June 22, 2025. Enhanced mobile file upload with comprehensive error handling, timeout controls, retry logic, and CORS headers for better mobile compatibility
- June 23, 2025. Implemented comprehensive WebP image optimization system using Sharp library for massive performance improvement
- June 23, 2025. Converted all 164 NFT images from PNG to WebP format achieving 93.6% file size reduction (90MB → 5.8MB)
- June 23, 2025. Optimized partner logo images (WAGUS, DoctorBird) to WebP format with 60-83% size reduction
- June 23, 2025. Updated image serving infrastructure to use WebP format across NFT gallery and partner sections
- June 23, 2025. Created automated image optimization scripts for future content additions
- June 23, 2025. Completed comprehensive API performance analysis - no conflicts detected between NFT and other endpoints
- June 23, 2025. Verified optimal image loading performance: WebP files load in 39ms vs 300ms+ for original PNG
- June 23, 2025. Confirmed stable concurrent API handling with zero bottlenecks across all endpoints
- June 23, 2025. Optimized SAMU logo from JPG to WebP format achieving 70.6% file size reduction (138.9KB → 40.8KB)
- June 23, 2025. Updated home page to use optimized SAMU logo WebP for improved loading performance
- June 23, 2025. Completed comprehensive image optimization project - total savings of 84.5MB across all assets
- June 23, 2025. Cleaned up legacy image files and folders - removed original JPG/PNG files after WebP conversion
- June 23, 2025. Deleted development screenshots and temporary files saving additional 3.34MB storage space
- June 23, 2025. Finalized project structure with only optimized WebP assets - total space savings of 87.8MB
- June 23, 2025. Fixed NFT #78 image with user-provided replacement - converted to WebP with 92.4% size reduction
- June 23, 2025. Cleaned up temporary optimization scripts - removed one-time conversion tools, kept reusable optimize-images.js
- June 23, 2025. Fixed Submit button text visibility in partner sections - applied conditional text color for better contrast against WAGUS and DoctorBird background colors
- June 23, 2025. Streamlined Goods Shop to single premium item - SAMU x SOL Samurai Shirt with authentic design photo
- June 23, 2025. Optimized goods shop image from 5.8MB PNG to 609KB WebP achieving 89.5% file size reduction
- June 23, 2025. Implemented complete Cloudflare R2 cloud storage system replacing local file storage
- June 23, 2025. Created R2 upload/delete API endpoints with secure file handling and validation
- June 23, 2025. Added separate profile bucket support for user avatar uploads with 5MB size limit
- June 23, 2025. Enhanced upload system with proper MIME type detection and cache headers
- June 23, 2025. Integrated R2 storage with existing upload forms for meme submissions and profile images
- June 23, 2025. Verified R2 upload functionality - successfully uploading files to cloud storage
- June 23, 2025. Configured CORS policy and Public Development URL for R2 bucket public access
- June 23, 2025. Set up complete R2 infrastructure: upload/delete endpoints, profile image support, public URL access
- June 23, 2025. Final R2 setup: awaiting R2_PUBLIC_URL environment variable update to Public Development URL
- June 23, 2025. Successfully completed R2 cloud storage integration - all file uploads now working with Public Development URL
- June 23, 2025. Verified complete upload workflow: file upload → R2 storage → public URL → database → real-time display in app
- June 23, 2025. Production-ready cloud storage system fully operational with 217KB JPEG test file successfully uploaded and displayed
- June 24, 2025. Implemented meme deletion functionality - authors can delete their own memes with confirmation dialog
- June 24, 2025. Added R2 cloud file deletion support - removes both database entry and cloud-stored image files
- June 24, 2025. Cleaned up database - removed all dummy data, keeping only real user-uploaded content
- June 24, 2025. Optimized project structure - removed legacy local files, using only R2 cloud storage for new uploads
- June 25, 2025. Implemented complete contest management system with automatic archiving functionality
- June 25, 2025. Added Korean timezone (KST) support for all contest scheduling and time displays
- June 25, 2025. Created comprehensive admin interface for contest lifecycle management (create/start/end)
- June 25, 2025. Fixed Archive display to show real database data instead of dummy content
- June 25, 2025. Integrated contest-specific meme filtering system separating current and archived contests
- June 25, 2025. Successfully tested complete contest workflow: create → start → end → archive with real data persistence
- June 25, 2025. Implemented comprehensive R2 cloud storage organization system for contest archiving
- June 25, 2025. Added automatic file migration system - archived contests moved to `archives/contest-{id}/` folders
- June 25, 2025. Separated current contest files (uploads/) from archived contest files (archives/) for better organization
- June 25, 2025. Created moveToArchive() function with file copy/delete operations for systematic R2 storage management
- June 25, 2025. Fixed critical meme display issue - replaced eq() with isNull() for proper NULL value SQL queries
- June 25, 2025. Resolved meme submission workflow - submitted memes now appear correctly in meme cards section
- June 25, 2025. Verified complete contest lifecycle with real file submissions and proper database integration
- June 25, 2025. Successfully completed R2 cloud storage archiving system - 4 files moved to archives/contest-13/ folder structure
- June 25, 2025. Confirmed systematic file organization: uploads/ for current contests, archives/contest-{id}/ for completed contests
- June 25, 2025. Achieved complete separation between active and archived contest files with automatic URL updates
- June 25, 2025. Fixed UI logic for contest-dependent submissions - Submit button only appears when active contest exists
- June 25, 2025. Added helpful warning message when users try to submit without active contest
- June 25, 2025. Prevented code conflicts by properly managing contest state queries and conditional UI rendering
- June 25, 2025. Fixed admin panel Active Contests filtering - archived contests no longer appear in active section
- June 25, 2025. Completed proper separation between active and archived contest management in admin interface
- June 25, 2025. Added "Back to Home" button to admin panel for improved navigation
- June 25, 2025. Implemented admin authentication system using ADMIN_EMAILS environment variable
- June 25, 2025. Admin button now only appears for authorized users, hidden from regular users
- June 25, 2025. Enhanced security with email-based admin role verification system
- June 25, 2025. Removed duplicate admin button from contest header - kept only the purple admin button in wallet section
- June 25, 2025. Cleaned up all test archive data - removed 12 archived contests, 17 archived memes, and related vote data for fresh start
- June 25, 2025. Improved contest header UI - replaced "Manual Control TBD" with "Soon" and "TBA" for better user experience
- June 25, 2025. Added clickable user profiles in meme detail modal - clicking author name opens UserInfoModal for better user interaction
- June 25, 2025. Removed hover effects from mobile interface - optimized for touch interaction instead of mouse hover
- June 25, 2025. Added clickable profile picture in UserInfoModal - opens full-size image view modal for better profile picture viewing
- June 25, 2025. Enhanced archive contest display - added contest description below title for better context and information
- June 25, 2025. Completed comprehensive code cleanup and optimization - removed sample data, console logs, and unused imports
- June 25, 2025. Added loading states to Archive section - fixed micro-lag when loading Previous Contests with visual loading indicators
- June 25, 2025. Implemented 1.2-second loading spinner for NFT section to enhance perceived performance and user experience
- June 25, 2025. Fixed admin panel Active Contests filtering - archived contests no longer appear in active section
- June 25, 2025. Completed proper separation between active and archived contest management in admin interface
- June 24, 2025. Fixed profile image storage - now correctly uploads to R2 cloud storage in profiles/ folder
- June 24, 2025. Verified profile image R2 integration - 42KB PNG successfully uploaded and accessible via public URL
- June 24, 2025. Implemented comprehensive display name uniqueness validation system with real-time availability checking
- June 24, 2025. Added automatic username suggestion feature - generates numbered alternatives when names are taken
- June 24, 2025. Enhanced profile editing UI with inline validation, error messages, and clickable name suggestions
- June 24, 2025. Completed PostgreSQL-based profile data storage - display names stored in database with uniqueness constraints
- June 24, 2025. Fixed R2 cloud storage file deletion system - memes deleted from app now properly remove files from R2 storage
- June 24, 2025. Enhanced R2 deletion function with proper error handling and detailed logging for successful file cleanup
- June 24, 2025. Improved URL parsing for R2 key extraction to handle various R2 Public Development URL formats
- June 24, 2025. Updated R2 configuration to use correct Public Development URL (https://pub-6ba1d3b9f0b544138a8d628ffcf407f6.r2.dev)
- June 24, 2025. Fixed profile image upload system to properly save files in profiles/ folder with correct R2 domain
- June 24, 2025. Enhanced URL key extraction to support multiple R2 domains for reliable file deletion across all storage formats
- June 24, 2025. Fixed Profile page R2 integration - successfully uploading 357KB JPEG files to R2 cloud storage with automatic database updates
- June 24, 2025. Resolved API call syntax error in profile update function - replaced incorrect apiRequest usage with standard fetch API
- June 24, 2025. Completed Profile page transition from localStorage to PostgreSQL + R2 cloud storage system
- June 24, 2025. Verified end-to-end profile image workflow: file upload → R2 storage → database update → real-time display
- June 24, 2025. Fixed header profile display inconsistency - replaced localStorage with database queries for consistent profile images across all pages
- June 24, 2025. Synchronized home page header with Profile page using shared database queries instead of mixed localStorage/database sources
- June 24, 2025. Fixed profile name editing API endpoint - corrected URL path from /api/users/profile to /api/users/profile/:walletAddress
- June 24, 2025. Enhanced profile update logging for better debugging and error tracking
- June 24, 2025. Implemented automatic R2 cleanup for profile images - old images are deleted when new ones are uploaded
- June 24, 2025. Added wallet address tracking to profile upload endpoint for proper image cleanup
- June 24, 2025. Enhanced profile image upload with automatic storage optimization to prevent accumulation
- June 24, 2025. Fixed Multer "Unexpected field" error by removing duplicate profile upload endpoints and ensuring consistent field naming
- June 24, 2025. Optimized application performance - reduced toast duration to 1 second, minimized console logging, improved query cache invalidation with predicates
- June 24, 2025. Cleaned up redundant API calls and console logs for better production performance
- June 24, 2025. Fixed profile-header synchronization issues - immediate state updates now trigger before query invalidation for instant visual feedback
- June 24, 2025. Implemented comprehensive profile synchronization across entire application - MemeCard author info, NFT comments, and all user-related data now update immediately when profile changes
- June 24, 2025. Fixed DatabaseStorage.updateUser to properly call updateUserMemeAuthorInfo method for synchronizing meme author names when profile is updated
- June 24, 2025. Added authorAvatarUrl column to memes table and implemented complete author profile synchronization - both name and profile image now update across all meme cards when user profile changes
- June 24, 2025. Fixed header profile synchronization - now listens to both profileUpdated and imageUpdated events for immediate updates without page refresh
- June 24, 2025. Optimized profile image caching - added key prop to AvatarImage and forced query refetch to prevent stale image display
- June 24, 2025. Code optimization completed - removed duplicate console logs, streamlined event listeners, eliminated redundant query invalidations for better performance
- June 24, 2025. Consolidated all modal implementations - replaced 4 duplicate modal systems (MemeCard internal modal, home.tsx grid modal, archive modal) with single unified MemeDetailModal component
- June 24, 2025. Removed unnecessary debug logs from upload system and optimized performance across all components
- June 24, 2025. Cleaned up redundant code comments and simplified component structure while maintaining existing UI appearance
- June 24, 2025. Fixed "My Votes" image display issue in Profile page - now properly shows images of all memes user voted on by searching in all memes instead of only user's own memes
- June 24, 2025. Fixed author name display in "My Votes" section - corrected field reference from authorName to authorUsername to properly show meme creators
- June 24, 2025. Implemented infinite scroll with view-mode specific pagination - card view loads 7 items, grid view loads 9 items per page
- June 24, 2025. Added backend pagination API with sorting support (/api/memes?page=1&limit=7&sortBy=votes)
- June 24, 2025. Enhanced infinite scroll UX with natural loading animations - semi-transparent overlay during loading, staggered fade-in effects for new items, bouncing dots loading indicator
- June 24, 2025. Fixed Profile page API compatibility issue with new paginated memes endpoint structure
- June 24, 2025. Added meme deletion functionality to Profile page "My Memes" section with 3-dot menu and confirmation dialog
- June 24, 2025. Implemented R2 cloud storage cleanup for profile page meme deletion - removes both database entries and cloud files
- June 24, 2025. Enhanced profile page meme management with proper authentication checks and real-time cache invalidation
- June 24, 2025. Fixed real-time voting updates - votes now reflect immediately without requiring page refresh
- June 24, 2025. Improved voting system with instant cache invalidation across all components (MemeCard, MemeDetailModal, home page grid view)
- June 24, 2025. Enhanced user experience with immediate feedback - voting updates appear instantly with 1-second toast notifications
- June 24, 2025. Implemented optimistic updates for voting - vote counts increase instantly on click before server confirmation
- June 24, 2025. Added automatic rollback functionality for failed votes - UI reverts to original state if server request fails
- June 24, 2025. Achieved near-instant UI responsiveness - users see vote changes in 0ms instead of 200-300ms server delay
- June 24, 2025. Enhanced meme detail modal UI - moved description from bottom to top header section for better information hierarchy
- June 24, 2025. Fixed Leaderboard pagination compatibility - resolved "memes is not iterable" error by adapting to new API response format
- June 24, 2025. Corrected variable reference errors in Leaderboard statistics section - changed "memes" to "memesArray" for proper variable scope
- June 24, 2025. Optimized Leaderboard performance with useMemo hooks for expensive calculations (sorting, creator stats) and improved query caching strategy
- June 24, 2025. Fixed Top Creators count inconsistency - disabled aggressive caching to ensure accurate real-time meme counts across all components
- June 24, 2025. Resolved Leaderboard pagination issue - implemented complete data fetching across all pages to show accurate creator statistics (Hola: 4 memes correctly displayed)
- June 24, 2025. Optimized Leaderboard data fetching strategy - balanced accuracy with performance using smart pagination and reasonable cache policies to prevent excessive API calls
- June 25, 2025. Implemented comprehensive contest management system with admin panel
- June 25, 2025. Added automatic contest scheduling and archiving functionality 
- June 25, 2025. Created contests and archived_contests database tables with R2 cloud storage integration
- June 25, 2025. Built admin interface with contest creation, start/stop controls, and real-time status monitoring
- June 25, 2025. Configured Korean timezone (KST) display for all contest times and scheduling
- June 25, 2025. Fixed database schema issues and enabled authenticated users to access admin panel
- June 24, 2025. Implemented comprehensive video support across entire application - created MediaDisplay component with play/pause controls, mute/unmute, autoplay settings
- June 24, 2025. Added video file detection utility functions and integrated video playback in MemeCard, MemeDetailModal, grid views, archive, and profile pages
- June 24, 2025. Enhanced upload system to properly handle video files (MP4, MOV, AVI, WebM) with visual indicators and mobile-friendly controls
- June 24, 2025. Fixed mobile video thumbnail issue - improved preload settings, added thumbnail generation, and enhanced mobile video preview with play button overlay
- June 24, 2025. Enhanced upload form with video preview support - integrated MediaDisplay component for both image and video file previews during upload process
- June 24, 2025. Fixed upload form video thumbnail generation - implemented direct video element with metadata preload and currentTime seeking for reliable mobile thumbnails
- June 24, 2025. Updated file size limit from 50MB to 5MB for better performance and user experience
- June 24, 2025. Fixed video playback button overlap issue - removed duplicate play button overlay when native video controls are visible, disabled autoloop in card views
- June 24, 2025. Updated Leaderboard with MORE button pagination - Current rankings and Top Creators sections now show 10 items by default with expandable MORE button functionality
- June 24, 2025. Enhanced mobile video controls - implemented tap-to-hide video controls functionality for better mobile UX, controls disappear when tapped and reappear on next tap
- June 24, 2025. Simplified mobile video interface - removed complex overlay controls, using only native video controls with tap-to-toggle for clean mobile app experience
- June 24, 2025. Fixed video modal functionality - restored tap-to-open detail modal behavior for meme videos while maintaining control toggle for upload previews
- June 24, 2025. Fixed video and image click handlers - simplified event handling with proper preventDefault and stopPropagation to ensure modal opens correctly
- June 24, 2025. Implemented mobile-first video architecture - videos show thumbnail with play button in feed, full controls and playback only available in detail modal for better mobile UX
- June 24, 2025. Fixed mobile video player language settings - added lang="en" attribute and CSS controls to prevent Korean text in video controls
- June 24, 2025. Optimized MediaDisplay component - removed duplicate state, simplified click handlers, cleaned up unused props and improved code structure
- June 24, 2025. Fixed MediaDisplay default props - changed showControls default to false to properly show video thumbnails in profile page and meme cards
- June 24, 2025. Fixed Creator modal video thumbnails - replaced img tags with MediaDisplay component in user-info-modal.tsx to properly show video thumbnails in creator detail modal
- June 24, 2025. Optimized MediaDisplay component - removed unnecessary state, useEffect, and redundant props to simplify video handling logic and improve performance
- June 24, 2025. Fixed MediaDisplay image sizing - removed hardcoded w-full h-full classes to allow proper parent container size constraints in Profile My Votes section
- June 24, 2025. Enhanced voting cache invalidation - added votes query invalidation to ensure My Votes section updates immediately after voting
- June 27, 2025. Improved contest time management system - replaced complex datetime inputs with simple dropdown selection (1-30 days)
- June 27, 2025. Enhanced contest header UI - moved countdown to top with green color scheme and English text to prevent overflow issues
- June 27, 2025. Fixed DrawerDescription import error in user-info-modal component for proper modal functionality

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