# SAMU — Community IP Protocol on Solana

> Memes are cultural assets worth billions. Creators and communities capture none of it.
> **SAMU turns community-curated memes into tradeable on-chain intellectual property.**

🌐 **[samu.ink](https://samu.ink)** — Live on Solana Mainnet

---

## The Problem

Internet memes generate massive cultural and economic value — yet the creators, remixers, and communities that make them go viral receive nothing. There is no mechanism for a meme to become a real asset that its community can own, trade, or profit from.

## The Solution

SAMU is a protocol where a meme's journey doesn't end at virality — it begins there.

```
Community votes on memes with SAMU tokens
        ↓
Winning memes become physical merchandise (Kiss-Cut Stickers via Printful)
        ↓
Goods revenue is split on-chain: 45% Creators / 40% Voters / 15% Platform
        ↓
Every participant receives a cNFT representing their IP equity stake (Phase 3)
        ↓
Those stakes are transferable — creating a secondary market for meme IP
        ↓
Brands and developers license IP from cNFT holders on an open marketplace (Phase 5)
```

---

## What's Working Today (Phase 1 ✅)

| Feature | Status |
|---|---|
| Meme contest submission & SPL token voting | ✅ Live |
| On-chain SAMU token transfers to treasury | ✅ Live |
| Solana Blinks (vote from X/Twitter, Discord) | ✅ Live |
| Printful merchandise fulfillment (Kiss-Cut Stickers) | ✅ Live |
| SOL goods payment with real-time CoinGecko pricing | ✅ Live |
| On-chain payment splitting at purchase | ✅ Live |
| Creator & Voter SOL reward claiming | ✅ Live |
| Global SAMU Map (orders visualized worldwide) | ✅ Live |
| Contest archive with full stats & reward history | ✅ Live |
| Privy embedded wallet + external wallet support | ✅ Live |

---

## Token Architecture

| Token | Role |
|---|---|
| **SAMU** (SPL) | Voting rights. Transferred on-chain to treasury per vote. Voting amount determines reward share. |
| **SOL** | Merchandise payment & reward distribution currency. Revenue split executed on-chain at purchase. |

---

## Protocol Roadmap

| Phase | Name | Status | What it unlocks |
|---|---|---|---|
| 1 | Meme Incubator App | ✅ Complete | Contest → Goods → SOL Rewards |
| 2 | On-chain Escrow (Anchor) | ⚙️ Devnet verified | SOL rewards enforced by smart contract, not server |
| 3 | IP Equity cNFT | 📐 Contract written | Every participant gets a transferable IP stake |
| 4 | Community Factory | 🔭 Planned | Anyone can launch their own meme community permissionlessly |
| 5 | License NFT Marketplace | 🔭 Planned | Brands buy IP rights from cNFT holders in USDC |
| 6 | Solana SVM Appchain | 🔭 Planned | Dedicated appchain for meme IP at scale |

### Phase 2 — On-chain Escrow (Anchor) ⚙️

A custom Anchor program (`samu-rewards`) replaces server-held escrow with PDA-controlled accounts. The 45/40/15 split is enforced **on-chain** — the contract rejects any deposit that doesn't match configured ratios (within 0.1% tolerance).

- `initialize` ✅ Devnet verified
- `deposit_profit` ✅ Devnet verified (real SOL movement confirmed)
- `record_allocation` ✅ Devnet verified
- `claim` — code complete, Mainnet end-to-end pending

### Phase 3 — IP Equity cNFT 📐

When a contest ends, **every participant receives a compressed NFT** (via Metaplex Bubblegum) encoding their equity stake:

- Creator cNFT: equity proportional to votes received
- Voter cNFT: equity proportional to SAMU spent voting

These cNFTs are **fully transferable**. When a holder sells their cNFT, revenue attribution follows it. Goods revenue queries current holders via Helius DAS API and distributes SOL accordingly — turning meme IP into a living, tradeable asset class.

---

## Smart Contracts

| Program | Framework | Status | Program ID |
|---|---|---|---|
| `samu-rewards` | Anchor 0.30 | Devnet deployed ✅ | `FbKgJNWn8tn2BTzGZ2qBWRh4zYSLbdPbQjBCzESdhPU7` |
| `samu-ip-nft` | Anchor 0.30 + Bubblegum | Written, Devnet pending | TBD on deploy |

---

## Tech Stack

**Frontend:** React 18, TypeScript, Vite, TanStack Query, Wouter, Tailwind CSS, shadcn/ui

**Backend:** Express.js, TypeScript, PostgreSQL, Drizzle ORM

**Blockchain:** Solana Web3.js, Anchor, SPL Token, Metaplex Bubblegum (cNFT), Helius RPC & DAS API

**Auth:** Privy (Solana-only — email, embedded wallet, external wallets)

**Infra:** Cloudflare R2 (archive storage), Printful API (fulfillment), OpenStreetMap Nominatim (geocoding)

---

## Running the Project

```bash
npm install
npm run dev       # Start dev server (Express + Vite on port 5000)
npm test          # Run unit & integration tests (vitest)
npm run check     # TypeScript type check
npm run db:push   # Push schema to PostgreSQL
```

**Required environment variables:** `DATABASE_URL`, `ESCROW_WALLET_PRIVATE_KEY`, `PRINTFUL_API_KEY`, `PRIVY_APP_ID`, `PRIVY_APP_SECRET`, `HELIUS_API_KEY`, `R2_*` (Cloudflare R2 credentials)

---

## Inspiration

- **Pudgy Penguins** — IP → physical goods pipeline
- **Steemit** — Ecosystem rewards for content curators
- **Zora** — On-chain creator monetization
- **Threadless** — Community voting → merchandise

---

## License

MIT
