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

1. **User Authentication**: Mock Phantom wallet integration (development mode)
2. **Meme Submission**: Users upload images with metadata via form submission
3. **Voting System**: Token holders vote with power based on SAMU holdings + NFT multipliers
4. **Real-time Updates**: TanStack Query manages data fetching and cache invalidation
5. **Image Storage**: Base64 encoded images stored directly in database (MVP approach)

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
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```