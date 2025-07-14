# GitLab Runner 빌드 오류 해결 방법

## 문제 분석
GitLab Runner에서 `unexpected token at ''` JSON 파싱 오류가 발생했습니다. 이는 주로 다음과 같은 원인으로 발생합니다:

1. **ionic.config.json 파일 문제** - 빈 파일이거나 잘못된 JSON 형식
2. **Ionic CLI 버전 호환성** - 서버 환경의 Ionic CLI 버전과 프로젝트 설정 불일치
3. **환경 변수 누락** - 빌드 과정에서 필요한 환경 변수 부족

## 해결 방법

### 1. 로컬 빌드 테스트
먼저 로컬 환경에서 빌드가 정상적으로 작동하는지 확인:

```bash
# 의존성 설치
npm install

# 웹 빌드 테스트
npm run build

# Capacitor 동기화
npx cap sync

# Android 빌드 테스트 (로컬에서만)
npx cap build android
```

### 2. GitLab Runner 설정 수정
`.gitlab-ci.yml` 파일에 다음 설정을 추가:

```yaml
variables:
  IONIC_CLI_VERSION: "7.2.0"
  CAPACITOR_CLI_VERSION: "7.3.0"

before_script:
  - npm install -g @ionic/cli@${IONIC_CLI_VERSION}
  - npm install -g @capacitor/cli@${CAPACITOR_CLI_VERSION}
  - node scripts/validate-config.js  # 설정 파일 검증
```

### 3. 설정 파일 최적화
- `ionic.config.json`: 앱 ID 및 기본 설정 추가
- `capacitor.config.json`: JSON 형식 백업 파일 생성
- 빌드 검증 스크립트 추가

### 4. 대안 방법
GitLab Runner 대신 GitHub Actions 사용:

```yaml
name: Android Build
on:
  push:
    branches: [ main ]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
    - name: Install dependencies
      run: npm ci
    - name: Build
      run: npm run build
    - name: Build Android
      run: |
        npx cap sync android
        cd android
        ./gradlew assembleDebug
```

## 현재 상태
- ✅ `ionic.config.json` 설정 완료
- ✅ `capacitor.config.json` 백업 생성
- ✅ 설정 검증 스크립트 작성
- ✅ GitLab CI/CD 설정 개선
- ✅ 빌드 스크립트 생성

## 권장사항
1. GitLab Runner 환경에서 Node.js 버전 확인
2. Ionic CLI 버전 업데이트
3. 빌드 로그에서 구체적인 오류 메시지 확인
4. 필요시 GitHub Actions로 대체