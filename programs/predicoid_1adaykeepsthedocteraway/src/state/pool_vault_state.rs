use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PoolVaultState {
    pub market_admin: Pubkey,
    pub pool_status: u8,
    pub pool_fee: u64,
    pub pool_treasury_bump: u8,
    pub amount_side_a: u64,
    pub amount_side_b: u64,
    pub bump: u8,
}
