use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct LiqudityPosition {
    pub admin: Pubkey,
    pub amount_provided: u64,
    pub last_accumulated_reward_per_share: u64,
    pub total_fees: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct LiquidityState {
    pub accumulated_reward_per_share: u64,
    pub total_fees: u64,
    pub bump: u8,
}