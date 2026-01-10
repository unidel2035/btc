/**
 * Portfolio Rotation Manager
 *
 * Manages smooth transition between old and new trading pairs
 */

import type { RotationPlan } from './types.js';

/**
 * Portfolio Rotation Manager
 */
export class PortfolioRotationManager {
  /**
   * Plan rotation from old pairs to new pairs
   */
  planRotation(currentPairs: string[], newPairs: string[]): RotationPlan {
    const toKeep = currentPairs.filter((pair) => newPairs.includes(pair));
    const toClose = currentPairs.filter((pair) => !newPairs.includes(pair));
    const toOpen = newPairs.filter((pair) => !currentPairs.includes(pair));

    const closeActions = toClose.map((pair, index) => ({
      pair,
      reason: 'No longer in screening recommendations',
      urgency: ('gradual' as const),
      // TODO: Get actual PnL
      currentPnL: undefined,
    }));

    const openActions = toOpen.map((pair, index) => ({
      pair,
      priority: index + 1,
      delayHours: index * 2, // Stagger openings by 2 hours
    }));

    return {
      timestamp: new Date(),
      currentPairs,
      newPairs,
      toKeep,
      toClose,
      toOpen,
      closeActions,
      openActions,
    };
  }

  /**
   * Determine if rotation should be gradual or immediate
   */
  private shouldCloseImmediately(pair: string, currentPnL?: number): boolean {
    // Close immediately if losing money
    if (currentPnL !== undefined && currentPnL < -5) {
      return true;
    }

    // Otherwise close gradually
    return false;
  }

  /**
   * Calculate optimal opening delay for new positions
   */
  private calculateOpeningDelay(pair: string, priority: number): number {
    // Higher priority pairs open sooner
    const baseDelay = (priority - 1) * 2; // 2 hours per priority level

    // Add random jitter to avoid all opening at once
    const jitter = Math.random() * 0.5;

    return baseDelay + jitter;
  }
}
