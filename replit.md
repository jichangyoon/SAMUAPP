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
    - **Profit:** Locked in an Escrow wallet (`ojzHLw6QxUqprnEjk4gfQM3QXS1RKHWdTLXzZS543cg`).
    Profits are distributed as 45% to Creators, 40% to Voters, and 15% to the Platform.
- **Printful Webhook:** Integrates with Printful v2 webhooks to automate order status updates and trigger profit distribution upon `shipment_delivered`. A 30-day timeout scheduler ensures distribution for delayed orders.
- **Reward System:**
    - **Creator Rewards (45%):** Allocated based on vote share per contest, recorded individually.
    - **Voter Rewards (40%):** Managed through a DeFi Reward Per Share model, accumulated in a `voterRewardPool` per contest.
    - **Claiming:** Rewards are claimed via on-chain SOL transfers from the Escrow wallet to user wallets, with the server signing transactions and covering gas fees.
- **SAMU Map:** Visualizes order locations globally using `react-leaflet` and CartoDB tiles, with color-coding for user-related profits. Includes routing to Printful fulfillment centers.
- **Order Geocoding:** Uses OpenStreetMap Nominatim API to get precise latitude/longitude for orders based on postal code and country.
- **My Profile:** Provides sections for "My Memes" (grouped by contest), "My Votes," "Rewards" (summary of earned and claimable SOL), and "Activity" (creator/voter stats and earnings).
- **Archiving System:** Processes ended contests for archiving into Cloudflare R2 with parallel processing and retry mechanisms, ensuring DB atomicity for state transitions.
- **Smart Contract Integration (Phase 2 - Devnet 테스트 중, Mainnet 대기 중):** Solana 프로그램 `samu-rewards`가 Anchor 프레임워크로 개발 완료되어 Devnet 배포 및 부분 검증 완료. Devnet 검증 결과: `initialize` ✅, `deposit_profit` ✅ (실제 SOL 이동 확인), `record_allocation` ✅, `claim` ⚠️ (Playground UI 한계로 직접 테스트 미완 — 코드 버그 수정 완료: signer seeds의 `contest_id_bytes` 로컬 바인딩 패턴 적용). 서버 코드(`server/utils/solana.ts`)에 완전 통합됨. `SAMU_REWARDS_PROGRAM_ID` env 설정 시 자동 활성화, 미설정 시 기존 DB 기반 분배로 폴백 (완전 하위 호환). **다음 단계:** Mainnet 배포 후 실제 앱에서 굿즈 구매 → 배송 완료 → claim 전체 흐름 end-to-end 검증 필요.

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
| Phase 2 | On-chain Escrow (Anchor) | ⚙️ 진행 중 | 서버 에스크로 → PDA 컨트롤 스마트 컨트랙트 교체. Devnet 완료, Mainnet 배포 대기 |
| Phase 3 | Dynamic IP Equity cNFT | ⚙️ 컨트랙트 작성 완료 | cNFT(Compressed NFT) 기반. `samu-ip-nft` Anchor 프로그램 작성 완료. Devnet 배포 대기 |
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