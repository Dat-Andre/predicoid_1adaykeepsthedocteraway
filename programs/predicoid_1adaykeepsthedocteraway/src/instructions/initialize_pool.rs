use anchor_lang::prelude::*;

use crate::{error::ErrorCode, Config, PoolConfig, PoolVaultState};

#[derive(Accounts)]
#[instruction(event: String)]
pub struct InitializePool<'info> {
    #[account(mut)]
    market_admin: Signer<'info>,
    #[account(
    init,
    payer = market_admin,
    seeds = [
        b"pool", 
        market_admin.key().as_ref(),
        platform_config.admin.key().as_ref(),
        event.as_str().as_bytes()],
        bump,
        space = PoolConfig::INIT_SPACE
   )]
    pub pool_config: Account<'info, PoolConfig>,
    #[account(
    init,
    payer = market_admin,
    seeds = [b"pool_vault", pool_config.key().as_ref()],
    bump,
    space = 8 + PoolVaultState::INIT_SPACE
   )]
    pub pool_vault: Account<'info, PoolVaultState>,
    #[account(
        seeds = [b"platform", platform_config.admin.key().as_ref()],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, Config>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializePool<'info> {
    pub fn initialize_pool(
        &mut self,
        event: String,
        side_a: String,
        side_b: String,
        bumps: &InitializePoolBumps,
    ) -> Result<()> {
        require!(
            event.len() > 0 && event.len() < 32,
            ErrorCode::EventNameTooLong
        );

        require!(
            side_a.len() > 0 && side_a.len() < 16,
            ErrorCode::SideNameTooLong
        );

        require!(
            side_b.len() > 0 && side_b.len() < 16,
            ErrorCode::SideNameTooLong
        );

        self.pool_config.set_inner(PoolConfig {
            market_admin: self.market_admin.key(),
            pool_vault_state_bump: bumps.pool_vault,
            bump: bumps.pool_config,
            event,
            side_a,
            side_b,
        });

        self.pool_vault.set_inner(PoolVaultState {
            market_admin: self.market_admin.key(),
            pool_status: 0,
            pool_fee: self.platform_config.pool_fee,
            pool_treasury_bump: bumps.pool_vault,
            amount_side_a: 0,
            amount_side_b: 0,
            bump: bumps.pool_vault,
        });

        Ok(())
    }
}
