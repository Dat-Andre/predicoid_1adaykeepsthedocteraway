use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub treasury: Pubkey,
    pub platform_fee: u16,
    /* pub pool_fee: u64, */
    pub status: u8,
    pub bump: u8,
}
