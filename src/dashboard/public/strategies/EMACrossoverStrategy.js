/**
 * EMA Crossover Strategy (Client-side)
 * Стратегия на пересечении экспоненциальных скользящих средних
 */

class EMACrossoverStrategy extends BaseStrategy {
  constructor() {
    super({
      id: 'ema-crossover',
      name: 'EMA Crossover',
      description: 'Торговля на пересечении EMA',
      color: '#3b82f6',
      markerShape: 'circle',
      indicators: [
        {
          id: 'ema-fast',
          title: 'EMA 9',
          color: '#3b82f6',
          lineWidth: 2,
          lineStyle: 0, // Solid
        },
        {
          id: 'ema-slow',
          title: 'EMA 21',
          color: '#f97316',
          lineWidth: 2,
          lineStyle: 0, // Solid
        },
      ],
    });

    this.EMA_FAST_PERIOD = 9;
    this.EMA_SLOW_PERIOD = 21;
    this.emaFast = null;
    this.emaSlow = null;
    this.previousEmaFast = null;
    this.previousEmaSlow = null;
  }

  /**
   * Расчет EMA (Exponential Moving Average)
   */
  calculateEMA(prices, period) {
    if (prices.length < period) {
      return null;
    }

    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  /**
   * Проверка пересечения EMA
   */
  checkCrossover() {
    if (!this.previousEmaFast || !this.previousEmaSlow) {
      return null;
    }

    // Bullish crossover: Fast EMA пересекает Slow EMA снизу вверх
    if (this.previousEmaFast < this.previousEmaSlow && this.emaFast > this.emaSlow) {
      return 'LONG';
    }

    // Bearish crossover: Fast EMA пересекает Slow EMA сверху вниз
    if (this.previousEmaFast > this.previousEmaSlow && this.emaFast < this.emaSlow) {
      return 'SHORT';
    }

    return null;
  }

  /**
   * Анализ рынка
   */
  analyze(priceHistory, currentCandle) {
    if (priceHistory.length < this.EMA_SLOW_PERIOD) {
      return null;
    }

    const closePrices = priceHistory.map(p => p.close);

    // Сохраняем предыдущие значения
    this.previousEmaFast = this.emaFast;
    this.previousEmaSlow = this.emaSlow;

    // Рассчитываем текущие EMA
    this.emaFast = this.calculateEMA(closePrices, this.EMA_FAST_PERIOD);
    this.emaSlow = this.calculateEMA(closePrices, this.EMA_SLOW_PERIOD);

    if (!this.emaFast || !this.emaSlow) {
      return null;
    }

    // Проверяем пересечение
    const signal = this.checkCrossover();

    if (signal) {
      const distance = Math.abs(this.emaFast - this.emaSlow);
      const stopLoss = signal === 'LONG'
        ? currentCandle.close - distance * 2
        : currentCandle.close + distance * 2;
      const takeProfit = signal === 'LONG'
        ? currentCandle.close + distance * 3
        : currentCandle.close - distance * 3;

      const trade = {
        direction: signal,
        entryPrice: currentCandle.close,
        stopLoss,
        takeProfit,
        time: currentCandle.time,
        confidence: 75,
      };

      this.addTrade(trade);

      return trade;
    }

    return null;
  }

  /**
   * Получение значения индикатора
   */
  getIndicatorValue(indicatorId) {
    if (indicatorId === 'ema-fast') {
      return this.emaFast;
    } else if (indicatorId === 'ema-slow') {
      return this.emaSlow;
    }
    return null;
  }

  /**
   * Сброс стратегии
   */
  reset() {
    super.reset();
    this.emaFast = null;
    this.emaSlow = null;
    this.previousEmaFast = null;
    this.previousEmaSlow = null;
  }
}

// Экспорт
window.EMACrossoverStrategy = EMACrossoverStrategy;
