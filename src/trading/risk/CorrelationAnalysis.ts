import type {
  CorrelationAnalysisOptions,
  CorrelationResult,
  OHLCVData,
  Position,
  LimitCheckResult,
} from './types.js';

/**
 * Модуль анализа корреляции активов
 */
export class CorrelationAnalysis {
  private priceData: Map<string, number[]>; // symbol -> array of close prices
  private correlationCache: Map<string, Map<string, CorrelationResult>>;
  private cacheTimestamp: Date;
  private cacheTTL: number; // Time to live in milliseconds

  constructor(cacheTTL: number = 3600000) {
    // Default 1 hour
    this.priceData = new Map();
    this.correlationCache = new Map();
    this.cacheTimestamp = new Date();
    this.cacheTTL = cacheTTL;
  }

  /**
   * Добавление исторических данных для актива
   */
  addPriceData(symbol: string, ohlcvData: OHLCVData[]): void {
    const closePrices = ohlcvData.map((candle) => candle.close);
    this.priceData.set(symbol, closePrices);
  }

  /**
   * Обновление данных одной свечой
   */
  updatePriceData(symbol: string, ohlcv: OHLCVData): void {
    const existingData = this.priceData.get(symbol) || [];
    existingData.push(ohlcv.close);
    this.priceData.set(symbol, existingData);

    // Инвалидируем кеш для этого символа
    this.invalidateCacheForSymbol(symbol);
  }

  /**
   * Расчет корреляции Пирсона между двумя активами
   */
  calculateCorrelation(
    symbol1: string,
    symbol2: string,
    options: CorrelationAnalysisOptions,
  ): CorrelationResult {
    // Проверяем кеш
    const cached = this.getCachedCorrelation(symbol1, symbol2);
    if (cached) {
      return cached;
    }

    // Получаем данные
    const data1 = this.priceData.get(symbol1);
    const data2 = this.priceData.get(symbol2);

    if (!data1 || !data2) {
      throw new Error(`Price data not available for ${symbol1} or ${symbol2}`);
    }

    // Берем последние N периодов
    const period = Math.min(options.period, data1.length, data2.length);
    const prices1 = data1.slice(-period);
    const prices2 = data2.slice(-period);

    if (prices1.length < 2 || prices2.length < 2) {
      throw new Error('Insufficient price data for correlation calculation');
    }

    // Рассчитываем корреляцию
    const correlation = this.pearsonCorrelation(prices1, prices2);
    const isHighlyCorrelated = Math.abs(correlation) >= options.threshold;

    const result: CorrelationResult = {
      symbol1,
      symbol2,
      correlation,
      isHighlyCorrelated,
    };

    // Кешируем результат
    this.cacheCorrelation(symbol1, symbol2, result);

    return result;
  }

  /**
   * Расчет коэффициента корреляции Пирсона
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);

    if (n === 0) {
      return 0;
    }

    // Вычисляем средние значения
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;

    // Вычисляем числитель и знаменатель
    let numerator = 0;
    let sumSqX = 0;
    let sumSqY = 0;

    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;

      numerator += diffX * diffY;
      sumSqX += diffX * diffX;
      sumSqY += diffY * diffY;
    }

    // Проверка на деление на ноль
    if (sumSqX === 0 || sumSqY === 0) {
      return 0;
    }

    const denominator = Math.sqrt(sumSqX * sumSqY);
    return numerator / denominator;
  }

  /**
   * Получение всех коррелированных пар для данного актива
   */
  getCorrelatedAssets(
    symbol: string,
    options: CorrelationAnalysisOptions,
  ): CorrelationResult[] {
    const results: CorrelationResult[] = [];
    const symbols = Array.from(this.priceData.keys());

    for (const otherSymbol of symbols) {
      if (otherSymbol === symbol) {
        continue;
      }

      try {
        const result = this.calculateCorrelation(symbol, otherSymbol, options);
        if (result.isHighlyCorrelated) {
          results.push(result);
        }
      } catch (error) {
        console.warn(`Failed to calculate correlation for ${symbol}-${otherSymbol}:`, error);
      }
    }

    // Сортируем по убыванию корреляции (по модулю)
    results.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

    return results;
  }

  /**
   * Проверка лимита коррелированных позиций
   */
  checkCorrelatedPositions(
    positions: Position[],
    newSymbol: string,
    maxCorrelatedPositions: number,
    options: CorrelationAnalysisOptions,
  ): LimitCheckResult {
    // Находим все коррелированные активы для нового символа
    const correlatedAssets = this.getCorrelatedAssets(newSymbol, options);

    if (correlatedAssets.length === 0) {
      return { allowed: true };
    }

    // Считаем, сколько открытых позиций коррелированы с новым активом
    const openSymbols = positions
      .filter((pos) => pos.status === 'open')
      .map((pos) => pos.symbol);

    let correlatedCount = 0;
    const correlatedSymbols: string[] = [];

    for (const result of correlatedAssets) {
      const correlatedSymbol = result.symbol1 === newSymbol ? result.symbol2 : result.symbol1;

      if (openSymbols.includes(correlatedSymbol)) {
        correlatedCount++;
        correlatedSymbols.push(correlatedSymbol);
      }
    }

    if (correlatedCount >= maxCorrelatedPositions) {
      return {
        allowed: false,
        reason: `Maximum correlated positions would be exceeded. ${newSymbol} is correlated with ${correlatedSymbols.join(', ')} (${correlatedCount}/${maxCorrelatedPositions})`,
        currentValue: correlatedCount,
        limitValue: maxCorrelatedPositions,
      };
    }

    return { allowed: true };
  }

