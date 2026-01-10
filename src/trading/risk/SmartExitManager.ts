import type { Position, SmartExitConfig, OHLCVData, SteppedTrailingStep } from './types.js';
import { SmartStopLoss } from './SmartStopLoss.js';
import { TechnicalIndicators } from './TechnicalIndicators.js';

/**
 * Результат обновления позиции Smart Exit Manager
 */
export interface SmartExitUpdateResult {
  position: Position;
  actions: Array<{
    type: string;
    message: string;
    data?: Record<string, unknown>;
  }>;
  shouldClose: boolean;
  closeReason?: string;
}

/**
 * Smart Exit Manager - оркестрирует все правила умного выхода
 */
export class SmartExitManager {
  private config: SmartExitConfig;
  private marketData: Map<string, OHLCVData[]> = new Map();

  constructor(config?: Partial<SmartExitConfig>) {
    this.config = {
      breakevenEnabled: config?.breakevenEnabled ?? true,
      breakevenActivationPercent: config?.breakevenActivationPercent ?? 2,
      steppedTrailingEnabled: config?.steppedTrailingEnabled ?? true,
      timeBasedExitEnabled: config?.timeBasedExitEnabled ?? false,
      maxHoldingTime: config?.maxHoldingTime,
      minProfitForTimeExit: config?.minProfitForTimeExit ?? 3,
      volatilityAdaptationEnabled: config?.volatilityAdaptationEnabled ?? true,
      partialProfitEnabled: config?.partialProfitEnabled ?? true,
    };
  }

  /**
   * Добавление/обновление рыночных данных для символа
   */
  updateMarketData(symbol: string, ohlcvData: OHLCVData[]): void {
    this.marketData.set(symbol, ohlcvData);
  }

  /**
   * Комплексное обновление позиции с применением всех правил
   */
  async updatePosition(position: Position, currentPrice: number): Promise<SmartExitUpdateResult> {
    const actions: SmartExitUpdateResult['actions'] = [];
    let shouldClose = false;
    let closeReason: string | undefined;

    // Обновляем текущую цену и PnL
    position.currentPrice = currentPrice;
    position.lastUpdatedAt = new Date();

    const pnlPercent = SmartStopLoss.calculatePnLPercent(position, currentPrice);

    // Обновляем highest/lowest price
    if (position.side === 'long') {
      position.highestPrice = Math.max(position.highestPrice || position.entryPrice, currentPrice);
    } else {
      position.lowestPrice = Math.min(
        position.lowestPrice || position.entryPrice,
        currentPrice,
      );
    }

    // Расчет unrealized PnL
    if (position.side === 'long') {
      position.unrealizedPnL = (currentPrice - position.entryPrice) * position.remainingQuantity;
    } else {
      position.unrealizedPnL = (position.entryPrice - currentPrice) * position.remainingQuantity;
    }

    // Rule 1: Проверка стоп-лосса
    if (SmartStopLoss.isStopLossTriggered(position, currentPrice)) {
      shouldClose = true;
      closeReason = 'stop_loss_triggered';
      actions.push({
        type: 'stop_loss',
        message: `Stop loss triggered at ${currentPrice.toFixed(2)}`,
        data: { stopLoss: position.stopLoss, currentPrice },
      });
      return { position, actions, shouldClose, closeReason };
    }

    // Rule 2: Breakeven Protection
    if (
      this.config.breakevenEnabled &&
      pnlPercent >= this.config.breakevenActivationPercent
    ) {
      const breakevenUpdate = SmartStopLoss.moveToBreakeven(position);
      if (breakevenUpdate.updated) {
        position.stopLoss = breakevenUpdate.newStopLoss;
        actions.push({
          type: 'breakeven_activated',
          message: `Stop loss moved to breakeven at ${breakevenUpdate.newStopLoss.toFixed(2)}`,
          data: { newStopLoss: breakevenUpdate.newStopLoss },
        });
      }
    }

    // Rule 3: Stepped Trailing Stop
    if (
      this.config.steppedTrailingEnabled &&
      position.steppedTrailingSteps &&
      position.steppedTrailingSteps.length > 0
    ) {
      const steppedUpdate = SmartStopLoss.updateSteppedTrailingStop(
        position,
        currentPrice,
        position.steppedTrailingSteps,
      );

      if (steppedUpdate.updated) {
        position.stopLoss = steppedUpdate.newStopLoss;
        actions.push({
          type: 'stepped_trailing_updated',
          message: `Stepped trailing stop updated to ${steppedUpdate.newStopLoss.toFixed(2)} (step ${(steppedUpdate.stepActivated ?? 0) + 1})`,
          data: {
            newStopLoss: steppedUpdate.newStopLoss,
            stepActivated: steppedUpdate.stepActivated,
          },
        });
      }
    }

    // Rule 4: Regular Trailing Stop (если активен)
    if (position.trailingStopActive && !this.config.steppedTrailingEnabled) {
      // Используем ATR trailing если есть данные, иначе обычный
      const ohlcvData = this.marketData.get(position.symbol);

      if (ohlcvData && ohlcvData.length > 0) {
        const atrUpdate = SmartStopLoss.updateATRTrailingStop(position, currentPrice, ohlcvData);
        if (atrUpdate.updated) {
          position.stopLoss = atrUpdate.newStopLoss;
          actions.push({
            type: 'atr_trailing_updated',
            message: `ATR trailing stop updated to ${atrUpdate.newStopLoss.toFixed(2)}`,
            data: { newStopLoss: atrUpdate.newStopLoss },
          });
        }
      }
    }

    // Rule 5: Time-Based Exit
    if (
      this.config.timeBasedExitEnabled &&
      this.config.maxHoldingTime !== undefined
    ) {
      const timeBasedTriggered = SmartStopLoss.checkTimeBasedStop(
        position,
        this.config.maxHoldingTime,
      );

      if (timeBasedTriggered) {
        // Проверяем минимальный профит
        if (
          this.config.minProfitForTimeExit === undefined ||
          pnlPercent < this.config.minProfitForTimeExit
        ) {
          shouldClose = true;
          closeReason = 'time_based_exit';
          actions.push({
            type: 'time_based_exit',
            message: `Time-based exit triggered after ${this.config.maxHoldingTime} hours with ${pnlPercent.toFixed(2)}% profit`,
            data: { maxHoldingTime: this.config.maxHoldingTime, pnlPercent },
          });
          return { position, actions, shouldClose, closeReason };
        }
      }
    }

    // Rule 6: Volatility Adaptation
    if (this.config.volatilityAdaptationEnabled) {
      const ohlcvData = this.marketData.get(position.symbol);
      if (ohlcvData && ohlcvData.length >= 64) {
        const currentATR = TechnicalIndicators.calculateATR(ohlcvData);
        const avgATR = TechnicalIndicators.calculateAverageATR(ohlcvData);

        // Высокая волатильность - расширяем стоп
        if (currentATR > avgATR * 1.5) {
          actions.push({
            type: 'volatility_warning',
            message: `High volatility detected (ATR: ${currentATR.toFixed(2)} vs avg: ${avgATR.toFixed(2)})`,
            data: { currentATR, avgATR, ratio: currentATR / avgATR },
          });
        }

        // Низкая волатильность - сужаем стоп
        if (currentATR < avgATR * 0.5) {
          actions.push({
            type: 'volatility_warning',
            message: `Low volatility detected (ATR: ${currentATR.toFixed(2)} vs avg: ${avgATR.toFixed(2)})`,
            data: { currentATR, avgATR, ratio: currentATR / avgATR },
          });
        }
      }
    }

    // Rule 7: Partial Profit Taking (проверяется отдельно через checkTakeProfit)
    // Эта проверка делается в RiskManager

    return { position, actions, shouldClose, closeReason };
  }

