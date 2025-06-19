# SAMU 앱 배포 가이드

## 1. GitHub Actions를 통한 자동 APK 빌드

### 단계:
1. 이 프로젝트를 GitHub 리포지토리에 푸시
2. GitHub Actions가 자동으로 APK 빌드
3. Actions 탭에서 빌드된 APK 다운로드

### 사용법:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

## 2. 구글 플레이 스토어 배포

### 전제조건:
- Google Play Console 계정 ($25 일회성 등록비)
- 앱 서명 키 생성

### 단계:
1. **앱 서명 키 생성**:
```bash
keytool -genkey -v -keystore samu-release-key.keystore -alias samu -keyalg RSA -keysize 2048 -validity 10000
```

2. **Release APK 빌드**:
```bash
cd android
./gradlew assembleRelease
```

3. **Google Play Console에서**:
   - 새 앱 생성
   - APK 업로드
   - 앱 정보 입력 (제목, 설명, 스크린샷)
   - 검토 제출

## 3. 대안: 직접 배포 (APK 파일)

### 웹사이트나 소셜미디어를 통한 배포:
1. GitHub Releases에 APK 업로드
2. 사용자가 직접 다운로드하여 설치
3. "알 수 없는 소스" 허용 필요

## 4. iOS 앱 스토어 (향후)

### 준비사항:
- Apple Developer 계정 ($99/년)
- macOS 환경
- Xcode

### 단계:
```bash
npx cap add ios
npx cap sync ios
npx cap open ios
```

## 5. 배포 체크리스트

### 앱 준비:
- [x] Capacitor 설정 완료
- [x] 안드로이드 프로젝트 생성
- [x] GitHub Actions 워크플로우 설정
- [x] 앱 아이콘 및 브랜딩
- [x] 모바일 최적화 UI
- [x] Phantom 지갑 딥링크 연동

### 스토어 준비:
- [ ] 구글 플레이 콘솔 계정
- [ ] 앱 서명 키
- [ ] 앱 스크린샷 (최소 2개)
- [ ] 앱 설명 및 키워드
- [ ] 개인정보 처리방침 URL

### 마케팅:
- [ ] 앱 아이콘 디자인
- [ ] 스토어 리스팅 최적화
- [ ] 커뮤니티 홍보

## 6. 현재 상태

✅ **완료됨**:
- Capacitor 안드로이드 프로젝트
- GitHub Actions 자동 빌드
- 모바일 Phantom 지갑 연동
- 완전한 SAMU 브랜딩

🔄 **진행 중**:
- APK 빌드 최적화
- 스토어 준비 자료

📋 **다음 단계**:
1. GitHub에 푸시하여 자동 APK 빌드
2. Google Play Console 계정 생성
3. 앱 스토어 리스팅 준비