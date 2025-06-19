# SAMU 모바일 앱 배포 패키지

## 📦 패키지 내용

이 압축 파일(`samu-mobile-project.tar.gz`)에는 SAMU 밈 컨테스트 모바일 앱의 완전한 소스코드와 빌드 환경이 포함되어 있습니다.

## 🚀 빠른 배포

### 자동 빌드 (권장)

**Linux/Mac:**
```bash
./build-mobile.sh
```

**Windows:**
```cmd
build-mobile.bat
```

### 수동 빌드

1. **의존성 설치**
   ```bash
   npm install
   ```

2. **웹 자산 빌드**
   ```bash
   npm run build
   ```

3. **모바일 동기화**
   ```bash
   npx cap sync android
   ```

4. **APK 생성**
   ```bash
   cd android
   ./gradlew assembleDebug
   ```

## 📱 APK 설치

1. `android/app/build/outputs/apk/debug/app-debug.apk` 파일을 안드로이드 기기로 전송
2. 안드로이드 설정에서 "알 수 없는 소스에서 앱 설치" 허용
3. APK 파일 실행하여 설치

## 🔧 요구사항

- Node.js 20.x
- Java 17
- Android SDK (선택사항)

## ✨ 앱 기능

- 팬텀 지갑 연결 및 SAMU 토큰 잔액 조회
- 밈 업로드 및 커뮤니티 투표
- 토큰 기반 상품 구매 시스템
- 실시간 리더보드 및 순위

## 🌐 서버 연결

프로덕션 서버: `https://meme-chain-rally-wlckddbs12345.replit.app`

## 📞 지원

빌드 중 문제가 발생하면 `MOBILE_BUILD_GUIDE.md` 파일의 트러블슈팅 섹션을 참고하세요.