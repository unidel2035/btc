/**
 * Price Channel Breakout Strategy (Client-side)
 * Стратегия торговли на пробое ценовых каналов
 */

class PriceChannelStrategy extends BaseStrategy {
  constructor() {
    super({
      id: 'price-channel',
      name: 'Price Channel Breakout',
      description: 'Торговля на пробое ценовых каналов',
      color: '#10b981',
      markerShape: 'arrow',
      indicators: [
        {
          id: 'channel-high',
          title: 'Channel High',
          color: '#10b981',
          lineWidth: 2,
          lineStyle: 2, // Dashed
        },
        {
          id: 'channel-low',
          title: 'Channel Low',
          color: '#ef4444',
          lineWidth: 2,
          lineStyle: 2, // Dashed
        },
      ],
    });

    this.CHANNEL_PERIOD = 18;
    this.channelHigh = null;
    this.channelLow = null;
  }

  /**
   * Расчет ценового канала
   */
  calculateChannel(priceHistory) {
    if (priceHistory.length < this.CHANNEL_PERIOD) {
      return null;
    }

    const recent = priceHistory.slice(-this.CHANNEL_PERIOD);
    const high = Math.max(...recent.map((p) => p.high));
    const low = Math.min(...recent.map((p) => p.low));
    const width = high - low;
    const widthPercent = (width / low) * 100;

    return { high, low, width, widthPercent };
  }

  /**
   * Проверка пробоя канала
   */
  checkBreakout(price, channel) {
    if (!channel) return null;

    const threshold = channel.width * 0.001;

    if (price > channel.high + threshold) {
      return 'LONG';
    } else if (price < channel.low - threshold) {
      return 'SHORT';
    }

    return null;
  }

  /**
   * Анализ рынка
   */
  analyze(priceHistory, currentCandle) {
    const channel = this.calculateChannel(priceHistory);

    if (!channel) {
      return null;
    }

    // Сохраняем значения канала для индикаторов
    this.channelHigh = channel.high;
    this.channelLow = channel.low;

    // Проверяем пробой
    const signal = this.checkBreakout(currentCandle.close, channel);

    if (signal) {
      const stopLoss = signal === 'LONG' ? channel.low : channel.high;
      const takeProfitDistance = channel.width * 1.5;
      const takeProfit =
        signal === 'LONG'
          ? currentCandle.close + takeProfitDistance
          : currentCandle.close - takeProfitDistance;

      const trade = {
        direction: signal,
        entryPrice: currentCandle.close,
        stopLoss,
        takeProfit,
        time: currentCandle.time,
        confidence: 80,
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
    if (indicatorId === 'channel-high') {
      return this.channelHigh;
    } else if (indicatorId === 'channel-low') {
      return this.channelLow;
    }
    return null;
  }

  /**
   * Сброс стратегии
   */
  reset() {
    super.reset();
    this.channelHigh = null;
    this.channelLow = null;
  }
}

// Экспорт
window.PriceChannelStrategy = PriceChannelStrategy;
