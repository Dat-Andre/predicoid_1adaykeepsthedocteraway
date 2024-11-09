use anchor_lang::prelude::*;

#[account]
/* #[derive(InitSpace)] */
pub struct Market {
    pub platform_admin: Pubkey,
    pub market_admin: Pubkey,  //usual signer
    pub market_treasury_bump: u8,
    pub market_fee: u64, //something like 1% or 0.01 or whatever way ratios are used
    pub bump: u8,
    pub market_name: String,
}

impl Space for Market {
    const INIT_SPACE: usize = 8 + 32 + 32 + 1 + 8 + 1 + (4 + 32);
}