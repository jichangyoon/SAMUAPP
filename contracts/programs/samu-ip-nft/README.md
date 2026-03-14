# SAMU IP NFT Smart Contract — Phase 3

## 개요

Phase 3 스마트 컨트랙트 `samu-ip-nft`는 콘테스트 참가자에게 **IP Equity cNFT**를 발행합니다.

| 역할 | Phase 2 (`samu-rewards`) | Phase 3 (`samu-ip-nft`) |
|---|---|---|
| 목적 | SOL 에스크로 + claim | IP 지분 증명 cNFT 발행 |
| 핵심 | 돈 보관/출금 | 지분 증명/양도 |
| SOL 이동 | ✅ | ❌ |
| Claim 기능 | ✅ | ❌ |

## 핵심 개념

- **cNFT (Compressed NFT)**: Metaplex Bubblegum 기반. 수백~수천 명에게 거의 0원의 비용으로 NFT 발행 가능.
- **equity_share_bps**: cNFT 메타데이터에 포함된 수익 지분. 1350 bps = 13.50%.
- **양도 가능**: cNFT 2차 거래 시 수익 귀속이 새 홀더로 이전됨.

## Architecture

```
콘테스트 종료
    │
    ▼
[1] initialize_contest_tree
    → Merkle Tree + tree_config 생성
    → contest_authority PDA가 tree creator
    │
    ▼
[2] mint_participant_nft × N (참가자 수만큼)
    → Creator/Voter 전원에게 cNFT 발행
    → equity_share_bps가 메타데이터에 포함
    │
    ▼
[3] finalize_contest
    → 추가 mint 차단
    │
    ▼
[수익 발생 시 - Off-chain]
    → Helius DAS API로 현재 cNFT 홀더 조회
    → 서버가 Phase 2 record_allocation 호출 (홀더 기준)
    → 홀더가 Phase 2 claim 호출
```

## Instructions

### `initialize`
프로그램 최초 초기화. admin 지갑 설정.

| 인자 | 타입 | 설명 |
|---|---|---|
| (없음) | - | admin은 Signer |

### `initialize_contest_tree`
콘테스트용 Merkle Tree 초기화.

| 인자 | 타입 | 설명 |
|---|---|---|
| contest_id | u64 | 콘테스트 ID |
| max_depth | u32 | Merkle Tree 깊이 (14 = 16,384개 leaf) |
| max_buffer_size | u32 | 동시 업데이트 버퍼 (64 권장) |
| public | bool | 아무나 mint 가능 여부 (false 권장) |

**사전 조건:**
- `merkle_tree` 계정이 system_program으로 미리 생성되어 있어야 함
- 계정 크기: `8 + 32 + 32 * max_depth + 32 * max_buffer_size * (1 + max_depth)` bytes
- rent exempt lamports 필요

### `mint_participant_nft`
참가자 1명에게 IP Equity cNFT 발행.

| 인자 | 타입 | 설명 |
|---|---|---|
| contest_id | u64 | 콘테스트 ID |
| name | String | cNFT 이름 (예: "SAMU Contest #1 Creator") |
| symbol | String | "SAMU-IP" |
| uri | String | Off-chain 메타데이터 JSON URL |
| role | Role | Creator 또는 Voter |
| equity_share_bps | u16 | 수익 지분 (0-10000) |

### `finalize_contest`
콘테스트 mint 완료 처리.

| 인자 | 타입 | 설명 |
|---|---|---|
| contest_id | u64 | 콘테스트 ID |

### `transfer_admin`
admin 지갑 변경 (긴급 상황용).

| 인자 | 타입 | 설명 |
|---|---|---|
| new_admin | Pubkey | 새 admin 지갑 |

## 계정 구조 (PDA)

### `program_config`
- Seeds: `["config"]`
- admin, total_contests, bump

### `contest_tree`
- Seeds: `["contest-tree", contest_id_LE8]`
- merkle_tree, contest_id, max_depth, max_buffer_size, total_minted, finalized, bump

