use anchor_lang::prelude::*;

use crate::{error::ErrorCode, Config, Market};

#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    #[account(mut)]
    pub market_owner: Signer<'info>,
    #[account(
        init,
        payer = market_owner,
        seeds = [b"market", market_owner.key().as_ref()],
        bump,
        space = Market::INIT_SPACE
    )]
    pub market: Account<'info, Market>,
    #[account(
        seeds = [b"market_treasury", market_owner.key().as_ref()],
        bump,
    )]
    pub treasury: SystemAccount<'info>,
    pub platform_config: Account<'info, Config>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializeMarket<'info> {
    pub fn initialize_market(
        &mut self,
        name: String,
        fee: u64,
        bumps: InitializeMarketBumps,
    ) -> Result<()> {
        require!(
            name.len() > 0 && name.len() < 32,
            ErrorCode::MarketNameTooLong
        );

        require!(fee > 0 && fee < 100, ErrorCode::FeeOutOfBounds);

        self.market.set_inner(Market {
            market_admin: self.market_owner.key(),
            market_treasury_bump: bumps.treasury,
            market_fee: fee,
            bump: bumps.market,
            market_name: name,
        });
        Ok(())
    }
}
