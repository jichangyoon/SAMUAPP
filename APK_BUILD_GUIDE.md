# SAMU Android APK 빌드 가이드

## 자동 빌드 (GitHub Actions)

### 1. 코드 푸시
```bash
git add .
git commit -m "Android APK 빌드 설정 완료"
git push origin main
```

### 2. APK 다운로드
1. GitHub 저장소 → Actions 탭으로 이동
2. "Build Android APK" 워크플로우 확인
3. 완료된 빌드에서 "samu-app-debug" 아티팩트 다운로드
4. 또는 Releases 페이지에서 최신 버전 다운로드

## 수동 빌드 (로컬)

### 사전 요구사항
- Node.js 20+
- Java 17
- Android SDK
- Android Studio (권장)

### 빌드 단계
```bash
# 1. 의존성 설치
npm install

# 2. 웹 애셋 빌드
npm run build

# 3. Capacitor 동기화
npx cap sync android

# 4. Android Studio에서 열기
npx cap open android

# 5. APK 빌드 (터미널)
cd android
./gradlew assembleDebug
```

### APK 위치
- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release APK: `android/app/build/outputs/apk/release/app-release.apk`

## 설치 방법

### Android 기기에서
1. APK 파일 다운로드
2. 설정 → 보안 → "알 수 없는 소스" 허용
3. APK 파일 실행하여 설치

### 주요 기능
- 팬텀 지갑 연결 (딥링크 지원)
- SAMU 토큰 잔액 실시간 조회
- 밈 업로드 및 투표
- 상품 구매 시스템
- 모바일 최적화 UI

## 딥링크 설정
앱은 다음 딥링크를 지원합니다:
- `samuapp://phantom-connect` (팬텀 지갑 연결)
- `https://meme-chain-rally-wlckddbs12345.replit.app/*` (웹 호환)

## 문제 해결

### 빌드 오류
- Java 17 사용 확인
- Android SDK 최신 버전 설치
- `./gradlew clean` 후 재빌드

### 설치 오류
- "알 수 없는 소스" 허용 확인
- 기기 저장공간 확인
- 이전 버전 제거 후 재설치