/**
 * Enhanced Trading Chart - MEXC-style
 * Advanced features: volume bars, multiple timeframes, technical indicators, drawing tools
 */

class EnhancedTradingChart {
  constructor() {
    this.chart = null;
    this.candlestickSeries = null;
    this.volumeSeries = null;
    this.channelHighSeries = null;
    this.channelLowSeries = null;
    this.indicators = new Map();

    // State
    this.simulationRunning = false;
    this.simulationInterval = null;
    this.currentTime = Math.floor(Date.now() / 1000);
    this.currentPrice = 50000;
    this.priceHistory = [];
    this.volumeHistory = [];
    this.trades = [];

    // Settings
    this.CHANNEL_PERIOD = 18;
    this.currentTimeframe = '1h'; // Default timeframe
    this.chartType = 'candlestick'; // candlestick, line, area, bars
    this.activeIndicators = new Set(['channelHigh', 'channelLow']); // Active indicators

    // Available timeframes
    this.timeframes = [
      { value: '1m', label: '1m', seconds: 60 },
      { value: '5m', label: '5m', seconds: 300 },
      { value: '15m', label: '15m', seconds: 900 },
      { value: '1h', label: '1H', seconds: 3600 },
      { value: '4h', label: '4H', seconds: 14400 },
      { value: '1D', label: '1D', seconds: 86400 },
    ];
  }

  initialize() {
    const chartContainer = document.getElementById('tradingChartContainer');
    if (!chartContainer) {
      console.error('Chart container not found');
      return;
    }

    console.log('Initializing enhanced chart...');

    const width = chartContainer.clientWidth || 800;
    const height = chartContainer.clientHeight || 600;

    console.log('Creating chart with dimensions:', { width, height });

    // Create main chart
    this.chart = LightweightCharts.createChart(chartContainer, {
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
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: '#2d3748',
        timeVisible: true,
        secondsVisible: false,
      },
      watermark: {
        visible: true,
        fontSize: 24,
        horzAlign: 'center',
        vertAlign: 'center',
        color: 'rgba(160, 174, 192, 0.1)',
        text: 'BTC/USDT',
      },
    });

    // Create price series based on chart type
    this.updateChartType(this.chartType);

    // Create volume series
    this.volumeSeries = this.chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Create channel lines
    this.channelHighSeries = this.chart.addLineSeries({
      color: '#10b981',
      lineWidth: 2,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      title: 'Channel High',
      priceLineVisible: false,
      lastValueVisible: false,
    });

    this.channelLowSeries = this.chart.addLineSeries({
      color: '#ef4444',
      lineWidth: 2,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      title: 'Channel Low',
      priceLineVisible: false,
      lastValueVisible: false,
    });

    this.setupEventListeners();
    this.setupIndicators();

    // Responsive handling
    window.addEventListener('resize', () => {
      if (this.chart && chartContainer) {
        this.chart.applyOptions({
          width: chartContainer.clientWidth,
          height: chartContainer.clientHeight,
        });
      }
    });

