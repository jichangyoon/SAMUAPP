# SAMU Rewards Smart Contract - Deployment Guide

## Overview

This is a Solana smart contract (Anchor program) for on-chain reward distribution.
It automates the SAMU token reward distribution for the Meme Incubator platform.

### Features
- **Configurable reward shares**: Creator (30%), Voter (30%), NFT Holder (25%), Platform (15%)
- **Admin-controlled share updates**: Ratios can be changed by admin without redeployment
- **Permanent lock option**: Admin can lock ratios permanently when ready
- **On-chain ratio enforcement**: Contract validates per-role totals match configured ratios (0.1% tolerance for rounding)
- **Token account validation**: All recipient token accounts verified for correct SAMU mint and wallet ownership
- **On-chain distribution records**: Every distribution is recorded on-chain for transparency
- **Multiple distributions per contest**: Uses distribution_index to allow multiple revenue events per contest
- **Batch distribution**: Up to 50 recipients per transaction
- **Admin transfer**: Admin role can be transferred to a new wallet

### Share Percentages
Shares use basis points (1/100th of a percent):
- 3000 = 30%
- 2500 = 25%
- 1500 = 15%
- Total must equal 10000 (100%)

---

## Deployment via Solana Playground

### Step 1: Open Solana Playground
Go to https://beta.solpg.io

### Step 2: Create Project
1. Click "Create a new project"
2. Name it `samu-rewards`
3. Select "Anchor" as the framework

### Step 3: Copy Contract Code
1. Copy the contents of `programs/samu-rewards/src/lib.rs`
2. Paste it into the `lib.rs` file in Solana Playground

### Step 4: Update Cargo.toml
Copy the contents of `programs/samu-rewards/Cargo.toml` to match the dependencies:
```toml
[dependencies]
anchor-lang = "0.30.1"
anchor-spl = "0.30.1"
```

### Step 5: Build
1. Click the "Build" button (hammer icon) in Solana Playground
2. Wait for compilation to complete
3. The program ID will be auto-generated — copy it

### Step 6: Update Program ID
1. Replace `declare_id!("11111111111111111111111111111111")` in lib.rs with your new program ID
2. Rebuild

### Step 7: Deploy
1. Switch network to **Devnet** first for testing (Settings → Endpoint → Devnet)
2. Airdrop SOL for deployment fees (if on devnet)
3. Click "Deploy"
4. Save the deployed program ID

---

## Usage After Deployment

### 1. Initialize the Contract
Call `initialize` with:
- `creator_share`: 3000 (30%)
- `voter_share`: 3000 (30%)
- `nft_holder_share`: 2500 (25%)
- `platform_share`: 1500 (15%)
- Treasury wallet: `4WjMuna7iLjPE897m5fphErUt7AnSdjJTky1hyfZZaJk`
- SAMU mint address (validated as a real Mint account)

### 2. Set Up Treasury Token Account
Create a SAMU token account owned by the Config PDA:
- The Config PDA (seeds: ["config"]) must be the owner of the treasury token account
- This allows the smart contract to sign transfers from the treasury
- Token account mint must match the configured SAMU mint

### 3. Distribute Rewards
When a contest ends and revenue is calculated:
1. Server calculates net revenue (SOL received - Printful costs)
2. Server converts to SAMU equivalent
3. Server calls `distribute_rewards` with:
   - `contest_id`: The archived contest ID
   - `distribution_index`: 0 for first distribution, 1 for second, etc. (allows multiple per contest)
   - `total_amount`: Total SAMU to distribute
   - `recipients`: Array of { wallet, token_account, role, amount }
4. Contract validates:
   - Per-role totals match configured share ratios (within 0.1% tolerance for rounding)
   - All recipient token accounts are valid SAMU token accounts
   - Each token account is owned by the corresponding wallet
   - Total distributed does not exceed total_amount

### 4. Update Shares (Optional)
Call `update_shares` with new basis point values (must total 10000)

### 5. Lock Configuration (Optional)
Call `lock_config` to permanently freeze the share ratios.
**Warning: This is irreversible!**

### 6. Transfer Admin (Optional)
Call `transfer_admin` with the new admin's public key.

---

## Integration with SAMU Web App

After deploying the smart contract, update the web app:

1. Add the program ID to environment variables:
   ```
   SAMU_REWARDS_PROGRAM_ID=<your-deployed-program-id>
   ```

2. Update the server-side distribution logic to call the smart contract
   instead of (or in addition to) recording distributions in the database

3. The web app can read on-chain distribution records for transparency

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              SAMU Web App (Server)           │
│                                              │
│  1. Contest ends                              │
│  2. Calculate revenue (SOL - Printful costs)  │
│  3. Determine recipients & amounts            │
│                                              │
│         ↓ calls smart contract ↓             │
├─────────────────────────────────────────────┤
│          Solana Smart Contract                │
│                                              │
│  • Enforces configured share ratios          │
│  • Validates all token accounts (mint+owner) │
│  • Transfers SAMU tokens to recipients       │
│  • Records distribution on-chain             │
│  • Emits events for indexing                 │
├─────────────────────────────────────────────┤
│              Solana Blockchain                │
│                                              │
│  • Immutable distribution records            │
│  • Transparent token transfers               │
│  • Verifiable by anyone                      │
└─────────────────────────────────────────────┘
```

---

## Account Structure

### Config (PDA: seeds = ["config"])
- admin: Admin wallet public key
- treasury: Treasury wallet address
- samu_mint: SAMU token mint address (validated as Mint on init)
- creator/voter/nft_holder/platform_share: Basis points (must total 10000)
- total_distributions: Counter
- total_distributed_amount: Running total
- is_locked: Whether config changes are frozen

### DistributionRecord (PDA: seeds = ["distribution", contest_id, distribution_index])
- contest_id: Which contest this distribution is for
- distribution_index: Allows multiple distributions per contest (0, 1, 2...)
- total_amount: Total SAMU distributed
- Per-role totals: creator, voter, nft_holder, platform
- recipient_count: Number of recipients
- timestamp: When distribution occurred
- admin: Who initiated the distribution

---

## Security Features

1. **On-chain ratio enforcement**: Per-role totals validated against configured basis-point ratios (0.1% tolerance for integer rounding)
2. **Token account validation**: Every recipient token account checked for correct SAMU mint and wallet ownership
3. **Treasury constraints**: Treasury token account must match configured SAMU mint and be owned by Config PDA
4. **SAMU mint validation**: Mint verified as a real SPL Mint account during initialization
5. **Admin-only operations**: All state-changing functions require admin signature
6. **Permanent lock**: `lock_config` is irreversible — use with caution
7. **Test on devnet**: Always test thoroughly before mainnet deployment
8. **Audit**: Consider a security audit before mainnet launch
