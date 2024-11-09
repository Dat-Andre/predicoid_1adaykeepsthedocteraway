use anchor_lang::prelude::*;

#[account]
pub struct PoolConfig {
    pub market_admin: Pubkey,
    pub pool_status: u8,
    pub pool_fee: u64,
    pub pool_vault_state_bump: u8,
    pub bump: u8,
    pub event: String,
    pub side_a: String,
    pub side_b: String,
}