### `contest_authority`
- Seeds: `["authority", contest_id_LE8]`
- Bubblegum tree의 creator/delegate 역할
- 이 PDA가 서명해야만 mint 가능 → 우리 프로그램만 mint 가능

## Off-chain 메타데이터 JSON 형식

URI가 가리키는 JSON (Arweave, IPFS, 또는 Cloudflare R2에 저장):

```json
{
  "name": "SAMU Contest #1 Creator NFT",
  "symbol": "SAMU-IP",
  "description": "IP Equity NFT for SAMU Meme Contest #1. This cNFT represents a 13.50% revenue share.",
  "image": "https://example.com/contest-1-creator.png",
  "attributes": [
    { "trait_type": "contest_id", "value": "1" },
    { "trait_type": "role", "value": "Creator" },
    { "trait_type": "equity_share_bps", "value": "1350" },
    { "trait_type": "meme_title", "value": "Doge to the Moon" }
  ],
  "properties": {
    "category": "image"
  }
}
```

## 수익 분배 흐름 (서버 로직)

```
굿즈 판매 수익 발생 (SOL)
    │
    ▼
서버: Helius DAS API 호출
    GET /v0/searchAssets
    { "ownerAddress": "*", "grouping": ["collection", "<collection_mint>"] }
    → 현재 cNFT 홀더 목록 + 각 URI 조회
    │
    ▼
서버: 각 URI에서 equity_share_bps 파싱
    → 홀더별 분배 금액 계산
    │
    ▼
서버: Phase 2 samu-rewards.record_allocation 호출
    → 각 홀더에 대해 on-chain allocation_record 생성
    │
    ▼
홀더: Phase 2 samu-rewards.claim 호출
    → 자기 몫 SOL 수령
```

## 배포 가이드

### 1. Solana Playground에서 배포

1. https://beta.solpg.io 접속
2. 새 프로젝트 생성 (Framework: Anchor)
3. `lib.rs` 내용 복사 붙여넣기
4. `Cargo.toml`의 `[dependencies]` 설정:
   ```toml
   anchor-lang = "0.30.1"
   anchor-spl = "0.30.1"
   ```
5. Build → 자동 생성된 Program ID 복사
6. `declare_id!()` 교체 후 재빌드
7. Devnet 배포 (SOL Airdrop → Deploy)

### 2. Merkle Tree 계정 생성

배포 후 `initialize` 호출 전에, 별도로 Merkle Tree 계정을 생성해야 합니다.
TypeScript 서버에서 `@solana/spl-account-compression` SDK 사용:

```typescript
import { createAllocTreeIx } from "@solana/spl-account-compression";

const maxDepth = 14;      // 최대 16,384개 cNFT
const maxBufferSize = 64;

const allocTreeIx = await createAllocTreeIx(
  connection, merkleTree.publicKey, payer, { maxDepth, maxBufferSize }, canopyDepth
);
```

### 3. 환경변수 설정

```
SAMU_IP_NFT_PROGRAM_ID = <배포된 Program ID>
```

Phase 2와 마찬가지로 env 변수 존재 여부로 Phase 3 활성화/비활성화.

## 의존성

| 프로그램 | Program ID | 용도 |
|---|---|---|
| Bubblegum | BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY | cNFT 민팅 |
| SPL Account Compression | cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK | Merkle Tree |
| SPL Noop | noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV | 로깅 |
| Helius DAS API | (off-chain) | cNFT 홀더 조회 |

## 보안 특징

1. **admin 전용 mint**: contest_authority PDA가 tree creator → 프로그램 CPI만 mint 가능
2. **finalize 잠금**: finalize 후 추가 mint 불가
3. **equity 범위 검증**: equity_share_bps ≤ 10000
4. **불변 메타데이터**: cNFT leaf 데이터는 온체인 Merkle Tree에 해시로 저장 → 변조 불가
5. **Phase 2와 독립**: 별도 Program ID, 별도 config PDA → Phase 2에 영향 없음
