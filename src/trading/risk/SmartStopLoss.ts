import type { StopLossParams, Position, SteppedTrailingStep, OHLCVData } from './types.js';
import { StopLossType } from './types.js';
import { TechnicalIndicators } from './TechnicalIndicators.js';

/**
 * Продвинутый модуль управления Stop-Loss с динамическими уровнями
 */
export class SmartStopLoss {
  /**
   * Расчет уровня стоп-лосса с поддержкой всех типов
   */
  static calculateStopLoss(params: StopLossParams): number {
    switch (params.type) {
      case StopLossType.FIXED:
        return this.calculateFixedStopLoss(params);
      case StopLossType.ATR_BASED:
        return this.calculateATRStopLoss(params);
      case StopLossType.TRAILING:
        return this.calculateTrailingStopLoss(params);
      case StopLossType.STRUCTURE_BASED:
        return this.calculateStructureStopLoss(params);
      case StopLossType.PARABOLIC_SAR:
        return this.calculateParabolicSARStopLoss(params);
      case StopLossType.TIME_BASED:
        return this.calculateTimeBasedStopLoss(params);
      case StopLossType.ATR_TRAILING:
        return this.calculateATRTrailingStopLoss(params);
      case StopLossType.STEPPED_TRAILING:
        return this.calculateSteppedTrailingStopLoss(params);
      default:
        throw new Error(`Unknown stop loss type: ${params.type}`);
    }
  }

  /**
   * Фиксированный стоп-лосс (процент от цены входа)
   */
  private static calculateFixedStopLoss(params: StopLossParams): number {
    const { entryPrice, percent, side = 'long' } = params;

    if (percent === undefined) {
      throw new Error('Fixed stop loss requires percent parameter');
    }

    if (percent <= 0 || percent >= 100) {
      throw new Error('Stop loss percent must be between 0 and 100');
    }

    if (side === 'long') {
      return entryPrice * (1 - percent / 100);
    } else {
      return entryPrice * (1 + percent / 100);
    }
  }

  /**
   * Стоп-лосс на основе ATR с адаптивным множителем
   */
  private static calculateATRStopLoss(params: StopLossParams): number {
    const { entryPrice, atr, atrMultiplier, avgATR, side = 'long', ohlcvData } = params;

    let actualATR = atr;
    let actualMultiplier = atrMultiplier || 2.0;

    // Если предоставлены OHLCV данные, рассчитываем ATR
    if (ohlcvData && ohlcvData.length > 0) {
      actualATR = TechnicalIndicators.calculateATR(ohlcvData);
    }

    if (actualATR === undefined || actualATR <= 0) {
      throw new Error('ATR-based stop loss requires valid ATR value');
    }

    // Если есть avgATR, используем адаптивный множитель
    if (avgATR !== undefined && avgATR > 0) {
      actualMultiplier = TechnicalIndicators.calculateAdaptiveATRMultiplier(actualATR, avgATR);
    }

    const stopDistance = actualATR * actualMultiplier;

    if (side === 'long') {
      return entryPrice - stopDistance;
    } else {
      return entryPrice + stopDistance;
    }
  }

  /**
   * Трейлинг стоп-лосс (начальное значение)
   */
  private static calculateTrailingStopLoss(params: StopLossParams): number {
    const { entryPrice, trailingDistance, side = 'long' } = params;

    if (trailingDistance === undefined) {
      throw new Error('Trailing stop loss requires trailingDistance parameter');
    }

    if (trailingDistance <= 0 || trailingDistance >= 100) {
      throw new Error('Trailing distance must be between 0 and 100');
    }

    if (side === 'long') {
      return entryPrice * (1 - trailingDistance / 100);
    } else {
      return entryPrice * (1 + trailingDistance / 100);
    }
  }

