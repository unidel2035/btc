import type { PositionSizingMethod, PositionSizingParams, PositionSizeResult } from './types.js';

/**
 * Модуль расчета размера позиции
 */
export class PositionSizing {
  /**
   * Расчет размера позиции
   */
  static calculateSize(params: PositionSizingParams): PositionSizeResult {
    switch (params.method) {
      case 'fixed':
        return this.calculateFixed(params);
      case 'percentage':
        return this.calculatePercentage(params);
      case 'kelly':
        return this.calculateKelly(params);
      case 'volatility_adjusted':
        return this.calculateVolatilityAdjusted(params);
      default:
        throw new Error(`Unknown position sizing method: ${params.method}`);
    }
  }

  /**
   * Фиксированный размер позиции
   */
  private static calculateFixed(params: PositionSizingParams): PositionSizeResult {
    const { balance, riskPerTrade, stopLossPercent, entryPrice } = params;

    // Фиксированный размер = (Баланс * Риск%) / StopLoss%
    const riskAmount = balance * (riskPerTrade / 100);
    const size = riskAmount / (stopLossPercent / 100);
    const quantity = size / entryPrice;

    return {
      size,
      quantity,
      riskAmount,
      method: 'fixed' as PositionSizingMethod,
    };
  }

  /**
   * Процент от баланса
   */
  private static calculatePercentage(params: PositionSizingParams): PositionSizeResult {
    const { balance, riskPerTrade, stopLossPercent, entryPrice } = params;

    // Размер позиции = (Баланс * Риск%) / StopLoss%
    const riskAmount = balance * (riskPerTrade / 100);
    const size = riskAmount / (stopLossPercent / 100);
    const quantity = size / entryPrice;

    return {
      size: Math.min(size, balance), // Не превышаем баланс
      quantity,
      riskAmount,
      method: 'percentage' as PositionSizingMethod,
    };
  }

  /**
   * Kelly Criterion
   * Формула: f = (p * b - q) / b
   * где:
   * - f = размер позиции как доля капитала
   * - p = вероятность выигрыша
   * - q = вероятность проигрыша (1 - p)
   * - b = отношение среднего выигрыша к среднему проигрышу
   */
  private static calculateKelly(params: PositionSizingParams): PositionSizeResult {
    const { balance, winRate, avgWinLoss, stopLossPercent, entryPrice } = params;

    if (winRate === undefined || avgWinLoss === undefined) {
      throw new Error('Kelly Criterion requires winRate and avgWinLoss parameters');
    }

    // Проверка корректности параметров
    if (winRate <= 0 || winRate >= 1) {
      throw new Error('winRate must be between 0 and 1');
    }
    if (avgWinLoss <= 0) {
      throw new Error('avgWinLoss must be positive');
    }

    const p = winRate;
    const q = 1 - winRate;
    const b = avgWinLoss;

    // Kelly formula
    let kellyPercent = (p * b - q) / b;

    // Защита от отрицательных значений (нет положительного матожидания)
    if (kellyPercent <= 0) {
      console.warn('Kelly Criterion resulted in non-positive value. Using minimal position.');
      kellyPercent = 0.01; // 1% минимум
    }

    // Обычно используют fractional Kelly (половину от полного Kelly для снижения риска)
    const fractionalKelly = kellyPercent * 0.5;

    // Ограничиваем максимум 25% от баланса
    const adjustedKelly = Math.min(fractionalKelly, 0.25);

    const size = balance * adjustedKelly;
    const quantity = size / entryPrice;
    const riskAmount = size * (stopLossPercent / 100);

    return {
      size,
      quantity,
      riskAmount,
      method: 'kelly' as PositionSizingMethod,
    };
  }

  /**
   * Размер с учетом волатильности
   * Увеличиваем размер при низкой волатильности, уменьшаем при высокой
   */
  private static calculateVolatilityAdjusted(params: PositionSizingParams): PositionSizeResult {
    const { balance, riskPerTrade, volatility, baseVolatility, stopLossPercent, entryPrice } =
      params;

    if (volatility === undefined || baseVolatility === undefined) {
      throw new Error('Volatility-adjusted sizing requires volatility and baseVolatility');
    }

    if (volatility <= 0 || baseVolatility <= 0) {
      throw new Error('Volatility values must be positive');
    }

    // Коэффициент корректировки на основе волатильности
    // Если текущая волатильность выше базовой - уменьшаем размер позиции
    const volatilityRatio = baseVolatility / volatility;

    // Ограничиваем диапазон корректировки (0.5x - 2.0x)
    const adjustedRatio = Math.max(0.5, Math.min(2.0, volatilityRatio));

    // Базовый расчет
    const riskAmount = balance * (riskPerTrade / 100);
    let size = riskAmount / (stopLossPercent / 100);

    // Корректируем на волатильность
    size = size * adjustedRatio;

    // Не превышаем баланс
    size = Math.min(size, balance);

    const quantity = size / entryPrice;

    return {
      size,
      quantity,
      riskAmount,
      method: 'volatility_adjusted' as PositionSizingMethod,
    };
  }

  /**
   * Валидация параметров расчета
   */
  static validateParams(params: PositionSizingParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (params.balance <= 0) {
      errors.push('Balance must be positive');
    }

    if (params.riskPerTrade <= 0 || params.riskPerTrade > 100) {
      errors.push('Risk per trade must be between 0 and 100');
    }

    if (params.stopLossPercent <= 0 || params.stopLossPercent > 100) {
      errors.push('Stop loss percent must be between 0 and 100');
    }

    if (params.entryPrice <= 0) {
      errors.push('Entry price must be positive');
    }

    // Специфичные проверки для разных методов
    if (params.method === 'kelly') {
      if (params.winRate === undefined) {
        errors.push('Kelly method requires winRate');
      } else if (params.winRate <= 0 || params.winRate >= 1) {
        errors.push('Win rate must be between 0 and 1');
      }

      if (params.avgWinLoss === undefined) {
        errors.push('Kelly method requires avgWinLoss');
      } else if (params.avgWinLoss <= 0) {
        errors.push('Average win/loss ratio must be positive');
      }
    }

    if (params.method === 'volatility_adjusted') {
      if (params.volatility === undefined) {
        errors.push('Volatility-adjusted method requires volatility');
      } else if (params.volatility <= 0) {
        errors.push('Volatility must be positive');
      }

      if (params.baseVolatility === undefined) {
        errors.push('Volatility-adjusted method requires baseVolatility');
      } else if (params.baseVolatility <= 0) {
        errors.push('Base volatility must be positive');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
