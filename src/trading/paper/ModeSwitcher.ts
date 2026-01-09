/**
 * Mode Switcher
 * Handles switching between paper and live trading modes with warnings
 */

import { TradingMode, ModeSwitchWarning } from './types.js';

export class ModeSwitcher {
  /**
   * Generate warnings for mode switch
   */
  public static generateWarnings(
    fromMode: TradingMode,
    toMode: TradingMode,
    hasOpenPositions: boolean,
    hasPendingOrders: boolean,
  ): ModeSwitchWarning {
    const warnings: string[] = [];

    if (toMode === TradingMode.LIVE) {
      // Switching to live trading
      warnings.push('⚠️  WARNING: You are about to switch to LIVE TRADING mode');
      warnings.push('⚠️  Real money will be at risk');
      warnings.push('⚠️  All future orders will be executed on real markets');
      warnings.push('⚠️  Make sure your API keys and configurations are correct');

      if (hasOpenPositions) {
        warnings.push('⚠️  You have open positions in paper trading');
        warnings.push('⚠️  These positions will NOT be transferred to live trading');
        warnings.push('⚠️  Close all positions before switching or they will be lost');
      }

      if (hasPendingOrders) {
        warnings.push('⚠️  You have pending orders in paper trading');
        warnings.push('⚠️  These orders will be cancelled when switching modes');
      }

      return {
        fromMode,
        toMode,
        warnings,
        requiresConfirmation: true,
      };
    } else {
      // Switching to paper trading
      warnings.push('ℹ️  Switching to PAPER TRADING mode');
      warnings.push('ℹ️  No real money will be used');
      warnings.push('ℹ️  All trades will be simulated');

      if (hasOpenPositions) {
        warnings.push('⚠️  You have open positions in live trading');
        warnings.push('⚠️  These positions will remain open in live markets');
        warnings.push('⚠️  Paper trading will start with fresh virtual balance');
      }

      if (hasPendingOrders) {
        warnings.push('ℹ️  Your pending live orders will remain active');
        warnings.push('ℹ️  Paper trading will start with no pending orders');
      }

      return {
        fromMode,
        toMode,
        warnings,
        requiresConfirmation: false,
      };
    }
  }

  /**
   * Display mode switch warnings
   */
  public static displayWarnings(warning: ModeSwitchWarning): void {
    console.info('\n' + '═'.repeat(60));
    console.info('                  MODE SWITCH WARNING');
    console.info('═'.repeat(60));
    console.info(`From: ${warning.fromMode.toUpperCase()} → To: ${warning.toMode.toUpperCase()}`);
    console.info('═'.repeat(60));

    for (const msg of warning.warnings) {
      console.info(msg);
    }

    console.info('═'.repeat(60) + '\n');

    if (warning.requiresConfirmation) {
      console.info('⚠️  This action requires explicit confirmation');
      console.info('⚠️  Type "CONFIRM" to proceed or "CANCEL" to abort');
    }
  }

  /**
   * Validate mode switch
   */
  public static validateSwitch(
    fromMode: TradingMode,
    toMode: TradingMode,
  ): { valid: boolean; reason?: string } {
    if (fromMode === toMode) {
      return {
        valid: false,
        reason: `Already in ${toMode} mode`,
      };
    }

    return { valid: true };
  }

  /**
   * Get recommended actions before switching
   */
  public static getRecommendedActions(
    toMode: TradingMode,
    hasOpenPositions: boolean,
    hasPendingOrders: boolean,
  ): string[] {
    const actions: string[] = [];

    if (toMode === TradingMode.LIVE) {
      actions.push('1. Close all open paper trading positions');
      actions.push('2. Cancel all pending paper trading orders');
      actions.push('3. Review your trading strategy and risk parameters');
      actions.push('4. Verify your API keys and exchange credentials');
      actions.push('5. Start with small position sizes in live mode');
      actions.push('6. Monitor your first few live trades closely');
    } else {
      if (hasOpenPositions || hasPendingOrders) {
        actions.push('1. Document your current live positions');
        actions.push('2. Consider closing live positions before switching');
        actions.push('3. Test your strategies in paper mode first');
      } else {
        actions.push('1. Use paper trading to test new strategies');
        actions.push('2. Experiment with different parameters safely');
        actions.push('3. Monitor performance metrics in paper mode');
      }
    }

    return actions;
  }

  /**
   * Format mode for display
   */
  public static formatMode(mode: TradingMode): string {
    switch (mode) {
      case TradingMode.PAPER:
        return '📝 PAPER TRADING (Simulated)';
      case TradingMode.LIVE:
        return '🔴 LIVE TRADING (Real Money)';
    }
  }
}