  /**
   * Structure-Based Stop Loss (на основе поддержки/сопротивления)
   */
  private static calculateStructureStopLoss(params: StopLossParams): number {
    const { entryPrice, side = 'long', ohlcvData, lookback = 50 } = params;

    if (!ohlcvData || ohlcvData.length === 0) {
      throw new Error('Structure-based stop loss requires OHLCV data');
    }

    if (side === 'long') {
      // Для лонг позиции ищем ближайшую поддержку ниже entry
      const support = TechnicalIndicators.findNearestSupport(ohlcvData, entryPrice, lookback);
      // Ставим SL немного ниже поддержки (-0.1%)
      return support * 0.999;
    } else {
      // Для шорт позиции ищем ближайшее сопротивление выше entry
      const resistance = TechnicalIndicators.findNearestResistance(ohlcvData, entryPrice, lookback);
      // Ставим SL немного выше сопротивления (+0.1%)
      return resistance * 1.001;
    }
  }

  /**
   * Parabolic SAR Stop Loss
   */
  private static calculateParabolicSARStopLoss(params: StopLossParams): number {
    const { ohlcvData, acceleration = 0.02, maximum = 0.2 } = params;

    if (!ohlcvData || ohlcvData.length < 2) {
      throw new Error('Parabolic SAR stop loss requires at least 2 OHLCV candles');
    }

    const sarValues = TechnicalIndicators.calculateParabolicSAR(ohlcvData, acceleration, maximum);

    // Возвращаем последнее значение SAR
    return sarValues[sarValues.length - 1]!;
  }

  /**
   * Time-Based Stop Loss (initial value = fixed SL, проверка времени в другом методе)
   */
  private static calculateTimeBasedStopLoss(params: StopLossParams): number {
    // Time-based SL использует фиксированный SL как начальное значение
    // Фактическая проверка времени происходит в checkTimeBasedStop
    return this.calculateFixedStopLoss({ ...params, type: StopLossType.FIXED, percent: params.percent || 2 });
  }

  /**
   * ATR Trailing Stop Loss (начальное значение)
   */
  private static calculateATRTrailingStopLoss(params: StopLossParams): number {
    // Начальное значение совпадает с ATR-based SL
    return this.calculateATRStopLoss(params);
  }

  /**
   * Stepped Trailing Stop Loss (начальное значение)
   */
  private static calculateSteppedTrailingStopLoss(params: StopLossParams): number {
    const { entryPrice, percent = 2, side = 'long' } = params;

    // Начальное значение - фиксированный SL
    if (side === 'long') {
      return entryPrice * (1 - percent / 100);
    } else {
      return entryPrice * (1 + percent / 100);
    }
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
      const highestPrice = Math.max(position.highestPrice || position.entryPrice, currentPrice);
      const newStopLoss = highestPrice * (1 - trailingDistance / 100);

      if (newStopLoss > position.stopLoss) {
        return { newStopLoss, updated: true };
      }
    } else {
      const lowestPrice = Math.min(position.lowestPrice || position.entryPrice, currentPrice);
      const newStopLoss = lowestPrice * (1 + trailingDistance / 100);

      if (newStopLoss < position.stopLoss) {
        return { newStopLoss, updated: true };
      }
    }

