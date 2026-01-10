/**
 * Multi-Strategy Chart
 * Интерактивный график для визуализации множественных торговых стратегий
 */

class StrategyChart {
  constructor() {
    this.chart = null;
    this.candlestickSeries = null;
    this.strategyManager = new StrategyManager();

    this.simulationRunning = false;
    this.simulationInterval = null;
    this.currentTime = Math.floor(Date.now() / 1000);
    this.currentPrice = 50000;
    this.priceHistory = [];
  }

  initialize() {
    const chartElement = document.getElementById('tradingChart');
    if (!chartElement) {
      console.error('Chart element not found');
      return;
    }

    console.log('Initializing multi-strategy chart...', {
      width: chartElement.clientWidth,
      height: chartElement.clientHeight,
    });

    // Создаем график
    const width = chartElement.clientWidth || chartElement.offsetWidth || 800;
    const height = chartElement.clientHeight || chartElement.offsetHeight || 600;

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

    // Создаем основную серию свечей
    this.candlestickSeries = this.chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    // Передаем ссылку на график в StrategyManager
    this.strategyManager.setChart(this.chart, this.candlestickSeries);

    // Регистрируем стратегии
    this.registerStrategies();

    // Обработчики кнопок
    document.getElementById('chartStart')?.addEventListener('click', () => this.start());
    document.getElementById('chartPause')?.addEventListener('click', () => this.pause());
    document.getElementById('chartReset')?.addEventListener('click', () => this.reset());

    // Обработчики чекбоксов стратегий
    this.setupStrategyCheckboxes();

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

  /**
   * Регистрация всех доступных стратегий
   */
  registerStrategies() {
    // Price Channel Strategy
    const priceChannel = new PriceChannelStrategy();
    this.strategyManager.registerStrategy(priceChannel);

    // EMA Crossover Strategy
    const emaCrossover = new EMACrossoverStrategy();
    this.strategyManager.registerStrategy(emaCrossover);

    // RSI Strategy
    const rsi = new RSIStrategy();
    this.strategyManager.registerStrategy(rsi);

    // Активируем Price Channel по умолчанию
    this.strategyManager.activateStrategy('price-channel');
  }

  /**
   * Настройка обработчиков для чекбоксов стратегий
   */
  setupStrategyCheckboxes() {
    const checkboxes = document.querySelectorAll('.strategy-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const strategyId = e.target.dataset.strategy;
        if (e.target.checked) {
          this.strategyManager.activateStrategy(strategyId);
        } else {
          this.strategyManager.deactivateStrategy(strategyId);
        }

        // Обновляем таблицу сравнения
        this.updateComparisonTable();
      });
    });
  }

  /**
   * Генерация исторических данных
   */
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

      const candle = { time, open, high, low, close };
      data.push(candle);

      // Обновляем историю цен в StrategyManager
      this.strategyManager.updatePriceHistory(candle);
    }

    this.currentPrice = data[data.length - 1].close;
    this.currentTime = data[data.length - 1].time + 3600;

    return data;
  }

  /**
   * Генерация следующей свечи
   */
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
    this.currentTime += 3600;

    return candle;
  }

  /**
   * Шаг симуляции
   */
  simulationStep() {
    const candle = this.generateNextCandle();
    this.candlestickSeries.update(candle);

    // Обновляем историю в StrategyManager
    this.strategyManager.updatePriceHistory(candle);

    // Анализируем все активные стратегии
    const signals = this.strategyManager.analyzeStrategies(candle);

    // Обновляем UI
    this.updateUI(candle, signals);

    // Обновляем таблицу сравнения
    this.updateComparisonTable();

    // Обновляем последний сигнал
    if (signals.length > 0) {
      this.updateLastSignals(signals);
    }
  }

  /**
   * Обновление UI
   */
  updateUI(candle, signals) {
    document.getElementById('chartPrice').textContent = `$${candle.close.toLocaleString(undefined, {minimumFractionDigits: 2})}`;

    // Показываем количество активных сигналов
    if (signals.length > 0) {
      const signalText = signals.map(s => `${s.strategy}: ${s.direction}`).join(', ');
      document.getElementById('chartSignalStatus').innerHTML =
        `<span class="badge badge-active">${signals.length} Signal(s)</span>`;
    } else {
      document.getElementById('chartSignalStatus').innerHTML =
        '<span class="badge badge-neutral">No Signals</span>';
    }
  }

  /**
   * Обновление таблицы последних сигналов
   */
  updateLastSignals(signals) {
    const container = document.getElementById('chartLastSignals');
    if (!container) return;

    const signalsHtml = signals.map(signal => `
      <div class="signal-item">
        <div class="signal-header">
          <span class="strategy-badge" style="background: ${this.getStrategyColor(signal.strategyId)}">${signal.strategy}</span>
          <span class="badge ${signal.direction === 'LONG' ? 'badge-long' : 'badge-short'}">${signal.direction}</span>
        </div>
        <div class="signal-details">
          <div>Entry: $${signal.entryPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <div>SL: $${signal.stopLoss.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <div>TP: $${signal.takeProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
        </div>
      </div>
    `).join('');

    container.innerHTML = signalsHtml || '<p class="text-muted">No recent signals</p>';
  }

  /**
   * Получение цвета стратегии
   */
  getStrategyColor(strategyId) {
    const colorMap = {
      'price-channel': '#10b981',
      'ema-crossover': '#3b82f6',
      'rsi': '#f59e0b',
    };
    return colorMap[strategyId] || '#667eea';
  }

  /**
   * Обновление таблицы сравнения метрик
   */
  updateComparisonTable() {
    const tbody = document.getElementById('strategyMetrics');
    if (!tbody) return;

    const metrics = this.strategyManager.getStrategyMetrics();

    if (metrics.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-muted">No active strategies</td></tr>';
      return;
    }

    tbody.innerHTML = metrics.map(metric => `
      <tr>
        <td>
          <span class="strategy-badge" style="background: ${metric.color}">${metric.name}</span>
        </td>
        <td>${metric.signals}</td>
        <td>${metric.winRate.toFixed(1)}%</td>
        <td class="${metric.pnl >= 0 ? 'positive' : 'negative'}">
          $${metric.pnl.toFixed(2)}
        </td>
        <td>${metric.sharpeRatio.toFixed(2)}</td>
      </tr>
    `).join('');
  }

  /**
   * Запуск симуляции
   */
  start() {
    if (!this.simulationRunning) {
      this.simulationRunning = true;
      this.simulationInterval = setInterval(() => this.simulationStep(), 500);
    }
  }

  /**
   * Пауза симуляции
   */
  pause() {
    this.simulationRunning = false;
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  /**
   * Сброс
   */
  reset() {
    this.pause();
    this.currentTime = Math.floor(Date.now() / 1000);
    this.currentPrice = 50000;

    // Сбрасываем StrategyManager
    this.strategyManager.reset();

    // Генерируем исторические данные
    const historicalData = this.generateHistoricalData();
    this.candlestickSeries.setData(historicalData);

    // Обновляем UI
    const lastCandle = historicalData[historicalData.length - 1];
    this.updateUI(lastCandle, []);
    this.updateComparisonTable();

    document.getElementById('chartLastSignals').innerHTML = '<p class="text-muted">Waiting for signals...</p>';
  }

  /**
   * Уничтожение
   */
  destroy() {
    this.pause();
    if (this.chart) {
      this.chart.remove();
    }
    this.strategyManager.destroy();
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
