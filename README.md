# 🐺 SAMU 밈 콘테스트 모바일 앱

SAMU 토큰 기반 밈 콘테스트 플랫폼의 모바일 앱 버전입니다.

## 🚀 주요 기능

- **밈 콘테스트**: 밈 업로드, 투표, 리더보드
- **SAMU 토큰 연동**: Privy 지갑을 통한 토큰 밸런스 조회
- **파트너 통합**: WAGUS, DoctorBird 커뮤니티 연동
- **X(Twitter) 딥링크**: 모바일 앱에서 X 앱 연동
- **NFT 갤러리**: 164개 SAMU Wolf NFT 컬렉션
- **토큰 전송**: SAMU/SOL 토큰 전송 기능

## 📱 모바일 앱 빌드

### 자동 빌드 (GitHub Actions)
푸시할 때마다 자동으로 APK가 빌드되어 Actions 탭에서 다운로드할 수 있습니다.

### 로컬 빌드
```bash
# 1. 의존성 설치
npm install

# 2. 웹 자산 빌드
npm run build

# 3. Capacitor 동기화
npx cap sync android

# 4. Android Studio에서 열기
npx cap open android

# 또는 직접 빌드
cd android
./gradlew assembleDebug
```

## 🔧 기술 스택

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Express.js + PostgreSQL + Drizzle ORM
- **Mobile**: Capacitor 7.3.0 + Android SDK 35
- **Authentication**: Privy 지갑 통합
- **Storage**: Cloudflare R2 클라우드 스토리지
- **Blockchain**: Solana 토큰 통합

## 📋 앱 설정

- **App ID**: com.samu.memecontest
- **App Name**: SAMU
- **Target SDK**: 35
- **Min SDK**: 24
- **Java Version**: 17

## 🔗 링크

- **웹 앱**: https://meme-chain-rally-wlckddbs12345.replit.app
- **SAMU 토큰**: EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF

## 📄 라이선스

MIT License