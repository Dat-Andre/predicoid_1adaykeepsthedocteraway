use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PredictorPosition {
    /* pub owner: Pubkey, */
    pub side_a_amount: u64,
    pub side_b_amount: u64,
    pub side_a_entry_odd: u64,
    pub side_b_entry_odd: u64,
    pub initialized: bool,
    pub bump: u8,
}
