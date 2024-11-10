use anchor_lang::prelude::*;

#[account]
pub struct PoolConfig {
    pub market_admin: Pubkey,
    pub pool_status: u8,
    /* pub pool_fee: u64, */
    pub pool_vault_state_bump: u8,
    pub bump: u8,
    pub min_days_to_run: u8,
    pub target_liq_to_start: u64,
    pub event: String,
    pub side_a: String,
    pub side_b: String,
}

impl Space for PoolConfig {
    const INIT_SPACE: usize = 8 + 32 + 1 + 1 + 1 + 1 + 8 + (4 + 32) + (4 + 16) + (4 + 16);
}
