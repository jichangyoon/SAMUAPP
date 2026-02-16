use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};

declare_id!("11111111111111111111111111111111");

const TOLERANCE_BPS: u16 = 10;

#[program]
pub mod samu_rewards {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        creator_share: u16,
        voter_share: u16,
        nft_holder_share: u16,
        platform_share: u16,
    ) -> Result<()> {
        require!(
            creator_share + voter_share + nft_holder_share + platform_share == 10000,
            ErrorCode::InvalidShareTotal
        );

        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.treasury = ctx.accounts.treasury.key();
        config.samu_mint = ctx.accounts.samu_mint.key();
        config.creator_share = creator_share;
        config.voter_share = voter_share;
        config.nft_holder_share = nft_holder_share;
        config.platform_share = platform_share;
        config.total_distributions = 0;
        config.total_distributed_amount = 0;
        config.is_locked = false;
        config.bump = ctx.bumps.config;

        emit!(ConfigInitialized {
            admin: config.admin,
            treasury: config.treasury,
            creator_share,
            voter_share,
            nft_holder_share,
            platform_share,
        });

        Ok(())
    }

    pub fn update_shares(
        ctx: Context<AdminOnly>,
        creator_share: u16,
        voter_share: u16,
        nft_holder_share: u16,
        platform_share: u16,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;

        require!(!config.is_locked, ErrorCode::ConfigLocked);
        require!(
            creator_share + voter_share + nft_holder_share + platform_share == 10000,
            ErrorCode::InvalidShareTotal
        );

        config.creator_share = creator_share;
        config.voter_share = voter_share;
        config.nft_holder_share = nft_holder_share;
        config.platform_share = platform_share;

        emit!(SharesUpdated {
            creator_share,
            voter_share,
            nft_holder_share,
            platform_share,
        });

        Ok(())
    }

    pub fn lock_config(ctx: Context<AdminOnly>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        require!(!config.is_locked, ErrorCode::ConfigLocked);
        config.is_locked = true;

        emit!(ConfigLocked {
            admin: config.admin,
        });

        Ok(())
    }

    pub fn distribute_rewards(
        ctx: Context<DistributeRewards>,
        contest_id: u64,
        distribution_index: u8,
        total_amount: u64,
        recipients: Vec<Recipient>,
    ) -> Result<()> {
        let config = &ctx.accounts.config;

        require!(total_amount > 0, ErrorCode::InvalidAmount);
        require!(!recipients.is_empty(), ErrorCode::NoRecipients);
        require!(recipients.len() <= 50, ErrorCode::TooManyRecipients);

        let mut creator_total: u64 = 0;
        let mut voter_total: u64 = 0;
        let mut nft_holder_total: u64 = 0;
        let mut platform_total: u64 = 0;

        for r in &recipients {
            match r.role {
                Role::Creator => creator_total += r.amount,
                Role::Voter => voter_total += r.amount,
                Role::NftHolder => nft_holder_total += r.amount,
                Role::Platform => platform_total += r.amount,
            }
        }

        let distributed_total = creator_total + voter_total + nft_holder_total + platform_total;
        require!(distributed_total > 0, ErrorCode::InvalidAmount);
        require!(distributed_total <= total_amount, ErrorCode::ExceedsTotal);

        let expected_creator = (total_amount as u128)
            .checked_mul(config.creator_share as u128).unwrap()
            .checked_div(10000).unwrap() as u64;
        let expected_voter = (total_amount as u128)
            .checked_mul(config.voter_share as u128).unwrap()
            .checked_div(10000).unwrap() as u64;
        let expected_nft = (total_amount as u128)
            .checked_mul(config.nft_holder_share as u128).unwrap()
            .checked_div(10000).unwrap() as u64;
        let expected_platform = (total_amount as u128)
            .checked_mul(config.platform_share as u128).unwrap()
            .checked_div(10000).unwrap() as u64;

        let tolerance = (total_amount as u128)
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
            within_tolerance(nft_holder_total, expected_nft, tolerance),
            ErrorCode::ShareMismatch
        );
        require!(
            within_tolerance(platform_total, expected_platform, tolerance),
            ErrorCode::ShareMismatch
        );

        let non_zero_recipients: Vec<&Recipient> = recipients.iter().filter(|r| r.amount > 0).collect();
        require!(
            ctx.remaining_accounts.len() == non_zero_recipients.len(),
            ErrorCode::RecipientCountMismatch
        );

        let record = &mut ctx.accounts.distribution_record;
        record.contest_id = contest_id;
        record.distribution_index = distribution_index;
        record.total_amount = total_amount;
        record.distributed_total = distributed_total;
        record.creator_total = creator_total;
        record.voter_total = voter_total;
        record.nft_holder_total = nft_holder_total;
        record.platform_total = platform_total;
        record.recipient_count = non_zero_recipients.len() as u16;
        record.timestamp = Clock::get()?.unix_timestamp;
        record.admin = ctx.accounts.admin.key();
        record.bump = ctx.bumps.distribution_record;

        let config_bump = config.bump;
        let seeds = &[b"config".as_ref(), &[config_bump]];
        let signer_seeds = &[&seeds[..]];

        let samu_mint = config.samu_mint;

        for (i, recipient) in non_zero_recipients.iter().enumerate() {
            let recipient_account_info = &ctx.remaining_accounts[i];

            require!(
                recipient_account_info.key() == recipient.token_account,
                ErrorCode::RecipientMismatch
            );

            let recipient_token: Account<TokenAccount> =
                Account::try_from(recipient_account_info)?;

            require!(
                recipient_token.mint == samu_mint,
                ErrorCode::InvalidMint
            );
            require!(
                recipient_token.owner == recipient.wallet,
                ErrorCode::InvalidTokenOwner
            );

            let transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.treasury_token_account.to_account_info(),
                    to: recipient_account_info.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                signer_seeds,
            );

            token::transfer(transfer_ctx, recipient.amount)?;
        }

        let config_mut = &mut ctx.accounts.config;
        config_mut.total_distributions += 1;
        config_mut.total_distributed_amount += distributed_total;

        emit!(RewardsDistributed {
            contest_id,
            distribution_index,
            total_amount,
            distributed_total,
            creator_total,
            voter_total,
            nft_holder_total,
            platform_total,
            recipient_count: non_zero_recipients.len() as u16,
            timestamp: record.timestamp,
        });

        Ok(())
    }

    pub fn transfer_admin(ctx: Context<AdminOnly>, new_admin: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.config;
        let old_admin = config.admin;
        config.admin = new_admin;

        emit!(AdminTransferred {
            old_admin,
            new_admin,
        });

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

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Role {
    Creator,
    Voter,
    NftHolder,
    Platform,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Recipient {
    pub wallet: Pubkey,
    pub token_account: Pubkey,
    pub role: Role,
    pub amount: u64,
}

#[account]
pub struct Config {
    pub admin: Pubkey,
    pub treasury: Pubkey,
    pub samu_mint: Pubkey,
    pub creator_share: u16,
    pub voter_share: u16,
    pub nft_holder_share: u16,
    pub platform_share: u16,
    pub total_distributions: u64,
    pub total_distributed_amount: u64,
    pub is_locked: bool,
    pub bump: u8,
}

#[account]
pub struct DistributionRecord {
    pub contest_id: u64,
    pub distribution_index: u8,
    pub total_amount: u64,
    pub distributed_total: u64,
    pub creator_total: u64,
    pub voter_total: u64,
    pub nft_holder_total: u64,
    pub platform_total: u64,
    pub recipient_count: u16,
    pub timestamp: i64,
    pub admin: Pubkey,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + std::mem::size_of::<Config>(),
        seeds = [b"config"],
        bump,
    )]
    pub config: Account<'info, Config>,

    /// CHECK: Treasury wallet address, validated by admin
    pub treasury: UncheckedAccount<'info>,

    pub samu_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.admin == admin.key() @ ErrorCode::Unauthorized,
    )]
    pub config: Account<'info, Config>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(contest_id: u64, distribution_index: u8)]
