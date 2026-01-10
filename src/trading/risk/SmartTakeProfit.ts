import type { TakeProfitParams, Position, TakeProfitLevel, OHLCVData } from './types.js';
import { TakeProfitType } from './types.js';
import { TechnicalIndicators } from './TechnicalIndicators.js';

/**
 * Продвинутый модуль управления Take-Profit с динамическими уровнями
 */
export class SmartTakeProfit {
  /**
   * Расчет уровней тейк-профита с поддержкой всех типов
   */
  static calculateLevels(params: TakeProfitParams): number[] {
    const type = params.type || TakeProfitType.MULTIPLE_LEVELS;

    switch (type) {
      case TakeProfitType.FIXED:
        return this.calculateFixedTP(params);
      case TakeProfitType.MULTIPLE_LEVELS:
        return this.calculateMultipleLevels(params);
      case TakeProfitType.RISK_REWARD:
        return this.calculateRiskRewardTP(params);
      case TakeProfitType.FIBONACCI:
        return this.calculateFibonacciTP(params);
      default:
        throw new Error(`Unknown take profit type: ${type}`);
    }
  }

  /**
   * Фиксированный тейк-профит (один уровень)
   */
  private static calculateFixedTP(params: TakeProfitParams): number[] {
    const { entryPrice, side = 'long' } = params;

    if (!params.levels || params.levels.length === 0) {
      throw new Error('Fixed TP requires at least one level');
    }

    const level = params.levels[0]!;

    if (side === 'long') {
      return [entryPrice * (1 + level.percent / 100)];
    } else {
      return [entryPrice * (1 - level.percent / 100)];
    }
  }

  /**
   * Множественные уровни тейк-профита
   */
  private static calculateMultipleLevels(params: TakeProfitParams): number[] {
    const { entryPrice, levels, side = 'long' } = params;

    if (!levels || levels.length === 0) {
      throw new Error('Multiple levels TP requires at least one level');
    }

    // Проверяем, что сумма closePercent = 100%
    const totalClosePercent = levels.reduce((sum, level) => sum + level.closePercent, 0);
    if (Math.abs(totalClosePercent - 100) > 0.01) {
      throw new Error(`Sum of closePercent must equal 100%, got ${totalClosePercent.toFixed(2)}%`);
    }

    // Рассчитываем цены уровней
    return levels.map((level) => {
      if (side === 'long') {
        return entryPrice * (1 + level.percent / 100);
      } else {
        return entryPrice * (1 - level.percent / 100);
      }
    });
  }

  /**
   * Тейк-профит на основе Risk/Reward ratio
   */
  private static calculateRiskRewardTP(params: TakeProfitParams): number[] {
    const { entryPrice, stopLoss, riskRewardRatio = 2.0, side = 'long' } = params;

    if (stopLoss === undefined) {
      throw new Error('Risk/Reward TP requires stopLoss parameter');
    }

    const risk = Math.abs(entryPrice - stopLoss);
    const reward = risk * riskRewardRatio;

    if (side === 'long') {
      return [entryPrice + reward];
    } else {
      return [entryPrice - reward];
    }
  }

  /**
   * Тейк-профит на основе Fibonacci Extension
   */
  private static calculateFibonacciTP(params: TakeProfitParams): number[] {
    const { side = 'long', swingLow, swingHigh, ohlcvData } = params;

    let actualSwingLow = swingLow;
    let actualSwingHigh = swingHigh;

    // Если swing points не указаны, пытаемся найти их в данных
    if ((!actualSwingLow || !actualSwingHigh) && ohlcvData && ohlcvData.length > 0) {
      const recentData = ohlcvData.slice(-50); // Берем последние 50 свечей
      actualSwingLow = Math.min(...recentData.map((d) => d.low));
      actualSwingHigh = Math.max(...recentData.map((d) => d.high));
    }

    if (actualSwingLow === undefined || actualSwingHigh === undefined) {
      throw new Error('Fibonacci TP requires swingLow and swingHigh or ohlcvData');
    }

    return TechnicalIndicators.calculateFibonacciExtension(actualSwingLow, actualSwingHigh, side);
  }

  /**
   * Создание дефолтных уровней TP (50% @ +5%, 30% @ +10%, 20% @ +15%)
   */
  static createDefaultLevels(): TakeProfitLevel[] {
    return [
      { percent: 5, closePercent: 50 },
      { percent: 10, closePercent: 30 },
      { percent: 15, closePercent: 20 },
    ];
  }

