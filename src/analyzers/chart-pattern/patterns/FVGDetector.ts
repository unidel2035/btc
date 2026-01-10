/**
 * Fair Value Gap (FVG) Detector
 *
 * Detects Fair Value Gaps - three-candle patterns where the middle candle
 * has high shadows and doesn't overlap with neighboring candles.
 * These gaps often act as magnets for price to return and fill.
 */

import { Candle } from '../../../exchanges/types.js';
import { FairValueGap, FVGType, ConfidenceLevel, PatternDetectionConfig } from '../types.js';

export class FVGDetector {
  constructor(private config: PatternDetectionConfig) {}

  /**
   * Detect all Fair Value Gaps in the given candle data
   */
  detect(candles: Candle[]): FairValueGap[] {
    const fvgs: FairValueGap[] = [];

    // Need at least 3 candles for FVG pattern
    if (candles.length < 3) {
      return fvgs;
    }

    // Scan through candles in groups of 3
    for (let i = 1; i < candles.length - 1; i++) {
      const prev = candles[i - 1];
      const current = candles[i];
      const next = candles[i + 1];

      // Check for bullish FVG
      const bullishFVG = this.detectBullishFVG(prev, current, next);
      if (bullishFVG) {
        // Calculate effectiveness
        const effectiveness = this.calculateEffectiveness(candles, bullishFVG, i);
        if (effectiveness >= this.config.fvgEffectivenessThreshold) {
          fvgs.push({
            ...bullishFVG,
            effectiveness,
            confidence: this.determineConfidence(effectiveness),
          });
        }
      }

      // Check for bearish FVG
      const bearishFVG = this.detectBearishFVG(prev, current, next);
      if (bearishFVG) {
        const effectiveness = this.calculateEffectiveness(candles, bearishFVG, i);
        if (effectiveness >= this.config.fvgEffectivenessThreshold) {
          fvgs.push({
            ...bearishFVG,
            effectiveness,
            confidence: this.determineConfidence(effectiveness),
          });
        }
      }
    }

    return fvgs;
  }

  /**
   * Detect bullish Fair Value Gap
   * Gap between prev candle's high and next candle's low (upward movement)
   */
  private detectBullishFVG(prev: Candle, current: Candle, next: Candle): FairValueGap | null {
    // For bullish FVG: next.low should be above prev.high
    if (next.low <= prev.high) {
      return null;
    }

    const gapSize = next.low - prev.high;
    const gapSizePercent = (gapSize / prev.high) * 100;

    // Check if gap is significant enough
    if (gapSizePercent < this.config.minGapSize) {
      return null;
    }

    return {
      type: FVGType.BULLISH,
      timestamp: current.timestamp,
      gapHigh: next.low,
      gapLow: prev.high,
      filled: false, // Will be checked later
      effectiveness: 0,
      confidence: ConfidenceLevel.MEDIUM,
    };
  }

  /**
   * Detect bearish Fair Value Gap
   * Gap between prev candle's low and next candle's high (downward movement)
   */
  private detectBearishFVG(prev: Candle, current: Candle, next: Candle): FairValueGap | null {
    // For bearish FVG: next.high should be below prev.low
    if (next.high >= prev.low) {
      return null;
    }

    const gapSize = prev.low - next.high;
    const gapSizePercent = (gapSize / prev.low) * 100;

    // Check if gap is significant enough
    if (gapSizePercent < this.config.minGapSize) {
      return null;
    }

    return {
      type: FVGType.BEARISH,
      timestamp: current.timestamp,
      gapHigh: prev.low,
      gapLow: next.high,
      filled: false,
      effectiveness: 0,
      confidence: ConfidenceLevel.MEDIUM,
    };
  }

  /**
   * Calculate effectiveness - how often the gap acted as support/resistance
   */
  private calculateEffectiveness(
    candles: Candle[],
    fvg: FairValueGap,
    detectionIndex: number,
  ): number {
    let priceReturned = false;
    let actedAsLevel = false;

    // Check if price returned to the gap after it was created
    for (let i = detectionIndex + 2; i < candles.length; i++) {
      const candle = candles[i];

      // Check if price entered the gap zone
      const inGap =
        (candle.low <= fvg.gapHigh && candle.high >= fvg.gapLow) ||
        (candle.high >= fvg.gapLow && candle.low <= fvg.gapHigh);

      if (inGap) {
        priceReturned = true;

        // Check if gap acted as support (bullish) or resistance (bearish)
        if (fvg.type === FVGType.BULLISH) {
          // For bullish FVG, check if price bounced up after touching
          const bounced = this.checkBullishBounce(candles, i);
          if (bounced) {
            actedAsLevel = true;
            break;
          }
        } else {
          // For bearish FVG, check if price bounced down after touching
          const bounced = this.checkBearishBounce(candles, i);
          if (bounced) {
            actedAsLevel = true;
            break;
          }
        }

        // Check if gap was filled (price crossed through completely)
        if (fvg.type === FVGType.BULLISH && candle.low < fvg.gapLow) {
          fvg.filled = true;
          break;
        } else if (fvg.type === FVGType.BEARISH && candle.high > fvg.gapHigh) {
          fvg.filled = true;
          break;
        }
      }
    }

    // Calculate effectiveness score
    if (!priceReturned) {
      return 0.5; // Neutral if price never returned
    }

    if (actedAsLevel && !fvg.filled) {
      return 0.95; // High effectiveness - acted as level and not filled
    }

    if (actedAsLevel && fvg.filled) {
      return 0.7; // Medium - acted as level but eventually filled
    }

    if (fvg.filled) {
      return 0.3; // Low - filled without much reaction
    }

    return 0.5; // Neutral
  }

  /**
   * Check if price bounced up from the gap
   */
  private checkBullishBounce(candles: Candle[], index: number): boolean {
    const nextCandles = candles.slice(index + 1, Math.min(index + 4, candles.length));
    if (nextCandles.length < 2) return false;

    const touchCandle = candles[index];
    const maxHighAfter = Math.max(...nextCandles.map((c) => c.high));
    const moveUp = ((maxHighAfter - touchCandle.low) / touchCandle.low) * 100;

    return moveUp >= 1.5; // At least 1.5% bounce up
  }

  /**
   * Check if price bounced down from the gap
   */
  private checkBearishBounce(candles: Candle[], index: number): boolean {
    const nextCandles = candles.slice(index + 1, Math.min(index + 4, candles.length));
    if (nextCandles.length < 2) return false;

    const touchCandle = candles[index];
    const minLowAfter = Math.min(...nextCandles.map((c) => c.low));
    const moveDown = ((touchCandle.high - minLowAfter) / touchCandle.high) * 100;

    return moveDown >= 1.5; // At least 1.5% bounce down
  }

  /**
   * Determine confidence level based on effectiveness
   */
  private determineConfidence(effectiveness: number): ConfidenceLevel {
    if (effectiveness >= 0.85) return ConfidenceLevel.HIGH;
    if (effectiveness >= 0.65) return ConfidenceLevel.MEDIUM;
    return ConfidenceLevel.LOW;
  }
}
