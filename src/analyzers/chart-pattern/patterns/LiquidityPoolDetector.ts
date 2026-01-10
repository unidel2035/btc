/**
 * Liquidity Pool Detector
 *
 * Detects areas of liquidity concentration where stop-losses cluster
 * around key swing highs/lows. These areas are often targeted by smart money.
 */

import { Candle } from '../../../exchanges/types.js';
import {
  LiquidityPool,
  LiquidityPoolType,
  SwingPoint,
  PatternDetectionConfig,
} from '../types.js';

export class LiquidityPoolDetector {
  constructor(private config: PatternDetectionConfig) {}

  /**
   * Detect liquidity pools near swing highs and lows
   */
  detect(candles: Candle[], swingPoints: SwingPoint[]): LiquidityPool[] {
    const liquidityPools: LiquidityPool[] = [];

    // For each swing point, check if there's a liquidity pool nearby
    for (const swing of swingPoints) {
      const pool = this.detectPoolAtSwing(candles, swing);
      if (pool && pool.strength >= this.config.liquidityStrengthThreshold) {
        liquidityPools.push(pool);
      }
    }

    return liquidityPools;
  }

  /**
   * Detect liquidity pool at a swing point
   */
  private detectPoolAtSwing(candles: Candle[], swing: SwingPoint): LiquidityPool | null {
    // Find the candle at this swing point
    const swingCandleIndex = candles.findIndex((c) => c.timestamp === swing.timestamp);
    if (swingCandleIndex === -1) return null;

    const swingCandle = candles[swingCandleIndex];

    // Calculate liquidity strength based on:
    // 1. Wick size relative to body
    // 2. Volume spike
    // 3. Number of rejections at this level
    const wickRatio = swing.isHigh
      ? this.calculateUpperWickRatio(swingCandle)
      : this.calculateLowerWickRatio(swingCandle);

    if (wickRatio < this.config.minWickRatio) {
      return null;
    }

    // Check volume spike
    const avgVolume = this.calculateAverageVolume(
      candles,
      Math.max(0, swingCandleIndex - 20),
      swingCandleIndex,
    );
    const volumeRatio = swingCandle.volume / avgVolume;

    // Check if level was tested multiple times
    const testCount = this.countLevelTests(candles, swing.price, swingCandleIndex);

    // Calculate overall strength (0-1)
    const wickScore = Math.min(wickRatio / 3, 1); // Normalize to 0-1
    const volumeScore = Math.min(volumeRatio / 2, 1); // Normalize to 0-1
    const testScore = Math.min(testCount / 5, 1); // Normalize to 0-1

    const strength = (wickScore * 0.4 + volumeScore * 0.3 + testScore * 0.3);

    // Check if liquidity was swept (price went through level significantly)
    const swept = this.checkIfSwept(candles, swing, swingCandleIndex);

    return {
      type: swing.isHigh ? LiquidityPoolType.ABOVE : LiquidityPoolType.BELOW,
      timestamp: swing.timestamp,
      price: swing.price,
      strength,
      swept,
    };
  }

  /**
   * Calculate upper wick ratio (wick / body)
   */
  private calculateUpperWickRatio(candle: Candle): number {
    const body = Math.abs(candle.close - candle.open);
    const upperWick = candle.high - Math.max(candle.open, candle.close);

    if (body === 0) return upperWick > 0 ? 10 : 0; // Doji with wick
    return upperWick / body;
  }

  /**
   * Calculate lower wick ratio (wick / body)
   */
  private calculateLowerWickRatio(candle: Candle): number {
    const body = Math.abs(candle.close - candle.open);
    const lowerWick = Math.min(candle.open, candle.close) - candle.low;

    if (body === 0) return lowerWick > 0 ? 10 : 0; // Doji with wick
    return lowerWick / body;
  }

  /**
   * Calculate average volume over a period
   */
  private calculateAverageVolume(candles: Candle[], startIndex: number, endIndex: number): number {
    const periodCandles = candles.slice(startIndex, endIndex);
    if (periodCandles.length === 0) return 1;

    const totalVolume = periodCandles.reduce((sum, c) => sum + c.volume, 0);
    return totalVolume / periodCandles.length;
  }

  /**
   * Count how many times price tested this level
   */
  private countLevelTests(candles: Candle[], price: number, swingIndex: number): number {
    let testCount = 0;
    const tolerance = price * 0.005; // 0.5% tolerance

    // Check before swing point
    for (let i = Math.max(0, swingIndex - 50); i < swingIndex; i++) {
      const candle = candles[i];
      if (Math.abs(candle.high - price) <= tolerance || Math.abs(candle.low - price) <= tolerance) {
        testCount++;
      }
    }

    // Check after swing point
    for (let i = swingIndex + 1; i < Math.min(candles.length, swingIndex + 50); i++) {
      const candle = candles[i];
      if (Math.abs(candle.high - price) <= tolerance || Math.abs(candle.low - price) <= tolerance) {
        testCount++;
      }
    }

    return testCount;
  }

  /**
   * Check if liquidity was swept (price moved through level significantly)
   */
  private checkIfSwept(candles: Candle[], swing: SwingPoint, swingIndex: number): boolean {
    const sweptThreshold = swing.price * 0.01; // 1% beyond the level

    // Check candles after swing point
    for (let i = swingIndex + 1; i < candles.length; i++) {
      const candle = candles[i];

      if (swing.isHigh) {
        // For swing high, check if price swept above and then reversed
        if (candle.high > swing.price + sweptThreshold) {
          return true;
        }
      } else {
        // For swing low, check if price swept below and then reversed
        if (candle.low < swing.price - sweptThreshold) {
          return true;
        }
      }
    }

    return false;
  }
}
