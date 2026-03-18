# SAMU Rewards Smart Contract - 배포 가이드

## 컨트랙트 구조 이해

**굿즈 결제 흐름:**
```
결제 시:
  원가 → Treasury 지갑 (4WjMuna7...)
  수익 → escrow_pool PDA 직접 입금 (투명한 온체인 보관!)

배송 완료 시 서버가 자동으로:
  1. initialize_pool  → PDA를 Anchor 계정으로 초기화
  2. deposit_profit   → 배분 금액 기록 (SOL 이동 없음)
  3. record_allocation → 유저별 수령 가능액 기록

유저가 Claim 버튼 클릭 시:
  escrow_pool PDA → 유저 지갑 (SOL 전송)
```

**비율:** Creator 45% / Voter 40% / Platform 15%

**Instructions 목록:**
| Instruction | 호출자 | 설명 |
|---|---|---|
| `initialize` | admin (최초 1회) | 45/40/15 비율 등록 |
| `transfer_admin` | admin (최초 1회) | admin을 에스크로 지갑으로 변경 |
| `initialize_pool` | admin (서버 자동) | 배송완료 시 escrow_pool PDA 초기화 |
| `deposit_profit` | admin (서버 자동) | 배분 금액 기록 |
| `record_allocation` | admin (서버 자동) | 유저별 수령액 기록 |
| `claim` | 유저 본인 | 자기 몫 수령 |
| `transfer_admin` | admin | admin 지갑 변경 (긴급용) |

---

## STEP 1: Solana Playground에서 Build & Deploy

### 1-1. Playground 열기
https://beta.solpg.io 접속

### 1-2. 기존 프로젝트가 있으면 코드만 교체
왼쪽 Explorer → `src/lib.rs` 클릭 → 전체 선택 후 삭제  
`contracts/programs/samu-rewards/src/lib.rs` 내용 전체 붙여넣기

> 새 프로젝트라면: "Create a new project" → 이름 `samu-rewards` → Anchor 선택 후 위 동일하게 진행

### 1-3. Cargo.toml 확인
Playground의 `Cargo.toml`에 아래 내용 확인 (없으면 추가):
```toml
[dependencies]
anchor-lang = "0.30.1"
```

### 1-4. Build
왼쪽 **Build** 버튼(망치 아이콘) 클릭 → "Build successful" 대기

### 1-5. Program ID 업데이트
Build 완료 후 왼쪽 하단에 자동 생성된 **Program ID** 확인  
`lib.rs` 상단 `declare_id!("...")` 안의 값을 이 Program ID로 교체  
**다시 Build** (Program ID 반영을 위해)

### 1-6. 네트워크 설정
- **Mainnet 배포**: 왼쪽 하단 지갑 아이콘 클릭 → Endpoint → `Mainnet-beta` 선택
- **Devnet 테스트**: Endpoint → `Devnet` 선택 → Airdrop 버튼으로 SOL 받기

### 1-7. Deploy
**Deploy** 버튼 클릭 → 완료까지 대기

> SOL이 부족하면 → STEP 0 참고 (기존 프로그램 Close하여 SOL 회수)

---

## STEP 0: 기존 프로그램 Close하고 SOL 회수 (재배포 시)

> 컨트랙트를 수정할 때마다 Close → 재배포하면 SOL이 순환됨 (거의 무료)

### Playground 터미널에서 실행:
```bash
solana program close <현재_PROGRAM_ID>
```
예시:
```bash
solana program close 6BqXQqGmV5HdgABgpo1tmWgYhF9GTFcNsFtpTCSn1Mot
```

> 확인 메시지가 뜨면 `y` 입력  
> 완료 후 Playground 지갑에 ~3-4 SOL 반환됨  
> ⚠️ Close 후에는 같은 Program ID 재사용 불가. 새 Program ID 생성됨

---

## STEP 2: 컨트랙트 초기화 (Deploy 직후 반드시 실행)

Playground 왼쪽 **Test** 탭 클릭

