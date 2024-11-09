use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct LiquidityProviderState {
    pub provider: Pubkey,
    pub amount_provided: u64,
    pub last_accumulated_reward_per_share: u64,
    pub bump: u8,
}
