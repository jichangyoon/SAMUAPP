use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("11111111111111111111111111111111");

const TOLERANCE_BPS: u64 = 10;

#[program]
pub mod samu_rewards {
    use super::*;

    /// 최초 1회 초기화. admin 지갑 + 45/40/15 비율 설정.
    pub fn initialize(
        ctx: Context<Initialize>,
        creator_share: u16,
        voter_share: u16,
        platform_share: u16,
    ) -> Result<()> {
        require!(
            (creator_share as u32) + (voter_share as u32) + (platform_share as u32) == 10000,
            ErrorCode::InvalidShareTotal
        );

        let cfg = &mut ctx.accounts.program_config;
        cfg.admin = ctx.accounts.admin.key();
        cfg.creator_share = creator_share;
        cfg.voter_share = voter_share;
        cfg.platform_share = platform_share;
        cfg.total_deposited_lamports = 0;
        cfg.bump = ctx.bumps.program_config;

        emit!(ConfigInitialized {
            admin: cfg.admin,
            creator_share,
            voter_share,
            platform_share,
        });

        Ok(())
    }

    /// admin이 굿즈 수익 SOL을 escrow_pool PDA로 예치. 45/40/15 비율 검증 포함.
    /// remaining_accounts 없음 — Signer lifetime 충돌 방지.
    pub fn deposit_profit(
        ctx: Context<DepositProfit>,
        contest_id: u64,
        total_lamports: u64,
        creator_total: u64,
        voter_total: u64,
        platform_total: u64,
    ) -> Result<()> {
        require!(total_lamports > 0, ErrorCode::InvalidAmount);
        require!(
            creator_total
                .checked_add(voter_total).unwrap()
                .checked_add(platform_total).unwrap()
                == total_lamports,
            ErrorCode::ShareMismatch
        );

        let cfg = &ctx.accounts.program_config;

        let expected_creator = (total_lamports as u128)
            .checked_mul(cfg.creator_share as u128).unwrap()
            .checked_div(10000).unwrap() as u64;
        let expected_voter = (total_lamports as u128)
            .checked_mul(cfg.voter_share as u128).unwrap()
            .checked_div(10000).unwrap() as u64;
        let expected_platform = (total_lamports as u128)
            .checked_mul(cfg.platform_share as u128).unwrap()
            .checked_div(10000).unwrap() as u64;

        let tolerance = (total_lamports as u128)
            .checked_mul(TOLERANCE_BPS as u128).unwrap()
            .checked_div(10000).unwrap() as u64;

        require!(
            within_tolerance(creator_total, expected_creator, tolerance),
            ErrorCode::ShareMismatch
        );
        require!(
            within_tolerance(voter_total, expected_voter, tolerance),
            ErrorCode::ShareMismatch
        );
        require!(
            within_tolerance(platform_total, expected_platform, tolerance),
            ErrorCode::ShareMismatch
        );

        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.admin.to_account_info(),
                to: ctx.accounts.escrow_pool.to_account_info(),
            },
        );
        system_program::transfer(cpi_ctx, total_lamports)?;

        let pool = &mut ctx.accounts.escrow_pool;
        pool.contest_id = contest_id;
        pool.total_deposited = pool.total_deposited.checked_add(total_lamports).unwrap();
        pool.bump = ctx.bumps.escrow_pool;

        let cfg_mut = &mut ctx.accounts.program_config;
        cfg_mut.total_deposited_lamports = cfg_mut
            .total_deposited_lamports
            .checked_add(total_lamports)
            .unwrap();

        emit!(FundsDeposited {
            contest_id,
            total_lamports,
            creator_total,
            voter_total,
            platform_total,
        });

        Ok(())
    }

    /// admin이 수령인 1명의 allocation_record PDA를 생성/업데이트.
    /// 수령인마다 별도 호출 — remaining_accounts 없음.
    pub fn record_allocation(
        ctx: Context<RecordAllocation>,
        contest_id: u64,
        recipient_wallet: Pubkey,
        role: Role,
        lamports: u64,
    ) -> Result<()> {
        require!(lamports > 0, ErrorCode::InvalidAmount);

        let record = &mut ctx.accounts.allocation_record;
        require!(!record.claimed, ErrorCode::AlreadyClaimed);

        record.contest_id = contest_id;
        record.wallet = recipient_wallet;
        record.role = role.clone();
        record.lamports = record.lamports.checked_add(lamports).unwrap();
        record.bump = ctx.bumps.allocation_record;

        emit!(AllocationRecorded {
            contest_id,
            wallet: recipient_wallet,
            role_index: match role {
                Role::Creator => 0u8,
                Role::Voter => 1u8,
                Role::Platform => 2u8,
            },
            lamports,
        });

        Ok(())
    }

    /// 유저가 직접 호출 (유저 지갑으로 서명, 가스비 유저 부담).
    /// escrow_pool → 유저 지갑으로 SOL 전송.
    pub fn claim(ctx: Context<Claim>, contest_id: u64) -> Result<()> {
        let record = &mut ctx.accounts.allocation_record;
        require!(!record.claimed, ErrorCode::AlreadyClaimed);
        require!(record.lamports > 0, ErrorCode::InvalidAmount);
        require!(
            record.wallet == ctx.accounts.claimer.key(),
            ErrorCode::Unauthorized
        );

        let lamports_to_send = record.lamports;
        let pool = &mut ctx.accounts.escrow_pool;

        let escrow_bump = pool.bump;
        let seeds = &[
            b"escrow".as_ref(),
            &contest_id.to_le_bytes(),
            &[escrow_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: pool.to_account_info(),
                to: ctx.accounts.claimer.to_account_info(),
            },
            signer_seeds,
        );
        system_program::transfer(cpi_ctx, lamports_to_send)?;

        pool.total_claimed = pool.total_claimed.checked_add(lamports_to_send).unwrap();
        record.claimed = true;

        emit!(RewardClaimed {
            contest_id,
            wallet: ctx.accounts.claimer.key(),
            lamports: lamports_to_send,
        });

        Ok(())
    }

    /// admin 지갑 변경 (긴급 상황용).
    pub fn transfer_admin(ctx: Context<AdminOnly>, new_admin: Pubkey) -> Result<()> {
        let cfg = &mut ctx.accounts.program_config;
        let old_admin = cfg.admin;
        cfg.admin = new_admin;
        emit!(AdminTransferred { old_admin, new_admin });
        Ok(())
    }
}

