/**
 * Strategy Manager
 * Координирует выполнение и визуализацию множественных стратегий на одном графике
 */

class StrategyManager {
  constructor() {
    this.strategies = new Map();
    this.activeStrategies = new Set();
    this.chart = null;
    this.candlestickSeries = null;
    this.priceHistory = [];
    this.currentTime = Math.floor(Date.now() / 1000);
    this.currentPrice = 50000;

    // Simulation control
    this.simulationRunning = false;
    this.simulationInterval = null;
  }

  /**
   * Регистрация стратегии
   */
  registerStrategy(strategyInstance) {
    const id = strategyInstance.id;
    this.strategies.set(id, strategyInstance);

    // Добавляем линейные серии для индикаторов стратегии
    if (this.chart && strategyInstance.indicators) {
      strategyInstance.indicators.forEach(indicator => {
        const series = this.chart.addLineSeries({
          color: indicator.color,
          lineWidth: indicator.lineWidth || 2,
          lineStyle: indicator.lineStyle || 0, // Solid
          title: indicator.title,
          visible: false, // Изначально скрыто
        });
        indicator.series = series;
      });
    }
  }

  /**
   * Активация стратегии
   */
  activateStrategy(strategyId) {
    if (!this.strategies.has(strategyId)) {
      console.error(`Strategy ${strategyId} not found`);
      return;
    }

    this.activeStrategies.add(strategyId);
    const strategy = this.strategies.get(strategyId);

    // Показываем индикаторы стратегии
    if (strategy.indicators) {
      strategy.indicators.forEach(indicator => {
        if (indicator.series) {
          indicator.series.applyOptions({ visible: true });
        }
      });
    }

    // Обновляем маркеры на графике
    this.updateMarkers();
  }

  /**
   * Деактивация стратегии
   */
  deactivateStrategy(strategyId) {
    this.activeStrategies.delete(strategyId);
    const strategy = this.strategies.get(strategyId);

    // Скрываем индикаторы стратегии
    if (strategy && strategy.indicators) {
      strategy.indicators.forEach(indicator => {
        if (indicator.series) {
          indicator.series.applyOptions({ visible: false });
        }
      });
    }

    // Обновляем маркеры на графике
    this.updateMarkers();
  }

  /**
   * Проверка, активна ли стратегия
   */
  isStrategyActive(strategyId) {
    return this.activeStrategies.has(strategyId);
  }

  /**
   * Установка ссылки на график
   */
  setChart(chart, candlestickSeries) {
    this.chart = chart;
    this.candlestickSeries = candlestickSeries;
  }

  /**
   * Обновление истории цен
   */
  updatePriceHistory(candle) {
    this.priceHistory.push({
      time: candle.time,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      open: candle.open,
    });

    // Ограничиваем размер истории
    if (this.priceHistory.length > 200) {
      this.priceHistory.shift();
    }

    this.currentTime = candle.time;
    this.currentPrice = candle.close;
  }

  /**
   * Анализ всех активных стратегий
   */
  analyzeStrategies(candle) {
    const signals = [];

    for (const strategyId of this.activeStrategies) {
      const strategy = this.strategies.get(strategyId);
      if (!strategy) continue;

      const signal = strategy.analyze(this.priceHistory, candle);
      if (signal) {
        signals.push({
          strategyId,
          strategy: strategy.name,
          ...signal,
        });
      }

      // Обновляем индикаторы стратегии
      if (strategy.indicators) {
        strategy.indicators.forEach(indicator => {
          const value = strategy.getIndicatorValue(indicator.id);
          if (value !== null && value !== undefined && indicator.series) {
            indicator.series.update({ time: candle.time, value });
          }
        });
      }
    }

    return signals;
  }

  /**
   * Обновление маркеров на графике
   */
  updateMarkers() {
    if (!this.candlestickSeries) return;

    const allMarkers = [];

    for (const strategyId of this.activeStrategies) {
      const strategy = this.strategies.get(strategyId);
      if (!strategy) continue;

      const markers = strategy.getMarkers();
      allMarkers.push(...markers);
    }

    // Сортируем маркеры по времени
    allMarkers.sort((a, b) => a.time - b.time);

    this.candlestickSeries.setMarkers(allMarkers);
  }

  /**
   * Получение метрик всех активных стратегий
   */
  getStrategyMetrics() {
    const metrics = [];

    for (const strategyId of this.activeStrategies) {
      const strategy = this.strategies.get(strategyId);
      if (!strategy) continue;

      metrics.push({
        id: strategyId,
        name: strategy.name,
        color: strategy.color,
        ...strategy.getMetrics(),
      });
    }

    return metrics;
  }

  /**
   * Сброс всех стратегий
   */
  reset() {
    this.priceHistory = [];
    this.currentTime = Math.floor(Date.now() / 1000);
    this.currentPrice = 50000;

    for (const strategy of this.strategies.values()) {
      strategy.reset();
    }

    this.updateMarkers();
  }

  /**
   * Получение списка всех зарегистрированных стратегий
   */
  getAllStrategies() {
    return Array.from(this.strategies.values()).map(strategy => ({
      id: strategy.id,
      name: strategy.name,
      description: strategy.description,
      color: strategy.color,
      active: this.activeStrategies.has(strategy.id),
    }));
  }

  /**
   * Уничтожение менеджера
   */
  destroy() {
    this.strategies.clear();
    this.activeStrategies.clear();
    this.priceHistory = [];
  }
}

// Экспорт для использования в других модулях
window.StrategyManager = StrategyManager;
