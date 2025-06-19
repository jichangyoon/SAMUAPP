# SAMU 앱 배포 완전 가이드

## 1. GitHub Actions 자동 APK 빌드 (권장)

### 단계:
1. **GitHub 저장소 생성**
   - GitHub에서 새 저장소 생성
   - `samu-final-clean.tar.gz` 압축 해제
   - 모든 파일을 저장소에 업로드

2. **자동 빌드 시작**
   ```bash
   git add .
   git commit -m "SAMU 앱 초기 배포"
   git push origin main
   ```

3. **APK 다운로드**
   - GitHub → Actions 탭 → "Build Android APK" 확인
   - 완료 후 Releases에서 최종 APK 다운로드

### 빌드 시간: 약 5-10분

## 2. 로컬 빌드 (고급 사용자)

```bash
# 의존성 설치
npm install

# 웹 빌드
npm run build

# Android 동기화
npx cap sync android

# APK 빌드
cd android
./gradlew assembleDebug
```

**APK 위치**: `android/app/build/outputs/apk/debug/app-debug.apk`

## 3. Google Play Store 배포

### 사전 준비:
- Google Play Console 계정 ($25)
- 앱 서명 키 생성

### 단계:
1. **서명 키 생성**:
```bash
keytool -genkey -v -keystore samu-release-key.keystore -alias samu -keyalg RSA -keysize 2048 -validity 10000
```

2. **Release APK 빌드**:
```bash
cd android
./gradlew assembleRelease
```

3. **Play Store 업로드**:
   - Google Play Console에서 새 앱 생성
   - APK 업로드 및 스토어 정보 입력
   - 검토 제출 (1-3일 소요)

## 4. 직접 배포 (사이드로딩)

### Android 기기에서:
1. APK 파일 다운로드
2. 설정 → 보안 → "알 수 없는 소스" 허용
3. APK 파일 실행하여 설치

## 현재 완성된 기능

### 핵심 기능
- 팬텀 지갑 연결 (데스크톱/모바일)
- SAMU 토큰 잔액 실시간 조회
- 밈 업로드 및 투표 시스템
- 리더보드 및 순위 표시
- 상품 구매 시스템

### 모바일 최적화
- iOS Universal Links 지원
- Android 딥링크 설정 완료
- Capacitor 네이티브 앱 통합
- 반응형 모바일 UI

### 기술 스택
- React + TypeScript
- Express.js + PostgreSQL
- Drizzle ORM
- TanStack Query
- Tailwind CSS + shadcn/ui

## 파일 구조
- **프로젝트 소스**: `samu-final-clean.tar.gz` (36MB)
- **GitHub Actions**: `.github/workflows/android-build.yml`
- **Android 설정**: `android/` 폴더
- **빌드 가이드**: `APK_BUILD_GUIDE.md`

프로젝트가 완전히 배포 준비되었습니다.