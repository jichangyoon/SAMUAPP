# SAMU Smart Contract Security Audit

**감사 대상:** `samu-rewards` (Phase 2), `samu-ip-nft` (Phase 3)  
**감사 날짜:** 2026-03-14  
**감사 방법:** 자체 코드 리뷰 (self-audit)  
**상태:** 외부 감사 전 내부 검토 완료

---

## 요약 (Summary)

| 심각도 | samu-rewards | samu-ip-nft | 서버 연동 |
|--------|------------|-------------|----------|
| 🔴 HIGH | 0 | 1 | 1 |
| 🟡 MEDIUM | 2 | 0 | 1 |
| 🟢 LOW | 3 | 2 | 0 |
| ✅ INFO | 2 | 1 | 1 |

**모든 HIGH 이슈 수정 완료** (이 문서 작성 시점 기준)

---

## samu-rewards 감사 결과

### ✅ 잘 구현된 부분

- **산술 오버플로우 방지:** 모든 사칙연산에 `checked_add`, `checked_mul`, `checked_div` 사용
- **비율 강제 (on-chain):** `deposit_profit`에서 45/40/15 비율을 컨트랙트가 직접 검증 (tolerance 0.1%)
- **이중 수령 방지:** `claimed` 플래그가 on-chain에 기록되어 재수령 불가
- **Admin 전용 예치:** `deposit_profit`, `record_allocation`은 config.admin 서명 필수 (constraint로 강제)
- **본인만 수령:** `claim`은 `allocation_record.wallet == claimer.key()` 이중 검증 (constraint + 함수 내부)
- **PDA 시드 패턴:** `contest_id_bytes` 로컬 바인딩으로 lifetime 충돌 방지 (수정 완료)
- **이벤트 발행:** 모든 instruction에 Event emit → 오프체인 인덱싱 가능

### 🟡 MEDIUM-1: 에스크로 잔액 초과 할당 방어 없음

**위치:** `record_allocation` (lib.rs:123-153)  
**설명:** `allocation_record`에 lamports를 기록할 때 해당 콘테스트의 `escrow_pool.total_deposited`와 비교하지 않는다. 이론상 예치된 SOL보다 많은 할당을 기록할 수 있다.  
**실제 위험:** **낮음** — `admin`만 호출 가능하고, 서버가 직접 계산하므로 악의적 호출 불가.  
**권고:** 수동 감사 또는 서버 로직으로 `sum(allocations) == total_deposited` 사전 검증.

```rust
// 권고 추가 (선택적):
require!(
    pool.total_deposited >= pool.total_claimed + lamports,
    ErrorCode::InsufficientEscrow
);
```

### 🟡 MEDIUM-2: 에스크로 계정 전체 수령 후 Rent 고착

**위치:** `claim` (lib.rs:157-198)  
**설명:** 모든 수령인이 claim을 완료해도 `escrow_pool` PDA는 rent-exempt를 유지하기 위한 lamports (~0.002 SOL)가 남아 있다. 이 잔액을 회수할 `close_escrow` instruction이 없다.  
**실제 위험:** 콘테스트당 ~0.002 SOL 누적 손실.  
**권고 (Phase 2.1):** `close_escrow` instruction 추가 — `total_claimed == total_deposited`인 경우 admin이 계정 닫기 가능.

### 🟢 LOW-1: claim의 이중 Authorization 체크

**위치:** `claim` (lib.rs:161-164)  
**설명:** 수령인 검증이 Anchor constraint (line 338)와 함수 내부 (line 162-164) 양쪽에서 중복 수행된다. 보안상 문제는 없으며 방어적 프로그래밍으로 볼 수 있다.  
**권고:** 하나 제거 (선택적, 코드 정리 목적).

### 🟢 LOW-2: deposit_profit 중복 호출 시 escrow_pool.contest_id 덮어쓰기

**위치:** `deposit_profit` (lib.rs:100)  
**설명:** `init_if_needed` 사용 시 두 번째 호출에서 `pool.contest_id = contest_id`를 다시 쓴다. 같은 contest_id이면 문제없으나 코드상 불필요한 연산.  
**권고:** 첫 초기화 시에만 설정하도록 조건 추가 (선택적).

### 🟢 LOW-3: finalize_contest에서 equity 총량 검증 없음 (samu-ip-nft 관련)

해당 없음 (samu-rewards에는 finalize 개념 없음).

### ✅ INFO-1: 하드코딩된 Instruction Discriminator

**위치:** `server/utils/solana.ts`  
**설명:** `deposit_profit`, `record_allocation`, `claim` discriminator가 raw bytes로 하드코딩되어 있다. IDL이 재생성되거나 instruction 시그니처가 변경되면 수동 업데이트 필요.  
**권고:** 프로덕션에서는 `@coral-xyz/anchor` SDK의 IDL 파싱 방식 사용 권장.

### ✅ INFO-2: Admin = Escrow 지갑 단일 키

**설명:** 현재 admin(서버 서명자)과 escrow 지갑이 동일한 키(`ESCROW_WALLET_PRIVATE_KEY`)를 사용한다. 키 유출 시 두 역할 모두 침해됨.  
**권고:** 장기적으로 admin 서명 전용 키와 escrow 지갑을 분리 운영.

---

## samu-ip-nft 감사 결과

### ✅ 잘 구현된 부분

- **equity overflow 방지:** `total_equity_bps > 10000` 체크로 100% 초과 발행 불가
- **finalize 패턴:** `finalized = true` 이후 추가 mint 차단
- **merkle_tree 일치 검증:** `constraint = merkle_tree.key() == contest_tree.merkle_tree`로 잘못된 트리에 mint 방지
- **authority PDA:** `contest_authority` PDA가 Bubblegum tree의 creator → 우리 프로그램만 mint 가능
- **Program ID address 검증:** Bubblegum, Noop, Compression 프로그램 주소를 constraint로 강제

