# SAMU Meme Contest Application

## Overview

Meme Incubator on Solana. 유저가 밈을 올리고 SAMU 토큰으로 투표하면, 우승 밈이 굿즈(스티커)로 제작되고 판매 수익이 SOL로 분배되는 플랫폼. 밈코인을 Solana 위의 IP(지식재산)로 진화시키는 것이 목표.

## User Preferences

- 한국어로 소통 선호
- 비기술적 창업자가 AI 도움으로 관리하는 프로젝트
- 웹앱 (모바일앱 아님). 반응형 웹 디자인은 OK

---

## 핵심 모델

**파이프라인:** Meme Contest → Goods (Printful) → Ecosystem Rewards (SOL)

**듀얼 토큰:**
- **SAMU** = 투표권 (투표 시 SAMU를 treasury로 전송)
- **SOL** = 굿즈 결제 + 리워드 분배

**지갑 주소:**
- Treasury: `4WjMuna7iLjPE897m5fphErUt7AnSdjJTky1hyfZZaJk`
- Escrow: `ojzHLw6QxUqprnEjk4gfQM3QXS1RKHWjTLXzZS543cg`

---

## 기능 구현 현황

### ✅ 투표 시스템 (완전 구현)
- SAMU SPL 토큰 온체인 실전송 (treasury 지갑으로)
- 최소 1 SAMU, 상한 없음 (잔액 범위 내)
- 투표량이 리워드 비율 결정
- `/api/memes/prepare-transaction` → 직렬화된 SPL transfer tx 빌드 → 프론트에서 Privy로 서명
- Solana Blinks(외부 투표)도 동일한 SPL transfer + on-chain 검증
- `verifyTransaction` 함수로 in-app/Blinks 공통 검증 (preTokenBalances/postTokenBalances)
- 중복 투표 방지: `getVoteByTxSignature` 체크

### ✅ Escrow - 주문/잠금/회계 (구현 완료)
- 굿즈 결제 시 멀티 인스트럭션 Solana TX로 SOL 분리:
  - **원가** (Printful 제작비+배송) → Treasury (즉시 온체인 전송)
  - **수익** (판매가 - 원가) → Escrow (잠금)
- DB에 EscrowDeposit 기록: `locked` 상태로 저장
- `distributeEscrowProfit` 함수: 수익을 45/40/15로 수학 계산 후 DB 기록
  - Creator 45%: 콘테스트 내 득표 비율로 각 크리에이터에게 할당
  - Voters 40%: `voterRewardPool`에 적립
  - Platform 15%: 플랫폼 보관
- Escrow 상태: `locked` → `distributed`
- Admin API: `POST /api/goods/admin/distribute-escrow/:orderId` (수동 분배 트리거)
- Admin API: `GET /api/goods/admin/escrow-deposits` (locked 목록 조회)

### ⚠️ Escrow - 실제 SOL 지급 (미구현 - 핵심 과제)
**현재:** 회계 장부(DB)만 완성. 실제 SOL이 지갑으로 나가는 코드 없음.

- ❌ **크리에이터 SOL 미전송**: DB에 "줘야 할 금액" 기록만 됨. Escrow wallet → Creator wallet 온체인 TX 없음
- ❌ **투표자 클레임 SOL 미전송**: 클레임 버튼 누르면 DB 잔액만 업데이트. 실제 SOL 안 나감
- ❌ **웹훅 → 자동 분배 연결 없음**: `package_delivered` 수신해도 `distributeEscrowProfit` 자동 미실행

### ✅ Printful Webhook (구현 완료 - 상태 업데이트만)
- HMAC-SHA256 서명 검증
- 처리 이벤트: `package_shipped`, `package_in_transit`, `package_delivered`, `order_failed`, `order_canceled`, `order_created`, `order_updated`
- 이벤트 수신 시 DB `printfulStatus`, `trackingNumber`, `trackingUrl` 업데이트
- **단, delivered 이벤트가 와도 에스크로 자동 분배 미실행** (수동 어드민 작업 필요)

### ✅ 리워드 시스템 (DB 레벨 구현)
- 투표자 40% → `voterRewardPool`에 적립 (DeFi Reward Per Share 방식)
- 투표자 프로필 페이지에서 클레임 가능 (DB 잔액 업데이트만, SOL 실전송 없음)
- DB: `goodsRevenueDistributions`, `voterRewardPool`, `voterClaimRecords`
- API: `/api/rewards/dashboard`, `/api/rewards/voter-pool/:contestId`, `/api/rewards/claimable/:contestId/:wallet`, `/api/rewards/claim/:contestId`, `/api/rewards/my-claims/:wallet`
- Rewards Dashboard UI: 파이차트, 요약 카드, 분배 히스토리

### ✅ SAMU Map (구현 완료)
- `react-leaflet` + CartoDB 다크 타일
- 기본 줌: 전세계 뷰(zoom=1), maxBounds로 드래그 시 검은 공간 방지
- Lazy loaded (`React.lazy`) — Leaflet 번들은 Rewards 탭 진입 시에만 로드
- 60초 자동 새로고침 (TanStack Query refetchInterval)
- 색상 코딩: 초록(내 수익 연관) vs 빨강(일반 주문)
- 클릭 → 주문 상세 (추적 링크, 수익 분배 내역)
- 6개 Printful 풀필먼트 센터 라우팅 (아시아→일본, 유럽→리가 등)
- API: `/api/rewards/map?wallet=<address>` (최적화: `getVotesByContestIds`로 타겟 쿼리)

