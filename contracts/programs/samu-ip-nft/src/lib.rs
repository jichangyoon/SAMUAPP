use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke_signed,
};
use mpl_bubblegum::types::{
    Creator as BubblegumCreator, MetadataArgs, TokenProgramVersion as BgTokenProgramVersion,
    TokenStandard as BgTokenStandard,
};

declare_id!("11111111111111111111111111111111");

pub const BUBBLEGUM_PROGRAM_ID: Pubkey =
    solana_program::pubkey!("BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY");

pub const COMPRESSION_PROGRAM_ID: Pubkey =
    solana_program::pubkey!("cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK");

pub const NOOP_PROGRAM_ID: Pubkey =
    solana_program::pubkey!("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV");

/// Bubblegum Anchor instruction discriminators.
/// sha256("global:<instruction_name>")[0..8]
const CREATE_TREE_CONFIG_DISC: [u8; 8] = [170, 141, 85, 101, 116, 175, 115, 173];
const MINT_V1_DISC: [u8; 8] = [145, 98, 192, 118, 184, 147, 118, 104];

#[program]
pub mod samu_ip_nft {
    use super::*;

    /// Phase 3 프로그램 초기화. admin 지갑 설정.
    /// 최초 1회 호출. 이후 admin만 tree 생성/mint 가능.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let cfg = &mut ctx.accounts.program_config;
        cfg.admin = ctx.accounts.admin.key();
        cfg.total_contests = 0;
        cfg.bump = ctx.bumps.program_config;

        emit!(ConfigInitialized {
            admin: cfg.admin,
        });

