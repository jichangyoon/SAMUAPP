# SAMU Meme Contest Application

## Overview
The SAMU Meme Contest Application is a platform designed to evolve memecoins into intellectual property (IP) on the Solana blockchain. Users can upload memes and vote for them using SAMU tokens. The winning memes are then produced as merchandise (stickers), and the sales profits are distributed in SOL. The project aims to create a self-sustaining ecosystem where meme creators and voters are rewarded, and the platform generates revenue.

## User Preferences
- 한국어로 소통 선호
- 비기술적 창업자가 AI 도움으로 관리하는 프로젝트
- 웹앱 (모바일앱 아님). 반응형 웹 디자인은 OK

## System Architecture

**Core Model:**
The platform operates on a pipeline: Meme Contest → Goods (Printful) → Ecosystem Rewards (SOL). It utilizes a dual-token system: SAMU for voting (transferred to treasury) and SOL for merchandise payments and reward distribution.

**Key Features:**
- **Voting System:** Implemented with on-chain SAMU SPL token transfers to a treasury wallet (`4WjMuna7iLjPE897m5fphErUt7AnSdjJTky1hyfZZaJk`). Supports in-app voting and Solana Blinks, with transaction verification to prevent duplicate votes.
- **Escrow, Order & Accounting:** SOL payments for merchandise are split into two parts via multi-instruction Solana transactions:
    - **Cost Price:** Transferred immediately to the Treasury.
    - **Profit:** 컨트랙트 모드 ON 시 escrow_pool PDA로 직접 입금 (투명한 온체인 보관). 컨트랙트 모드 OFF 시 Escrow 지갑(`ojzHLw6QxUqprnEjk4gfQM3QXS1RKHWdTLXzZS543cg`)으로 입금.
    Profits are distributed as 45% to Creators, 40% to Voters, and 15% to the Platform.
- **Printful Webhook:** Integrates with Printful v2 webhooks to automate order status updates and trigger profit distribution upon `shipment_delivered`. A 30-day timeout scheduler ensures distribution for delayed orders.
- **Reward System:**
    - **Creator Rewards (45%):** Allocated based on vote share per contest, recorded individually.
    - **Voter Rewards (40%):** Managed through a DeFi Reward Per Share model, accumulated in a `voterRewardPool` per contest.
    - **Claiming:** 컨트랙트 모드 ON 시, 유저가 Claim 클릭 → 서버가 `record_allocation + claim` 두 명령어를 하나의 트랜잭션으로 빌드 → admin(에스크로 지갑)이 pre-sign(금액 권한 보증) → 유저 지갑이 최종 서명 & 가스비 부담 → 브로드캐스트. **서버 가스비 0원.** 컨트랙트 모드 OFF 시 DB 기반 SOL 직접 전송 (에스크로 지갑 → 유저 지갑).