### ✅ 주문 Geocoding (구현 완료)
- `server/utils/geocode.ts`: OpenStreetMap Nominatim API (무료, API 키 불필요)
- 주문 생성 시 우편번호+국가로 정확한 위경도 조회 후 DB 저장
- 실패 시 city+country 재시도 → 국가 기본값 폴백
- `client/src/data/country-coordinates.ts`: 한국 20개 지역 좌표 (송파구, 강남구, 마포구 등)
- KR 기본 좌표: 한국 중앙 → 서울(37.5665, 126.978)

### ✅ My Profile - My Memes 탭 (업데이트 완료)
- 콘테스트별 그룹화 (My Votes와 동일 구조)
- 헤더: 콘테스트명, 상태, 받은 총 SAMU 투표수
- 5개 초과 시 접기/펼치기
- API: `GET /api/users/:wallet/memes-by-contest`
- Storage: `getUserMemesByContest`, `getVotesByContestIds`

### ✅ 아카이브 시스템 (구현 완료)
- 병렬 처리: R2 10개 동시 작업
- 재시도: 2회, 지수 백오프
- 상태 흐름: draft → active → ended → archiving → archived
- 에러 복구: archiving 실패 시 ended로 복귀

---

## 다음에 할 일 (우선순위 순)

### 🔴 높은 우선순위 (핵심 기능 완성)
1. **크리에이터 실제 SOL 온체인 전송**: `distributeEscrowProfit` 내에 Escrow wallet → Creator wallet 실제 Solana TX 추가
2. **투표자 클레임 실제 SOL 전송**: 클레임 시 Pool wallet → Voter wallet 실제 Solana TX 추가
3. **Printful Webhook → 자동 분배**: `package_delivered` 이벤트 → `distributeEscrowProfit` 자동 호출

### 🟡 중간 우선순위
4. **Escrow Refund**: 주문 실패/취소 시 자동 환불 플로우
5. **SAMU Map 게임화**: 배송 진행 = 리워드 언락 진행도, SAMU 캐릭터 애니메이션
6. **Phantom 직접 로그인**: Privy 이메일 외에 Phantom 지갑 직접 연결

### 🟢 낮은 우선순위
7. **Smart Contract 이전**: Phase 2 — Rust/Anchor로 리워드 분배 온체인 자동화

---

## 알려진 문제 수정 이력

- 중복 아카이빙: DB unique constraint로 방지
- Race condition: 3레이어 보호로 해결
- 굿즈 결제 지갑 주소 버그 수정
- 중복 어드민 라우트 제거 (케이스 불일치 5개)
- MemStorage 인터페이스 완전 구현
- Privy SDK 콘솔 경고: SDK 내부 동작, 제거 불가
- 지도 드래그 블랙 스크린: `maxBounds` + `maxBoundsViscosity=1.0` 설정으로 해결
- 주문 위치 부정확: Nominatim geocoding으로 우편번호 기반 정확한 좌표 저장
- KR 기본 좌표: 한국 중앙 → 서울로 수정

---

## 시스템 아키텍처

**스택:**
- Frontend: React 18, TypeScript, Vite, TanStack Query, Wouter, React Hook Form + Zod
- Backend: Express.js + TypeScript, RESTful API
- Database: PostgreSQL + Drizzle ORM
- Auth: Privy (Solana-only, 이메일 + 임베디드 지갑 + 외부 지갑)
- Storage: Cloudflare R2
- Map: react-leaflet + CartoDB tiles
- Geocoding: OpenStreetMap Nominatim API
- Merchandise: Printful API (Kiss-Cut Stickers, product ID 358)
- Pricing: CoinGecko API

**Printful 스티커 Variant IDs:**
- 10163: 3"×3"
- 10164: 4"×4"
- 10165: 5.5"×5.5"
- 16362: 15"×3.75"

**주요 서버 라우트:**
- `server/routes/memes.ts`: 밈/투표
- `server/routes/admin.ts`: 어드민
- `server/routes/goods.ts`: 굿즈/에스크로
- `server/routes/rewards-dashboard.ts`: 리워드 대시보드/맵
- `server/routes/revenue.ts`: 수익
- `server/routes/actions.ts`: Solana Blinks
- `server/routes/users.ts`: 유저 프로필
- `server/routes/webhook.ts`: Printful 웹훅
- `server/routes/partners.ts`: 파트너 콘테스트

**주요 유틸:**
- `server/utils/geocode.ts`: Nominatim API 래퍼
- `client/src/data/country-coordinates.ts`: 국가/도시 폴백 좌표

**UI:**
- 5탭 하단 네비게이션: Contest, Archive, Goods, Rewards, Partners
- Tailwind CSS + shadcn/ui + Vaul 드로어
- Poppins 폰트
- 다크 테마

**성능 최적화:**
- `/api/rewards/map`: `getVotesByContestIds`로 타겟 쿼리 (전체 votes 테이블 스캔 제거)
- SamuMap: `React.lazy` lazy loading
- 지도 자동새로고침: 60초 (30초에서 변경)
- TanStack Query: 동일 queryKey 요청 자동 중복 제거

**Solana Blinks:**
- `/api/actions/vote/:memeId`: GET(메타데이터), POST(TX 빌드), POST `/confirm`(검증)
- Vote 옵션: 1, 5, 10, 커스텀(1-100) SAMU

**Smart Contract (미배포):**
- `contracts/programs/samu-rewards/src/lib.rs`
- Anchor 0.30.1 + anchor-spl
- Solana Playground에서 빌드/배포 (Replit 내 빌드 불가)
