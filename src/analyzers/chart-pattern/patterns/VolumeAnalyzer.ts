/**
 * Volume Analyzer
 *
 * Analyzes volume patterns to detect accumulation, distribution,
 * and volume divergences
 */

import { Candle } from '../../../exchanges/types.js';
import { VolumeAnalysis, PatternDetectionConfig } from '../types.js';

export class VolumeAnalyzer {
  constructor(private config: PatternDetectionConfig) {}

  /**
   * Perform comprehensive volume analysis
   */
  analyze(candles: Candle[]): VolumeAnalysis {
    if (candles.length < this.config.volumeLookback) {
      return this.getDefaultAnalysis(candles);
    }

    const avgVolume = this.calculateAverageVolume(candles);
    const currentVolume = candles[candles.length - 1].volume;
    const volumeRatio = currentVolume / avgVolume;

    // Detect accumulation (low volatility + high volume)
    const accumulationDetected = this.detectAccumulation(candles);

    // Detect distribution (high volatility at peaks + high volume)
    const distributionDetected = this.detectDistribution(candles);

    // Detect volume divergence
    const divergence = this.detectVolumeDivergence(candles);

    return {
      avgVolume,
      currentVolume,
      volumeRatio,
      accumulationDetected,
      distributionDetected,
      divergenceDetected: divergence.detected,
      divergenceType: divergence.type,
    };
  }