pub struct DistributeRewards<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.admin == admin.key() @ ErrorCode::Unauthorized,
    )]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + std::mem::size_of::<DistributionRecord>(),
        seeds = [b"distribution", &contest_id.to_le_bytes(), &[distribution_index]],
        bump,
    )]
    pub distribution_record: Account<'info, DistributionRecord>,

    #[account(
        mut,
        constraint = treasury_token_account.mint == config.samu_mint @ ErrorCode::InvalidMint,
        constraint = treasury_token_account.owner == config.key() @ ErrorCode::InvalidTreasury,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct ConfigInitialized {
    pub admin: Pubkey,
    pub treasury: Pubkey,
    pub creator_share: u16,
    pub voter_share: u16,
    pub nft_holder_share: u16,
    pub platform_share: u16,
}

#[event]
pub struct SharesUpdated {
    pub creator_share: u16,
    pub voter_share: u16,
    pub nft_holder_share: u16,
    pub platform_share: u16,
}

#[event]
pub struct ConfigLocked {
    pub admin: Pubkey,
}

#[event]
pub struct RewardsDistributed {
    pub contest_id: u64,
    pub distribution_index: u8,
    pub total_amount: u64,
    pub distributed_total: u64,
    pub creator_total: u64,
    pub voter_total: u64,
    pub nft_holder_total: u64,
    pub platform_total: u64,
    pub recipient_count: u16,
    pub timestamp: i64,
}

#[event]
pub struct AdminTransferred {
    pub old_admin: Pubkey,
    pub new_admin: Pubkey,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Share percentages must total 10000 (100%)")]
    InvalidShareTotal,
    #[msg("Only admin can perform this action")]
    Unauthorized,
    #[msg("Configuration is permanently locked")]
    ConfigLocked,
    #[msg("Distribution amount must be greater than 0")]
    InvalidAmount,
    #[msg("Must have at least one recipient")]
    NoRecipients,
    #[msg("Maximum 50 recipients per distribution")]
    TooManyRecipients,
    #[msg("Distributed amounts exceed total")]
    ExceedsTotal,
    #[msg("Per-role totals do not match configured share ratios")]
    ShareMismatch,
    #[msg("Remaining accounts count does not match non-zero recipients")]
    RecipientCountMismatch,
    #[msg("Recipient account does not match expected token account")]
    RecipientMismatch,
    #[msg("Token account mint does not match SAMU mint")]
    InvalidMint,
    #[msg("Token account owner does not match recipient wallet")]
    InvalidTokenOwner,
    #[msg("Invalid treasury token account")]
    InvalidTreasury,
}
