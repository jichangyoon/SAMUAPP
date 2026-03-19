import { logger } from "./logger";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { config } from "../config";
import bs58 from "bs58";

export function getConnection(): Connection {
  const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
  const rpcUrl = HELIUS_API_KEY 
    ? `https://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`
    : 'https://api.mainnet-beta.solana.com';
  return new Connection(rpcUrl, 'confirmed');
}

export async function getSamuBalance(walletAddress: string): Promise<number> {
  const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
  const SAMU_TOKEN_MINT_STR = config.SAMU_TOKEN_MINT;
  
  const RPC_ENDPOINTS = [
    `https://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`,
    ...config.RPC_ENDPOINTS
  ];

  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Math.floor(Math.random() * 1000),
          method: 'getTokenAccountsByOwner',
          params: [
            walletAddress,
            { mint: SAMU_TOKEN_MINT_STR },
            { encoding: 'jsonParsed' },
          ],
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();
      if (data.error) continue;

      const tokenAccounts = data.result?.value || [];
      if (tokenAccounts.length === 0) return 0;

      const tokenAccount = tokenAccounts[0];
      return tokenAccount?.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0;
    } catch {
      continue;
    }
  }
  return 0;
}

export async function sendSolFromEscrow(toWallet: string, amountSol: number): Promise<string> {
  const privateKeyStr = process.env.ESCROW_WALLET_PRIVATE_KEY;
  if (!privateKeyStr) throw new Error("ESCROW_WALLET_PRIVATE_KEY not configured");

  const secretKey = bs58.decode(privateKeyStr);
  const keypair = Keypair.fromSecretKey(secretKey);
  const connection = getConnection();
  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: new PublicKey(toWallet),
      lamports,
    })
  );

  const signature = await sendAndConfirmTransaction(connection, tx, [keypair]);
  return signature;
}

// ─── Phase 2: Smart Contract 연동 ───────────────────────────────────────────

/**
 * 컨트랙트가 활성화됐는지 확인.
 * SAMU_REWARDS_PROGRAM_ID env var가 설정된 경우에만 true.
 */
export function isContractEnabled(): boolean {
  return !!config.SAMU_REWARDS_PROGRAM_ID && config.SAMU_REWARDS_PROGRAM_ID !== "11111111111111111111111111111111";
}

/**
 * escrow_pool PDA 주소 계산 (seeds: ["escrow", contest_id_le_bytes])
 */
export function getEscrowPoolPda(contestId: number, programId: PublicKey): [PublicKey, number] {
  const contestIdBuf = Buffer.alloc(8);
  contestIdBuf.writeBigUInt64LE(BigInt(contestId));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), contestIdBuf],
    programId
  );
}

/**
 * allocation_record PDA 주소 계산 (seeds: ["alloc", contest_id_le_bytes, wallet])
 */
export function getAllocationRecordPda(
  contestId: number,
  wallet: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  const contestIdBuf = Buffer.alloc(8);
  contestIdBuf.writeBigUInt64LE(BigInt(contestId));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("alloc"), contestIdBuf, wallet.toBuffer()],
    programId
  );
}

export interface ContractAllocation {
  wallet: string;
  role: "Creator" | "Voter" | "Platform";
  lamports: number;
}

/**
 * 배송 완료 시 escrow_pool PDA를 Anchor 계정으로 초기화.
 * 결제 시 SOL이 PDA에 직접 입금되므로, deposit_profit 호출 전에 먼저 이 함수를 호출해야 함.
 */
export async function initializePool(contestId: number): Promise<string | null> {
  if (!isContractEnabled()) {
    logger.info("[contract] SAMU_REWARDS_PROGRAM_ID not set — skipping initializePool");
    return null;
  }

  const privateKeyStr = process.env.ESCROW_WALLET_PRIVATE_KEY;
  if (!privateKeyStr) {
    logger.warn("[contract] ESCROW_WALLET_PRIVATE_KEY not configured — skipping");
    return null;
  }

  try {
    const programId = new PublicKey(config.SAMU_REWARDS_PROGRAM_ID);
    const secretKey = bs58.decode(privateKeyStr);
    const adminKeypair = Keypair.fromSecretKey(secretKey);
    const connection = getConnection();

    const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
    const [escrowPoolPda] = getEscrowPoolPda(contestId, programId);

    // sha256("global:initialize_pool")[0:8]
    const discriminator = Buffer.from([95, 180, 10, 172, 84, 174, 232, 40]);

    const contestIdBuf = Buffer.alloc(8);
    contestIdBuf.writeBigUInt64LE(BigInt(contestId));

    const data = Buffer.concat([discriminator, contestIdBuf]);

    const ix = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: configPda, isSigner: false, isWritable: false },
        { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: escrowPoolPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    const tx = new Transaction().add(ix);
    const signature = await sendAndConfirmTransaction(connection, tx, [adminKeypair]);
    logger.info(`[contract] initializePool TX: ${signature} | contest=${contestId}`);
    return signature;
  } catch (err: any) {
    logger.error("[contract] initializePool failed:", err?.message || err);
    return null;
  }
}

