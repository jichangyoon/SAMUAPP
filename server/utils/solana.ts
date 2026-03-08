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
  const HELIUS_API_KEY = process.env.VITE_HELIUS_API_KEY;
  const rpcUrl = HELIUS_API_KEY 
    ? `https://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`
    : 'https://api.mainnet-beta.solana.com';
  return new Connection(rpcUrl, 'confirmed');
}

export async function getSamuBalance(walletAddress: string): Promise<number> {
  const HELIUS_API_KEY = process.env.VITE_HELIUS_API_KEY;
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
 * 서버(admin 키페어)가 deposit_and_allocate instruction을 직접 빌드/전송.
 * 컨트랙트 PDA로 SOL을 예치하고 각 수령인의 allocation_record를 생성.
 *
 * SAMU_REWARDS_PROGRAM_ID 미설정 시 graceful skip.
 */
export async function depositAndAllocate(
  contestId: number,
  allocations: ContractAllocation[]
): Promise<string | null> {
  if (!isContractEnabled()) {
    console.log("[contract] SAMU_REWARDS_PROGRAM_ID not set — skipping on-chain deposit");
    return null;
  }

  const privateKeyStr = process.env.ESCROW_WALLET_PRIVATE_KEY;
  if (!privateKeyStr) {
    console.warn("[contract] ESCROW_WALLET_PRIVATE_KEY not configured — skipping");
    return null;
  }

  try {
    const programId = new PublicKey(config.SAMU_REWARDS_PROGRAM_ID);
    const secretKey = bs58.decode(privateKeyStr);
    const adminKeypair = Keypair.fromSecretKey(secretKey);
    const connection = getConnection();

    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      programId
    );
    const [escrowPoolPda] = getEscrowPoolPda(contestId, programId);

    // allocation PDA 목록 (remaining_accounts)
    const allocationPdas = allocations.map(({ wallet }) => {
      const [pda] = getAllocationRecordPda(contestId, new PublicKey(wallet), programId);
      return pda;
    });

    // deposit_and_allocate instruction 직접 빌드 (Anchor discriminator)
    const discriminator = Buffer.from([
      // sha256("global:deposit_and_allocate")[0:8]
      // Anchor 방식: sha256("global:<instruction_name>").slice(0,8)
      // 사전 계산된 값 (lib.rs 메서드명과 정확히 일치해야 함)
      0xd7, 0x85, 0x9f, 0x5d, 0x3b, 0x9d, 0x4e, 0x12,
    ]);

    // contest_id (u64 LE) + allocations 직렬화
    const contestIdBuf = Buffer.alloc(8);
    contestIdBuf.writeBigUInt64LE(BigInt(contestId));

    // Vec<Allocation> 직렬화: len (u32 LE) + each Allocation
    const allocBufs: Buffer[] = [];
    allocBufs.push(Buffer.alloc(4));
    allocBufs[0].writeUInt32LE(allocations.length, 0);

    for (const alloc of allocations) {
      const walletBuf = new PublicKey(alloc.wallet).toBuffer();
      // Role enum: Creator=0, Voter=1, Platform=2
      const roleMap: Record<string, number> = { Creator: 0, Voter: 1, Platform: 2 };
      const roleBuf = Buffer.alloc(1);
      roleBuf.writeUInt8(roleMap[alloc.role], 0);
      const lamportsBuf = Buffer.alloc(8);
      lamportsBuf.writeBigUInt64LE(BigInt(alloc.lamports), 0);
      allocBufs.push(Buffer.concat([walletBuf, roleBuf, lamportsBuf]));
    }

    const data = Buffer.concat([discriminator, contestIdBuf, ...allocBufs]);

    const remainingAccounts = allocationPdas.map(pda => ({
      pubkey: pda,
      isSigner: false,
      isWritable: true,
    }));

    const ix = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: escrowPoolPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ...remainingAccounts,
      ],
      data,
    });

    const tx = new Transaction().add(ix);
    const signature = await sendAndConfirmTransaction(connection, tx, [adminKeypair]);

    console.log(`[contract] deposit_and_allocate TX: ${signature} | contest=${contestId} | ${allocations.length} allocations`);
    return signature;
  } catch (err: any) {
    console.error("[contract] deposit_and_allocate failed:", err?.message || err);
    return null;
  }
}

/**
 * 유저가 직접 서명할 claim TX를 직렬화해서 반환.
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
      console.log(`[contract] No allocation_record for contest=${contestId} wallet=${claimerWallet}`);
      return null;
    }

    // claimed 플래그 체크 (discriminator 8바이트 + contest_id 8 + wallet 32 + role 1 + lamports 8 + claimed 1)
    const claimedOffset = 8 + 8 + 32 + 1 + 8;
    if (accountInfo.data[claimedOffset] === 1) {
      console.log(`[contract] Already claimed: contest=${contestId} wallet=${claimerWallet}`);
      return null;
    }

    // claim instruction discriminator
    const discriminator = Buffer.from([
      // sha256("global:claim")[0:8]
      0x3e, 0xc6, 0xd6, 0xc1, 0xd5, 0x9f, 0x5f, 0x2a,
    ]);

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
    console.error("[contract] buildClaimTransaction failed:", err?.message || err);
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
