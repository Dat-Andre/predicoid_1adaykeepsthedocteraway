use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};

use crate::{Config, LiquidityPosition, LiquidityState, PoolConfig, PoolVaultState};

use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct LiquidityActions<'info> {
    #[account(mut)]
    pub market_admin: Signer<'info>,
    #[account(
        mut,
        seeds = [
        b"pool", 
        market_admin.key().as_ref(),
        platform_config.admin.key().as_ref(),
        pool_config.event.as_str().as_bytes()],
        bump = pool_config.bump,
   )]
    pub pool_config: Account<'info, PoolConfig>,
    #[account(
        seeds = [b"platform", platform_config.admin.key().as_ref()],
        bump = platform_config.bump,
    )]
    platform_config: Account<'info, Config>,
    #[account(
        seeds = [b"pool_vault", pool_config.key().as_ref()],
        bump = pool_config.pool_vault_state_bump,
    )]
    pub pool_vault: Account<'info, PoolVaultState>,
    #[account(
        init_if_needed,
        payer = market_admin,
        seeds = [b"liquidity_position", pool_config.key().as_ref()],
        bump,
        space = 8 + LiquidityPosition::INIT_SPACE
    )]
    pub liquidity_position: Account<'info, LiquidityPosition>,
    #[account(
        seeds = [b"liquidity_state", pool_config.key().as_ref()],
        bump = liquidity_state.bump,
    )]
    pub liquidity_state: Account<'info, LiquidityState>,
    pub system_program: Program<'info, System>,
}

impl<'info> LiquidityActions<'info> {
    pub fn add_liquidity(&mut self, mut amount: u64) -> Result<()> {
        // tranfer amount from user to pool_vault
        require!(
            amount > 0 && amount < 500_000_000,
            ErrorCode::LiquidityProvidedBelowMinimum
        );

        let cpi_program = self.system_program.to_account_info();

        let cpi_accounts = Transfer {
            from: self.market_admin.to_account_info(),
            to: self.pool_vault.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        transfer(cpi_ctx, amount)?;

        //check if there are pending fees to collect and transfer them from liq state to pool vault
        if self.liquidity_state.accumulated_reward_per_share > 0
            && self.liquidity_position.last_accumulated_reward_per_share
                < self.liquidity_state.accumulated_reward_per_share
        {
            // calculate pending fees
            let pending_fees = self.liquidity_position.amount_provided
                * (self.liquidity_state.accumulated_reward_per_share
                    - self.liquidity_position.last_accumulated_reward_per_share)
                / 1_000_000_000;

            // add current fees to amount "claim and deposit"
            self.transfer_sol_restake(pending_fees)?;
            amount += pending_fees;
        }
        // update LiquidityPosition
        self.liquidity_position.amount_provided += amount;
        self.liquidity_position.last_accumulated_reward_per_share =
            self.liquidity_state.accumulated_reward_per_share;
        // update liquidity state
        self.liquidity_state.current_liquidity_amount += amount;
        // update pool vault state - note: add remainder to side_a
        self.pool_vault.amount_side_a += amount / 2 + amount % 2;
        self.pool_vault.amount_side_b += amount / 2;

        // check if pool status is looking for start liqudity, and if so, check if target liq is reached
        if self.pool_config.pool_status == 0
            && self.pool_vault.amount_side_a >= self.pool_config.target_liq_to_start
        {
            self.pool_config.pool_status = 1;
        }
        Ok(())
    }

    /* pub fn remove_liquidity(&mut self, amount: u64) -> Result<()> {
        /* self.pool_vault.amount_provided -= amount; */
        Ok(())
    } */

    pub fn transfer_sol_restake(&mut self, amount: u64) -> Result<()> {
        let seeds = &[
            &"liquidity_state".as_bytes(),
            &self.pool_config.key().to_bytes()[..],
            &[self.liquidity_state.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_program = self.system_program.to_account_info();

        let cpi_accounts = Transfer {
            from: self.liquidity_state.to_account_info(),
            to: self.pool_vault.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        transfer(cpi_ctx, amount)
    }
}