        Ok(())
    }

    /// 콘테스트용 Merkle Tree 초기화.
    ///
    /// 사전 조건: merkle_tree 계정이 이미 생성되어 있어야 함 (system_program으로 사전 생성).
    /// 이 instruction은:
    /// 1. ContestTree PDA 생성 (콘테스트-트리 매핑 기록)
    /// 2. Bubblegum create_tree_config CPI 호출 (트리 설정 초기화)
    ///
    /// tree_creator = contest_authority PDA → 우리 프로그램만 이 트리에 mint 가능.
    ///
    /// max_depth / max_buffer_size 권장값:
    ///   depth=14, buffer=64 → 최대 16,384개 cNFT (대부분 콘테스트에 충분)
    ///   depth=20, buffer=256 → 최대 1,048,576개 cNFT (대규모)
    pub fn initialize_contest_tree(
        ctx: Context<InitializeContestTree>,
        contest_id: u64,
        max_depth: u32,
        max_buffer_size: u32,
        public: bool,
    ) -> Result<()> {
        let contest_tree = &mut ctx.accounts.contest_tree;
        contest_tree.merkle_tree = ctx.accounts.merkle_tree.key();
        contest_tree.contest_id = contest_id;
        contest_tree.max_depth = max_depth;
        contest_tree.max_buffer_size = max_buffer_size;
        contest_tree.total_minted = 0;
        contest_tree.total_equity_bps = 0;
        contest_tree.finalized = false;
        contest_tree.bump = ctx.bumps.contest_tree;

        let cfg = &mut ctx.accounts.program_config;
        cfg.total_contests = cfg.total_contests.checked_add(1).unwrap();

        let authority_bump = ctx.bumps.contest_authority;
        let contest_id_bytes = contest_id.to_le_bytes();
        let authority_seeds = &[
            b"authority".as_ref(),
            contest_id_bytes.as_ref(),
            &[authority_bump],
        ];

        let mut data = CREATE_TREE_CONFIG_DISC.to_vec();
        data.extend_from_slice(&max_depth.to_le_bytes());
        data.extend_from_slice(&max_buffer_size.to_le_bytes());
        // Option<bool> Borsh 직렬화: Some(value) = [1, value_byte]
        data.push(1); // Some
        data.push(if public { 1 } else { 0 });

        let create_tree_ix = Instruction {
            program_id: BUBBLEGUM_PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(ctx.accounts.bubblegum_tree_config.key(), false),
                AccountMeta::new(ctx.accounts.merkle_tree.key(), false),
                AccountMeta::new(ctx.accounts.admin.key(), true),
                AccountMeta::new_readonly(ctx.accounts.contest_authority.key(), true),
                AccountMeta::new_readonly(NOOP_PROGRAM_ID, false),
                AccountMeta::new_readonly(COMPRESSION_PROGRAM_ID, false),
                AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
            ],
            data,
        };

        invoke_signed(
            &create_tree_ix,
            &[
                ctx.accounts.bubblegum_tree_config.to_account_info(),
                ctx.accounts.merkle_tree.to_account_info(),
                ctx.accounts.admin.to_account_info(),
                ctx.accounts.contest_authority.to_account_info(),
                ctx.accounts.log_wrapper.to_account_info(),
                ctx.accounts.compression_program.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                ctx.accounts.bubblegum_program.to_account_info(),
            ],
            &[authority_seeds],
        )?;

        emit!(ContestTreeInitialized {
            contest_id,
            merkle_tree: ctx.accounts.merkle_tree.key(),
            max_depth,
            max_buffer_size,
        });

        Ok(())
    }

    /// 참가자에게 IP Equity cNFT 발행.
    ///
    /// 콘테스트 종료 후 admin이 참가자 1명당 1회 호출.
    /// cNFT 메타데이터에 equity_share_bps (수익 지분 %) 포함.
    ///
    /// equity_share_bps 예시:
    ///   Creator가 전체 투표의 30% 획득 → 4500 × 30% = 1350 bps (13.50%)
    ///   Voter가 전체 SAMU의 5% 투표 → 4000 × 5% = 200 bps (2.00%)
    ///
    /// 메타데이터 URI (off-chain JSON)에 equity_share_bps가 attribute로 저장됨:
    /// {
    ///   "name": "SAMU Contest #1 Creator",
    ///   "symbol": "SAMU-IP",
    ///   "attributes": [
    ///     { "trait_type": "contest_id", "value": "1" },
    ///     { "trait_type": "role", "value": "Creator" },
    ///     { "trait_type": "equity_share_bps", "value": "1350" }
    ///   ]
    /// }
    pub fn mint_participant_nft(
        ctx: Context<MintParticipantNft>,
        contest_id: u64,
        name: String,
        uri: String,
        role: Role,
        equity_share_bps: u16,
    ) -> Result<()> {
        let contest_tree = &mut ctx.accounts.contest_tree;
        require!(!contest_tree.finalized, ErrorCode::AlreadyFinalized);
        require!(equity_share_bps > 0 && equity_share_bps <= 10000, ErrorCode::InvalidEquityShare);

        let new_total = contest_tree.total_equity_bps
            .checked_add(equity_share_bps as u32)
            .ok_or(ErrorCode::EquityOverflow)?;
        require!(new_total <= 10000, ErrorCode::EquityOverflow);

        let authority_bump = ctx.bumps.contest_authority;
        let contest_id_bytes = contest_id.to_le_bytes();
        let authority_seeds = &[
            b"authority".as_ref(),
            contest_id_bytes.as_ref(),
            &[authority_bump],
        ];

        let metadata_args = MetadataArgs {
            name: name.clone(),
            symbol: String::from("SAMU-IP"),
            uri: uri.clone(),
            seller_fee_basis_points: 0,
            primary_sale_happened: false,
            is_mutable: false,
            edition_nonce: None,
            token_standard: Some(BgTokenStandard::NonFungible),
            collection: None,
            uses: None,
            token_program_version: BgTokenProgramVersion::Original,
            creators: vec![BubblegumCreator {
                address: ctx.accounts.admin.key(),
                verified: false,
                share: 100,
            }],
        };

        let mut data = MINT_V1_DISC.to_vec();
        let args_bytes = metadata_args.try_to_vec()?;
        data.extend_from_slice(&args_bytes);

        let mint_ix = Instruction {
            program_id: BUBBLEGUM_PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(ctx.accounts.bubblegum_tree_config.key(), false),
                AccountMeta::new_readonly(ctx.accounts.recipient.key(), false),
                AccountMeta::new_readonly(ctx.accounts.recipient.key(), false),
                AccountMeta::new(ctx.accounts.merkle_tree.key(), false),
                AccountMeta::new(ctx.accounts.admin.key(), true),
                AccountMeta::new_readonly(ctx.accounts.contest_authority.key(), true),
                AccountMeta::new_readonly(NOOP_PROGRAM_ID, false),
                AccountMeta::new_readonly(COMPRESSION_PROGRAM_ID, false),
                AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
            ],
            data,
        };

        invoke_signed(
            &mint_ix,
            &[
                ctx.accounts.bubblegum_tree_config.to_account_info(),
                ctx.accounts.recipient.to_account_info(),
                ctx.accounts.merkle_tree.to_account_info(),
                ctx.accounts.admin.to_account_info(),
                ctx.accounts.contest_authority.to_account_info(),
                ctx.accounts.log_wrapper.to_account_info(),
                ctx.accounts.compression_program.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                ctx.accounts.bubblegum_program.to_account_info(),
            ],
            &[authority_seeds],
        )?;

        contest_tree.total_minted = contest_tree.total_minted.checked_add(1).unwrap();
        contest_tree.total_equity_bps = new_total;

        emit!(ParticipantNftMinted {
            contest_id,
            recipient: ctx.accounts.recipient.key(),
            role: role.clone(),
            equity_share_bps,
            total_equity_bps: new_total,
            nft_index: contest_tree.total_minted - 1,
            name,
            uri,
        });

        Ok(())
    }

    /// 콘테스트 mint 완료. 이후 추가 mint 불가.
    ///
    /// 모든 참가자에게 cNFT 발행 후 admin이 호출.
    /// finalized = true 이후 mint_participant_nft 호출 시 AlreadyFinalized 에러.
    pub fn finalize_contest(
        ctx: Context<FinalizeContest>,
        contest_id: u64,
    ) -> Result<()> {
        let contest_tree = &mut ctx.accounts.contest_tree;
        require!(!contest_tree.finalized, ErrorCode::AlreadyFinalized);

        contest_tree.finalized = true;

        emit!(ContestFinalized {
            contest_id,
            total_minted: contest_tree.total_minted,
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

// ─── Data Structures ─────────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum Role {
    Creator,
    Voter,
}

// ─── Account Structures ──────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct ProgramConfig {
    pub admin: Pubkey,
    pub total_contests: u32,
    pub bump: u8,
}

/// 콘테스트별 Merkle Tree 정보.
/// seeds: ["contest-tree", contest_id.to_le_bytes()]
#[account]
#[derive(InitSpace)]
pub struct ContestTree {
    pub merkle_tree: Pubkey,
    pub contest_id: u64,
    pub max_depth: u32,
    pub max_buffer_size: u32,
    pub total_minted: u32,
    pub total_equity_bps: u32,
    pub finalized: bool,
    pub bump: u8,
}

// ─── Context Structs ─────────────────────────────────────────────────────────

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
pub struct InitializeContestTree<'info> {
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
        init,
        payer = admin,
        space = 8 + ContestTree::INIT_SPACE,
        seeds = [b"contest-tree", contest_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub contest_tree: Account<'info, ContestTree>,

    /// contest_authority PDA: Bubblegum tree의 creator/delegate 역할.
    /// 이 PDA가 tree_creator가 되므로 우리 프로그램만 mint 가능.
    /// CHECK: PDA seed 검증으로 충분
    #[account(
        seeds = [b"authority", contest_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub contest_authority: UncheckedAccount<'info>,

    /// CHECK: Merkle Tree 계정 (사전에 system_program으로 생성 필요).
    /// Bubblegum create_tree_config CPI에서 초기화됨.
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: Bubblegum tree_config PDA (Bubblegum 프로그램이 생성/관리).
    /// seeds: [merkle_tree.key()] under BUBBLEGUM_PROGRAM_ID
    #[account(
        mut,
        seeds = [merkle_tree.key().as_ref()],
        seeds::program = BUBBLEGUM_PROGRAM_ID,
        bump,
    )]
    pub bubblegum_tree_config: UncheckedAccount<'info>,

    /// CHECK: Bubblegum Program
    #[account(address = BUBBLEGUM_PROGRAM_ID)]
    pub bubblegum_program: UncheckedAccount<'info>,

    /// CHECK: SPL Noop (로깅)
    #[account(address = NOOP_PROGRAM_ID)]
    pub log_wrapper: UncheckedAccount<'info>,

    /// CHECK: SPL Account Compression
    #[account(address = COMPRESSION_PROGRAM_ID)]
    pub compression_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(contest_id: u64)]