    return { newStopLoss: position.stopLoss, updated: false };
  }

  /**
   * Обновление ATR Trailing Stop
   */
  static updateATRTrailingStop(
    position: Position,
    currentPrice: number,
    ohlcvData: OHLCVData[],
    atrMultiplier: number = 2.0,
  ): { newStopLoss: number; updated: boolean } {
    const atr = TechnicalIndicators.calculateATR(ohlcvData);

    if (position.side === 'long') {
      const newStopLoss = currentPrice - atr * atrMultiplier;
      if (newStopLoss > position.stopLoss) {
        return { newStopLoss, updated: true };
      }
    } else {
      const newStopLoss = currentPrice + atr * atrMultiplier;
      if (newStopLoss < position.stopLoss) {
        return { newStopLoss, updated: true };
      }
    }

    return { newStopLoss: position.stopLoss, updated: false };
  }

  /**
   * Обновление Stepped Trailing Stop
   */
  static updateSteppedTrailingStop(
    position: Position,
    currentPrice: number,
    steps: SteppedTrailingStep[],
  ): { newStopLoss: number; updated: boolean; stepActivated?: number } {
    const pnlPercent = this.calculatePnLPercent(position, currentPrice);

    // Сортируем ступени по убыванию профита
    const sortedSteps = [...steps].sort((a, b) => b.profitPercent - a.profitPercent);

    // Находим активную ступень (наибольшую достигнутую)
    for (let i = 0; i < sortedSteps.length; i++) {
      const step = sortedSteps[i]!;

      if (pnlPercent >= step.profitPercent) {
        const targetStopLossPrice =
          position.side === 'long'
            ? position.entryPrice * (1 + step.stopLossPercent / 100)
            : position.entryPrice * (1 - step.stopLossPercent / 100);

        // Проверяем, нужно ли обновить SL
        const shouldUpdate =
          position.side === 'long'
            ? targetStopLossPrice > position.stopLoss
            : targetStopLossPrice < position.stopLoss;

        if (shouldUpdate) {
          return { newStopLoss: targetStopLossPrice, updated: true, stepActivated: i };
        }

        // Если текущий SL уже на этом уровне или лучше, не обновляем
        return { newStopLoss: position.stopLoss, updated: false };
      }
    }

    return { newStopLoss: position.stopLoss, updated: false };
  }

  /**
   * Проверка, сработал ли стоп-лосс
   */
  static isStopLossTriggered(position: Position, currentPrice: number): boolean {
    if (position.side === 'long') {
      return currentPrice <= position.stopLoss;
    } else {
      return currentPrice >= position.stopLoss;
    }
  }

  /**
   * Проверка time-based stop
   */
  static checkTimeBasedStop(position: Position, maxHoldingTime: number): boolean {
    const now = new Date();
    const hoursHeld = (now.getTime() - position.openedAt.getTime()) / (1000 * 60 * 60);
    return hoursHeld >= maxHoldingTime;
  }

  /**
   * Перевод стоп-лосса в breakeven
   */
  static moveToBreakeven(position: Position): { newStopLoss: number; updated: boolean } {
    const breakevenPrice = position.entryPrice;

    // Проверяем, не хуже ли текущий SL
    const shouldUpdate =
      position.side === 'long'
        ? breakevenPrice > position.stopLoss
        : breakevenPrice < position.stopLoss;

    if (shouldUpdate) {
      return { newStopLoss: breakevenPrice, updated: true };
    }

    return { newStopLoss: position.stopLoss, updated: false };
  }

  /**
   * Расчет процента прибыли/убытка
   */
  static calculatePnLPercent(position: Position, currentPrice: number): number {
    if (position.side === 'long') {
      return ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
    } else {
      return ((position.entryPrice - currentPrice) / position.entryPrice) * 100;
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
      case StopLossType.FIXED:
      case StopLossType.TIME_BASED:
      case StopLossType.STEPPED_TRAILING:
        if (params.percent === undefined) {
          errors.push(`${params.type} stop loss requires percent`);
        } else if (params.percent <= 0 || params.percent >= 100) {
          errors.push('Percent must be between 0 and 100');
        }
        break;

      case StopLossType.ATR_BASED:
      case StopLossType.ATR_TRAILING:
        if (params.atr === undefined && (!params.ohlcvData || params.ohlcvData.length === 0)) {
          errors.push(`${params.type} requires either atr value or ohlcvData`);
        }
        if (params.atr !== undefined && params.atr <= 0) {
          errors.push('ATR must be positive');
        }
        break;

      case StopLossType.TRAILING:
        if (params.trailingDistance === undefined) {
          errors.push('Trailing stop requires trailingDistance');
        } else if (params.trailingDistance <= 0 || params.trailingDistance >= 100) {
          errors.push('Trailing distance must be between 0 and 100');
        }
        break;

      case StopLossType.STRUCTURE_BASED:
        if (!params.ohlcvData || params.ohlcvData.length === 0) {
          errors.push('Structure-based stop loss requires ohlcvData');
        }
        break;

      case StopLossType.PARABOLIC_SAR:
        if (!params.ohlcvData || params.ohlcvData.length < 2) {
          errors.push('Parabolic SAR requires at least 2 OHLCV candles');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
