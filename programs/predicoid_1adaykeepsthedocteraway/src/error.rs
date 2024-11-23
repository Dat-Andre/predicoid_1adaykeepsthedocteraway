use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {

    #[msg("We are moving things around")]
    PlatformIsClosed,

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

    #[msg("The target liquidity specified is below the minimum")]
    TargetLiquidityBelowMinimum,
}