/**
 * admin이 굿즈 수익 SOL 배분 기록. SOL은 이미 결제 시 PDA에 직접 입금됨.
 * initializePool 호출 후 사용해야 함.
 */
export async function depositProfit(
  contestId: number,
  totalLamports: number,
  creatorTotal: number,
  voterTotal: number,
  platformTotal: number,
): Promise<string | null> {
  if (!isContractEnabled()) {
    logger.info("[contract] SAMU_REWARDS_PROGRAM_ID not set — skipping depositProfit");
    return null;
  }

  const privateKeyStr = process.env.ESCROW_WALLET_PRIVATE_KEY;
  if (!privateKeyStr) {
    logger.warn("[contract] ESCROW_WALLET_PRIVATE_KEY not configured — skipping");
    return null;
  }

  try {
    const programId = new PublicKey(config.SAMU_REWARDS_PROGRAM_ID);
    const secretKey = bs58.decode(privateKeyStr);
    const adminKeypair = Keypair.fromSecretKey(secretKey);
    const connection = getConnection();

    const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
    const [escrowPoolPda] = getEscrowPoolPda(contestId, programId);

    // EscrowPool 계정 렌트 차감 후 실제 배분 가능 금액 계산
    // EscrowPool INIT_SPACE: contest_id(8) + total_deposited(8) + total_claimed(8) + bump(1) = 25, + discriminator(8) = 33 bytes
    const ESCROW_POOL_ACCOUNT_SIZE = 33;
    const escrowBalance = await connection.getBalance(escrowPoolPda);
    const rentExempt = await connection.getMinimumBalanceForRentExemption(ESCROW_POOL_ACCOUNT_SIZE);
    const available = escrowBalance - rentExempt;

    if (available < totalLamports) {
      logger.warn(`[contract] depositProfit: adjusting totalLamports from ${totalLamports} to ${available} (rent=${rentExempt})`);
      const ratio = available / totalLamports;
      creatorTotal = Math.floor(creatorTotal * ratio);
      voterTotal = Math.floor(voterTotal * ratio);
      platformTotal = available - creatorTotal - voterTotal;
      totalLamports = available;
    }

    // sha256("global:deposit_profit")[0:8]
    const discriminator = Buffer.from([128, 94, 241, 212, 35, 142, 213, 247]);

    const contestIdBuf = Buffer.alloc(8);
    contestIdBuf.writeBigUInt64LE(BigInt(contestId));
    const totalBuf = Buffer.alloc(8);
    totalBuf.writeBigUInt64LE(BigInt(totalLamports));
    const creatorBuf = Buffer.alloc(8);
    creatorBuf.writeBigUInt64LE(BigInt(creatorTotal));
    const voterBuf = Buffer.alloc(8);
    voterBuf.writeBigUInt64LE(BigInt(voterTotal));
    const platformBuf = Buffer.alloc(8);
    platformBuf.writeBigUInt64LE(BigInt(platformTotal));

    const data = Buffer.concat([discriminator, contestIdBuf, totalBuf, creatorBuf, voterBuf, platformBuf]);

    const ix = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: escrowPoolPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    const tx = new Transaction().add(ix);
    const signature = await sendAndConfirmTransaction(connection, tx, [adminKeypair]);
    logger.info(`[contract] depositProfit TX: ${signature} | contest=${contestId} | total=${totalLamports}`);
    return signature;
  } catch (err: any) {
    logger.error("[contract] depositProfit failed:", err?.message || err);
    return null;
  }
}

/**
 * record_allocation instruction 데이터 빌더 (내부 공통 함수).
 * 새 컨텍스트:
 *   [0] program_config: mut PDA
 *   [1] admin: Signer (not mut — authority only)
 *   [2] claimer: mut Signer (payer for account creation)
 *   [3] allocation_record: mut PDA
 *   [4] system_program
 */