- **SAMU Map:** Visualizes order locations globally using `react-leaflet` and CartoDB tiles, with color-coding for user-related profits. Includes routing to Printful fulfillment centers.
- **Order Geocoding:** Uses OpenStreetMap Nominatim API to get precise latitude/longitude for orders based on postal code and country.
- **My Profile:** Provides sections for "My Memes" (grouped by contest), "My Votes," "Rewards" (summary of earned and claimable SOL), and "Activity" (creator/voter stats and earnings).
- **Archiving System:** Processes ended contests for archiving into Cloudflare R2 with parallel processing and retry mechanisms, ensuring DB atomicity for state transitions.
- **Smart Contract Integration (Phase 2 - 재배포 필요):** Solana 프로그램 `samu-rewards` Anchor 프레임워크. **Program ID:** `SAMU_REWARDS_PROGRAM_ID` env에 설정됨 (Replit Secrets). `initialize` ✅, `transferAdmin` ✅ (에스크로 지갑이 admin).
  - **컨트랙트 구조 (최신):**
    - `initialize_pool`: 배송 완료 시 escrow_pool PDA(금고) 초기화. 서버 호출.
    - `deposit_profit`: SOL 배분 금액 기록 (SOL 이동 없음). 서버 호출.
    - `record_allocation`: 유저 claim 시 유저 지갑이 payer(계정 생성비 부담). admin은 서명으로 금액 권한만 보증. **서버가 직접 제출하지 않음.**
    - `claim`: escrow_pool PDA → 유저 지갑 SOL 전송. 유저 지갑이 서명 & 가스비 부담.
  - **가스비 구조:** 배송완료 시 서버 가스비 딱 2회(initialize_pool + deposit_profit) 고정. 유저 수와 무관. record_allocation + claim은 유저가 하나의 트랜잭션으로 처리 (유저 가스비 ~0.7원).
  - **결제 흐름:** 결제 시 수익금이 escrow_pool PDA로 직접 입금 (투명한 온체인 보관).
  - **Claim 흐름:** 서버가 `record_allocation + claim` 합산 TX 빌드 → admin pre-sign → 유저 지갑 최종 서명 & 브로드캐스트.
  - **컨트랙트 수정/재배포 방법:** Playground 터미널에서 `solana program close <ID>` → SOL 회수 → lib.rs 수정 후 Build → Deploy → `declare_id!` 및 `SAMU_REWARDS_PROGRAM_ID` 업데이트 → `initialize(4500, 4000, 1500)` + `transferAdmin` 재실행.
  - **서버 코드:** `server/utils/solana.ts`. `SAMU_REWARDS_PROGRAM_ID` env 설정 시 자동 활성화, 미설정 시 기존 DB 기반 분배로 폴백 (완전 하위 호환).

**Technical Stack:**
- **Frontend:** React 18, TypeScript, Vite, TanStack Query, Wouter, React Hook Form + Zod, Tailwind CSS, shadcn/ui, Vaul. Uses Poppins font and supports dark theme.
- **Backend:** Express.js + TypeScript, RESTful API.
- **Database:** PostgreSQL + Drizzle ORM.
- **Authentication:** Privy (Solana-only, email + embedded wallet + external wallets).
- **Storage:** Cloudflare R2 for archived memes.
- **Map:** react-leaflet, CartoDB tiles.
- **Geocoding:** OpenStreetMap Nominatim API.
- **Merchandise:** Printful API (Kiss-Cut Stickers).
- **Pricing:** CoinGecko API.

**Performance Optimization:** Includes targeted database queries, batch queries, lazy loading for map components, and TanStack Query's automatic deduplication.

## Long-term Roadmap

| Phase | 이름 | 상태 | 핵심 내용 |
|---|---|---|---|
| Phase 1 | Meme Incubator App | ✅ 완성 | 현재 시스템 전체 (React + Express + Printful + Privy) |
| Phase 2 | On-chain Escrow (Anchor) | 🔄 재배포 필요 | 결제 수익 → escrow_pool PDA 직접 입금 (투명). 배송 완료 시 initialize_pool → deposit_profit (서버, 2회 고정). record_allocation + claim은 유저가 하나의 TX로 직접 처리 (유저 가스비). 서버 가스비 최소화 설계. |
| Phase 3 | Dynamic IP Equity cNFT | ⚙️ 컨트랙트 작성 완료 | cNFT(Compressed NFT) 기반. `samu-ip-nft` Anchor 프로그램 작성 완료. Devnet에서 DB 테스트 데이터로 전체 흐름 검증 예정. |
| Phase 4 | Community Factory Program | 🔭 계획됨 | 퍼미션리스 커뮤니티 런칭 온체인 프로그램. SAMU를 앱 → 플랫폼으로 전환 |
| Phase 5 | License NFT Marketplace | 🔭 계획됨 | IP 라이선스 NFT 거래, USDC 플로우, 브랜드/크리에이터 라이선스 구매 |
| Phase 6 | Solana SVM Appchain | 🔭 계획됨 | Sonic SVM / MagicBlock 기반 전용 앱체인 |

