/**
 * Screening Module
 *
 * AI-powered cryptocurrency project screening and portfolio construction
 *
 * Pipeline:
 * 1. Macro Filter: Identify top-performing sectors
 * 2. Quantitative Screening: Filter projects by metrics
 * 3. Fundamental Scoring: Calculate composite scores
 * 4. Portfolio Construction: Build diversified portfolio
 */

export { ScreeningModule } from './ScreeningModule.js';
export { CoinGeckoClient } from './CoinGeckoClient.js';
export { MacroFilter } from './MacroFilter.js';
export { QuantitativeScreening } from './QuantitativeScreening.js';
export { FundamentalScoring } from './FundamentalScoring.js';
export { PortfolioConstruction } from './PortfolioConstruction.js';
export { defaultScreeningConfig, getScreeningConfig } from './config.js';
export * from './types.js';
