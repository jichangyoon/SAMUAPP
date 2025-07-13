# SAMU 모바일 앱 빌드 가이드

## 📋 필수 요구사항

### 1. 개발 환경 설정
```bash
# Node.js 20+ 설치
# Java 17 설치 (Android Studio 포함)
# Android SDK 설치
```

### 2. 프로젝트 설정
```bash
# 의존성 설치
npm install

# Ionic CLI 및 Capacitor CLI 설치
npm install -g @ionic/cli @capacitor/cli

# 웹 자산 빌드
npm run build

# Capacitor 동기화
npx cap sync android
```

### 3. Android 빌드
```bash
# Android Studio에서 열기
npx cap open android

# 또는 직접 빌드
cd android
./gradlew assembleDebug
```

### 4. 생성된 APK 위치
```
android/app/build/outputs/apk/debug/app-debug.apk
```

## 🔧 설정 정보

### 앱 정보
- **App ID**: com.samu.memecontest
- **App Name**: SAMU
- **서버 URL**: https://meme-chain-rally-wlckddbs12345.replit.app

### 주요 기능
- Privy 지갑 연동
- X(Twitter) 딥링크 지원
- 모바일 최적화 UI
- 파트너 커뮤니티 통합

## 📱 테스트 방법

1. APK 파일을 안드로이드 기기에 설치
2. "알 수 없는 소스" 허용 설정
3. 앱 실행 및 기능 테스트

## 🔗 딥링크 설정

앱에서 지원하는 딥링크:
- `samuapp://` - 앱 내부 딥링크
- `twitter://` - X 앱 연동
- `https://` - 웹 URL 폴백