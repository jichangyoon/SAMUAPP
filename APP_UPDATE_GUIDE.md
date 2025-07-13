# 📱 앱 업데이트 및 배포 관리 가이드

## 🔄 업데이트 워크플로우

### 방법 1: 기존 리포지토리 업데이트 (권장)
```bash
# 1. 기존 GitHub 리포지토리 클론
git clone https://github.com/yourusername/samu-app.git
cd samu-app

# 2. Replit에서 수정된 파일들 복사
# (새 tar.gz 다운로드 후 덮어쓰기)

# 3. 변경사항 커밋
git add .
git commit -m "Update: 새로운 기능 추가"
git push origin main

# 4. Ionic Appflow 자동 빌드 트리거
# (GitHub 연결되어 있으면 자동으로 새 APK 생성)
```

### 방법 2: 새 리포지토리 (간단함)
```bash
# 1. 새 리포지토리 생성
# 2. tar.gz 압축 해제 후 업로드
# 3. Ionic Appflow에서 새 리포지토리 연결
```

## 🚀 배포 타입별 업데이트 방법

### A. 웹 업데이트 (즉시 반영)
- **Replit Deploy**: 코드 수정 → Deploy 버튼 → 즉시 반영
- **사용자 경험**: 웹사이트 새로고침하면 바로 업데이트됨

### B. 모바일 앱 업데이트

#### 1. 경미한 업데이트 (코드 수정)
```
Replit 코드 수정 → GitHub 업로드 → Ionic Appflow 빌드 → 새 APK 생성
```

#### 2. 주요 업데이트 (앱스토어 배포)
```
코드 수정 → APK 생성 → Google Play Store 업로드 → 사용자 업데이트 알림
```

## 📊 업데이트 관리 전략

### 1. 버전 관리
```json
// package.json
{
  "version": "1.0.0",  // 초기 버전
  "version": "1.0.1",  // 버그 수정
  "version": "1.1.0",  // 새 기능 추가
  "version": "2.0.0"   // 대규모 변경
}
```

### 2. 업데이트 주기
- **웹**: 실시간 업데이트 가능
- **모바일**: 주 1회 또는 월 1회 권장
- **긴급 수정**: 즉시 배포

### 3. 테스트 전략
```bash
# 로컬 테스트
npm run dev

# 빌드 테스트
npm run build

# 모바일 테스트
npx cap run android
```

## 🛠️ 효율적인 개발 환경 구성

### 1. GitHub Actions 자동화
```yaml
# .github/workflows/auto-build.yml
name: Auto Build APK
on:
  push:
    branches: [ main ]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Sync Capacitor
        run: npx cap sync
```

### 2. 브랜치 전략
```
main (배포용)
├── develop (개발용)
├── feature/new-contest (새 기능)
└── hotfix/voting-bug (긴급 수정)
```

## 🎯 권장 업데이트 플로우

### 일반적인 업데이트:
1. **Replit에서 코드 수정**
2. **로컬 테스트 (npm run dev)**
3. **tar.gz 다운로드**
4. **GitHub 리포지토리 업데이트**
5. **Ionic Appflow 자동 빌드**
6. **새 APK 다운로드**

### 긴급 수정:
1. **Replit에서 즉시 수정**
2. **웹은 Deploy 버튼으로 즉시 반영**
3. **모바일은 위 플로우 진행**

## 📝 업데이트 로그 관리

매 업데이트마다 CHANGELOG.md 작성:
```markdown
# Changelog

## [1.1.0] - 2025-07-13
### Added
- 새로운 콘테스트 기능
- 투표 파워 시스템 개선

### Fixed
- 모바일 UI 버그 수정
- 로딩 속도 개선
```

## 🔍 요약

**현재 방식으로 충분합니다!**
- 로컬 다운로드 + GitHub 업로드 = ✅ 가능
- 새 리포지토리 매번 만들기 = ✅ 가능
- 기존 리포지토리 업데이트 = ✅ 더 효율적

**추천 방법**: 기존 리포지토리 업데이트가 더 체계적이고 버전 관리에 유리합니다.