use std::ops::{Add, Div, Mul};

use anchor_lang::{prelude::*, system_program::{transfer, Transfer}};

use crate::{error::ErrorCode, Config, Market, PoolConfig, PoolVaultState, PredictorPosition};

#[derive(Accounts)]
#[instruction(amount: u64, side: String)]
pub struct Prediction<'info> {
    #[account(mut)]
    pub predictor: Signer<'info>,
    #[account(
        seeds = [
        b"pool", 
        market.market_admin.key().as_ref(),
        platform_config.admin.key().as_ref(),
        pool_config.event.as_str().as_bytes()],
        bump = pool_config.bump,
        constraint = pool_config.pool_status == 1 @ErrorCode::PoolIsClosed,
   )]
    pub pool_config: Account<'info, PoolConfig>,
    #[account(
        seeds = [b"market", market.market_admin.key().as_ref(), platform_config.key().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,
    #[account(
        seeds = [b"platform", platform_config.admin.key().as_ref()],
        bump = platform_config.bump,
        constraint = platform_config.status == 1 @ErrorCode::PlatformIsClosed,
    )]
    platform_config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [b"pool_vault", pool_config.key().as_ref()],
        bump = pool_config.pool_vault_state_bump,
    )]
    pub pool_vault: Account<'info, PoolVaultState>,
    #[account(
        init_if_needed,
        payer = predictor,
        seeds = [b"predictor_position", pool_config.key().as_ref(), predictor.key().as_ref()],
        bump,
        space = 8 + PredictorPosition::INIT_SPACE
    )]
    pub predictor_position: Account<'info, PredictorPosition>,
    pub system_program: Program<'info, System>,
}

impl<'info> Prediction<'info> {
    pub fn predict(&mut self, amount: u64, side: String, bumps: &PredictionBumps) -> Result<()> {

        require!(amount > 0, ErrorCode::InvalidAmount);

        require!(side == "A" || side == "B", ErrorCode::InvalidSide);
        
        // check if Predictor position is initialized, and if not save bump
        if !self.predictor_position.initialized {
            self.predictor_position.bump = bumps.predictor_position;
            self.predictor_position.initialized = true;
        }

        // update predictor position
        if side == "A" {
            self.predictor_position.side_a_amount += amount;
            self.predictor_position.side_a_entry_odd = self.calculate_entry_odd(amount, String::from("A"));
        } else {
            self.predictor_position.side_b_amount += amount;
            self.predictor_position.side_b_entry_odd = self.calculate_entry_odd(amount, String::from("B"));
        }
        
        // update pool vault state
        if side == "A" {
            self.pool_vault.amount_side_a += amount;
        } else {
            self.pool_vault.amount_side_b += amount;
        }

        // send amount to pool vault state
        let cpi_program = self.system_program.to_account_info();

        let cpi_accounts = Transfer {
            from: self.predictor.to_account_info(),
            to: self.pool_vault.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        transfer(cpi_ctx, amount)?;

        Ok(())
    }

    pub fn calculate_entry_odd(&self, amount: u64, side: String) -> u64 {
        if side == "A" {
            let new_amount_side_a = (self.pool_vault.amount_side_a + amount) as f64;
            let new_total_amount = new_amount_side_a.add(self.pool_vault.amount_side_b as f64);
            return new_amount_side_a.div(new_total_amount).mul(10_000 as f64) as u64;
        } else {
            let new_amount_side_b = (self.pool_vault.amount_side_b + amount) as f64;
            let new_total_amount = new_amount_side_b.add(self.pool_vault.amount_side_a as f64);
            return new_amount_side_b.div(new_total_amount).mul(10_000 as f64) as u64;
        }
    }
}