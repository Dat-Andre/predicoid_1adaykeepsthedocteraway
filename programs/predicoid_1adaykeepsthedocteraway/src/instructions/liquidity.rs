use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct Liquidity<'info> {
    #[account(mut)]
    pub pool_config: Account<'info, PoolConfig>,
    #[account(mut)]
    pub liquidity_provider_state: Account<'info, LiquidityProviderState>,
    #[account(mut)]
    pub pool_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_vault: Account<'info, TokenAccount>,
    pub user: Signer<'info>,
    pub system_program: AccountInfo<'info>,
}