    // Initialize with historical data
    this.reset();
  }

  setupEventListeners() {
    // Control buttons
    document.getElementById('chartStart')?.addEventListener('click', () => this.start());
    document.getElementById('chartPause')?.addEventListener('click', () => this.pause());
    document.getElementById('chartReset')?.addEventListener('click', () => this.reset());

    // Timeframe selector
    document.querySelectorAll('.timeframe-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.switchTimeframe(e.target.dataset.timeframe);
      });
    });

    // Chart type selector
    document.querySelectorAll('.chart-type-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.switchChartType(e.target.dataset.chartType);
      });
    });

    // Indicator toggles
    document.querySelectorAll('.indicator-toggle').forEach((toggle) => {
      toggle.addEventListener('click', (e) => {
        const indicator = e.target.dataset.indicator;
        this.toggleIndicator(indicator);
      });
    });

    // Fullscreen toggle
    document.getElementById('chartFullscreen')?.addEventListener('click', () => {
      this.toggleFullscreen();
    });
  }

  setupIndicators() {
    // Initialize indicator storage
    this.indicators.set(
      'ma20',
      this.chart.addLineSeries({
        color: '#2962FF',
        lineWidth: 2,
        title: 'MA(20)',
        priceLineVisible: false,
        lastValueVisible: false,
      }),
    );

    this.indicators.set(
      'ma50',
      this.chart.addLineSeries({
        color: '#FF6D00',
        lineWidth: 2,
        title: 'MA(50)',
        priceLineVisible: false,
        lastValueVisible: false,
      }),
    );

    this.indicators.set(
      'ema20',
      this.chart.addLineSeries({
        color: '#00E676',
        lineWidth: 2,
        title: 'EMA(20)',
        priceLineVisible: false,
        lastValueVisible: false,
      }),
    );

    // Hide all indicators by default
    this.indicators.forEach((series) => {
      series.applyOptions({ visible: false });
    });
  }

  switchTimeframe(timeframe) {
    this.currentTimeframe = timeframe;

    // Update active button
    document.querySelectorAll('.timeframe-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.timeframe === timeframe);
    });

    // In a real implementation, this would fetch new data
    console.log(`Switched to ${timeframe} timeframe`);

    // For simulation, just update the interval
    if (this.simulationRunning) {
      this.pause();
      this.start();
    }
  }

  switchChartType(chartType) {
    this.chartType = chartType;

    // Update active button
    document.querySelectorAll('.chart-type-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.chartType === chartType);
    });

    this.updateChartType(chartType);

    // Reload data
    const historicalData = this.generateHistoricalData();
    this.setChartData(historicalData);
  }

  updateChartType(chartType) {
    // Remove old series if exists
    if (this.candlestickSeries) {
      this.chart.removeSeries(this.candlestickSeries);
      this.candlestickSeries = null;
    }

    switch (chartType) {
      case 'candlestick':
        this.candlestickSeries = this.chart.addCandlestickSeries({
          upColor: '#10b981',
          downColor: '#ef4444',
          borderVisible: false,
          wickUpColor: '#10b981',
          wickDownColor: '#ef4444',
        });
        break;

      case 'line':
        this.candlestickSeries = this.chart.addLineSeries({
          color: '#667eea',
          lineWidth: 2,
        });
        break;

      case 'area':
        this.candlestickSeries = this.chart.addAreaSeries({
          topColor: 'rgba(102, 126, 234, 0.4)',
          bottomColor: 'rgba(102, 126, 234, 0.0)',
          lineColor: '#667eea',
          lineWidth: 2,
        });
        break;

      case 'bars':
        this.candlestickSeries = this.chart.addBarSeries({
          upColor: '#10b981',
          downColor: '#ef4444',
        });
        break;
    }
  }

  toggleIndicator(indicatorName) {
    if (this.activeIndicators.has(indicatorName)) {
      this.activeIndicators.delete(indicatorName);
      this.hideIndicator(indicatorName);
    } else {
      this.activeIndicators.add(indicatorName);
      this.showIndicator(indicatorName);
    }

    // Update button state
    const btn = document.querySelector(`[data-indicator="${indicatorName}"]`);
    if (btn) {
      btn.classList.toggle('active', this.activeIndicators.has(indicatorName));
    }
  }

  showIndicator(indicatorName) {
    const series = this.indicators.get(indicatorName);
    if (series) {
      series.applyOptions({ visible: true });
      this.updateIndicatorData(indicatorName);
    }
  }

  hideIndicator(indicatorName) {
    const series = this.indicators.get(indicatorName);
    if (series) {
      series.applyOptions({ visible: false });
    }
  }

  toggleFullscreen() {
    const chartPage = document.getElementById('chart-page');
    if (!document.fullscreenElement) {
      chartPage.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  generateHistoricalData() {
    const data = [];
    const volumeData = [];
    let price = 49900;
    const timeframeData = this.timeframes.find((tf) => tf.value === this.currentTimeframe);
    const interval = timeframeData ? timeframeData.seconds : 3600;
    const startTime = this.currentTime - 100 * interval;

    for (let i = 0; i < 100; i++) {
      const time = startTime + i * interval;
      const change = (Math.random() - 0.5) * 200;
      price += change;

      const open = price;
      const high = price + Math.random() * 100;
      const low = price - Math.random() * 100;
      const close = price + (Math.random() - 0.5) * 50;
      const volume = Math.random() * 100 + 50;

      data.push({ time, open, high, low, close });
      volumeData.push({
        time,
        value: volume,
        color: close >= open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
      });

      this.priceHistory.push({ time, high, low, close });
      this.volumeHistory.push({ time, volume });
    }

    this.currentPrice = data[data.length - 1].close;
    this.currentTime = data[data.length - 1].time + interval;

    return { price: data, volume: volumeData };
  }

  setChartData(data) {
    if (this.chartType === 'line') {
      const lineData = data.price.map((d) => ({ time: d.time, value: d.close }));
      this.candlestickSeries.setData(lineData);
    } else if (this.chartType === 'area') {
      const areaData = data.price.map((d) => ({ time: d.time, value: d.close }));
      this.candlestickSeries.setData(areaData);
    } else {
      this.candlestickSeries.setData(data.price);
    }

    this.volumeSeries.setData(data.volume);

    // Update channel data
    const channel = this.calculateChannel();
    if (channel) {
      const channelData = data.price.map((d) => ({ time: d.time, value: channel.high }));
      this.channelHighSeries.setData(channelData);
      this.channelLowSeries.setData(channelData.map((d) => ({ ...d, value: channel.low })));

      this.updateUI(data.price[data.price.length - 1], channel, null);
    }

    // Update indicators if active
    this.activeIndicators.forEach((indicator) => {
      this.updateIndicatorData(indicator);
    });
  }

  calculateChannel() {
    if (this.priceHistory.length < this.CHANNEL_PERIOD) return null;

    const recent = this.priceHistory.slice(-this.CHANNEL_PERIOD);
    const high = Math.max(...recent.map((p) => p.high));
    const low = Math.min(...recent.map((p) => p.low));
    const width = high - low;
    const widthPercent = (width / low) * 100;

    return { high, low, width, widthPercent };
  }

  calculateMA(period) {
    if (this.priceHistory.length < period) return [];

    const data = [];
    for (let i = period - 1; i < this.priceHistory.length; i++) {
      const slice = this.priceHistory.slice(i - period + 1, i + 1);
      const sum = slice.reduce((acc, p) => acc + p.close, 0);
      const avg = sum / period;
      data.push({ time: this.priceHistory[i].time, value: avg });
    }
    return data;
  }

  calculateEMA(period) {
    if (this.priceHistory.length < period) return [];

    const data = [];
    const multiplier = 2 / (period + 1);

    // Start with SMA
    const firstSlice = this.priceHistory.slice(0, period);
    let ema = firstSlice.reduce((acc, p) => acc + p.close, 0) / period;
    data.push({ time: this.priceHistory[period - 1].time, value: ema });

    // Calculate EMA
    for (let i = period; i < this.priceHistory.length; i++) {
      ema = (this.priceHistory[i].close - ema) * multiplier + ema;
      data.push({ time: this.priceHistory[i].time, value: ema });
    }

    return data;
  }

  updateIndicatorData(indicatorName) {
    let data = [];

    switch (indicatorName) {
      case 'ma20':
        data = this.calculateMA(20);
        break;
      case 'ma50':
        data = this.calculateMA(50);
        break;
      case 'ema20':
        data = this.calculateEMA(20);
        break;
    }

    const series = this.indicators.get(indicatorName);
    if (series && data.length > 0) {
      series.setData(data);
    }
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
    const takeProfit =
      direction === 'LONG' ? entryPrice + takeProfitDistance : entryPrice - takeProfitDistance;

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

    // Add marker to chart
    const markers = [
      {
        time: this.currentTime,
        position: direction === 'LONG' ? 'belowBar' : 'aboveBar',
        color: direction === 'LONG' ? '#10b981' : '#ef4444',
        shape: direction === 'LONG' ? 'arrowUp' : 'arrowDown',
        text: direction,
      },
    ];

    this.candlestickSeries.setMarkers(markers);
  }

  updateUI(candle, channel, signal) {
    const price = typeof candle === 'number' ? candle : candle.close;
    document.getElementById('chartPrice').textContent =
      `$${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    if (channel) {
      document.getElementById('chartChannelHigh').textContent =
        `$${channel.high.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      document.getElementById('chartChannelLow').textContent =
        `$${channel.low.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      document.getElementById('chartChannelWidth').textContent =
        `$${channel.width.toFixed(2)} (${channel.widthPercent.toFixed(2)}%)`;
    }

    if (signal) {
      const badgeClass = signal === 'LONG' ? 'badge-long' : 'badge-short';
      document.getElementById('chartSignalStatus').innerHTML =
        `<span class="badge ${badgeClass}">${signal}</span>`;
    } else {
      document.getElementById('chartSignalStatus').innerHTML =
        '<span class="badge badge-neutral">No Signal</span>';
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
        <span class="stat-value">$${trade.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Stop Loss</span>
        <span class="stat-value negative">$${trade.stopLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Take Profit</span>
        <span class="stat-value positive">$${trade.takeProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
          <span>$${trade.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div>SL: $${trade.stopLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })} | TP: $${trade.takeProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
      </div>
    `;

    const historyDiv = document.getElementById('chartTradeHistory');
    if (historyDiv.querySelector('.text-muted')) {
      historyDiv.innerHTML = '';
    }
    historyDiv.insertAdjacentHTML('afterbegin', tradeHtml);
  }

  generateNextCandle() {
    const timeframeData = this.timeframes.find((tf) => tf.value === this.currentTimeframe);
    const interval = timeframeData ? timeframeData.seconds : 3600;

    const change = (Math.random() - 0.5) * 300;
    this.currentPrice += change;

    const open = this.currentPrice;
    const high = this.currentPrice + Math.random() * 150;
    const low = this.currentPrice - Math.random() * 150;
    const close = this.currentPrice + (Math.random() - 0.5) * 100;
    const volume = Math.random() * 100 + 50;

    const candle = {
      time: this.currentTime,
      open,
      high,
      low,
      close,
    };

    const volumeBar = {
      time: this.currentTime,
      value: volume,
      color: close >= open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
    };

    this.currentPrice = close;
    this.priceHistory.push({ time: this.currentTime, high, low, close });
    this.volumeHistory.push({ time: this.currentTime, volume });

    if (this.priceHistory.length > 200) {
      this.priceHistory.shift();
      this.volumeHistory.shift();
    }

    this.currentTime += interval;

    return { candle, volumeBar };
  }

  simulationStep() {
    const { candle, volumeBar } = this.generateNextCandle();

    if (this.chartType === 'line') {
      this.candlestickSeries.update({ time: candle.time, value: candle.close });
    } else if (this.chartType === 'area') {
      this.candlestickSeries.update({ time: candle.time, value: candle.close });
    } else {
      this.candlestickSeries.update(candle);
    }

    this.volumeSeries.update(volumeBar);

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

    // Update active indicators
    this.activeIndicators.forEach((indicator) => {
      this.updateIndicatorData(indicator);
    });
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

  reset() {
    this.pause();
    this.priceHistory = [];
    this.volumeHistory = [];
    this.trades = [];
    this.currentTime = Math.floor(Date.now() / 1000);
    this.currentPrice = 50000;

    const historicalData = this.generateHistoricalData();
    this.setChartData(historicalData);

    document.getElementById('chartLastSignal').innerHTML =
      '<p class="text-muted">Waiting for channel breakout...</p>';
    document.getElementById('chartTradeHistory').innerHTML =
      '<p class="text-muted">No trades yet</p>';
  }

  destroy() {
    this.pause();
    if (this.chart) {
      this.chart.remove();
    }
  }
}

// Global initialization
window.enhancedTradingChart = null;

// Initialize enhanced chart
function initEnhancedStrategyChart() {
  if (!window.enhancedTradingChart && document.getElementById('tradingChartContainer')) {
    window.enhancedTradingChart = new EnhancedTradingChart();
    window.enhancedTradingChart.initialize();
  }
}

// Cleanup
function cleanupEnhancedStrategyChart() {
  if (window.enhancedTradingChart) {
    window.enhancedTradingChart.destroy();
    window.enhancedTradingChart = null;
  }
}