### 2-1. `initialize` 호출
```
creator_share: 4500
voter_share: 4000
platform_share: 1500
```
> 합계 10000 (= 100%) 이어야 함

### 2-2. `transfer_admin` 호출
admin을 에스크로 지갑으로 변경해야 서버가 컨트랙트를 제어할 수 있음

```
new_admin: ojzHLw6QxUqprnEjk4gfQM3QXS1RKHWdTLXzZS543cg
```

> ⚠️ 이 단계를 빠트리면 서버가 deposit_profit 등을 호출할 수 없음

---

## STEP 3: Replit Secrets 업데이트

1. Replit 좌측 **Secrets** 탭 열기
2. `SAMU_REWARDS_PROGRAM_ID` 값을 새 Program ID로 업데이트
3. "Start application" 워크플로우 재시작

> 이 값이 설정되면 자동으로 컨트랙트 모드 활성화  
> 미설정 시 기존 DB/에스크로 지갑 방식으로 동작 (하위 호환)

---

## 전체 재배포 체크리스트

컨트랙트 수정 후 처음부터 다시 할 때 순서:

- [ ] Playground 터미널에서 `solana program close <기존_ID>` 실행
- [ ] `lib.rs` 수정 내용 Playground에 붙여넣기
- [ ] Build 클릭 → 성공 확인
- [ ] `declare_id!` 를 새 Program ID로 교체
- [ ] 다시 Build
- [ ] Deploy 클릭 → 완료 확인
- [ ] Test 탭에서 `initialize` 호출 (4500, 4000, 1500)
- [ ] Test 탭에서 `transfer_admin` 호출 (`ojzHLw6QxUqprnEjk4gfQM3QXS1RKHWdTLXzZS543cg`)
- [ ] Replit Secrets에서 `SAMU_REWARDS_PROGRAM_ID` 업데이트
- [ ] "Start application" 재시작

---

## 계정 구조 (PDA 주소 계산)

### `program_config` PDA
```
seeds: ["config"]
역할: admin 주소, 45/40/15 비율 저장
개수: 프로그램당 1개
```

### `escrow_pool` PDA
```
seeds: ["escrow", contest_id (u64 little-endian 8bytes)]
역할: 콘테스트별 수익금 보관 (SOL)
개수: 콘테스트당 1개
```

PDA 주소 미리 계산하기 (Node.js):
```javascript
const { PublicKey } = require('@solana/web3.js');
const programId = new PublicKey('YOUR_PROGRAM_ID');
const contestId = 45; // 원하는 contest_id
const buf = Buffer.alloc(8);
buf.writeBigUInt64LE(BigInt(contestId));
const [pda] = PublicKey.findProgramAddressSync(
  [Buffer.from('escrow'), buf],
  programId
);
console.log(pda.toBase58());
```

### `allocation_record` PDA
```
seeds: ["alloc", contest_id (u64 LE 8bytes), wallet_pubkey (32bytes)]
역할: 유저별 수령 가능액 기록
개수: 유저 × 콘테스트당 1개
```

---

## 보안 특징

1. **온체인 비율 강제**: 45/40/15 비율이 컨트랙트에서 검증 (0.1% tolerance)
2. **이중 수령 방지**: `claimed` 플래그 온체인 기록
3. **Admin 전용**: `deposit_profit`, `record_allocation`은 admin 서명 필수
4. **본인만 수령**: `claim`은 수령인 본인 서명 필수
5. **투명한 보관**: 결제 시 수익이 PDA로 직접 입금 → Solscan에서 누구나 확인 가능

---

## 주요 주소 참고

| 항목 | 주소 |
|---|---|
| Treasury 지갑 | `4WjMuna7iLjPE897m5fphErUt7AnSdjJTky1hyfZZaJk` |
| Escrow 지갑 (= 컨트랙트 admin) | `ojzHLw6QxUqprnEjk4gfQM3QXS1RKHWdTLXzZS543cg` |
| SAMU 토큰 | `EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF` |
| Program ID | Replit Secrets `SAMU_REWARDS_PROGRAM_ID` 확인 |
