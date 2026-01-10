/**
 * Base Strategy Class
 * Базовый класс для всех клиентских стратегий
 */

class BaseStrategy {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description || '';
    this.color = config.color;
    this.markerShape = config.markerShape || 'arrowUp'; // arrowUp, circle, square
    this.indicators = config.indicators || [];

    // Торговые сигналы и метрики
    this.trades = [];
    this.markers = [];
    this.metrics = {
      signals: 0,
      winRate: 0,
      pnl: 0,
      sharpeRatio: 0,
    };
  }

  /**
   * Анализ рынка (должен быть переопределен в дочернем классе)
   */
  analyze(priceHistory, currentCandle) {
    throw new Error('analyze() must be implemented by subclass');
  }

  /**
   * Получение значения индикатора по ID
   */
  getIndicatorValue(indicatorId) {
    return null; // Переопределяется в дочернем классе
  }

  /**
   * Добавление торгового сигнала
   */
  addTrade(trade) {
    this.trades.push(trade);
    this.metrics.signals = this.trades.length;

    // Добавляем маркер
    const marker = {
      time: trade.time,
      position: trade.direction === 'LONG' ? 'belowBar' : 'aboveBar',
      color: trade.direction === 'LONG' ? this.color : this.getShortColor(),
      shape: this.getMarkerShape(trade.direction),
      text: `${this.name.substring(0, 3).toUpperCase()}`,
    };

    this.markers.push(marker);

    // Обновляем метрики
    this.updateMetrics();
  }

  /**
   * Получение формы маркера для направления
   */
  getMarkerShape(direction) {
    if (this.markerShape === 'circle') {
      return 'circle';
    } else if (this.markerShape === 'square') {
      return 'square';
    } else {
      return direction === 'LONG' ? 'arrowUp' : 'arrowDown';
    }
  }

  /**
   * Получение цвета для коротких позиций
   */
  getShortColor() {
    // Конвертируем цвет в более темный/противоположный оттенок
    const colorMap = {
      '#10b981': '#ef4444', // Green -> Red
      '#3b82f6': '#f97316', // Blue -> Orange
      '#f59e0b': '#8b5cf6', // Amber -> Purple
      '#06b6d4': '#ec4899', // Cyan -> Pink
    };
    return colorMap[this.color] || '#ef4444';
  }

  /**
   * Обновление метрик
   */
  updateMetrics() {
    if (this.trades.length === 0) {
      return;
    }

    // Подсчет Win Rate (упрощенная версия - каждый второй трейд выигрышный для демо)
    const winningTrades = this.trades.filter((t, i) => i % 2 === 0).length;
    this.metrics.winRate = (winningTrades / this.trades.length) * 100;

    // Упрощенный P&L для демо
    this.metrics.pnl = this.trades.reduce((sum, t) => {
      const isWinning = this.trades.indexOf(t) % 2 === 0;
      return sum + (isWinning ? 100 : -50);
    }, 0);

    // Упрощенный Sharpe Ratio для демо
    this.metrics.sharpeRatio = this.metrics.winRate > 50 ? 1.5 : 0.8;
  }

  /**
   * Получение всех маркеров
   */
  getMarkers() {
    return this.markers;
  }

  /**
   * Получение метрик стратегии
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Сброс стратегии
   */
  reset() {
    this.trades = [];
    this.markers = [];
    this.metrics = {
      signals: 0,
      winRate: 0,
      pnl: 0,
      sharpeRatio: 0,
    };
  }
}

// Экспорт
window.BaseStrategy = BaseStrategy;
