/**
 * Order Block Detector
 *
 * Detects Order Blocks (OB) - the last opposite candle before a strong impulse move
 * These zones represent institutional order flow and often act as support/resistance
 */

import { Candle } from '../../../exchanges/types.js';
import { OrderBlock, OrderBlockType, ConfidenceLevel, PatternDetectionConfig } from '../types.js';

export class OrderBlockDetector {
  constructor(private config: PatternDetectionConfig) {}

  /**
   * Detect all Order Blocks in the given candle data
   */
  detect(candles: Candle[]): OrderBlock[] {
    const orderBlocks: OrderBlock[] = [];

    // Need at least 10 candles for meaningful detection
    if (candles.length < 10) {
      return orderBlocks;
    }

    // Scan through candles looking for impulse moves
    for (let i = 5; i < candles.length - 1; i++) {
      // Check for bullish impulse (strong upward move)
      const bullishOB = this.detectBullishOrderBlock(candles, i);
      if (bullishOB) {
        // Calculate effectiveness through backtesting
        const effectiveness = this.calculateEffectiveness(candles, bullishOB, i);
        if (effectiveness.effectiveness >= this.config.obEffectivenessThreshold) {
          orderBlocks.push({
            ...bullishOB,
            effectiveness: effectiveness.effectiveness,
            touchCount: effectiveness.touchCount,
            reactionCount: effectiveness.reactionCount,
            confidence: this.determineConfidence(effectiveness.effectiveness),
          });
        }
      }

      // Check for bearish impulse (strong downward move)
      const bearishOB = this.detectBearishOrderBlock(candles, i);
      if (bearishOB) {
        const effectiveness = this.calculateEffectiveness(candles, bearishOB, i);
        if (effectiveness.effectiveness >= this.config.obEffectivenessThreshold) {
          orderBlocks.push({
            ...bearishOB,
            effectiveness: effectiveness.effectiveness,
            touchCount: effectiveness.touchCount,
            reactionCount: effectiveness.reactionCount,
            confidence: this.determineConfidence(effectiveness.effectiveness),
          });
        }
      }
    }

    return orderBlocks;
  }

  /**
   * Detect bullish Order Block
   * Last bearish candle before strong upward impulse
   */
  private detectBullishOrderBlock(candles: Candle[], index: number): OrderBlock | null {
    const currentCandle = candles[index];
    const nextCandle = candles[index + 1];
    const prevCandle = candles[index - 1];

    // Current candle should be bearish (close < open)
    if (currentCandle.close >= currentCandle.open) {
      return null;
    }

    // Next few candles should show strong bullish impulse
    const impulseCandles = candles.slice(index + 1, Math.min(index + 6, candles.length));
    const impulseMove = this.calculateImpulseSize(impulseCandles, 'bullish');

    if (impulseMove < this.config.minImpulseSize) {
      return null;
    }

    // Verify impulse breaks above recent highs
    const recentHigh = Math.max(
      ...candles.slice(Math.max(0, index - 5), index + 1).map((c) => c.high),
    );
    const impulseHigh = Math.max(...impulseCandles.map((c) => c.high));

    if (impulseHigh <= recentHigh * 1.005) {
      // Need at least 0.5% break above recent high
      return null;
    }

    return {
      type: OrderBlockType.BULLISH,
      timestamp: currentCandle.timestamp,
      high: currentCandle.high,
      low: currentCandle.low,
      effectiveness: 0, // Will be calculated
      touchCount: 0,
      reactionCount: 0,
      confidence: ConfidenceLevel.MEDIUM,
    };
  }

