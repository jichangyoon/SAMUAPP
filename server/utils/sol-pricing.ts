export async function getSOLPriceUSD(): Promise<number> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const data = await res.json();
    return data.solana?.usd || 150;
  } catch {
    return 150;
  }
}
