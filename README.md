# SAMU Meme Contest Platform

SAMU 밈 콘테스트 플랫폼 - 모바일 최적화된 웹 애플리케이션

## 주요 기능

- 🎭 밈 업로드 및 콘테스트 참여
- 🗳️ SAMU 토큰 기반 투표 시스템
- 👤 Privy 통합 인증 (이메일/소셜)
- 📱 모바일 최적화 UI/UX
- 🏆 콘테스트 아카이브 및 Hall of Fame
- 🎨 NFT 갤러리 (164개 SAMU Wolf 컬렉션)
- 🛒 굿즈샵 (Hall of Fame 디자인)
- 🤝 파트너 콘테스트 시스템

## 개발 환경

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
```

## 빌드 및 배포

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

## 기술 스택

### Frontend
- **React 18** - UI 프레임워크
- **TypeScript** - 타입 안전성
- **Tailwind CSS** - 스타일링
- **Radix UI** - 컴포넌트 라이브러리
- **TanStack Query** - 상태 관리
- **Wouter** - 라우팅

### Backend
- **Express.js** - 서버 프레임워크
- **PostgreSQL** - 데이터베이스
- **Drizzle ORM** - 데이터베이스 ORM
- **Cloudflare R2** - 파일 스토리지

### Web3 Integration
- **Privy** - 인증 시스템
- **Solana Web3.js** - 블록체인 연동
- **SAMU Token** - 투표 파워

## 프로젝트 구조

```
├── client/          # React 프론트엔드
│   ├── src/
│   │   ├── components/  # UI 컴포넌트
│   │   ├── pages/      # 페이지 컴포넌트
│   │   └── lib/        # 유틸리티
├── server/          # Express.js 백엔드
│   ├── routes/      # API 라우트
│   └── storage.ts   # 데이터베이스 인터페이스
├── shared/          # 공유 타입 및 스키마
└── dist/           # 빌드 결과물
```

## 환경 변수

필요한 환경 변수들:

```env
DATABASE_URL=postgresql://...
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-r2-domain.com
ADMIN_EMAILS=admin@example.com,admin2@example.com
```

## SAMU Token 정보

- **Contract Address**: `EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF`
- **Network**: Solana Mainnet
- **Voting Power**: 1 SAMU = 1 Vote

## 라이센스

MIT License