function buildRecordAllocationInstruction(
  programId: PublicKey,
  configPda: PublicKey,
  adminPubkey: PublicKey,
  claimerPubkey: PublicKey,
  allocationRecordPda: PublicKey,
  contestId: number,
  recipientWallet: PublicKey,
  role: "Creator" | "Voter" | "Platform",
  lamports: number,
): TransactionInstruction {
  // sha256("global:record_allocation")[0:8]
  const discriminator = Buffer.from([77, 89, 9, 55, 102, 64, 146, 78]);

  const contestIdBuf = Buffer.alloc(8);
  contestIdBuf.writeBigUInt64LE(BigInt(contestId));
  const walletBuf = recipientWallet.toBuffer();
  const roleMap: Record<string, number> = { Creator: 0, Voter: 1, Platform: 2 };
  const roleBuf = Buffer.alloc(1);
  roleBuf.writeUInt8(roleMap[role], 0);
  const lamportsBuf = Buffer.alloc(8);
  lamportsBuf.writeBigUInt64LE(BigInt(lamports), 0);

  const data = Buffer.concat([discriminator, contestIdBuf, walletBuf, roleBuf, lamportsBuf]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: adminPubkey, isSigner: true, isWritable: false },
      { pubkey: claimerPubkey, isSigner: true, isWritable: true },
      { pubkey: allocationRecordPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * [핵심 함수] record_allocation + claim 을 하나의 트랜잭션으로 빌드.
 *
 * 흐름:
 *   1. 서버가 record_allocation + claim 명령어 포함 트랜잭션 생성
 *   2. admin(에스크로 지갑)이 pre-sign (금액 권한 보증)
 *   3. 직렬화 후 base64 반환 → 프론트엔드로 전달
 *   4. 유저 지갑이 서명 추가 후 브로드캐스트 (유저가 가스비 부담)
 *
 * 유저가 서명하는 이유: claimer = payer (계정 생성비 + 가스비 모두 유저 부담)
 */
export async function buildRecordAndClaimTransaction(
  contestId: number,
  claimerWallet: string,
  lamports: number,
  role: "Creator" | "Voter" | "Platform",
): Promise<string | null> {
  if (!isContractEnabled()) return null;

  const privateKeyStr = process.env.ESCROW_WALLET_PRIVATE_KEY;
  if (!privateKeyStr) {
    logger.warn("[contract] ESCROW_WALLET_PRIVATE_KEY not configured — skipping buildRecordAndClaimTransaction");
    return null;
  }

  try {
    const programId = new PublicKey(config.SAMU_REWARDS_PROGRAM_ID);
    const claimerPubkey = new PublicKey(claimerWallet);
    const secretKey = bs58.decode(privateKeyStr);
    const adminKeypair = Keypair.fromSecretKey(secretKey);
    const connection = getConnection();

    const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
    const [allocationRecordPda] = getAllocationRecordPda(contestId, claimerPubkey, programId);
    const [escrowPoolPda] = getEscrowPoolPda(contestId, programId);

    // 이미 on-chain record 존재하면 claim-only로 처리
    const accountInfo = await connection.getAccountInfo(allocationRecordPda);
    if (accountInfo && accountInfo.data.length > 0) {
      const claimedOffset = 8 + 8 + 32 + 1 + 8;
      if (accountInfo.data[claimedOffset] === 1) {
        logger.info(`[contract] Already claimed: contest=${contestId} wallet=${claimerWallet}`);
        return null;
      }
      // record가 이미 있으면 claim-only tx 반환
      return buildClaimTransaction(contestId, claimerWallet);
    }

    // ── Instruction 1: record_allocation (admin pre-sign) ──
    const recordIx = buildRecordAllocationInstruction(
      programId,
      configPda,
      adminKeypair.publicKey,
      claimerPubkey,
      allocationRecordPda,
      contestId,
      claimerPubkey,
      role,
      lamports,
    );

    // ── Instruction 2: claim ──
    // sha256("global:claim")[0:8]
    const claimDiscriminator = Buffer.from([62, 198, 214, 193, 213, 159, 108, 210]);
    const contestIdBuf = Buffer.alloc(8);
    contestIdBuf.writeBigUInt64LE(BigInt(contestId));
    const claimData = Buffer.concat([claimDiscriminator, contestIdBuf]);

    const claimIx = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: allocationRecordPda, isSigner: false, isWritable: true },
        { pubkey: escrowPoolPda, isSigner: false, isWritable: true },
        { pubkey: claimerPubkey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: claimData,
    });

    // ── 트랜잭션 생성: feePayer = claimer(유저) ──
    const { blockhash } = await connection.getLatestBlockhash();
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = claimerPubkey;
    tx.add(recordIx);
    tx.add(claimIx);

    // admin pre-sign (record_allocation 권한 보증)
    tx.partialSign(adminKeypair);

    // 직렬화 (유저 서명 아직 없음 → requireAllSignatures: false)
    const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
    logger.info(`[contract] buildRecordAndClaimTransaction built | contest=${contestId} | wallet=${claimerWallet} | lamports=${lamports} | role=${role}`);
    return serialized.toString("base64");
  } catch (err: any) {
    logger.error("[contract] buildRecordAndClaimTransaction failed:", err?.message || err);
    return null;
  }
}