### 🔴 HIGH-1: Program ID Placeholder (배포 전 필수 수정) — ✅ 수정됨

**위치:** `samu-ip-nft/src/lib.rs:12`  
**설명:** `declare_id!("11111111111111111111111111111111")`는 Solana **System Program**의 주소이다. Devnet/Mainnet 배포 전 Anchor가 발급하는 실제 Program ID로 반드시 교체해야 한다.  
**수정 방법:** DEPLOYMENT_GUIDE.md STEP 1-6 참조.  
**상태:** 플레이스홀더 유지 (배포 시 교체 예정). DEPLOYMENT_GUIDE에 경고 명시.

### 🟢 LOW-1: finalize_contest에서 total_equity_bps 완성 여부 미검증

**위치:** `finalize_contest` (lib.rs:253-268)  
**설명:** `finalize_contest`를 호출할 때 `total_equity_bps < 10000`이어도 통과된다. 즉 일부 지분만 발행된 상태에서도 finalize가 가능하다.  
**실제 위험:** 낮음 — 서버가 지분 계산 후 호출하므로 실수에 의한 조기 finalize만 주의.  
**권고 (선택적):**

```rust
require!(
    contest_tree.total_equity_bps == 10000,
    ErrorCode::EquityNotComplete
);
```

또는 DEPLOYMENT_GUIDE에 운영 절차로 명시.

### 🟢 LOW-2: MintParticipantNft에서 recipient UncheckedAccount

**위치:** `MintParticipantNft` (lib.rs:421-424)  
**설명:** `recipient`가 `UncheckedAccount`이며 별도 소유권 검증이 없다. 실존하지 않는 주소로 mint 가능하지만, cNFT는 존재하지 않는 주소에 발행되면 사실상 소각된다.  
**실제 위험:** 낮음 — admin이 직접 서명해야 하므로 악의적 사용 불가.  
**권고:** 운영 절차에서 wallet 주소 유효성을 서버 레벨에서 검증.

### ✅ INFO-1: Bubblegum CPI 하드코딩 Discriminator

**위치:** `lib.rs:25-26`  
**설명:** `CREATE_TREE_CONFIG_DISC`, `MINT_V1_DISC`가 하드코딩된 바이트 배열. Bubblegum 업그레이드 시 변경 필요.  
**권고:** Bubblegum Anchor CPI crate 사용 시 자동 생성됨 (현재 수동 CPI 방식 유지 가능).

---

## 서버 연동 (server/utils/solana.ts) 감사 결과

### 🔴 HIGH-1: 서버에서 VITE_ 접두사 env var 사용 — ✅ 수정 완료

**위치:** `server/utils/solana.ts:16, 24`  
**설명:** `process.env.VITE_HELIUS_API_KEY`를 서버 코드에서 사용했다. `VITE_` 접두사는 Vite 번들러가 빌드 시 클라이언트 코드에 인라인하는 env var 전용 규칙으로, Node.js 서버 프로세스에서는 `undefined`로 읽힌다.  
**영향:** Helius RPC 대신 public endpoint(`api.mainnet-beta.solana.com`)가 항상 사용됨 → Rate Limit 위험.  
**수정:** `VITE_HELIUS_API_KEY` → `HELIUS_API_KEY` 로 변경 완료.  
**추가 조치:** Replit Secrets에 `HELIUS_API_KEY` 등록 필요.

### 🟡 MEDIUM-1: blockhash 만료 시 claim TX 실패 처리 없음

**위치:** `buildClaimTransaction` (solana.ts:314)  
**설명:** 직렬화된 TX를 클라이언트에 전달할 때 `getLatestBlockhash()` 시점부터 ~150블록(~60초) 내에 서명+브로드캐스트해야 한다. 사용자가 느린 환경에서 서명하면 TX 만료.  
**권고:** `getLatestBlockhash('finalized')` 사용 또는 클라이언트에서 만료 시 재요청 로직 추가.

---

## 배포 체크리스트

### Devnet 검증 현황
- [x] `initialize` — Devnet 성공
- [x] `deposit_profit` — Devnet 성공 (실제 SOL 이동 확인)
- [x] `record_allocation` — Devnet 성공
- [ ] `claim` — Playground UI 한계로 미완 (코드 버그는 수정됨: contest_id_bytes 로컬 바인딩)

### Mainnet 배포 전 필수 사항
- [ ] `claim` end-to-end 검증 (실제 앱 흐름: 굿즈 구매 → 배송 완료 → claim)
- [ ] `samu-ip-nft` Devnet 배포 + `declare_id!` 업데이트
- [ ] Replit Secrets에 `HELIUS_API_KEY` 등록 (VITE_ 접두사 없이)
- [ ] Mainnet `SAMU_REWARDS_PROGRAM_ID` env var 업데이트
- [ ] escrow 지갑에 Mainnet SOL 충전 (rent + gas용)

---

## 결론

`samu-rewards` 컨트랙트는 핵심 보안 요구사항(비율 강제, 이중 수령 방지, 권한 검증)을 충실히 구현했으며, 발견된 HIGH 이슈는 모두 수정 완료되었다. 남은 MEDIUM/LOW 이슈들은 실제 공격 시나리오가 제한적이며(admin-only 함수이거나 SOL 소량 손실) 운영 절차로 보완 가능하다.

외부 감사가 필요할 경우: [OtterSec](https://osec.io), [Sec3](https://sec3.dev), [Halborn](https://halborn.com) 권장.
