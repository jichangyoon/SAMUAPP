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
  - Creator 45%: 콘테스트 내 득표 비율로 각 크리에이터에게 할당 → `creatorRewardDistributions`
  - Voters 40%: `voterRewardPool`에 적립 (DeFi Reward Per Share 방식)
  - Platform 15%: 플랫폼 보관
- Escrow 상태: `locked` → `distributed`
- Admin API: `POST /api/goods/admin/distribute-escrow/:orderId` (수동 분배 트리거)
- Admin API: `GET /api/goods/admin/escrow-deposits` (locked 목록 조회)

### ✅ Printful Webhook (완전 구현 - v2)
- **v2 등록** (store_id=17717241): `shipment_sent`, `shipment_delivered`, `shipment_returned`, `shipment_canceled`, `order_created/updated/failed/canceled`
- 등록 관리: `POST /api/admin/register-printful-webhook` (v2 API)
- `shipment_delivered` 수신 시 → `distributeEscrowProfit` 자동 실행 (45/40/15 분배)
- DB `printfulStatus`, `trackingNumber`, `trackingUrl` 자동 업데이트
- 웹훅 URL: `https://samu.ink/api/webhooks/printful`
- **30일 타임아웃 스케줄러** (`server/delivery-timeout-scheduler.ts`): 결제 후 30일 경과 + 에스크로 `locked` 상태인 주문 자동 분배 (6시간 주기 체크, 서버 기동 시 즉시 1회 실행)

### ✅ 리워드 시스템 (완전 구현)

**Creator 45%:**
- `creatorRewardDistributions`: 판매마다 크리에이터별 row — `voteSharePercent` × creatorPool로 각자 금액 계산
- creatorEarned = `creator_reward_distributions.sol_amount` 합산 (누적, 클레임 후 불변)
- DeFi 풀 미사용 (현재는 개별 row 방식. 리팩토링 예정)

**Voter 40%:**
- `voterRewardPool`: 콘테스트당 DeFi 풀 — `reward_per_share = 적립액 / 100`, `total_shares = 100`
- `voterClaimRecords`: 투표자별 클레임 포지션 추적
- 클레임 가능액: `reward_per_share × (내 SAMU / 전체 SAMU × 100)`
- API: `/api/rewards/claim/:contestId` (클레임 버튼)

**클레임 온체인 전송 (완전 구현):**
- 클레임 버튼 클릭 → `sendSolFromEscrow` 호출 → Escrow wallet → 유저 wallet 실제 Solana TX
- 서버(Escrow 프라이빗 키)가 서명 + 가스비 부담, 유저는 버튼 클릭만
- `voterClaimRecords` DB 중복 클레임 방지
- 크리에이터 + 투표자 동일 방식

**공통:**
- Total Earned = creatorEarned + voterEarned (누적값, 클레임 후에도 불변)
  - creatorEarned = 모든 `creator_reward_distributions.sol_amount` 합산
  - voterEarned = `claimable + totalClaimed` (클레임 전후 합계 동일)
- DB: `goodsRevenueDistributions`, `voterRewardPool`, `voterClaimRecords`, `creatorRewardDistributions`
- API: `/api/rewards/dashboard`, `/api/rewards/voter-pool/:contestId`, `/api/rewards/claimable/:contestId/:wallet`, `/api/rewards/claim/:contestId`, `/api/rewards/summary`
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

### ✅ My Profile (구현 완료)

**My Memes 탭:**
- 콘테스트별 그룹화
- 헤더: 콘테스트명, 상태, 받은 총 SAMU 투표수
- 5개 초과 시 접기/펼치기
- API: `GET /api/users/:wallet/memes-by-contest`

**My Votes 탭:**
- 콘테스트별 그룹화, 투표한 밈 목록

**Rewards 탭 (구 Claims):**
- 통합 리워드 요약: creatorEarned, voterEarned, claimable
- 클레임 버튼 → 실제 Escrow → 유저 wallet 온체인 SOL 전송 (서버 서명, 플랫폼이 가스비 부담)