> 새 기능 설계 시 이 로드맵을 참조하여 아키텍처 결정이 장기 방향과 충돌하지 않도록 할 것.

### Phase 3 상세 설계 (2026-03-13 확정)

**모델 전환:**
현재(Phase 1/2): 콘테스트 종료 → DB에 크리에이터/투표자 지분 기록 → 굿즈 수익 발생 시 DB 기준으로 SOL 분배
Phase 3: 콘테스트 종료 → 참여자 전원에게 cNFT 발행 → 굿즈 수익 발생 시 cNFT 보유자 기준으로 SOL 분배

**핵심 설계 결정:**
- **cNFT (Compressed NFT)** 사용: Metaplex Bubblegum 프로그램 기반. 발행 비용이 거의 0이므로 투표자 수백 명에게도 부담 없이 발행 가능.
- **발행 대상:** 콘테스트 종료 시 참여한 Creator + Voter 전원
  - Creator cNFT: 득표 비율에 따른 지분(%) 메타데이터 포함
  - Voter cNFT: 투표 기여도에 따른 지분(%) 메타데이터 포함
- **양도 가능 (Transferable):** cNFT 2차 거래 시 수익 귀속이 새 홀더로 이전됨. Phase 5 License NFT Marketplace의 기반.
- **수익 분배 방식:** 굿즈 수익 발생 시 Helius DAS API (인덱서)로 현재 cNFT 홀더 조회 → 서버가 현재 홀더에게 SOL 분배. Phase 2와 동일한 서버 기반 분배 패턴 유지.
- **컨트랙트 독립:** Phase 2 (`samu-rewards`)와 별도 Program ID로 배포. 웹앱은 env 변수 2개로 두 컨트랙트와 연동. Phase 2 검증 내용 유지됨.
- **CPI 가능:** Phase 3 컨트랙트에서 Phase 2 컨트랙트를 Cross-Program Invocation으로 호출 가능 (예: NFT 홀더 claim → Phase 2 SOL 전송).

**구현 시 필요한 것:**
1. Bubblegum 프로그램으로 Merkle Tree 생성 + cNFT 민팅 (콘테스트 종료 트리거)
2. Helius DAS API 연동 (현재 cNFT 홀더 조회)
3. 분배 로직을 DB 기록 기준 → cNFT 홀더 기준으로 전환

**기술적 주의사항:**
- cNFT는 상태 압축(Concurrent Merkle Tree)을 사용하므로 온체인에서 직접 소유권 조회 불가 → 반드시 off-chain 인덱서(Helius DAS API) 필요
- Merkle Tree 관리 (크기, 깊이, 캐노피) 설계 필요

## Phase 2 컨트랙트 배포 및 검증 전략 (2026-03-19 확정)

### 전략 결정 배경
- 앱을 devnet 모드로 전환하면 SAMU 잔액 조회, 결제 TX 등 다른 기능이 깨짐 → devnet 앱 전환은 득보다 실이 많음
- 현재는 테스트 기간 (혼자 테스트) → PDA에 SOL이 소액만 들어가므로 버그 시 close 후 재배포해도 손실 미미
- program close 시 배포에 쓴 SOL 대부분 회수 가능

### Step 1: Solana Playground에서 Level 1 테스트 (컨트랙트 로직 검증)
Playground에서 devnet 또는 mainnet으로 배포 후, Playground UI에서 직접 각 instruction 호출:
```
1. initialize(4500, 4000, 1500)
2. transferAdmin(에스크로 지갑 주소: ojzHLw6QxUqprnEjk4gfQM3QXS1RKHWdTLXzZS543cg)
3. initialize_pool(contest_id)
4. deposit_profit(contest_id, total, creator, voter, platform)
5. record_allocation(contest_id, wallet, role, lamports)  ← claimer가 payer인지 확인
6. claim(contest_id)  ← SOL이 실제로 지갑으로 전송되는지 확인
7. 중복 claim 시도 → AlreadyClaimed 에러 확인
8. 중복 record_allocation 시도 → AlreadyRecorded 에러 확인
```