/**
 * 유저가 직접 서명할 claim-only TX를 직렬화해서 반환.
 * allocation_record가 이미 on-chain에 존재할 때 사용 (backwards compat).
 * 프론트에서 Privy로 서명 → 브로드캐스트.
 */
export async function buildClaimTransaction(
  contestId: number,
  claimerWallet: string
): Promise<string | null> {
  if (!isContractEnabled()) return null;

  try {
    const programId = new PublicKey(config.SAMU_REWARDS_PROGRAM_ID);
    const claimerPubkey = new PublicKey(claimerWallet);
    const connection = getConnection();

    const [allocationRecordPda] = getAllocationRecordPda(contestId, claimerPubkey, programId);
    const [escrowPoolPda] = getEscrowPoolPda(contestId, programId);

    // allocation_record 계정 존재 + claimed 여부 확인
    const accountInfo = await connection.getAccountInfo(allocationRecordPda);
    if (!accountInfo || accountInfo.data.length === 0) {
      logger.info(`[contract] No allocation_record for contest=${contestId} wallet=${claimerWallet}`);
      return null;
    }

    // claimed 플래그 체크 (discriminator 8 + contest_id 8 + wallet 32 + role 1 + lamports 8)
    const claimedOffset = 8 + 8 + 32 + 1 + 8;
    if (accountInfo.data[claimedOffset] === 1) {
      logger.info(`[contract] Already claimed: contest=${contestId} wallet=${claimerWallet}`);
      return null;
    }

    // sha256("global:claim")[0:8]
    const discriminator = Buffer.from([62, 198, 214, 193, 213, 159, 108, 210]);

    const contestIdBuf = Buffer.alloc(8);
    contestIdBuf.writeBigUInt64LE(BigInt(contestId));
    const data = Buffer.concat([discriminator, contestIdBuf]);

    const ix = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: allocationRecordPda, isSigner: false, isWritable: true },
        { pubkey: escrowPoolPda, isSigner: false, isWritable: true },
        { pubkey: claimerPubkey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    const { blockhash } = await connection.getLatestBlockhash();
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = claimerPubkey;
    tx.add(ix);

    const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
    return serialized.toString("base64");
  } catch (err: any) {
    logger.error("[contract] buildClaimTransaction failed:", err?.message || err);
    return null;
  }
}

/**
 * on-chain allocation_record에서 클레임 가능 lamports 조회.
 */
export async function getOnChainClaimable(
  contestId: number,
  walletAddress: string
): Promise<{ lamports: number; claimed: boolean } | null> {
  if (!isContractEnabled()) return null;

  try {
    const programId = new PublicKey(config.SAMU_REWARDS_PROGRAM_ID);
    const [pda] = getAllocationRecordPda(contestId, new PublicKey(walletAddress), programId);
    const connection = getConnection();

    const accountInfo = await connection.getAccountInfo(pda);
    if (!accountInfo || accountInfo.data.length === 0) return null;

    const data = accountInfo.data;
    // layout: 8(disc) + 8(contest_id) + 32(wallet) + 1(role) + 8(lamports) + 1(claimed) + 1(bump)
    const lamportsBuf = data.slice(8 + 8 + 32 + 1, 8 + 8 + 32 + 1 + 8);
    const lamports = Number(lamportsBuf.readBigUInt64LE());
    const claimed = data[8 + 8 + 32 + 1 + 8] === 1;

    return { lamports, claimed };
  } catch {
    return null;
  }
}
