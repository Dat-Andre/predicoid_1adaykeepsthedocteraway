use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Predictor {
    pub owner: Pubkey,
    pub side_a_amount: u64,
    pub side_b_amount: u64,
    pub side_a_entry_odd: u64,
    pub side_b_entry_odd: u64,
    pub bump: u8,
}
