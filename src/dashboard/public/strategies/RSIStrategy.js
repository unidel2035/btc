/**
 * RSI Strategy (Client-side)
 * Стратегия на основе индикатора Relative Strength Index
 */

class RSIStrategy extends BaseStrategy {
  constructor() {
    super({
      id: 'rsi',
      name: 'RSI Strategy',
      description: 'Торговля по уровням перекупленности/перепроданности',
      color: '#f59e0b',
      markerShape: 'square',
      indicators: [], // RSI отображается отдельно, не на основном графике
    });

    this.RSI_PERIOD = 14;
    this.RSI_OVERBOUGHT = 70;
    this.RSI_OVERSOLD = 30;
    this.rsi = null;
    this.previousRsi = null;
  }

  /**
   * Расчет RSI (Relative Strength Index)
   */
  calculateRSI(prices) {
    if (prices.length < this.RSI_PERIOD + 1) {
      return null;
    }

    // Вычисляем изменения цен
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    // Разделяем на прибыли и убытки
    const gains = changes.map((change) => (change > 0 ? change : 0));
    const losses = changes.map((change) => (change < 0 ? -change : 0));

    // Рассчитываем средние прибыли и убытки за период
    const avgGain =
      gains.slice(-this.RSI_PERIOD).reduce((sum, gain) => sum + gain, 0) / this.RSI_PERIOD;
    const avgLoss =
      losses.slice(-this.RSI_PERIOD).reduce((sum, loss) => sum + loss, 0) / this.RSI_PERIOD;

    if (avgLoss === 0) {
      return 100;
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    return rsi;
  }

  /**
   * Проверка условий для торговли
   */
  checkRSISignal() {
    if (!this.previousRsi || !this.rsi) {
      return null;
    }

    // Выход из перепроданности (возможен LONG)
    if (this.previousRsi < this.RSI_OVERSOLD && this.rsi > this.RSI_OVERSOLD) {
      return 'LONG';
    }

    // Выход из перекупленности (возможен SHORT)
    if (this.previousRsi > this.RSI_OVERBOUGHT && this.rsi < this.RSI_OVERBOUGHT) {
      return 'SHORT';
    }

    return null;
  }

  /**
   * Анализ рынка
   */
  analyze(priceHistory, currentCandle) {
    if (priceHistory.length < this.RSI_PERIOD + 1) {
      return null;
    }

    const closePrices = priceHistory.map((p) => p.close);

    // Сохраняем предыдущее значение
    this.previousRsi = this.rsi;

    // Рассчитываем текущий RSI
    this.rsi = this.calculateRSI(closePrices);

    if (!this.rsi) {
      return null;
    }

    // Проверяем сигнал
    const signal = this.checkRSISignal();

    if (signal) {
      // Расчет уровней на основе волатильности
      const recentPrices = priceHistory.slice(-20);
      const volatility =
        Math.max(...recentPrices.map((p) => p.high)) - Math.min(...recentPrices.map((p) => p.low));

      const stopLoss =
        signal === 'LONG'
          ? currentCandle.close - volatility * 0.5
          : currentCandle.close + volatility * 0.5;
      const takeProfit =
        signal === 'LONG'
          ? currentCandle.close + volatility * 1.0
          : currentCandle.close - volatility * 1.0;

      const trade = {
        direction: signal,
        entryPrice: currentCandle.close,
        stopLoss,
        takeProfit,
        time: currentCandle.time,
        confidence: 70,
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
    return null; // RSI не отображается на основном графике
  }

  /**
   * Получение текущего значения RSI (для отображения в UI)
   */
  getCurrentRSI() {
    return this.rsi;
  }

  /**
   * Сброс стратегии
   */
  reset() {
    super.reset();
    this.rsi = null;
    this.previousRsi = null;
  }
}

// Экспорт
window.RSIStrategy = RSIStrategy;