**Activity 탭:**
- **CREATOR 섹션**: 참여 콘테스트 수 / 제출 밈 수 / 받은 SAMU 총량 + Pipeline 뱃지 (굿즈 된 밈 수) + 베스트 밈
- **VOTER 섹션**: 투표한 콘테스트 수 / 총 투표 횟수 / 사용한 SAMU 총량
- **EARNINGS 섹션**: Creator SOL / Voter SOL / Total Earned (누적, 클레임 후 불변)
- API: `GET /api/users/:wallet/stats`, `GET /api/rewards/summary?wallet=`

### ✅ 아카이브 시스템 (구현 완료)
- 병렬 처리: R2 10개 동시 작업
- 재시도: 2회, 지수 백오프
- 상태 흐름: draft → active → ended → archiving → archived
- 에러 복구: archiving 실패 시 ended로 복귀

---

## 다음에 할 일 (우선순위 순)

### 🔴 높은 우선순위 (핵심 기능 완성)
1. **Escrow Refund**: 주문 실패/취소 시 자동 환불 플로우

### 🟡 중간 우선순위
2. **SAMU Map 게임화**: 배송 진행 = 리워드 언락 진행도, SAMU 캐릭터 애니메이션
3. **Phantom 직접 로그인**: Privy 이메일 외에 Phantom 지갑 직접 연결

### 🟢 낮은 우선순위
4. **Creator/Voter 풀 스토리지 통일**: creator_reward_pool 추가해서 voter_reward_pool과 동일 패턴으로 리팩토링 (기능상 문제 없음, 코드 일관성 목적)
5. **Smart Contract 이전**: Phase 2 — Rust/Anchor로 리워드 분배 온체인 자동화

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
- `voter_reward_pool.total_shares=0` 버그 수정: `reward_per_share` 항상 0이던 문제. `total_shares=100` 고정, 기존 contest 45 DB 데이터 직접 수정
- Activity 탭 EARNINGS UI 개선: Pending 제거, Total Earned(누적) 추가
- voterEarned 계산 수정: `claimable + totalClaimed` 합산으로 클레임 후에도 불변
- `127.0.0.1` Suspicious IP 오탐 수정: 로컬호스트(`127.0.0.1`, `::1`, `::ffff:127.0.0.1`) 제외 처리
- `verifyTransaction` silent catch 수정: 서명자 키 파싱 실패 시 경고 로그 출력

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
- `server/routes/memes.ts`: 밈 CRUD (제출, 조회, 삭제)
- `server/routes/votes.ts`: SPL transfer tx 빌드, verifyTransaction, 중복투표 방지 (`/api/memes` 마운트)
- `server/routes/admin.ts`: 어드민
- `server/routes/goods.ts`: 굿즈/에스크로 + `distributeEscrowProfit`
- `server/routes/rewards-dashboard.ts`: 리워드 대시보드/맵/summary
- `server/routes/revenue.ts`: 수익
- `server/routes/actions.ts`: Solana Blinks
- `server/routes/users.ts`: 유저 프로필 + stats
- `server/routes/webhook.ts`: Printful 웹훅 (`/api/webhooks` 마운트)
- `server/routes/partners.ts`: 파트너 콘테스트
- `server/routes/wallet.ts`: SAMU/SOL 잔액 조회, treasury 지갑 주소
- `server/routes/uploads.ts`: 이미지/영상 파일 업로드

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
- Vote 옵션: 100, 1,000, 10,000 SAMU

**Smart Contract (미배포):**
- `contracts/programs/samu-rewards/src/lib.rs`
- Anchor 0.30.1 + anchor-spl
- Solana Playground에서 빌드/배포 (Replit 내 빌드 불가)

**리워드 풀 알고리즘 (DeFi Reward Per Share) — Voter 40%에 적용:**
- `total_shares = 100` (고정 — 지분율 0~100% 기반)
- 판매 발생 → `reward_per_share += deposit / 100`
- 유저 수령액 = `reward_per_share × (내 SAMU / 전체 SAMU × 100)`
- **Creator 45%는 DeFi 풀 미사용** — 판매마다 개별 row로 기록 (`creatorRewardDistributions`)
- 향후 Creator도 동일한 DeFi 풀 패턴으로 통일 예정 (🟢 낮은 우선순위)
