use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("We are moving things around")]
    PlatformIsClosed,

    #[msg("Too soon or too late to place a prediction")]
    PoolIsClosed,

    #[msg("Market name too long")]
    MarketNameTooLong,

    #[msg("Pool event name too long")]
    EventNameTooLong,

    #[msg("Pool side name too long")]
    SideNameTooLong,

    #[msg("Fee not allowed")]
    FeeOutOfBounds,

    #[msg("The amount of liquidity provided is below the minimum")]
    LiquidityProvidedBelowMinimum,

    #[msg("The amount of liquidity to withdraw is wrong...")]
    LiquidityWithdrawnIncorrect,

    #[msg("The target liquidity specified is below the minimum")]
    TargetLiquidityBelowMinimum,

    #[msg("Not enough lamports on the vault state to perform the withdrawal")]
    NotEnoughLamports,

    #[msg("Prediction amount not allowed")]
    InvalidAmount,

    #[msg("Pool side not allowed")]
    InvalidSide,

    #[msg("Predictor position not initialized or without any amount")]
    PredictorPositionNotInitialized,

    #[msg("Something went wrong with the fees split logic")]
    FeeSplitLogicError,

    #[msg("Something went wrong with the fees and amount calculation")]
    AmountAndFeeCalculationError,

    #[msg("The vault should have more money than the sum of sides")]
    PoolVaultAmountError,
}
