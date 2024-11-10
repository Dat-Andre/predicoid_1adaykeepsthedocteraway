use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PoolVaultState {
    pub amount_side_a: u64,
    pub amount_side_b: u64,
    pub bump: u8,
}