pub struct MintParticipantNft<'info> {
    #[account(
        seeds = [b"config"],
        bump = program_config.bump,
        constraint = program_config.admin == admin.key() @ ErrorCode::Unauthorized,
    )]
    pub program_config: Account<'info, ProgramConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"contest-tree", contest_id.to_le_bytes().as_ref()],
        bump = contest_tree.bump,
    )]
    pub contest_tree: Account<'info, ContestTree>,

    /// contest_authority PDA: mint 서명에 사용.
    /// CHECK: PDA seed 검증으로 충분
    #[account(
        seeds = [b"authority", contest_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub contest_authority: UncheckedAccount<'info>,

    /// CHECK: cNFT 수령인 지갑
    pub recipient: UncheckedAccount<'info>,

    /// CHECK: Bubblegum tree_config PDA.
    /// seeds: [merkle_tree.key()] under BUBBLEGUM_PROGRAM_ID에서 파생됨.
    #[account(
        mut,
        seeds = [merkle_tree.key().as_ref()],
        seeds::program = BUBBLEGUM_PROGRAM_ID,
        bump,
    )]
    pub bubblegum_tree_config: UncheckedAccount<'info>,

    /// CHECK: Merkle Tree 계정. contest_tree.merkle_tree와 일치해야 함.
    #[account(
        mut,
        constraint = merkle_tree.key() == contest_tree.merkle_tree @ ErrorCode::TreeMismatch,
    )]
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: Bubblegum Program
    #[account(address = BUBBLEGUM_PROGRAM_ID)]
    pub bubblegum_program: UncheckedAccount<'info>,

    /// CHECK: SPL Noop (로깅)
    #[account(address = NOOP_PROGRAM_ID)]
    pub log_wrapper: UncheckedAccount<'info>,

    /// CHECK: SPL Account Compression
    #[account(address = COMPRESSION_PROGRAM_ID)]
    pub compression_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(contest_id: u64)]
