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

    /* pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize_platform::handler(ctx)
    } */
}