fn within_tolerance(actual: u64, expected: u64, tolerance: u64) -> bool {
    if actual > expected {
        actual - expected <= tolerance
    } else {
        expected - actual <= tolerance
    }
}

// ─── Data Structures ─────────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum Role {
    Creator,
    Voter,
    Platform,
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct ProgramConfig {
    pub admin: Pubkey,
    pub creator_share: u16,
    pub voter_share: u16,
    pub platform_share: u16,
    pub total_deposited_lamports: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct EscrowPool {
    pub contest_id: u64,
    pub total_deposited: u64,
    pub total_claimed: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct AllocationRecord {
    pub contest_id: u64,
    pub wallet: Pubkey,
    pub role: Role,
    pub lamports: u64,
    pub claimed: bool,
    pub bump: u8,
}

// ─── Context Structs ──────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + ProgramConfig::INIT_SPACE,
        seeds = [b"config"],
        bump,
    )]
    pub program_config: Account<'info, ProgramConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(contest_id: u64)]
pub struct DepositProfit<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = program_config.bump,
        constraint = program_config.admin == admin.key() @ ErrorCode::Unauthorized,
    )]
    pub program_config: Account<'info, ProgramConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + EscrowPool::INIT_SPACE,
        seeds = [b"escrow", contest_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub escrow_pool: Account<'info, EscrowPool>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(contest_id: u64, recipient_wallet: Pubkey)]
pub struct RecordAllocation<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = program_config.bump,
        constraint = program_config.admin == admin.key() @ ErrorCode::Unauthorized,
    )]
    pub program_config: Account<'info, ProgramConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + AllocationRecord::INIT_SPACE,
        seeds = [b"alloc", contest_id.to_le_bytes().as_ref(), recipient_wallet.as_ref()],
        bump,
    )]
    pub allocation_record: Account<'info, AllocationRecord>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(contest_id: u64)]
pub struct Claim<'info> {
    #[account(
        mut,
        seeds = [b"alloc", contest_id.to_le_bytes().as_ref(), claimer.key().as_ref()],
        bump = allocation_record.bump,
        constraint = allocation_record.wallet == claimer.key() @ ErrorCode::Unauthorized,
    )]
    pub allocation_record: Account<'info, AllocationRecord>,

    #[account(
        mut,
        seeds = [b"escrow", contest_id.to_le_bytes().as_ref()],
        bump = escrow_pool.bump,
    )]
    pub escrow_pool: Account<'info, EscrowPool>,

    #[account(mut)]
    pub claimer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = program_config.bump,
        constraint = program_config.admin == admin.key() @ ErrorCode::Unauthorized,
    )]
    pub program_config: Account<'info, ProgramConfig>,

    pub admin: Signer<'info>,
}

// ─── Events ───────────────────────────────────────────────────────────────────

#[event]
pub struct ConfigInitialized {
    pub admin: Pubkey,
    pub creator_share: u16,
    pub voter_share: u16,
    pub platform_share: u16,
}

#[event]
pub struct FundsDeposited {
    pub contest_id: u64,
    pub total_lamports: u64,
    pub creator_total: u64,
    pub voter_total: u64,
    pub platform_total: u64,
}

#[event]
pub struct AllocationRecorded {
    pub contest_id: u64,
    pub wallet: Pubkey,
    pub role_index: u8,
    pub lamports: u64,
}

#[event]
pub struct RewardClaimed {
    pub contest_id: u64,
    pub wallet: Pubkey,
    pub lamports: u64,
}

#[event]
pub struct AdminTransferred {
    pub old_admin: Pubkey,
    pub new_admin: Pubkey,
}

// ─── Errors ───────────────────────────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("Share percentages must total 10000 (100.00%)")]
    InvalidShareTotal,
    #[msg("Only admin can perform this action")]
    Unauthorized,
    #[msg("Amount must be greater than 0")]
    InvalidAmount,
    #[msg("Per-role totals do not match configured share ratios")]
    ShareMismatch,
    #[msg("This reward has already been claimed")]
    AlreadyClaimed,
}