pub struct FinalizeContest<'info> {
    #[account(
        seeds = [b"config"],
        bump = program_config.bump,
        constraint = program_config.admin == admin.key() @ ErrorCode::Unauthorized,
    )]
    pub program_config: Account<'info, ProgramConfig>,

    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"contest-tree", contest_id.to_le_bytes().as_ref()],
        bump = contest_tree.bump,
    )]
    pub contest_tree: Account<'info, ContestTree>,
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

// ─── Events ──────────────────────────────────────────────────────────────────

#[event]
pub struct ConfigInitialized {
    pub admin: Pubkey,
}

#[event]
pub struct ContestTreeInitialized {
    pub contest_id: u64,
    pub merkle_tree: Pubkey,
    pub max_depth: u32,
    pub max_buffer_size: u32,
}

#[event]
pub struct ParticipantNftMinted {
    pub contest_id: u64,
    pub recipient: Pubkey,
    pub role: Role,
    pub equity_share_bps: u16,
    pub total_equity_bps: u32,
    pub nft_index: u32,
    pub name: String,
    pub uri: String,
}

#[event]
pub struct ContestFinalized {
    pub contest_id: u64,
    pub total_minted: u32,
}

#[event]
pub struct AdminTransferred {
    pub old_admin: Pubkey,
    pub new_admin: Pubkey,
}

// ─── Errors ──────────────────────────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("Only admin can perform this action")]
    Unauthorized,
    #[msg("This contest is already finalized, no more minting allowed")]
    AlreadyFinalized,
    #[msg("equity_share_bps must be 1-10000 (0.01% - 100.00%)")]
    InvalidEquityShare,
    #[msg("Total equity for this contest would exceed 10000 bps (100%)")]
    EquityOverflow,
    #[msg("Provided merkle_tree does not match the contest's registered tree")]
    TreeMismatch,
}
