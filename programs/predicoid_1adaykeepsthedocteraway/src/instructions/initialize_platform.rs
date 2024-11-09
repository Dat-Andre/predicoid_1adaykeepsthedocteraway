use anchor_lang::prelude::*;

use crate::Config;

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(mut)]
    admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        seeds = [b"platform", admin.key().as_ref()],
        bump,
        space = 8 + Config::INIT_SPACE
    )]
    pub config: Account<'info, Config>,
    #[account(
        seeds = [b"treasury", config.key().as_ref()],
        bump,
    )]
    pub treasury: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializePlatform<'info> {
    pub fn initialize_platform(&mut self, bumps: &InitializePlatformBumps) -> Result<()> {
        self.config.set_inner(Config {
            admin: self.admin.key(),
            treasury: self.treasury.key(),
            platform_fee: 100,
            pool_fee: 100,
            status: 0,
            bump: bumps.config,
        });
        Ok(())
    }
}
