import type { StopLossParams, TakeProfitParams, Position } from './types.js';
import { StopLossType } from './types.js';

/**
 * Модуль управления Stop-Loss и Take-Profit
 */
export class StopLossManager {
  /**
   * Расчет уровня стоп-лосса
   */
  static calculateStopLoss(params: StopLossParams): number {
    switch (params.type) {
      case 'fixed':
        return this.calculateFixedStopLoss(params);
      case 'atr_based':
        return this.calculateATRStopLoss(params);
      case 'trailing':
        return this.calculateTrailingStopLoss(params);
      default:
        throw new Error(`Unknown stop loss type: ${params.type}`);
    }
  }

  /**
   * Фиксированный стоп-лосс (процент от цены входа)
   */
  private static calculateFixedStopLoss(params: StopLossParams): number {
    const { entryPrice, percent } = params;

    if (percent === undefined) {
      throw new Error('Fixed stop loss requires percent parameter');
    }

    if (percent <= 0 || percent >= 100) {
      throw new Error('Stop loss percent must be between 0 and 100');
    }

    // Стоп-лосс на X% ниже цены входа
    return entryPrice * (1 - percent / 100);
  }

  /**
   * Стоп-лосс на основе ATR (Average True Range)
   */
  private static calculateATRStopLoss(params: StopLossParams): number {
    const { entryPrice, atr, atrMultiplier } = params;

    if (atr === undefined || atrMultiplier === undefined) {
      throw new Error('ATR-based stop loss requires atr and atrMultiplier parameters');
    }

    if (atr <= 0) {
      throw new Error('ATR must be positive');
    }

    if (atrMultiplier <= 0) {
      throw new Error('ATR multiplier must be positive');
    }

    // Стоп-лосс = цена входа - (ATR * множитель)
    return entryPrice - atr * atrMultiplier;
  }

  /**
   * Трейлинг стоп-лосс (начальное значение)
   */
  private static calculateTrailingStopLoss(params: StopLossParams): number {
    const { entryPrice, trailingDistance } = params;

    if (trailingDistance === undefined) {
      throw new Error('Trailing stop loss requires trailingDistance parameter');
    }

    if (trailingDistance <= 0 || trailingDistance >= 100) {
      throw new Error('Trailing distance must be between 0 and 100');
    }

    // Начальный трейлинг стоп на X% ниже цены входа
    return entryPrice * (1 - trailingDistance / 100);
  }

  /**
   * Обновление трейлинг стоп-лосса на основе текущей цены
   */
  static updateTrailingStop(
    position: Position,
    currentPrice: number,
    trailingDistance: number,
  ): { newStopLoss: number; updated: boolean } {
    if (!position.trailingStopActive) {
      return { newStopLoss: position.stopLoss, updated: false };
    }

    if (position.side === 'long') {
      // Для длинной позиции: обновляем highest price и подтягиваем стоп
      const highestPrice = Math.max(position.highestPrice || position.entryPrice, currentPrice);
      const newStopLoss = highestPrice * (1 - trailingDistance / 100);

      // Стоп-лосс только повышается, никогда не понижается
      if (newStopLoss > position.stopLoss) {
        return { newStopLoss, updated: true };
      }
    } else {
      // Для короткой позиции: обновляем lowest price и подтягиваем стоп
      const lowestPrice = Math.min(position.lowestPrice || position.entryPrice, currentPrice);
      const newStopLoss = lowestPrice * (1 + trailingDistance / 100);

      // Стоп-лосс только понижается, никогда не повышается
      if (newStopLoss < position.stopLoss) {
        return { newStopLoss, updated: true };
      }
    }

    return { newStopLoss: position.stopLoss, updated: false };
  }

  /**
   * Проверка, сработал ли стоп-лосс
   */
  static isStopLossTriggered(position: Position, currentPrice: number): boolean {
    if (position.side === 'long') {
      // Для длинной позиции: стоп срабатывает, если цена упала ниже стоп-лосса
      return currentPrice <= position.stopLoss;
    } else {
      // Для короткой позиции: стоп срабатывает, если цена выросла выше стоп-лосса
      return currentPrice >= position.stopLoss;
    }
  }

  /**
   * Валидация параметров стоп-лосса
   */
  static validateParams(params: StopLossParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (params.entryPrice <= 0) {
      errors.push('Entry price must be positive');
    }

    switch (params.type) {
      case 'fixed':
        if (params.percent === undefined) {
          errors.push('Fixed stop loss requires percent');
        } else if (params.percent <= 0 || params.percent >= 100) {
          errors.push('Percent must be between 0 and 100');
        }
        break;

      case 'atr_based':
        if (params.atr === undefined) {
          errors.push('ATR-based stop loss requires atr');
        } else if (params.atr <= 0) {
          errors.push('ATR must be positive');
        }

        if (params.atrMultiplier === undefined) {
          errors.push('ATR-based stop loss requires atrMultiplier');
        } else if (params.atrMultiplier <= 0) {
          errors.push('ATR multiplier must be positive');
        }
        break;

      case 'trailing':
        if (params.trailingDistance === undefined) {
          errors.push('Trailing stop requires trailingDistance');
        } else if (params.trailingDistance <= 0 || params.trailingDistance >= 100) {
          errors.push('Trailing distance must be between 0 and 100');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Менеджер тейк-профита
 */
export class TakeProfitManager {
  /**
   * Расчет уровней тейк-профита
   */
  static calculateLevels(params: TakeProfitParams): number[] {
    const { entryPrice, levels } = params;

    if (!levels || levels.length === 0) {
      throw new Error('Take profit requires at least one level');
    }

    // Проверяем, что сумма closePercent = 100%
    const totalClosePercent = levels.reduce((sum, level) => sum + level.closePercent, 0);
    if (Math.abs(totalClosePercent - 100) > 0.01) {
      throw new Error(`Sum of closePercent must equal 100%, got ${totalClosePercent.toFixed(2)}%`);
    }

    // Рассчитываем цены уровней
    return levels.map((level) => entryPrice * (1 + level.percent / 100));
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
   * Валидация параметров тейк-профита
   */
  static validateParams(params: TakeProfitParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (params.entryPrice <= 0) {
      errors.push('Entry price must be positive');
    }

    if (!params.levels || params.levels.length === 0) {
      errors.push('At least one take profit level is required');
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

      // Проверяем сумму closePercent
      const totalClosePercent = params.levels.reduce((sum, level) => sum + level.closePercent, 0);
      if (Math.abs(totalClosePercent - 100) > 0.01) {
        errors.push(`Sum of closePercent must equal 100%, got ${totalClosePercent.toFixed(2)}%`);
      }

      // Проверяем, что уровни идут по возрастанию
      for (let i = 1; i < params.levels.length; i++) {
        if (params.levels[i]!.percent <= params.levels[i - 1]!.percent) {
          errors.push('Take profit levels must be in ascending order');
          break;
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
