# SAMU Meme Contest App

A Web3 meme contest platform built with Solana blockchain integration, featuring token-weighted voting and merchandise rewards.

## Features

- **Solana Integration**: Real Phantom wallet connection with SAMU token detection
- **Mobile-First Design**: Responsive UI optimized for mobile devices
- **Token-Weighted Voting**: Vote power based on SAMU token holdings
- **Goods Shop**: Hall of Fame memes converted to purchasable merchandise
- **Native Mobile App**: Capacitor-wrapped Android app with deep linking

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Mobile**: Capacitor for native Android/iOS
- **Blockchain**: Solana Web3.js, Phantom Wallet
- **Build**: Vite, GitHub Actions

## Quick Start

### Web Development
```bash
npm install
npm run dev
```

### Mobile App Build
```bash
# Sync web assets to mobile
npx cap sync android

# Open in Android Studio
npx cap open android

# Or build APK directly
cd android && ./gradlew assembleDebug
```

## Deployment

### Automatic APK Build
GitHub Actions automatically builds APK files on every push to main branch.

1. Push code to GitHub
2. Check Actions tab for build progress
3. Download APK from build artifacts
4. Install on Android device

### Google Play Store
See `DEPLOYMENT.md` for complete app store deployment guide.

## Project Structure

```
├── client/          # React frontend
├── server/          # Express.js backend  
├── shared/          # Shared types and schemas
├── android/         # Capacitor Android project
├── .github/         # GitHub Actions workflows
└── DEPLOYMENT.md    # Complete deployment guide
```

## SAMU Token Integration

- **Contract**: `EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF`
- **Network**: Solana Mainnet
- **Voting Power**: 1 SAMU = 1 Vote
- **Wallet**: Phantom integration with mobile deep linking

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

MIT License - see LICENSE file for details