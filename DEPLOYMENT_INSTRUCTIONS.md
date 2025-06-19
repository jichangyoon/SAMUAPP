# SAMU 앱 배포 가이드

## APK 빌드 방법

### 1. GitHub 자동 빌드 (권장)
1. 프로젝트를 GitHub 저장소에 업로드
2. GitHub Actions가 자동으로 APK 빌드 시작
3. Actions 탭에서 "Build Android APK" 워크플로우 확인
4. 완료 후 Releases에서 APK 다운로드

### 2. 로컬 빌드
```bash
# 프로젝트 폴더에서
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

## 현재 완성된 기능

### ✅ 핵심 기능
- 팬텀 지갑 연결 (데스크톱/모바일)
- SAMU 토큰 잔액 실시간 조회 (77,770개 확인됨)
- 밈 업로드 및 투표 시스템
- 리더보드 및 순위 표시
- 상품 구매 시스템

### ✅ 모바일 최적화
- iOS Universal Links 지원
- Android 딥링크 설정
- Capacitor 네이티브 앱 통합
- 모바일 UI/UX 최적화

### ✅ 기술 구조
- React + TypeScript 프론트엔드
- Express.js 백엔드
- Drizzle ORM + PostgreSQL
- TanStack Query 상태 관리
- Tailwind CSS + shadcn/ui

## 배포 파일 위치
- 웹 빌드: `dist/public/`
- Android APK: `android/app/build/outputs/apk/debug/`
- 전체 프로젝트: `../samu-android-ready.tar.gz`

## 다음 단계
1. GitHub에 프로젝트 업로드
2. GitHub Actions로 자동 APK 빌드
3. Play Store 또는 직접 배포

프로젝트가 배포 준비 완료되었습니다!