use std::ops::{Add, Div, Mul};

use anchor_lang::{prelude::*, system_program::{transfer, Transfer}};

use crate::{error::ErrorCode, Config, LiquidityState, Market, PoolConfig, PoolVaultState, PredictorPosition};

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
    #[account(
        mut,
        seeds = [b"liquidity_state", pool_config.key().as_ref()],
        bump = liquidity_state.bump,
    )]
    pub liquidity_state: Account<'info, LiquidityState>,
    #[account(
        mut,
        seeds = [b"treasury", platform_config.key().as_ref()],
        bump,
    )]
    pub treasury: SystemAccount<'info>,
    #[account(
        mut,
        seeds = [b"market_treasury", market.market_admin.key().as_ref()],
        bump = market.market_treasury_bump,
    )]
    pub market_treasury: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> Prediction<'info> {

    pub fn place_prediction(&mut self, amount: u64, side: String, bumps: &PredictionBumps) -> Result<()> {

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

    pub fn remove_prediction(&mut self, amount:u64, side: String) -> Result<()> {

        require!(self.pool_config.pool_status == 1, ErrorCode::PoolIsClosed);
        require!(self.platform_config.status == 1, ErrorCode::PlatformIsClosed);

        require!(amount > 0, ErrorCode::InvalidAmount);

        if side == "A" {
            require!(self.predictor_position.initialized && self.predictor_position.side_a_amount > 0, ErrorCode::PredictorPositionNotInitialized);
        } else {
            require!(self.predictor_position.initialized && self.predictor_position.side_b_amount > 0, ErrorCode::PredictorPositionNotInitialized);
        }


        if let Some((amount_to_predictor, market_fee_amount, liquidity_fee_amount,  platform_fee_amount)) = self.calculate_amount_to_take_and_fees(amount, &side) {
            // send amount to predictor
            self.transfer_sol_from_pool_vault_to_predictor(amount_to_predictor)?;

            // update predictor position
            if side == "A" {
                self.predictor_position.side_a_amount -= amount;
                if self.predictor_position.side_a_amount == 0 {
                    self.predictor_position.side_a_entry_odd = 0;
                }
            } else {
                self.predictor_position.side_b_amount -= amount;
                if self.predictor_position.side_b_amount == 0 {
                    self.predictor_position.side_b_entry_odd = 0;
                }
            }

            // update pool vault state
            let total_amount_to_deduct = amount_to_predictor.checked_add(market_fee_amount).unwrap().checked_add(liquidity_fee_amount).unwrap().checked_add(platform_fee_amount).unwrap();
            self.pool_vault.amount_side_a -= total_amount_to_deduct / 2 + total_amount_to_deduct % 2;
            self.pool_vault.amount_side_b -= total_amount_to_deduct / 2;

             require!(self.pool_vault.amount_side_a.checked_add(self.pool_vault.amount_side_b).unwrap() < self.pool_vault.get_lamports(), ErrorCode::PoolVaultAmountError);

            // send fee to market vault
            self.transfer_sol_from_pool_vault_to_market_vault(market_fee_amount)?;
           
            // send fee to liquidity vault
            self.transfer_sol_from_pool_vault_to_liquidity_vault(liquidity_fee_amount)?;

            // update liquidity state
            self.liquidity_state.total_fees += liquidity_fee_amount;
            if let Some(x_amount) = liquidity_fee_amount.checked_div(self.liquidity_state.current_liquidity_amount) {
                self.liquidity_state.accumulated_reward_per_share += x_amount;
            }else {
                require!(false, ErrorCode::FeeSplitLogicError);
            }
            
            // send fee to platform vault
            self.transfer_sol_from_pool_vault_to_platform_vault(platform_fee_amount)?;
            

        }else {
            require!(false, ErrorCode::AmountAndFeeCalculationError);
        }
        Ok(())
    }

    pub fn transfer_sol_from_pool_vault_to_predictor(&mut self, amount: u64) -> Result<()> {
        
        require!(self.pool_vault.get_lamports() >= amount, ErrorCode::NotEnoughLamports);

        self.pool_vault.sub_lamports(amount)?;
        self.predictor.add_lamports(amount)?;

        Ok(())
    }

    pub fn transfer_sol_from_pool_vault_to_liquidity_vault(&mut self, amount: u64) -> Result<()> {
        
        require!(self.pool_vault.get_lamports() >= amount, ErrorCode::NotEnoughLamports);

        self.pool_vault.sub_lamports(amount)?;
        self.liquidity_state.add_lamports(amount)?;

        Ok(())
    }

    pub fn transfer_sol_from_pool_vault_to_platform_vault(&mut self, amount: u64) -> Result<()> {
        
        require!(self.pool_vault.get_lamports() >= amount, ErrorCode::NotEnoughLamports);

        self.pool_vault.sub_lamports(amount)?;
        self.treasury.add_lamports(amount)?;

        Ok(())
    }

    pub fn transfer_sol_from_pool_vault_to_market_vault(&mut self, amount: u64) -> Result<()> {
        
        require!(self.pool_vault.get_lamports() >= amount, ErrorCode::NotEnoughLamports);

        self.pool_vault.sub_lamports(amount)?;
        self.market_treasury.add_lamports(amount)?;

        Ok(())

        
    }

    pub fn calculate_amount_to_take_and_fees(&self, amount: u64, side: &String) -> Option<(u64, u64, u64, u64)> {
        // Extract shared variables
        // Determine the side-specific values
        let (side_amount, entry_odd) = if side == "A" {
            (self.pool_vault.amount_side_a, self.predictor_position.side_a_entry_odd)
        } else {
            (self.pool_vault.amount_side_b, self.predictor_position.side_b_entry_odd)
        };

        // Calculate the total pool amount
        let total_amount = self.pool_vault.amount_side_a.checked_add(self.pool_vault.amount_side_b)? as f64;

        // Compute current odds and delta odds
        let current_odd = (side_amount as f64 / total_amount) * 10_000.0;
        let delta_odd = current_odd as i64 - entry_odd as i64;

        // Calculate the amount to receive
        let amount_receive = (amount * ((10_000 + delta_odd) as u64)) / 10_000;

        // Calculate market fees
        let total_market_fee = (amount_receive * self.market.market_fee) / 10_000;
        let liquidity_fee = total_market_fee / 2 + total_market_fee % 2;
        let market_fee = total_market_fee / 2;

        // Calculate platform fees
        let platform_fee = (amount_receive * self.platform_config.platform_fee as u64) / 10_000;

        // Final amount after fees
        let final_amount = amount_receive - (market_fee + platform_fee);

        // Return the results as a tuple
        Some((final_amount, market_fee, liquidity_fee, platform_fee))
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