/**
 * Backtest Runner for Dashboard API
 * Handles strategy selection and backtest execution
 */

import { BacktestEngine } from '../trading/backtest/BacktestEngine.js';
import { MockDataLoader } from '../trading/backtest/DataLoader.js';
import type { BacktestConfig, BacktestResult } from '../trading/backtest/types.js';
import { PriceChannelStrategy } from '../trading/strategies/PriceChannelStrategy.js';
import { NewsMomentumStrategy } from '../trading/strategies/NewsMomentumStrategy.js';
import { SentimentSwingStrategy } from '../trading/strategies/SentimentSwingStrategy.js';
import type { Strategy } from '../trading/strategies/types.js';

interface BacktestRequest {
  strategy: string;
  symbol: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  positionSize: number;
  timeframe: string;
  fees: number;
  slippage: number;
  allowShorts: boolean;
}

/**
 * Run a backtest based on the provided configuration
 */
export async function runBacktest(request: BacktestRequest): Promise<BacktestResult> {
  const {
    strategy: strategyName,
    symbol,
    startDate,
    endDate,
    initialCapital,
    positionSize,
    timeframe,
    fees,
    slippage,
    allowShorts,
  } = request;

  // Create strategy instance
  const strategy = createStrategy(strategyName, positionSize);

  // Create backtest configuration
  const config: BacktestConfig = {
    symbol,
    startDate,
    endDate,
    initialCapital,
    strategyName,
    fees: {
      maker: fees,
      taker: fees,
    },
    slippage,
    maxPositionSize: positionSize,
    allowShorts,
    timeframe,
    dataSource: 'mock', // For now, use mock data
  };

  // Create data loader
  // In production, you would use CSVDataLoader or fetch from exchange API
  const dataLoader = new MockDataLoader(50000, 0.02);

  // Create and run backtest engine
  const engine = new BacktestEngine(config, strategy, dataLoader);
  const results = await engine.run();

  return results;
}

/**
 * Create a strategy instance based on the strategy name
 */
function createStrategy(strategyName: string, positionSize: number): Strategy {
  const baseParams = {
    enabled: true,
    maxPositionSize: positionSize,
    stopLossPercent: 2,
    takeProfitPercent: 5,
    minConfidence: 0.6,
  };

  switch (strategyName) {
    case 'price-channel': {
      return new PriceChannelStrategy({
        ...baseParams,
        channelPeriod: 20,
        breakoutThreshold: 0.5, // 0.5% threshold for more realistic testing
        requireSignalConfirmation: false, // Disable for backtest (no signals available)
        minChannelPercent: 0.3, // Minimum 0.3% channel width
        maxChannelPercent: 5, // Maximum 5% channel width
      });
    }

    case 'news-momentum': {
      return new NewsMomentumStrategy({
        ...baseParams,
        momentumThreshold: 0.7,
        newsImpactWeight: 0.6,
      });
    }

    case 'sentiment-swing': {
      return new SentimentSwingStrategy({
        ...baseParams,
        sentimentThreshold: 0.6,
        swingPeriod: 14,
      });
    }

    default: {
      // Default to price channel strategy
      console.warn(`Unknown strategy: ${strategyName}, using price-channel as default`);
      return new PriceChannelStrategy({
        ...baseParams,
        channelPeriod: 20,
        breakoutThreshold: 0.002,
      });
    }
  }
}
