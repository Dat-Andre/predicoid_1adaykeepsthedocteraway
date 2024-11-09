pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("gE5vWTmKd3ehmYwwUk67UJNhSC8jfPyeiTBAkshf6uT");

#[program]
pub mod predicoid_1adaykeepsthedocteraway {
    use super::*;

    pub fn initialize_platform(ctx: Context<InitializePlatform>) -> Result<()> {
        ctx.accounts.initialize_platform(&ctx.bumps)
    }

    pub fn initialize_market(ctx: Context<InitializeMarket>, name: String, fee: u64) -> Result<()> {
        ctx.accounts.initialize_market(name, fee, &ctx.bumps)
    }

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        event: String,
        side_a: String,
        side_b: String,
    ) -> Result<()> {
        ctx.accounts
            .initialize_pool(event, side_a, side_b, &ctx.bumps)
    }
}
