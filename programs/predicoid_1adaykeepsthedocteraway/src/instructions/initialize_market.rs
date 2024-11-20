use anchor_lang::prelude::*;

use crate::{error::ErrorCode, Config, Market};

#[derive(Accounts)]
#[instruction(marketname: String, marketsocials: String,fee: u64)]
pub struct InitializeMarket<'info> {
    #[account(mut)]
    pub market_owner: Signer<'info>,
    #[account(
        init,
        payer = market_owner,
        seeds = [b"market", market_owner.key().as_ref(), platform_config.key().as_ref()],
        bump,
        space = Market::INIT_SPACE
    )]
    pub market: Account<'info, Market>,
    #[account(
        seeds = [b"market_treasury", market_owner.key().as_ref()],
        bump,
    )]
    pub treasury: SystemAccount<'info>,
    #[account(
        seeds = [b"platform", platform_config.admin.key().as_ref()],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, Config>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializeMarket<'info> {
    pub fn initialize_market(
        &mut self,
        marketname: String,
        marketsocials: String,
        fee: u64,
        bumps: &InitializeMarketBumps,
    ) -> Result<()> {
        require!(
            marketname.len() > 0 && marketname.len() <= 32,
            ErrorCode::MarketNameTooLong
        );
        require!(
            marketsocials.len() > 0 && marketsocials.len() <= 16,
            ErrorCode::MarketNameTooLong
        );

        require!(fee > 0 && fee <= 100, ErrorCode::FeeOutOfBounds);

        self.market.set_inner(Market {
            /* platform_admin: self.platform_config.admin, */
            market_admin: self.market_owner.key(),
            market_treasury_bump: bumps.treasury,
            market_fee: fee,
            bump: bumps.market,
            market_name: marketname,
            market_socials: marketsocials,
        });
        Ok(())
    }
}