  /**
   * Создание дефолтной конфигурации Stepped Trailing
   */
  static createDefaultSteppedTrailing(): SteppedTrailingStep[] {
    return [
      { profitPercent: 2, stopLossPercent: 0 }, // At +2% → Move SL to breakeven
      { profitPercent: 5, stopLossPercent: 2 }, // At +5% → Move SL to +2%
      { profitPercent: 10, stopLossPercent: 5 }, // At +10% → Move SL to +5%
      { profitPercent: 15, stopLossPercent: 10 }, // At +15% → Move SL to +10%
    ];
  }

  /**
   * Проверка необходимости аварийного выхода (emergency exit)
   */
  shouldEmergencyExit(
    position: Position,
    currentPrice: number,
    marketConditions?: {
      volumeDropPercent?: number;
      adverseNews?: boolean;
    },
  ): { shouldExit: boolean; reason?: string } {
    // Проверка резкого падения объема
    if (marketConditions?.volumeDropPercent !== undefined) {
      if (marketConditions.volumeDropPercent > 50) {
        return {
          shouldExit: true,
          reason: `Volume dropped by ${marketConditions.volumeDropPercent.toFixed(1)}%`,
        };
      }
    }

    // Проверка негативных новостей
    if (marketConditions?.adverseNews) {
      return {
        shouldExit: true,
        reason: 'Adverse news detected',
      };
    }

    // Проверка критических убытков (если позиция прошла стоп-лосс из-за слипажа)
    const pnlPercent = SmartStopLoss.calculatePnLPercent(position, currentPrice);
    if (pnlPercent < -10) {
      // критический убыток
      return {
        shouldExit: true,
        reason: `Critical loss: ${pnlPercent.toFixed(2)}%`,
      };
    }

    return { shouldExit: false };
  }

  /**
   * Получение рекомендаций по оптимизации выхода
   */
  getExitRecommendations(position: Position, currentPrice: number): string[] {
    const recommendations: string[] = [];
    const pnlPercent = SmartStopLoss.calculatePnLPercent(position, currentPrice);

    if (pnlPercent > 10 && position.remainingQuantity === position.quantity) {
      recommendations.push('Consider taking partial profit (50%) at current levels');
    }

    if (pnlPercent > 5 && position.stopLoss < position.entryPrice) {
      recommendations.push('Move stop loss to breakeven or higher to lock in profits');
    }

    if (!position.steppedTrailingSteps && pnlPercent > 3) {
      recommendations.push('Enable stepped trailing stop to protect profits');
    }

    const hoursHeld = (Date.now() - position.openedAt.getTime()) / (1000 * 60 * 60);
    if (hoursHeld > 48 && pnlPercent < 2) {
      recommendations.push(
        'Consider closing position - low profit after 48+ hours holding time',
      );
    }

    return recommendations;
  }

  /**
   * Обновление конфигурации
   */
  updateConfig(newConfig: Partial<SmartExitConfig>): void {
    Object.assign(this.config, newConfig);
  }

  /**
   * Получение текущей конфигурации
   */
  getConfig(): SmartExitConfig {
    return { ...this.config };
  }
}
