import { Connection, PublicKey, Transaction, TransactionInstruction, Keypair, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import bs58 from "bs58";

const PROGRAM_ID = process.env.SAMU_REWARDS_PROGRAM_ID!;
const PRIVATE_KEY = process.env.ESCROW_WALLET_PRIVATE_KEY!;
const CONTEST_ID = 45;

async function main() {
  const originalTotal = 30804000;
  const originalCreator = 13861800;
  const originalVoter = 12321600;
  const originalPlatform = 4620600;

  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const programId = new PublicKey(PROGRAM_ID);
  const adminKeypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));

  const contestIdBytes = Buffer.alloc(8);
  contestIdBytes.writeBigUInt64LE(BigInt(CONTEST_ID));
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
  const [escrowPoolPda] = PublicKey.findProgramAddressSync([Buffer.from("escrow"), contestIdBytes], programId);

  const ESCROW_POOL_SIZE = 33;
  const escrowBalance = await connection.getBalance(escrowPoolPda);
  const rentExempt = await connection.getMinimumBalanceForRentExemption(ESCROW_POOL_SIZE);
  const available = escrowBalance - rentExempt;

  console.log(`PDA: ${escrowPoolPda.toString()}`);
  console.log(`Balance: ${escrowBalance}, Rent: ${rentExempt}, Available: ${available}`);

  let totalLamports = originalTotal;
  let creatorTotal = originalCreator;
  let voterTotal = originalVoter;
  let platformTotal = originalPlatform;

  if (available < originalTotal) {
    const ratio = available / originalTotal;
    creatorTotal = Math.floor(originalCreator * ratio);
    voterTotal = Math.floor(originalVoter * ratio);
    platformTotal = available - creatorTotal - voterTotal;
    totalLamports = available;
    console.log(`Adjusted: total=${totalLamports}, creator=${creatorTotal}, voter=${voterTotal}, platform=${platformTotal}`);
    console.log(`Check sum: ${creatorTotal + voterTotal + platformTotal} == ${totalLamports}`);
  }

  const discriminator = Buffer.from([128, 94, 241, 212, 35, 142, 213, 247]);
  const contestIdBuf = Buffer.alloc(8); contestIdBuf.writeBigUInt64LE(BigInt(CONTEST_ID));
  const totalBuf = Buffer.alloc(8); totalBuf.writeBigUInt64LE(BigInt(totalLamports));
  const creatorBuf = Buffer.alloc(8); creatorBuf.writeBigUInt64LE(BigInt(creatorTotal));
  const voterBuf = Buffer.alloc(8); voterBuf.writeBigUInt64LE(BigInt(voterTotal));
  const platformBuf = Buffer.alloc(8); platformBuf.writeBigUInt64LE(BigInt(platformTotal));

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
  const sig = await sendAndConfirmTransaction(connection, tx, [adminKeypair]);
  console.log(`✅ depositProfit TX: ${sig}`);
}

main().catch(console.error);