  /**
   * Получение матрицы корреляции для всех активов
   */
  getCorrelationMatrix(options: CorrelationAnalysisOptions): Map<string, Map<string, number>> {
    const symbols = Array.from(this.priceData.keys());
    const matrix = new Map<string, Map<string, number>>();

    for (const symbol1 of symbols) {
      const row = new Map<string, number>();

      for (const symbol2 of symbols) {
        if (symbol1 === symbol2) {
          row.set(symbol2, 1.0); // Корреляция с самим собой = 1
          continue;
        }

        try {
          const result = this.calculateCorrelation(symbol1, symbol2, options);
          row.set(symbol2, result.correlation);
        } catch (error) {
          console.warn(`Failed to calculate correlation for ${symbol1}-${symbol2}:`, error);
          row.set(symbol2, 0);
        }
      }

      matrix.set(symbol1, row);
    }

    return matrix;
  }

  /**
   * Проверка диверсификации портфеля
   */
  checkDiversification(
    positions: Position[],
    minAssets: number = 3,
    maxCorrelation: number = 0.7,
  ): {
    diversified: boolean;
    uniqueAssets: number;
    averageCorrelation: number;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const openPositions = positions.filter((pos) => pos.status === 'open');

    // Уникальные активы
    const uniqueSymbols = new Set(openPositions.map((pos) => pos.symbol));
    const uniqueAssets = uniqueSymbols.size;

    if (uniqueAssets < minAssets) {
      warnings.push(`Portfolio has only ${uniqueAssets} unique assets (recommended: ${minAssets}+)`);
    }

    // Средняя корреляция между активами
    let totalCorrelation = 0;
    let pairCount = 0;

    const symbolArray = Array.from(uniqueSymbols);
    for (let i = 0; i < symbolArray.length; i++) {
      for (let j = i + 1; j < symbolArray.length; j++) {
        try {
          const result = this.calculateCorrelation(symbolArray[i], symbolArray[j], {
            period: 30,
            threshold: maxCorrelation,
          });
          totalCorrelation += Math.abs(result.correlation);
          pairCount++;

          if (result.isHighlyCorrelated) {
            warnings.push(
              `High correlation between ${symbolArray[i]} and ${symbolArray[j]}: ${result.correlation.toFixed(2)}`,
            );
          }
        } catch (error) {
          // Игнорируем ошибки для отдельных пар
        }
      }
    }

    const averageCorrelation = pairCount > 0 ? totalCorrelation / pairCount : 0;

    const diversified = uniqueAssets >= minAssets && averageCorrelation <= maxCorrelation;

    return {
      diversified,
      uniqueAssets,
      averageCorrelation,
      warnings,
    };
  }

  /**
   * Кеширование результата корреляции
   */
  private cacheCorrelation(symbol1: string, symbol2: string, result: CorrelationResult): void {
    if (!this.correlationCache.has(symbol1)) {
      this.correlationCache.set(symbol1, new Map());
    }
    if (!this.correlationCache.has(symbol2)) {
      this.correlationCache.set(symbol2, new Map());
    }

    this.correlationCache.get(symbol1)!.set(symbol2, result);
    this.correlationCache.get(symbol2)!.set(symbol1, result);
  }

  /**
   * Получение из кеша
   */
  private getCachedCorrelation(symbol1: string, symbol2: string): CorrelationResult | null {
    // Проверяем TTL кеша
    const now = new Date();
    if (now.getTime() - this.cacheTimestamp.getTime() > this.cacheTTL) {
      this.clearCache();
      return null;
    }

    const symbol1Cache = this.correlationCache.get(symbol1);
    if (symbol1Cache) {
      return symbol1Cache.get(symbol2) || null;
    }

    return null;
  }

  /**
   * Инвалидация кеша для символа
   */
  private invalidateCacheForSymbol(symbol: string): void {
    this.correlationCache.delete(symbol);

    // Также удаляем из кешей других символов
    for (const cache of this.correlationCache.values()) {
      cache.delete(symbol);
    }
  }

  /**
   * Очистка всего кеша
   */
  clearCache(): void {
    this.correlationCache.clear();
    this.cacheTimestamp = new Date();
  }

  /**
   * Очистка старых данных (оставляем только последние N периодов)
   */
  trimPriceData(maxPeriods: number = 1000): void {
    for (const [symbol, prices] of this.priceData.entries()) {
      if (prices.length > maxPeriods) {
        const trimmed = prices.slice(-maxPeriods);
        this.priceData.set(symbol, trimmed);
      }
    }
  }

  /**
   * Получение статистики по данным
   */
  getStats(): {
    symbols: number;
    dataPoints: Record<string, number>;
    cacheSize: number;
  } {
    const dataPoints: Record<string, number> = {};

    for (const [symbol, prices] of this.priceData.entries()) {
      dataPoints[symbol] = prices.length;
    }

    return {
      symbols: this.priceData.size,
      dataPoints,
      cacheSize: this.correlationCache.size,
    };
  }
}