  /**
   * Calculate average volume over lookback period
   */
  private calculateAverageVolume(candles: Candle[]): number {
    const lookback = Math.min(this.config.volumeLookback, candles.length);
    const recentCandles = candles.slice(-lookback);

    const totalVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0);
    return totalVolume / recentCandles.length;
  }

  /**
   * Detect accumulation phase
   * Characteristics: Low volatility (tight range) + Above average volume
   */
  private detectAccumulation(candles: Candle[]): boolean {
    const lookback = Math.min(30, candles.length);
    const recentCandles = candles.slice(-lookback);

    // Calculate price volatility
    const volatility = this.calculateVolatility(recentCandles);
    const avgPrice = recentCandles.reduce((sum, c) => sum + c.close, 0) / recentCandles.length;
    const volatilityPercent = (volatility / avgPrice) * 100;

    // Calculate average volume
    const avgVolume = this.calculateAverageVolume(candles.slice(-this.config.volumeLookback));
    const recentAvgVolume =
      recentCandles.reduce((sum, c) => sum + c.volume, 0) / recentCandles.length;
    const volumeRatio = recentAvgVolume / avgVolume;

    // Accumulation: Low volatility (< 3%) + High volume (> threshold)
    return volatilityPercent < 3 && volumeRatio > this.config.volumeAccumulationThreshold;
  }

  /**
   * Detect distribution phase
   * Characteristics: Price at highs + High volume without continuation
   */
  private detectDistribution(candles: Candle[]): boolean {
    const lookback = Math.min(50, candles.length);
    const recentCandles = candles.slice(-lookback);

    if (recentCandles.length < 10) return false;

    // Check if price is near recent highs
    const currentPrice = candles[candles.length - 1].close;
    const recentHigh = Math.max(...recentCandles.map((c) => c.high));
    const distanceFromHigh = ((recentHigh - currentPrice) / recentHigh) * 100;

    if (distanceFromHigh > 5) {
      return false; // Not near highs
    }

    // Check if volume is elevated
    const avgVolume = this.calculateAverageVolume(candles.slice(-this.config.volumeLookback));
    const last10AvgVolume = candles.slice(-10).reduce((sum, c) => sum + c.volume, 0) / 10;
    const volumeRatio = last10AvgVolume / avgVolume;

    if (volumeRatio < 1.3) {
      return false; // Volume not elevated enough
    }

    // Check if price is failing to make new highs despite volume
    const last10Candles = candles.slice(-10);
    const last10High = Math.max(...last10Candles.map((c) => c.high));
    const priorHigh = Math.max(...recentCandles.slice(0, -10).map((c) => c.high));

    const noNewHighs = last10High <= priorHigh * 1.01; // Less than 1% new high

    return volumeRatio > 1.3 && noNewHighs;
  }

  /**
   * Detect volume divergence
   * Price making new highs/lows but volume declining
   */
  private detectVolumeDivergence(candles: Candle[]): {
    detected: boolean;
    type?: 'bullish' | 'bearish';
  } {
    const lookback = Math.min(50, candles.length);
    if (lookback < 30) {
      return { detected: false };
    }

    const recentCandles = candles.slice(-lookback);

    // Find recent swing highs and lows with their volumes
    const swingHighs = this.findSwingHighsWithVolume(recentCandles);
    const swingLows = this.findSwingLowsWithVolume(recentCandles);

    // Check for bearish divergence (higher highs with lower volume)
    if (swingHighs.length >= 2) {
      const lastTwo = swingHighs.slice(-2);
      const priceIncreasing = lastTwo[1].price > lastTwo[0].price;
      const volumeDecreasing = lastTwo[1].volume < lastTwo[0].volume;

      const volumeDecline = ((lastTwo[0].volume - lastTwo[1].volume) / lastTwo[0].volume) * 100;

      if (
        priceIncreasing &&
        volumeDecreasing &&
        volumeDecline > this.config.volumeDivergenceThreshold
      ) {
        return { detected: true, type: 'bearish' };
      }
    }

    // Check for bullish divergence (lower lows with lower volume)
    if (swingLows.length >= 2) {
      const lastTwo = swingLows.slice(-2);
      const priceDecreasing = lastTwo[1].price < lastTwo[0].price;
      const volumeDecreasing = lastTwo[1].volume < lastTwo[0].volume;

      const volumeDecline = ((lastTwo[0].volume - lastTwo[1].volume) / lastTwo[0].volume) * 100;

      if (
        priceDecreasing &&
        volumeDecreasing &&
        volumeDecline > this.config.volumeDivergenceThreshold
      ) {
        return { detected: true, type: 'bullish' };
      }
    }

    return { detected: false };
  }

  /**
   * Find swing highs with their associated volumes
   */
  private findSwingHighsWithVolume(candles: Candle[]): Array<{ price: number; volume: number }> {
    const swingHighs: Array<{ price: number; volume: number }> = [];
    const lookback = 5;

    for (let i = lookback; i < candles.length - lookback; i++) {
      const current = candles[i];
      let isSwingHigh = true;

      // Check if this is a local high
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && candles[j].high >= current.high) {
          isSwingHigh = false;
          break;
        }
      }

      if (isSwingHigh) {
        swingHighs.push({
          price: current.high,
          volume: current.volume,
        });
      }
    }

    return swingHighs;
  }

  /**
   * Find swing lows with their associated volumes
   */
  private findSwingLowsWithVolume(candles: Candle[]): Array<{ price: number; volume: number }> {
    const swingLows: Array<{ price: number; volume: number }> = [];
    const lookback = 5;

    for (let i = lookback; i < candles.length - lookback; i++) {
      const current = candles[i];
      let isSwingLow = true;

      // Check if this is a local low
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && candles[j].low <= current.low) {
          isSwingLow = false;
          break;
        }
      }

      if (isSwingLow) {
        swingLows.push({
          price: current.low,
          volume: current.volume,
        });
      }
    }

    return swingLows;
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
   * Get default analysis when insufficient data
   */
  private getDefaultAnalysis(candles: Candle[]): VolumeAnalysis {
    const currentVolume = candles.length > 0 ? candles[candles.length - 1].volume : 0;

    return {
      avgVolume: currentVolume,
      currentVolume,
      volumeRatio: 1,
      accumulationDetected: false,
      distributionDetected: false,
      divergenceDetected: false,
    };
  }
}
