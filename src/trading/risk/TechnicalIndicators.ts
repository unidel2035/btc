import type { OHLCVData } from './types.js';

/**
 * Технические индикаторы для расчета динамических уровней SL/TP
 */
export class TechnicalIndicators {
  /**
   * Расчет Average True Range (ATR)
   * @param ohlcvData - массив OHLCV данных
   * @param period - период для расчета (по умолчанию 14)
   * @returns значение ATR
   */
  static calculateATR(ohlcvData: OHLCVData[], period: number = 14): number {
    if (ohlcvData.length < period) {
      throw new Error(`Not enough data to calculate ATR. Need at least ${period} candles`);
    }

    const trueRanges: number[] = [];

    for (let i = 1; i < ohlcvData.length; i++) {
      const current = ohlcvData[i]!;
      const previous = ohlcvData[i - 1]!;

      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close),
      );

      trueRanges.push(tr);
    }

    // Берем последние period значений
    const recentTR = trueRanges.slice(-period);
    return recentTR.reduce((sum, tr) => sum + tr, 0) / period;
  }

  /**
   * Расчет адаптивного множителя ATR на основе волатильности
   * @param currentATR - текущий ATR
   * @param avgATR - средний ATR за больший период
   * @returns множитель ATR (1.5, 2.0, или 2.5)
   */
  static calculateAdaptiveATRMultiplier(currentATR: number, avgATR: number): number {
    if (currentATR < avgATR * 0.8) {
      return 1.5; // Низкая волатильность
    } else if (currentATR > avgATR * 1.2) {
      return 2.5; // Высокая волатильность
    }
    return 2.0; // Средняя волатильность
  }

  /**
   * Расчет Parabolic SAR
   * @param ohlcvData - массив OHLCV данных
   * @param acceleration - начальное ускорение (по умолчанию 0.02)
   * @param maximum - максимальное ускорение (по умолчанию 0.2)
   * @returns массив значений SAR
   */
  static calculateParabolicSAR(
    ohlcvData: OHLCVData[],
    acceleration: number = 0.02,
    maximum: number = 0.2,
  ): number[] {
    if (ohlcvData.length < 2) {
      throw new Error('Need at least 2 candles for Parabolic SAR');
    }

    const sar: number[] = [];
    let af = acceleration;
    let trend = 1; // 1 = uptrend, -1 = downtrend
    let ep = ohlcvData[0]!.high; // Extreme Point
    let prevSAR = ohlcvData[0]!.low;

    sar.push(prevSAR);

    for (let i = 1; i < ohlcvData.length; i++) {
      const current = ohlcvData[i]!;
      let currentSAR = prevSAR + af * (ep - prevSAR);

      // Проверка разворота тренда
      if (trend === 1) {
        // Uptrend
        if (current.low < currentSAR) {
          trend = -1;
          currentSAR = ep;
          ep = current.low;
          af = acceleration;
        } else {
          if (current.high > ep) {
            ep = current.high;
            af = Math.min(af + acceleration, maximum);
          }
        }
      } else {
        // Downtrend
        if (current.high > currentSAR) {
          trend = 1;
          currentSAR = ep;
          ep = current.high;
          af = acceleration;
        } else {
          if (current.low < ep) {
            ep = current.low;
            af = Math.min(af + acceleration, maximum);
          }
        }
      }

      sar.push(currentSAR);
      prevSAR = currentSAR;
    }

    return sar;
  }

  /**
   * Поиск ближайшего уровня поддержки
   * @param ohlcvData - массив OHLCV данных
   * @param currentPrice - текущая цена
   * @param lookback - количество свечей для анализа
   * @returns уровень поддержки
   */
  static findNearestSupport(
    ohlcvData: OHLCVData[],
    currentPrice: number,
    lookback: number = 50,
  ): number {
    const recentData = ohlcvData.slice(-lookback);
    const swingLows = this.findSwingLows(recentData);

    // Ищем ближайший swing low ниже текущей цены
    const supportLevels = swingLows.filter((level) => level < currentPrice);

    if (supportLevels.length === 0) {
      // Если нет swing lows ниже, берем минимум за период
      return Math.min(...recentData.map((d) => d.low));
    }

    // Возвращаем ближайший к текущей цене
    return Math.max(...supportLevels);
  }

  /**
   * Поиск ближайшего уровня сопротивления
   * @param ohlcvData - массив OHLCV данных
   * @param currentPrice - текущая цена
   * @param lookback - количество свечей для анализа
   * @returns уровень сопротивления
   */
  static findNearestResistance(
    ohlcvData: OHLCVData[],
    currentPrice: number,
    lookback: number = 50,
  ): number {
    const recentData = ohlcvData.slice(-lookback);
    const swingHighs = this.findSwingHighs(recentData);

    // Ищем ближайший swing high выше текущей цены
    const resistanceLevels = swingHighs.filter((level) => level > currentPrice);

    if (resistanceLevels.length === 0) {
      // Если нет swing highs выше, берем максимум за период
      return Math.max(...recentData.map((d) => d.high));
    }

    // Возвращаем ближайший к текущей цене
    return Math.min(...resistanceLevels);
  }

  /**
   * Поиск swing lows (локальных минимумов)
   * @param ohlcvData - массив OHLCV данных
   * @param leftBars - количество свечей слева (по умолчанию 5)
   * @param rightBars - количество свечей справа (по умолчанию 5)
   * @returns массив уровней swing lows
   */
  private static findSwingLows(
    ohlcvData: OHLCVData[],
    leftBars: number = 5,
    rightBars: number = 5,
  ): number[] {
    const swingLows: number[] = [];

    for (let i = leftBars; i < ohlcvData.length - rightBars; i++) {
      const current = ohlcvData[i]!.low;
      let isSwingLow = true;

      // Проверяем, что текущий low меньше всех left bars
      for (let j = i - leftBars; j < i; j++) {
        if (ohlcvData[j]!.low <= current) {
          isSwingLow = false;
          break;
        }
      }

      // Проверяем, что текущий low меньше всех right bars
      if (isSwingLow) {
        for (let j = i + 1; j <= i + rightBars; j++) {
          if (ohlcvData[j]!.low <= current) {
            isSwingLow = false;
            break;
          }
        }
      }

      if (isSwingLow) {
        swingLows.push(current);
      }
    }

    return swingLows;
  }

  /**
   * Поиск swing highs (локальных максимумов)
   * @param ohlcvData - массив OHLCV данных
   * @param leftBars - количество свечей слева (по умолчанию 5)
   * @param rightBars - количество свечей справа (по умолчанию 5)
   * @returns массив уровней swing highs
   */
  private static findSwingHighs(
    ohlcvData: OHLCVData[],
    leftBars: number = 5,
    rightBars: number = 5,
  ): number[] {
    const swingHighs: number[] = [];

    for (let i = leftBars; i < ohlcvData.length - rightBars; i++) {
      const current = ohlcvData[i]!.high;
      let isSwingHigh = true;

      // Проверяем, что текущий high больше всех left bars
      for (let j = i - leftBars; j < i; j++) {
        if (ohlcvData[j]!.high >= current) {
          isSwingHigh = false;
          break;
        }
      }

      // Проверяем, что текущий high больше всех right bars
      if (isSwingHigh) {
        for (let j = i + 1; j <= i + rightBars; j++) {
          if (ohlcvData[j]!.high >= current) {
            isSwingHigh = false;
            break;
          }
        }
      }

      if (isSwingHigh) {
        swingHighs.push(current);
      }
    }

    return swingHighs;
  }

  /**
   * Расчет Fibonacci Extension уровней
   * @param swingLow - минимум диапазона
   * @param swingHigh - максимум диапазона
   * @param direction - направление ('long' или 'short')
   * @returns массив уровней Fibonacci
   */
  static calculateFibonacciExtension(
    swingLow: number,
    swingHigh: number,
    direction: 'long' | 'short',
  ): number[] {
    const range = swingHigh - swingLow;
    const fibLevels = [0.618, 1.0, 1.618, 2.618];

    if (direction === 'long') {
      return fibLevels.map((fib) => swingHigh + range * fib);
    } else {
      return fibLevels.map((fib) => swingLow - range * fib);
    }
  }

  /**
   * Расчет Pivot Points
   * @param prevDay - данные предыдущего дня
   * @returns объект с pivot point и уровнями поддержки/сопротивления
   */
  static calculatePivotPoints(prevDay: OHLCVData): {
    pivot: number;
    r1: number;
    r2: number;
    r3: number;
    s1: number;
    s2: number;
    s3: number;
  } {
    const pivot = (prevDay.high + prevDay.low + prevDay.close) / 3;
    const r1 = 2 * pivot - prevDay.low;
    const r2 = pivot + (prevDay.high - prevDay.low);
    const r3 = prevDay.high + 2 * (pivot - prevDay.low);
    const s1 = 2 * pivot - prevDay.high;
    const s2 = pivot - (prevDay.high - prevDay.low);
    const s3 = prevDay.low - 2 * (prevDay.high - pivot);

    return { pivot, r1, r2, r3, s1, s2, s3 };
  }

  /**
   * Расчет среднего ATR за период
   * @param ohlcvData - массив OHLCV данных
   * @param period - период для расчета ATR
   * @param numPeriods - количество периодов для усреднения
   * @returns средний ATR
   */
  static calculateAverageATR(
    ohlcvData: OHLCVData[],
    period: number = 14,
    numPeriods: number = 50,
  ): number {
    const atrValues: number[] = [];

    for (let i = period; i <= Math.min(ohlcvData.length, period + numPeriods); i++) {
      const data = ohlcvData.slice(0, i);
      const atr = this.calculateATR(data, period);
      atrValues.push(atr);
    }

    return atrValues.reduce((sum, atr) => sum + atr, 0) / atrValues.length;
  }
}
