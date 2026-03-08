# SAMU Rewards Smart Contract - 배포 가이드

## 개요

이 컨트랙트는 굿즈 판매 수익(SOL)을 온체인에서 투명하게 분배합니다.

**핵심 로직:**
1. 굿즈 결제 시 → 수익 SOL이 `escrow_pool` PDA로 들어옴 (구매자 TX)
2. 배달 완료 후 → 서버(admin)가 `deposit_and_allocate` 호출 → 각 수령인 `allocation_record` 생성
3. 수령인이 `claim` 호출 → 자기 지분을 직접 수령 (가스비 본인 부담, ~$0.001)

**비율:** Creator 45% / Voter 40% / Platform 15%

---

## STEP 1: Solana Playground에서 배포

### 1-1. Solana Playground 열기
https://beta.solpg.io 접속

### 1-2. 새 프로젝트 생성
1. "Create a new project" 클릭
2. 이름: `samu-rewards`
3. 프레임워크: **Anchor** 선택

### 1-3. 코드 붙여넣기
`contracts/programs/samu-rewards/src/lib.rs` 파일 전체를 복사해서  
Solana Playground의 `lib.rs`에 붙여넣기

### 1-4. Cargo.toml 의존성 확인
Playground의 Cargo.toml에 아래 내용이 있는지 확인:
```toml
[dependencies]
anchor-lang = "0.30.1"
```
(anchor-spl은 이제 불필요 — SOL 네이티브 방식으로 변경됨)

### 1-5. Build
1. 왼쪽 Build 버튼(망치 아이콘) 클릭
2. 컴파일 성공 대기
3. 자동 생성된 **Program ID** 복사 (예: `AbCd...XyZ1`)

### 1-6. Program ID 업데이트
`lib.rs` 상단의 `declare_id!("11111111111111111111111111111111")`를  
복사한 Program ID로 교체 후 **재빌드**

### 1-7. Devnet 배포 (테스트)
1. Settings → Endpoint → **Devnet** 선택
2. SOL Airdrop 받기 (Playground 내 Airdrop 버튼)
3. **Deploy** 클릭
4. Program ID 저장

---

## STEP 2: 컨트랙트 초기화 (최초 1회)

Playground에서 아래 instruction 호출:

### `initialize`
```json
{
  "creator_share": 4500,
  "voter_share": 4000,
  "platform_share": 1500
}
```
> 합계가 10000(100%)이어야 함

---

## STEP 3: 웹앱 연동

### 3-1. 환경변수 설정
Replit Secrets에 추가:
```
SAMU_REWARDS_PROGRAM_ID = <배포된 Program ID>
```

이 값이 설정되면 자동으로 컨트랙트 모드로 전환됩니다.  
미설정 시 기존 escrow 지갑 방식으로 동작 (하위 호환).

### 3-2. 서버 재시작
Replit에서 "Start application" 워크플로우 재시작

---

## STEP 4: Mainnet 배포

1. Playground → Settings → **Mainnet-beta** 선택
2. 실제 SOL로 배포 (약 0.003 SOL 소요)
3. `initialize` 재호출
4. `SAMU_REWARDS_PROGRAM_ID` 환경변수를 Mainnet Program ID로 업데이트

---

## 계정 구조

### `program_config` PDA (seeds: `["config"]`)
- admin: 관리자 지갑
- creator_share: 4500 (45%)
- voter_share: 4000 (40%)
- platform_share: 1500 (15%)

### `escrow_pool` PDA (seeds: `["escrow", contest_id_LE8]`)
- 콘테스트별 SOL 보관소
- total_deposited: 총 입금액
- total_claimed: 총 수령액

### `allocation_record` PDA (seeds: `["alloc", contest_id_LE8, wallet_pubkey]`)
- 유저별 수령 가능액 기록
- lamports: 수령 가능 lamports
- claimed: 수령 여부 (true면 이미 수령)

---

## Instructions

| Instruction | 호출자 | 설명 |
|---|---|---|
| `initialize` | admin | 최초 1회 설정 |
| `deposit_and_allocate` | admin (서버) | 수익 입금 + 수령인 기록 |
| `claim` | 유저 (자기 서명) | 자기 몫 수령 |
| `transfer_admin` | admin | admin 지갑 변경 |

---

## 보안 특징

1. **on-chain 비율 강제**: 45/40/15 비율이 컨트랙트에서 검증 (0.1% tolerance)
2. **이중 수령 방지**: `claimed` 플래그 on-chain 기록
3. **Admin 전용 예치**: `deposit_and_allocate`는 admin 서명 필수
4. **자기 본인만 수령**: `claim`은 수령인 본인 서명 필수
5. **Devnet 완전 테스트 후 Mainnet 배포 권장**
