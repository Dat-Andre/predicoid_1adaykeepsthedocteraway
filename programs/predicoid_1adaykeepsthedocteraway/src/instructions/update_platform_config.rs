use anchor_lang::prelude::*;

use crate::{error::ErrorCode, Config};

#[derive(Accounts)]
#[instruction(status: u8)]
pub struct UpdatePlatformConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        has_one = admin,
        seeds = [b"platform", platform_config.admin.key().as_ref()],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, Config>,
    pub system_program: Program<'info, System>,
}

impl<'info> UpdatePlatformConfig<'info> {
    pub fn update_platform_status(&mut self, status: u8) -> Result<()> {
        self.platform_config.status = status;
        Ok(())
    }

    pub fn update_platform_fee(&mut self, fee: u16) -> Result<()> {
        self.platform_config.platform_fee = fee;
        Ok(())
    }
}
