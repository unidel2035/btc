/**
 * Price Channel Strategy Chart
 * Интерактивный график для визуализации стратегии Price Channel Breakout
 */

class StrategyChart {
  constructor() {
    this.chart = null;
    this.candlestickSeries = null;
    this.channelHighSeries = null;
    this.channelLowSeries = null;

    this.simulationRunning = false;
    this.simulationInterval = null;
    this.currentTime = Math.floor(Date.now() / 1000);
    this.currentPrice = 50000;
    this.priceHistory = [];
    this.trades = [];

    this.CHANNEL_PERIOD = 18;

    // Real data mode settings
    this.useRealData = true;
    this.exchange = 'binance';
    this.symbol = 'BTC/USDT';
    this.timeframe = '1h';
    this.ws = null;
  }

  initialize() {
    const chartElement = document.getElementById('tradingChart');
    if (!chartElement) {
      console.error('Chart element not found');
      return;
    }

    console.log('Initializing chart...', {
      width: chartElement.clientWidth,
      height: chartElement.clientHeight,
      offsetWidth: chartElement.offsetWidth,
      offsetHeight: chartElement.offsetHeight
    });

    // Создаем график
    const width = chartElement.clientWidth || chartElement.offsetWidth || 800;
    const height = chartElement.clientHeight || chartElement.offsetHeight || 600;

    console.log('Creating chart with dimensions:', { width, height });

    this.chart = LightweightCharts.createChart(chartElement, {
      width,
      height,
      layout: {
        background: { color: '#141932' },
        textColor: '#a0aec0',
      },
      grid: {
        vertLines: { color: '#1e2442' },
        horzLines: { color: '#1e2442' },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#2d3748',
      },
      timeScale: {
        borderColor: '#2d3748',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Создаем серии
    this.candlestickSeries = this.chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    this.channelHighSeries = this.chart.addLineSeries({
      color: '#10b981',
      lineWidth: 2,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      title: 'Channel High',
    });

    this.channelLowSeries = this.chart.addLineSeries({
      color: '#ef4444',
      lineWidth: 2,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      title: 'Channel Low',
    });

    // Обработчики кнопок
    document.getElementById('chartStart')?.addEventListener('click', () => this.start());
    document.getElementById('chartPause')?.addEventListener('click', () => this.pause());
    document.getElementById('chartReset')?.addEventListener('click', () => this.reset());

    // Обработчики селекторов
    document.getElementById('exchangeSelect')?.addEventListener('change', (e) => {
      this.updateSettings(e.target.value, this.symbol, this.timeframe);
    });
    document.getElementById('symbolSelect')?.addEventListener('change', (e) => {
      this.updateSettings(this.exchange, e.target.value, this.timeframe);
    });
    document.getElementById('timeframeSelect')?.addEventListener('change', (e) => {
      this.updateSettings(this.exchange, this.symbol, e.target.value);
    });

    // Адаптивность
    window.addEventListener('resize', () => {
      if (this.chart) {
        this.chart.applyOptions({
          width: chartElement.clientWidth
        });
      }
    });

    // Инициализация с историческими данными
    this.reset();
  }

  async loadRealData() {
    try {
      const response = await fetch(`/api/chart/history?exchange=${this.exchange}&symbol=${this.symbol}&timeframe=${this.timeframe}&limit=100`);

      if (!response.ok) {
        console.warn('Failed to load real data, falling back to simulation');
        this.useRealData = false;
        return this.generateHistoricalData();
      }

      const result = await response.json();
      const data = result.data;

      if (!data || data.length === 0) {
        console.warn('No data received, falling back to simulation');
        this.useRealData = false;
        return this.generateHistoricalData();
      }

      // Update price history for channel calculation
      this.priceHistory = data.map(candle => ({
        time: candle.time,
        high: candle.high,
        low: candle.low,
        close: candle.close
      }));

      this.currentPrice = data[data.length - 1].close;
      this.currentTime = data[data.length - 1].time;

      return data;
    } catch (error) {
      console.error('Error loading real data:', error);
      this.useRealData = false;
      return this.generateHistoricalData();
    }
  }

  generateHistoricalData() {
    const data = [];
    let price = 49900;
    const startTime = this.currentTime - (100 * 3600);

    for (let i = 0; i < 100; i++) {
      const time = startTime + (i * 3600);
      const change = (Math.random() - 0.5) * 200;
      price += change;

      const open = price;
      const high = price + Math.random() * 100;
      const low = price - Math.random() * 100;
      const close = price + (Math.random() - 0.5) * 50;

      data.push({ time, open, high, low, close });
      this.priceHistory.push({ time, high, low, close });
    }

    this.currentPrice = data[data.length - 1].close;
    this.currentTime = data[data.length - 1].time + 3600;

    return data;
  }

  setupWebSocket() {
    if (!this.useRealData) return;

    // Connect to existing WebSocket
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
      this.ws = window.ws;
      this.subscribeToChart();
    } else {
      console.warn('WebSocket not available, real-time updates disabled');
    }
  }

  subscribeToChart() {
    if (!this.ws) return;

    // Subscribe to chart updates
    this.ws.send(JSON.stringify({
      type: 'subscribe',
      channel: 'chart',
      exchange: this.exchange,
      symbol: this.symbol,
      timeframe: this.timeframe
    }));

    console.log(`Subscribed to chart: ${this.exchange} ${this.symbol} ${this.timeframe}`);
  }

  unsubscribeFromChart() {
    if (!this.ws) return;

    this.ws.send(JSON.stringify({
      type: 'unsubscribe',
      channel: 'chart',
      exchange: this.exchange,
      symbol: this.symbol,
      timeframe: this.timeframe
    }));

    console.log(`Unsubscribed from chart: ${this.exchange} ${this.symbol} ${this.timeframe}`);
  }

  handleChartCandle(candle) {
    if (!candle || candle.exchange !== this.exchange || candle.symbol !== this.symbol || candle.timeframe !== this.timeframe) {
      return;
    }

    const chartCandle = {
      time: Math.floor(candle.timestamp / 1000),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close
    };

    // Update or add candle
    this.candlestickSeries.update(chartCandle);

    // Update price history
    this.priceHistory.push({
      time: chartCandle.time,
      high: chartCandle.high,
      low: chartCandle.low,
      close: chartCandle.close
    });

    if (this.priceHistory.length > 200) {
      this.priceHistory.shift();
    }

    this.currentPrice = chartCandle.close;
    this.currentTime = chartCandle.time;

    // Update channel and check for signals
    const channel = this.calculateChannel();
    if (channel) {
      this.channelHighSeries.update({ time: chartCandle.time, value: channel.high });
      this.channelLowSeries.update({ time: chartCandle.time, value: channel.low });

      const signal = this.checkBreakout(chartCandle.close, channel);
      if (signal) {
        this.addTrade(signal, chartCandle.close, channel);
      }

      this.updateUI(chartCandle, channel, signal);
    } else {
      this.updateUI(chartCandle, null, null);
    }
  }

  calculateChannel() {
    if (this.priceHistory.length < this.CHANNEL_PERIOD) return null;

    const recent = this.priceHistory.slice(-this.CHANNEL_PERIOD);
    const high = Math.max(...recent.map(p => p.high));
    const low = Math.min(...recent.map(p => p.low));
    const width = high - low;
    const widthPercent = (width / low) * 100;

    return { high, low, width, widthPercent };
  }

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

  addTrade(direction, entryPrice, channel) {
    const stopLoss = direction === 'LONG' ? channel.low : channel.high;
    const takeProfitDistance = channel.width * 1.5;
    const takeProfit = direction === 'LONG'
      ? entryPrice + takeProfitDistance
      : entryPrice - takeProfitDistance;

    const trade = {
      direction,
      entryPrice,
      stopLoss,
      takeProfit,
      time: this.currentTime,
      confidence: 80,
    };

    this.trades.push(trade);
    this.updateLastSignal(trade);
    this.updateTradeHistory(trade);

    // Добавляем маркер на график
    const markers = [{
      time: this.currentTime,
      position: direction === 'LONG' ? 'belowBar' : 'aboveBar',
      color: direction === 'LONG' ? '#10b981' : '#ef4444',
      shape: direction === 'LONG' ? 'arrowUp' : 'arrowDown',
      text: direction,
    }];

    this.candlestickSeries.setMarkers(markers);
  }

  updateUI(candle, channel, signal) {
    document.getElementById('chartPrice').textContent = `$${candle.close.toLocaleString(undefined, {minimumFractionDigits: 2})}`;

    if (channel) {
      document.getElementById('chartChannelHigh').textContent = `$${channel.high.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
      document.getElementById('chartChannelLow').textContent = `$${channel.low.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
      document.getElementById('chartChannelWidth').textContent = `$${channel.width.toFixed(2)} (${channel.widthPercent.toFixed(2)}%)`;
    }

    if (signal) {
      const badgeClass = signal === 'LONG' ? 'badge-long' : 'badge-short';
      document.getElementById('chartSignalStatus').innerHTML = `<span class="badge ${badgeClass}">${signal}</span>`;
    } else {
      document.getElementById('chartSignalStatus').innerHTML = '<span class="badge badge-neutral">No Signal</span>';
    }
  }

  updateLastSignal(trade) {
    const signalHtml = `
      <div class="stat-row">
        <span class="stat-label">Direction</span>
        <span class="stat-value ${trade.direction === 'LONG' ? 'positive' : 'negative'}">${trade.direction}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Entry Price</span>
        <span class="stat-value">$${trade.entryPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Stop Loss</span>
        <span class="stat-value negative">$${trade.stopLoss.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Take Profit</span>
        <span class="stat-value positive">$${trade.takeProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Confidence</span>
        <span class="stat-value">${trade.confidence}%</span>
      </div>
    `;
    document.getElementById('chartLastSignal').innerHTML = signalHtml;
  }

  updateTradeHistory(trade) {
    const tradeHtml = `
      <div class="trade-item">
        <div class="trade-item-header">
          <span class="badge ${trade.direction === 'LONG' ? 'badge-long' : 'badge-short'}">${trade.direction}</span>
          <span>$${trade.entryPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
        </div>
        <div>SL: $${trade.stopLoss.toLocaleString(undefined, {minimumFractionDigits: 2})} | TP: $${trade.takeProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
      </div>
    `;

    const historyDiv = document.getElementById('chartTradeHistory');
    if (historyDiv.querySelector('.text-muted')) {
      historyDiv.innerHTML = '';
    }
    historyDiv.insertAdjacentHTML('afterbegin', tradeHtml);
  }

  generateNextCandle() {
    const change = (Math.random() - 0.5) * 300;
    this.currentPrice += change;

    const open = this.currentPrice;
    const high = this.currentPrice + Math.random() * 150;
    const low = this.currentPrice - Math.random() * 150;
    const close = this.currentPrice + (Math.random() - 0.5) * 100;

    const candle = {
      time: this.currentTime,
      open,
      high,
      low,
      close,
    };

    this.currentPrice = close;
    this.priceHistory.push({ time: this.currentTime, high, low, close });

    if (this.priceHistory.length > 200) {
      this.priceHistory.shift();
    }

    this.currentTime += 3600;

    return candle;
  }

  simulationStep() {
    const candle = this.generateNextCandle();
    this.candlestickSeries.update(candle);

    const channel = this.calculateChannel();

    if (channel) {
      this.channelHighSeries.update({ time: candle.time, value: channel.high });
      this.channelLowSeries.update({ time: candle.time, value: channel.low });

      const signal = this.checkBreakout(candle.close, channel);

      if (signal) {
        this.addTrade(signal, candle.close, channel);
      }

      this.updateUI(candle, channel, signal);
    } else {
      this.updateUI(candle, null, null);
    }
  }

  start() {
    if (!this.simulationRunning) {
      this.simulationRunning = true;
      this.simulationInterval = setInterval(() => this.simulationStep(), 500);
    }
  }

  pause() {
    this.simulationRunning = false;
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  async reset() {
    this.pause();
    this.unsubscribeFromChart();
    this.priceHistory = [];
    this.trades = [];
    this.currentTime = Math.floor(Date.now() / 1000);
    this.currentPrice = 50000;

    const historicalData = this.useRealData ? await this.loadRealData() : this.generateHistoricalData();
    this.candlestickSeries.setData(historicalData);

    const channel = this.calculateChannel();
    if (channel) {
      const channelData = historicalData.map(d => ({ time: d.time, value: channel.high }));
      this.channelHighSeries.setData(channelData);
      this.channelLowSeries.setData(channelData.map(d => ({ ...d, value: channel.low })));

      this.updateUI(historicalData[historicalData.length - 1], channel, null);
    }

    document.getElementById('chartLastSignal').innerHTML = '<p class="text-muted">Waiting for channel breakout...</p>';
    document.getElementById('chartTradeHistory').innerHTML = '<p class="text-muted">No trades yet</p>';

    // Setup WebSocket for real-time updates
    if (this.useRealData) {
      this.setupWebSocket();
    }
  }

  destroy() {
    this.pause();
    this.unsubscribeFromChart();
    if (this.chart) {
      this.chart.remove();
    }
  }

  async updateSettings(exchange, symbol, timeframe) {
    // Unsubscribe from old settings
    this.unsubscribeFromChart();

    // Update settings
    this.exchange = exchange;
    this.symbol = symbol;
    this.timeframe = timeframe;

    // Reload data
    await this.reset();
  }
}

// Глобальная инициализация
window.strategyChart = null;

// Инициализация при загрузке страницы
function initStrategyChart() {
  if (!window.strategyChart && document.getElementById('tradingChart')) {
    window.strategyChart = new StrategyChart();
    window.strategyChart.initialize();
  }
}

// Очистка при уходе со страницы
function cleanupStrategyChart() {
  if (window.strategyChart) {
    window.strategyChart.destroy();
    window.strategyChart = null;
  }
}