### Step 2: Mainnet 배포
```
1. Playground 터미널: solana program close <이전 Program ID> → SOL 회수
2. lib.rs 빌드 & Mainnet-beta 배포
3. 새 Program ID → declare_id! 업데이트
4. SAMU_REWARDS_PROGRAM_ID Replit Secret 업데이트
5. initialize(4500, 4000, 1500) 호출
6. transferAdmin(ojzHLw6QxUqprnEjk4gfQM3QXS1RKHWdTLXzZS543cg) 호출
```

### Step 3: 앱에서 End-to-End 검증 (Mainnet, 소액)
```
1. 테스트 굿즈 소액 주문
2. 어드민 패널에서 배송완료 처리
   → initialize_pool + deposit_profit 서버 로그 확인
3. Rewards 페이지에서 Claim 버튼 클릭
   → record_allocation + claim 합산 TX 서명 팝업 확인
   → 서명 후 SOL 실제 수령 확인
4. 버그 발생 시: program close(SOL 회수) → 수정 → Step 1부터 반복
```

### 주의사항
- 실 유저가 생기고 PDA에 큰 금액이 쌓이기 시작하면 "close → 재배포" 전략 불가
  (Program ID 바뀌면 기존 PDA orphan 처리 → SOL 영구 소실)
- 따라서 실서비스 전환 전에 반드시 end-to-end 완전 검증 필요

### Phase 3 배포 전략
**목표:** cNFT 민팅 → Helius DAS API 홀더 조회 → SOL 분배 전체 흐름 검증
- 실제 온체인 투표 없이 **DB에 직접 테스트 투표 데이터 삽입**
- 콘테스트 종료 트리거 → cNFT 민팅 → 홀더 조회 → 분배 흐름만 검증
- Phase 2와 동일한 순서로 Playground Level 1 → Mainnet 배포 → End-to-end 검증

## External Dependencies
- **Solana Blockchain:** Core infrastructure for SPL token transfers and smart contracts.
- **Privy:** Authentication service for user login (Solana-only, email, embedded, and external wallets).
- **Cloudflare R2:** Object storage for archiving contest data.
- **Printful API:** For merchandise production, order fulfillment, and webhook integration.
- **CartoDB:** Provides map tiles for the SAMU Map feature.
- **OpenStreetMap Nominatim API:** Used for geocoding order locations.
- **CoinGecko API:** For cryptocurrency pricing data.
- **Anchor:** Solana framework used for smart contract development.
- **Metaplex Bubblegum:** Solana program for minting compressed NFTs (cNFTs) via state compression. Phase 3 핵심 의존성.
- **Helius DAS API:** Digital Asset Standard API for querying cNFT ownership off-chain. Phase 3 수익 분배 시 현재 홀더 조회에 사용.

## Known Issues / 향후 개선 예정

### 영상 코덱 호환성 이슈 (우선순위 낮음)
- **증상:** HEVC(H.265)로 인코딩된 영상(iPhone 촬영본, Veo AI 생성 영상 등)이 데스크탑 Chrome/Edge에서 소리는 나오지만 화면이 검게 보임
- **원인:** Chrome/Edge on Windows는 HEVC 코덱 미지원. iOS 모바일 브라우저 및 네이버 웨일 브라우저는 정상 재생됨
- **현재 결정:** 주 타겟이 모바일 웹앱이므로 당장 미대응. 모바일에서는 문제없음
- **향후 해결책:** 업로드 시 서버에서 FFmpeg로 H.264 자동 트랜스코딩
  - `server/routes/uploads.ts`에서 영상 업로드 감지 후 변환 처리
  - 변환 완료 후 기존 R2 파이프라인으로 저장 (`server/r2-storage.ts`)
  - Cloudflare Stream(유료) 대신 FFmpeg 서버 처리 권장 (추가 비용 없음)
  - 변환 중 업로드 대기 시간이 생기나 앱 전반 성능엔 무영향