# SAMU Meme Contest App

Web3 밈 컨테스트 플랫폼 - Solana 블록체인과 팬텀 지갑 연동

## 기능

- 팬텀 지갑 연결 및 SAMU 토큰 잔액 조회
- 밈 업로드 및 토큰 기반 투표
- 상품 구매 시스템 (Hall of Fame)
- 모바일 앱 지원 (Android/iOS)

## 모바일 앱 빌드

### 빠른 빌드
```bash
# Linux/Mac
./build-mobile.sh

# Windows  
build-mobile.bat
```

### 수동 빌드
```bash
npm install
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

### APK 설치
1. `android/app/build/outputs/apk/debug/app-debug.apk` 파일을 안드로이드 기기로 전송
2. 안드로이드 설정에서 "알 수 없는 소스에서 앱 설치" 허용
3. APK 파일 실행하여 설치

## 요구사항
- Node.js 20.x
- Java 17
- Android SDK (선택사항)

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