  /**
   * Detect bearish Order Block
   * Last bullish candle before strong downward impulse
   */
  private detectBearishOrderBlock(candles: Candle[], index: number): OrderBlock | null {
    const currentCandle = candles[index];
    const nextCandle = candles[index + 1];

    // Current candle should be bullish (close > open)
    if (currentCandle.close <= currentCandle.open) {
      return null;
    }

    // Next few candles should show strong bearish impulse
    const impulseCandles = candles.slice(index + 1, Math.min(index + 6, candles.length));
    const impulseMove = this.calculateImpulseSize(impulseCandles, 'bearish');

    if (impulseMove < this.config.minImpulseSize) {
      return null;
    }

    // Verify impulse breaks below recent lows
    const recentLow = Math.min(
      ...candles.slice(Math.max(0, index - 5), index + 1).map((c) => c.low),
    );
    const impulseLow = Math.min(...impulseCandles.map((c) => c.low));

    if (impulseLow >= recentLow * 0.995) {
      // Need at least 0.5% break below recent low
      return null;
    }

    return {
      type: OrderBlockType.BEARISH,
      timestamp: currentCandle.timestamp,
      high: currentCandle.high,
      low: currentCandle.low,
      effectiveness: 0,
      touchCount: 0,
      reactionCount: 0,
      confidence: ConfidenceLevel.MEDIUM,
    };
  }

  /**
   * Calculate impulse size (percentage move)
   */
  private calculateImpulseSize(candles: Candle[], direction: 'bullish' | 'bearish'): number {
    if (candles.length === 0) return 0;

    const start = candles[0].open;
    if (direction === 'bullish') {
      const high = Math.max(...candles.map((c) => c.high));
      return ((high - start) / start) * 100;
    } else {
      const low = Math.min(...candles.map((c) => c.low));
      return ((start - low) / start) * 100;
    }
  }

  /**
   * Calculate effectiveness by backtesting how often price reacted to this OB
   */
  private calculateEffectiveness(
    candles: Candle[],
    orderBlock: OrderBlock,
    detectionIndex: number,
  ): {
    effectiveness: number;
    touchCount: number;
    reactionCount: number;
  } {
    let touchCount = 0;
    let reactionCount = 0;

    const obHigh = orderBlock.high;
    const obLow = orderBlock.low;

    // Check future price action after OB was formed
    for (let i = detectionIndex + 1; i < candles.length; i++) {
      const candle = candles[i];

      // Check if price touched the OB zone
      const touched =
        orderBlock.type === OrderBlockType.BULLISH
          ? candle.low <= obHigh && candle.low >= obLow
          : candle.high >= obLow && candle.high <= obHigh;

      if (touched) {
        touchCount++;

        // Check if price reacted (bounced) from the zone
        const reacted = this.checkReaction(candles, i, orderBlock.type);
        if (reacted) {
          reactionCount++;
        }
      }
    }

    // Effectiveness = (reactions / touches) or 0 if no touches
    const effectiveness =
      touchCount >= this.config.backtestMinTouches ? reactionCount / touchCount : 0;

    return {
      effectiveness,
      touchCount,
      reactionCount,
    };
  }

  /**
   * Check if price reacted (bounced) after touching the OB
   */
  private checkReaction(candles: Candle[], touchIndex: number, obType: OrderBlockType): boolean {
    // Look at next 3 candles to see if there was a bounce
    const nextCandles = candles.slice(touchIndex + 1, Math.min(touchIndex + 4, candles.length));
    if (nextCandles.length < 2) return false;

    const touchCandle = candles[touchIndex];

    if (obType === OrderBlockType.BULLISH) {
      // For bullish OB, check if price moved up after touching
      const maxHighAfter = Math.max(...nextCandles.map((c) => c.high));
      const moveUp = ((maxHighAfter - touchCandle.low) / touchCandle.low) * 100;
      return moveUp >= 1.0; // At least 1% bounce
    } else {
      // For bearish OB, check if price moved down after touching
      const minLowAfter = Math.min(...nextCandles.map((c) => c.low));
      const moveDown = ((touchCandle.high - minLowAfter) / touchCandle.high) * 100;
      return moveDown >= 1.0; // At least 1% bounce
    }
  }

  /**
   * Determine confidence level based on effectiveness
   */
  private determineConfidence(effectiveness: number): ConfidenceLevel {
    if (effectiveness >= 0.75) return ConfidenceLevel.HIGH;
    if (effectiveness >= 0.6) return ConfidenceLevel.MEDIUM;
    return ConfidenceLevel.LOW;
  }
}
