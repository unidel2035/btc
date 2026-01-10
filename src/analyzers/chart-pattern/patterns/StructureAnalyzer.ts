/**
 * Structure Analyzer
 *
 * Identifies market structure elements like swing highs, swing lows,
 * and determines overall market trend and phase
 */

import { Candle } from '../../../exchanges/types.js';
import { SwingPoint, MarketPhase, PatternDetectionConfig } from '../types.js';

export class StructureAnalyzer {
  constructor(private config: PatternDetectionConfig) {}

  /**
   * Identify all swing points (highs and lows)
   */
  identifySwingPoints(candles: Candle[]): SwingPoint[] {
    const swingPoints: SwingPoint[] = [];
    const lookback = this.config.swingLookback;

    if (candles.length < lookback * 2 + 1) {
      return swingPoints;
    }

    // Scan for swing highs and lows
    for (let i = lookback; i < candles.length - lookback; i++) {
      const current = candles[i];

      // Check for swing high
      if (this.isSwingHigh(candles, i, lookback)) {
        swingPoints.push({
          timestamp: current.timestamp,
          price: current.high,
          isHigh: true,
        });
      }

      // Check for swing low
      if (this.isSwingLow(candles, i, lookback)) {
        swingPoints.push({
          timestamp: current.timestamp,
          price: current.low,
          isHigh: false,
        });
      }
    }

    return swingPoints;
  }

  /**
   * Check if current candle is a swing high
   */
  private isSwingHigh(candles: Candle[], index: number, lookback: number): boolean {
    const current = candles[index];

    // Check left side (before)
    for (let i = index - lookback; i < index; i++) {
      if (candles[i].high >= current.high) {
        return false;
      }
    }

    // Check right side (after)
    for (let i = index + 1; i <= index + lookback; i++) {
      if (candles[i].high >= current.high) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if current candle is a swing low
   */
  private isSwingLow(candles: Candle[], index: number, lookback: number): boolean {
    const current = candles[index];

    // Check left side (before)
    for (let i = index - lookback; i < index; i++) {
      if (candles[i].low <= current.low) {
        return false;
      }
    }

    // Check right side (after)
    for (let i = index + 1; i <= index + lookback; i++) {
      if (candles[i].low <= current.low) {
        return false;
      }
    }

    return true;
  }

  /**
   * Determine current market phase
   */
  determineMarketPhase(candles: Candle[], swingPoints: SwingPoint[]): MarketPhase {
    if (candles.length < 50 || swingPoints.length < 4) {
      return MarketPhase.ACCUMULATION;
    }

    // Analyze recent swing points (last 50 candles)
    const recentTimestamp = candles[candles.length - 50].timestamp;
    const recentSwings = swingPoints.filter((s) => s.timestamp >= recentTimestamp);

    if (recentSwings.length < 3) {
      return MarketPhase.ACCUMULATION;
    }

    // Separate highs and lows
    const highs = recentSwings.filter((s) => s.isHigh).map((s) => s.price);
    const lows = recentSwings.filter((s) => !s.isHigh).map((s) => s.price);

    if (highs.length < 2 || lows.length < 2) {
      return MarketPhase.ACCUMULATION;
    }

    // Check if making higher highs and higher lows (uptrend)
    const higherHighs = this.isIncreasing(highs.slice(-3));
    const higherLows = this.isIncreasing(lows.slice(-3));

    if (higherHighs && higherLows) {
      return MarketPhase.UPTREND;
    }

    // Check if making lower highs and lower lows (downtrend)
    const lowerHighs = this.isDecreasing(highs.slice(-3));
    const lowerLows = this.isDecreasing(lows.slice(-3));

    if (lowerHighs && lowerLows) {
      return MarketPhase.DOWNTREND;
    }

    // Check for distribution (lower highs with higher lows - converging)
    if (lowerHighs && higherLows) {
      return MarketPhase.DISTRIBUTION;
    }

    // Check for correction (higher highs but lower lows or vice versa)
    if ((higherHighs && lowerLows) || (lowerHighs && higherLows)) {
      return MarketPhase.CORRECTION;
    }

    // Calculate volatility to distinguish accumulation from consolidation
    const volatility = this.calculateVolatility(candles.slice(-30));
    const avgPrice = candles.slice(-30).reduce((sum, c) => sum + c.close, 0) / 30;
    const volatilityPercent = (volatility / avgPrice) * 100;

    if (volatilityPercent < 2) {
      // Low volatility suggests accumulation
      return MarketPhase.ACCUMULATION;
    }

    return MarketPhase.ACCUMULATION; // Default
  }

  /**
   * Check if array values are increasing
   */
  private isIncreasing(values: number[]): boolean {
    if (values.length < 2) return false;

    for (let i = 1; i < values.length; i++) {
      if (values[i] <= values[i - 1]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if array values are decreasing
   */
  private isDecreasing(values: number[]): boolean {
    if (values.length < 2) return false;

    for (let i = 1; i < values.length; i++) {
      if (values[i] >= values[i - 1]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Calculate price volatility (standard deviation)
   */
  private calculateVolatility(candles: Candle[]): number {
    const closes = candles.map((c) => c.close);
    const mean = closes.reduce((sum, price) => sum + price, 0) / closes.length;

    const squaredDiffs = closes.map((price) => Math.pow(price - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / closes.length;

    return Math.sqrt(variance);
  }

  /**
   * Calculate support and resistance levels from swing points
   */
  calculateSupportResistance(swingPoints: SwingPoint[]): {
    support: number[];
    resistance: number[];
  } {
    const support: number[] = [];
    const resistance: number[] = [];

    // Group swing lows as support
    const lows = swingPoints.filter((s) => !s.isHigh).map((s) => s.price);
    support.push(...this.findKeyLevels(lows, 3));

    // Group swing highs as resistance
    const highs = swingPoints.filter((s) => s.isHigh).map((s) => s.price);
    resistance.push(...this.findKeyLevels(highs, 3));

    return {
      support: support.sort((a, b) => b - a), // Sort descending
      resistance: resistance.sort((a, b) => a - b), // Sort ascending
    };
  }

  /**
   * Find key levels by clustering nearby prices
   */
  private findKeyLevels(prices: number[], maxLevels: number): number[] {
    if (prices.length === 0) return [];

    const sorted = [...prices].sort((a, b) => a - b);
    const clusters: number[][] = [];
    let currentCluster: number[] = [sorted[0]];

    // Group nearby prices (within 1% of each other)
    for (let i = 1; i < sorted.length; i++) {
      const prev = currentCluster[currentCluster.length - 1];
      const current = sorted[i];

      if (Math.abs(current - prev) / prev <= 0.01) {
        currentCluster.push(current);
      } else {
        clusters.push(currentCluster);
        currentCluster = [current];
      }
    }
    clusters.push(currentCluster);

    // Calculate average of each cluster and sort by cluster size
    const levels = clusters
      .map((cluster) => ({
        price: cluster.reduce((sum, p) => sum + p, 0) / cluster.length,
        strength: cluster.length,
      }))
      .sort((a, b) => b.strength - a.strength)
      .slice(0, maxLevels)
      .map((l) => l.price);

    return levels;
  }
}
