import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
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