  /**
   * Проверка, какие уровни тейк-профита достигнуты
   */
  static checkTriggeredLevels(
    position: Position,
    currentPrice: number,
  ): { triggered: boolean; levelIndex: number | null } {
    if (!position.takeProfitLevels || position.takeProfitLevels.length === 0) {
      // Простая проверка единственного TP
      if (position.takeProfit.length === 0) {
        return { triggered: false, levelIndex: null };
      }

      const triggered =
        position.side === 'long'
          ? currentPrice >= position.takeProfit[0]!
          : currentPrice <= position.takeProfit[0]!;

      return { triggered, levelIndex: triggered ? 0 : null };
    }

    // Проверяем множественные уровни
    for (let i = 0; i < position.takeProfit.length; i++) {
      const tpPrice = position.takeProfit[i]!;
      const triggered =
        position.side === 'long' ? currentPrice >= tpPrice : currentPrice <= tpPrice;

      if (triggered) {
        return { triggered: true, levelIndex: i };
      }
    }

    return { triggered: false, levelIndex: null };
  }

  /**
   * Расчет количества для закрытия на данном уровне
   */
  static calculateCloseQuantity(position: Position, levelIndex: number): number {
    if (!position.takeProfitLevels || levelIndex >= position.takeProfitLevels.length) {
      // Если нет уровней или индекс некорректен, закрываем всю позицию
      return position.remainingQuantity;
    }

    const level = position.takeProfitLevels[levelIndex]!;
    const closeQuantity = (position.quantity * level.closePercent) / 100;

    // Не превышаем оставшееся количество
    return Math.min(closeQuantity, position.remainingQuantity);
  }

  /**
   * Расчет оптимального TP на основе волатильности
   */
  static calculateVolatilityBasedTP(
    entryPrice: number,
    ohlcvData: OHLCVData[],
    side: 'long' | 'short',
    atrMultiplier: number = 3.0,
  ): number {
    const atr = TechnicalIndicators.calculateATR(ohlcvData);
    const targetDistance = atr * atrMultiplier;

    if (side === 'long') {
      return entryPrice + targetDistance;
    } else {
      return entryPrice - targetDistance;
    }
  }

  /**
   * Расчет TP на основе Pivot Points
   */
  static calculatePivotBasedTP(
    entryPrice: number,
    prevDayOHLCV: OHLCVData,
    side: 'long' | 'short',
  ): number[] {
    const pivots = TechnicalIndicators.calculatePivotPoints(prevDayOHLCV);

    if (side === 'long') {
      // Для лонг позиции используем уровни сопротивления
      return [pivots.r1, pivots.r2, pivots.r3].filter((level) => level > entryPrice);
    } else {
      // Для шорт позиции используем уровни поддержки
      return [pivots.s1, pivots.s2, pivots.s3].filter((level) => level < entryPrice);
    }
  }

  /**
   * Валидация параметров тейк-профита
   */
  static validateParams(params: TakeProfitParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (params.entryPrice <= 0) {
      errors.push('Entry price must be positive');
    }

    const type = params.type || TakeProfitType.MULTIPLE_LEVELS;

    switch (type) {
      case TakeProfitType.FIXED:
      case TakeProfitType.MULTIPLE_LEVELS:
        if (!params.levels || params.levels.length === 0) {
          errors.push(`${type} requires at least one TP level`);
        } else {
          // Проверяем каждый уровень
          for (let i = 0; i < params.levels.length; i++) {
            const level = params.levels[i]!;

            if (level.percent <= 0) {
              errors.push(`Level ${i + 1}: percent must be positive`);
            }

            if (level.closePercent <= 0 || level.closePercent > 100) {
              errors.push(`Level ${i + 1}: closePercent must be between 0 and 100`);
            }
          }

          // Для MULTIPLE_LEVELS проверяем сумму closePercent
          if (type === TakeProfitType.MULTIPLE_LEVELS) {
            const totalClosePercent = params.levels.reduce(
              (sum, level) => sum + level.closePercent,
              0,
            );
            if (Math.abs(totalClosePercent - 100) > 0.01) {
              errors.push(`Sum of closePercent must equal 100%, got ${totalClosePercent.toFixed(2)}%`);
            }
          }

          // Проверяем, что уровни идут по возрастанию
          for (let i = 1; i < params.levels.length; i++) {
            if (params.levels[i]!.percent <= params.levels[i - 1]!.percent) {
              errors.push('Take profit levels must be in ascending order');
              break;
            }
          }
        }
        break;

      case TakeProfitType.RISK_REWARD:
        if (params.stopLoss === undefined) {
          errors.push('Risk/Reward TP requires stopLoss parameter');
        }
        if (params.riskRewardRatio !== undefined && params.riskRewardRatio <= 0) {
          errors.push('Risk/Reward ratio must be positive');
        }
        break;

      case TakeProfitType.FIBONACCI:
        if (
          (params.swingLow === undefined || params.swingHigh === undefined) &&
          (!params.ohlcvData || params.ohlcvData.length === 0)
        ) {
          errors.push('Fibonacci TP requires either swing points or ohlcvData');
        }
        if (
          params.swingLow !== undefined &&
          params.swingHigh !== undefined &&
          params.swingLow >= params.swingHigh
        ) {
          errors.push('swingLow must be less than swingHigh');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
