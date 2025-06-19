# SAMU 모바일 앱 빌드 가이드

## 🚀 빠른 시작

### 1. 프로젝트 압축 해제
```bash
tar -xzf samu-mobile-project.tar.gz
cd samu-mobile-project
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 웹 빌드
```bash
npm run build
```

### 4. Capacitor 동기화
```bash
npx cap sync android
```

### 5. Android APK 빌드
```bash
cd android
./gradlew assembleDebug
```

### 6. APK 파일 위치
```
android/app/build/outputs/apk/debug/app-debug.apk
```

## 📱 설치 방법

1. `app-debug.apk` 파일을 안드로이드 기기로 전송
2. 안드로이드 설정 > 보안 > "알 수 없는 소스에서 앱 설치" 허용
3. APK 파일 실행하여 설치

## 🔧 개발 환경 요구사항

- **Node.js**: 20.x 이상
- **Java**: 17 (OpenJDK 권장)
- **Android Studio**: 최신 버전 (선택사항)
- **Gradle**: 자동 설치됨

## 📋 주요 기능

- ✅ 팬텀 지갑 연결
- ✅ SAMU 토큰 잔액 조회  
- ✅ 밈 업로드 및 투표
- ✅ 상품 구매 시스템
- ✅ 모바일 최적화 UI

## 🌐 서버 설정

현재 프로덕션 서버: `https://meme-chain-rally-wlckddbs12345.replit.app`

로컬 개발시:
```bash
npm run dev
# 다른 터미널에서
npx cap run android
```

## 🛠 트러블슈팅

### Java 버전 오류
```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
```

### Gradle 권한 오류
```bash
chmod +x android/gradlew
```

### 캐시 정리
```bash
cd android
./gradlew clean
```

## 📦 배포 준비

### 릴리스 APK 빌드
```bash
cd android
./gradlew assembleRelease
```

### APK 서명 (선택사항)
Play Store 배포시 필요한 서명 키스토어 생성 및 적용

---

**문의사항이 있으면 개발팀에 연락하세요.**