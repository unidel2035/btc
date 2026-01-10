// WebSocket connection
let ws = null;
let reconnectTimeout = null;
let equityChart = null;

// State
const state = {
  metrics: {},
  positions: [],
  signals: [],
  news: [],
  equity: [],
  history: [],
  performance: {},
  strategies: [],
  riskConfig: {},
};

// Language management
let currentLanguage = 'en';

// Get current language from localStorage or browser
function getCurrentLanguage() {
  const savedLang = localStorage.getItem('preferredLanguage');
  if (savedLang) {
    return savedLang;
  }
  const browserLang = navigator.language.split('-')[0];
  return browserLang === 'ru' ? 'ru' : 'en';
}

// Initialize i18next
async function initializeI18n() {
  currentLanguage = getCurrentLanguage();

  try {
    await i18next.init({
      lng: currentLanguage,
      fallbackLng: 'en',
      resources: {
        en: { translation: await fetchJSON('/locales/en.json') },
        ru: { translation: await fetchJSON('/locales/ru.json') }
      }
    });

    updateUILanguage();
    highlightActiveLanguage(currentLanguage);
  } catch (error) {
    console.error('Failed to initialize i18n:', error);
  }
}

// Fetch JSON file
async function fetchJSON(url) {
  const response = await fetch(url);
  return await response.json();
}

// Switch language
async function switchLanguage(lang) {
  if (lang === currentLanguage) return;

  currentLanguage = lang;
  localStorage.setItem('preferredLanguage', lang);

  await i18next.changeLanguage(lang);
  updateUILanguage();
  highlightActiveLanguage(lang);
}

// Highlight active language button
function highlightActiveLanguage(lang) {
  document.querySelectorAll('.language-option').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.lang === lang) {
      btn.classList.add('active');
    }
  });
}

// Update UI with current language
function updateUILanguage() {
  // This is a basic implementation - will be expanded in issue #44
  // For now, just update the page headers as a demonstration
  document.querySelectorAll('[data-page]').forEach(link => {
    const page = link.dataset.page;
    const navText = link.querySelector('span:not(.icon)');
    if (navText) {
      navText.textContent = i18next.t(`nav.${page}`);
    }
  });

  // Update connection status
  const statusText = document.getElementById('wsStatusText');
  if (statusText) {
    const isConnected = statusText.classList.contains('connected');
    const key = isConnected ? 'connected' : 'disconnected';
    statusText.textContent = i18next.t(`connection.${key}`);
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  await initializeI18n();
  initializeNavigation();
  connectWebSocket();
  initializeEquityChart();
  loadInitialData();
  setupEventListeners();
});

// Navigation
function initializeNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      navigateToPage(page);
    });
  });
}

function navigateToPage(page) {
  // Update nav items
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.remove('active');
  });
  document.querySelector(`[data-page="${page}"]`).classList.add('active');

  // Update pages
  document.querySelectorAll('.page').forEach((p) => {
    p.classList.remove('active');
  });
  document.getElementById(`${page}-page`).classList.add('active');

  // Load page data
  loadPageData(page);
}

function loadPageData(page) {
  switch (page) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'signals':
      renderSignals();
      break;
    case 'positions':
      renderPositions();
      break;
    case 'news':
      renderNews();
      break;
    case 'analytics':
      loadAnalytics();
      break;
    case 'settings':
      loadSettings();
      break;
  }
}

// WebSocket
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('WebSocket connected');
    updateConnectionStatus(true);
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    handleWebSocketMessage(message);
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
    updateConnectionStatus(false);
    reconnectTimeout = setTimeout(() => connectWebSocket(), 3000);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

function updateConnectionStatus(connected) {
  const statusDot = document.getElementById('wsStatus');
  const statusText = document.getElementById('wsStatusText');

  if (connected) {
    statusDot.classList.add('connected');
    statusText.textContent = i18next.t('connection.connected');
  } else {
    statusDot.classList.remove('connected');
    statusText.textContent = i18next.t('connection.disconnected');
  }
}

function handleWebSocketMessage(message) {
  console.log('WebSocket message:', message.type);

  switch (message.type) {
    case 'metrics':
      state.metrics = message.data;
      updateMetrics();
      break;

    case 'position':
      if (message.data.positions) {
        state.positions = message.data.positions;
      } else {
        updateOrAddPosition(message.data);
      }
      renderPositions();
      renderDashboardPositions();
      break;

    case 'signal':
      if (message.data.signals) {
        state.signals = message.data.signals;
      } else {
        state.signals.unshift(message.data);
        if (state.signals.length > 100) {
          state.signals = state.signals.slice(0, 100);
        }
      }
      renderSignals();
      renderRecentSignals();
      break;

    case 'news':
      state.news.unshift(message.data);
      if (state.news.length > 100) {
        state.news = state.news.slice(0, 100);
      }
      renderNews();
      break;

    case 'price':
      updatePositionPrice(message.data);
      break;

    case 'notification':
      showNotification(message.data);
      break;
  }
}

// API calls
async function fetchAPI(endpoint) {
  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch ${endpoint}:`, error);
    return null;
  }
}

async function postAPI(endpoint, data) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Failed to post to ${endpoint}:`, error);
    return null;
  }
}

async function patchAPI(endpoint, data) {
  try {
    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Failed to patch ${endpoint}:`, error);
    return null;
  }
}

// Load initial data
async function loadInitialData() {
  const [metrics, positions, signals, news, equity] = await Promise.all([
    fetchAPI('/api/metrics'),
    fetchAPI('/api/positions'),
    fetchAPI('/api/signals?limit=50'),
    fetchAPI('/api/news?limit=50'),
    fetchAPI('/api/equity?limit=100'),
  ]);

  if (metrics) state.metrics = metrics;
  if (positions) state.positions = positions;
  if (signals) state.signals = signals;
  if (news) state.news = news;
  if (equity) state.equity = equity;

  renderDashboard();
}

// Metrics
function updateMetrics() {
  const { balance, equity, pnl, pnlPercent, winRate, totalTrades, dailyPnl, dailyPnlPercent } = state.metrics;

  document.getElementById('balance').textContent = formatCurrency(balance);
  document.getElementById('equity').textContent = formatCurrency(equity);
  document.getElementById('pnl').textContent = formatCurrency(pnl);
  document.getElementById('pnlPercent').textContent = formatPercent(pnlPercent);
  document.getElementById('winRate').textContent = formatPercent(winRate);
  document.getElementById('totalTrades').textContent = `${totalTrades} trades`;

  // Update change indicators
  updateChangeIndicator('balanceChange', dailyPnlPercent);
  updateChangeIndicator('equityChange', pnlPercent);
  updatePnlIndicator('pnl', pnl);
}

function updateChangeIndicator(elementId, value) {
  const element = document.getElementById(elementId);
  element.textContent = formatPercent(value);
  element.classList.remove('positive', 'negative');
  if (value > 0) element.classList.add('positive');
  else if (value < 0) element.classList.add('negative');
}

function updatePnlIndicator(elementId, value) {
  const element = document.getElementById(elementId);
  element.classList.remove('positive', 'negative');
  if (value > 0) element.classList.add('positive');
  else if (value < 0) element.classList.add('negative');
}

// Dashboard
function renderDashboard() {
  updateMetrics();
  renderDashboardPositions();
  renderRecentSignals();
  updateEquityChart();
}

function renderDashboardPositions() {
  const container = document.getElementById('dashboardPositions');
  if (!container) return;

  if (state.positions.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No open positions</p>';
    return;
  }

  container.innerHTML = state.positions
    .map(
      (pos) => `
    <div class="position-item">
      <div class="position-header">
        <span class="position-symbol">${pos.symbol}</span>
        <span class="position-side ${pos.side}">${pos.side}</span>
      </div>
      <div class="position-pnl ${pos.pnl >= 0 ? 'positive' : 'negative'}">
        ${formatCurrency(pos.pnl)} (${formatPercent(pos.pnlPercent)})
      </div>
    </div>
  `,
    )
    .join('');
}

function renderRecentSignals() {
  const container = document.getElementById('recentSignals');
  if (!container) return;

  const recentSignals = state.signals.slice(0, 5);

  if (recentSignals.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No signals yet</p>';
    return;
  }

  container.innerHTML = recentSignals
    .map(
      (signal) => `
    <div class="signal-item">
      <div class="signal-info">
        <div class="signal-header">
          <span class="signal-type">${signal.type}</span>
          <span class="signal-symbol">${signal.symbol}</span>
          <span class="signal-action ${signal.action}">${signal.action}</span>
        </div>
        <div class="signal-reason">${signal.reason}</div>
      </div>
    </div>
  `,
    )
    .join('');
}

// Equity Chart
function initializeEquityChart() {
  const ctx = document.getElementById('equityChart');
  if (!ctx) return;

  equityChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Equity',
          data: [],
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: { display: false },
        y: {
          ticks: {
            callback: (value) => formatCurrency(value),
            color: '#a0aec0',
          },
          grid: { color: '#2d3748' },
        },
      },
    },
  });
}

function updateEquityChart() {
  if (!equityChart || state.equity.length === 0) return;

  const labels = state.equity.map((point) => new Date(point.timestamp).toLocaleTimeString());
  const data = state.equity.map((point) => point.equity);

  equityChart.data.labels = labels;
  equityChart.data.datasets[0].data = data;
  equityChart.update();
}

// Signals Page
function renderSignals() {
  const container = document.getElementById('signalsList');
  if (!container) return;

  const filteredSignals = filterSignals();

  if (filteredSignals.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No signals found</p>';
    return;
  }

  container.innerHTML = filteredSignals
    .map(
      (signal) => `
    <div class="signal-item">
      <div class="signal-info">
        <div class="signal-header">
          <span class="signal-type">${signal.type}</span>
          <span class="signal-symbol">${signal.symbol}</span>
          <span class="signal-action ${signal.action}">${signal.action}</span>
        </div>
        <div class="signal-reason">${signal.reason}</div>
        <div class="signal-meta">
          <span>Strength: ${signal.strength.toFixed(1)}</span>
          <span>Confidence: ${formatPercent(signal.confidence * 100)}</span>
          <span>${new Date(signal.timestamp).toLocaleString()}</span>
        </div>
      </div>
    </div>
  `,
    )
    .join('');
}

function filterSignals() {
  const typeFilter = document.getElementById('signalTypeFilter')?.value || 'all';
  const actionFilter = document.getElementById('signalActionFilter')?.value || 'all';

  return state.signals.filter((signal) => {
    if (typeFilter !== 'all' && signal.type !== typeFilter) return false;
    if (actionFilter !== 'all' && signal.action !== actionFilter) return false;
    return true;
  });
}

// Positions Page
function renderPositions() {
  const container = document.getElementById('positionsList');
  if (!container) return;

  if (state.positions.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No open positions</p>';
    return;
  }

  container.innerHTML = state.positions
    .map(
      (pos) => `
    <div class="position-item">
      <div class="position-header">
        <span class="position-symbol">${pos.symbol}</span>
        <span class="position-side ${pos.side}">${pos.side}</span>
      </div>
      <div class="position-details">
        <div class="position-detail">
          <div class="position-detail-label">Entry Price</div>
          <div>${formatCurrency(pos.entryPrice)}</div>
        </div>
        <div class="position-detail">
          <div class="position-detail-label">Current Price</div>
          <div>${formatCurrency(pos.currentPrice)}</div>
        </div>
        <div class="position-detail">
          <div class="position-detail-label">Size</div>
          <div>${pos.size}</div>
        </div>
        <div class="position-detail">
          <div class="position-detail-label">Stop Loss</div>
          <div>${pos.stopLoss ? formatCurrency(pos.stopLoss) : '-'}</div>
        </div>
        <div class="position-detail">
          <div class="position-detail-label">Take Profit</div>
          <div>${pos.takeProfit ? formatCurrency(pos.takeProfit) : '-'}</div>
        </div>
        <div class="position-detail">
          <div class="position-detail-label">Opened At</div>
          <div>${new Date(pos.openedAt).toLocaleString()}</div>
        </div>
      </div>
      <div class="position-pnl ${pos.pnl >= 0 ? 'positive' : 'negative'}">
        ${formatCurrency(pos.pnl)} (${formatPercent(pos.pnlPercent)})
      </div>
      <div class="position-actions">
        <button class="btn btn-secondary btn-small" onclick="editPosition('${pos.id}')">Edit SL/TP</button>
        <button class="btn btn-danger btn-small" onclick="closePosition('${pos.id}', ${pos.currentPrice})">Close</button>
      </div>
    </div>
  `,
    )
    .join('');
}

function updateOrAddPosition(position) {
  const index = state.positions.findIndex((p) => p.id === position.id);
  if (index >= 0) {
    state.positions[index] = position;
  } else {
    state.positions.push(position);
  }
}

function updatePositionPrice(data) {
  const position = state.positions.find((p) => p.id === data.positionId);
  if (position) {
    position.currentPrice = data.price;
    const pnl = position.side === 'LONG' ? (data.price - position.entryPrice) * position.size : (position.entryPrice - data.price) * position.size;
    position.pnl = pnl;
    position.pnlPercent = (pnl / (position.entryPrice * position.size)) * 100;
    renderPositions();
    renderDashboardPositions();
  }
}

async function closePosition(id, currentPrice) {
  if (!confirm('Are you sure you want to close this position?')) return;

  const result = await postAPI(`/api/positions/${id}/close`, {
    exitPrice: currentPrice,
    reason: 'Manual close',
  });

  if (result) {
    state.positions = state.positions.filter((p) => p.id !== id);
    renderPositions();
    renderDashboardPositions();
    showNotification({ message: 'Position closed successfully', type: 'success' });
  }
}

function editPosition(id) {
  const position = state.positions.find((p) => p.id === id);
  if (!position) return;

  const stopLoss = prompt('Enter new Stop Loss price:', position.stopLoss || '');
  const takeProfit = prompt('Enter new Take Profit price:', position.takeProfit || '');

  if (stopLoss || takeProfit) {
    patchAPI(`/api/positions/${id}`, {
      stopLoss: stopLoss ? parseFloat(stopLoss) : position.stopLoss,
      takeProfit: takeProfit ? parseFloat(takeProfit) : position.takeProfit,
    }).then((result) => {
      if (result) {
        updateOrAddPosition(result);
        renderPositions();
        showNotification({ message: 'Position updated successfully', type: 'success' });
      }
    });
  }
}

// News Page
function renderNews() {
  const container = document.getElementById('newsFeed');
  if (!container) return;

  const filteredNews = filterNews();

  if (filteredNews.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No news found</p>';
    return;
  }

  container.innerHTML = filteredNews
    .map(
      (news) => `
    <div class="news-item">
      <div class="news-header">
        <div>
          <div class="news-title">${news.title}</div>
        </div>
        <span class="news-sentiment ${news.sentiment}">${news.sentiment}</span>
      </div>
      <div class="news-content">${news.content}</div>
      <div class="news-meta">
        <span>${news.source}</span>
        <span>${new Date(news.publishedAt).toLocaleString()}</span>
        <a href="${news.url}" target="_blank" style="color: var(--accent-primary);">Read more</a>
      </div>
    </div>
  `,
    )
    .join('');
}

function filterNews() {
  const sentimentFilter = document.getElementById('newsSentimentFilter')?.value || 'all';

  return state.news.filter((news) => {
    if (sentimentFilter !== 'all' && news.sentiment !== sentimentFilter) return false;
    return true;
  });
}

// Analytics Page
async function loadAnalytics() {
  const [performance, history] = await Promise.all([fetchAPI('/api/performance'), fetchAPI('/api/history?limit=100')]);

  if (performance) state.performance = performance;
  if (history) state.history = history;

  renderAnalytics();
}

function renderAnalytics() {
  const { totalTrades, winningTrades, losingTrades, winRate, averageWin, averageLoss, profitFactor, sharpeRatio, maxDrawdown } = state.performance;

  document.getElementById('statTotalTrades').textContent = totalTrades || 0;
  document.getElementById('statWinningTrades').textContent = winningTrades || 0;
  document.getElementById('statLosingTrades').textContent = losingTrades || 0;
  document.getElementById('statWinRate').textContent = formatPercent(winRate);
  document.getElementById('statAvgWin').textContent = formatCurrency(averageWin);
  document.getElementById('statAvgLoss').textContent = formatCurrency(averageLoss);
  document.getElementById('statProfitFactor').textContent = (profitFactor || 0).toFixed(2);
  document.getElementById('statSharpeRatio').textContent = (sharpeRatio || 0).toFixed(2);
  document.getElementById('statMaxDrawdown').textContent = formatPercent(maxDrawdown);

  renderTradeHistory();
}

function renderTradeHistory() {
  const container = document.getElementById('tradeHistory');
  if (!container) return;

  if (state.history.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No trade history</p>';
    return;
  }

  const table = `
    <table>
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Side</th>
          <th>Entry</th>
          <th>Exit</th>
          <th>PnL</th>
          <th>Opened</th>
          <th>Closed</th>
        </tr>
      </thead>
      <tbody>
        ${state.history
          .map(
            (trade) => `
          <tr>
            <td>${trade.symbol}</td>
            <td><span class="position-side ${trade.side}">${trade.side}</span></td>
            <td>${formatCurrency(trade.entryPrice)}</td>
            <td>${formatCurrency(trade.exitPrice)}</td>
            <td style="color: ${trade.pnl >= 0 ? 'var(--success)' : 'var(--danger)'}">
              ${formatCurrency(trade.pnl)} (${formatPercent(trade.pnlPercent)})
            </td>
            <td>${new Date(trade.openedAt).toLocaleString()}</td>
            <td>${new Date(trade.closedAt).toLocaleString()}</td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = table;
}

// Settings Page
async function loadSettings() {
  const [riskConfig, strategies] = await Promise.all([fetchAPI('/api/settings/risk'), fetchAPI('/api/strategies')]);

  if (riskConfig) state.riskConfig = riskConfig;
  if (strategies) state.strategies = strategies;

  renderSettings();
}

function renderSettings() {
  // Populate risk settings form
  document.getElementById('maxPositionSize').value = state.riskConfig.maxPositionSize || 0;
  document.getElementById('maxPositions').value = state.riskConfig.maxPositions || 0;
  document.getElementById('maxDailyLoss').value = state.riskConfig.maxDailyLoss || 0;
  document.getElementById('maxTotalDrawdown').value = state.riskConfig.maxTotalDrawdown || 0;
  document.getElementById('defaultStopLoss').value = state.riskConfig.defaultStopLoss || 0;
  document.getElementById('defaultTakeProfit').value = state.riskConfig.defaultTakeProfit || 0;
  document.getElementById('trailingStop').checked = state.riskConfig.trailingStop || false;

  renderStrategies();
}

function renderStrategies() {
  const container = document.getElementById('strategiesList');
  if (!container) return;

  container.innerHTML = state.strategies
    .map(
      (strategy) => `
    <div class="strategy-item">
      <div class="strategy-header">
        <span class="strategy-name">${strategy.name}</span>
        <span class="strategy-status ${strategy.enabled ? 'enabled' : 'disabled'}">
          ${strategy.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>
      <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.5rem;">
        <div>Risk per trade: ${strategy.riskPerTrade}%</div>
        <div>Max positions: ${strategy.maxPositions}</div>
      </div>
    </div>
  `,
    )
    .join('');
}

// Event Listeners
function setupEventListeners() {
  // Language switcher
  document.querySelectorAll('.language-option').forEach(btn => {
    btn.addEventListener('click', () => {
      switchLanguage(btn.dataset.lang);
    });
  });

  // Signal filters
  document.getElementById('signalTypeFilter')?.addEventListener('change', renderSignals);
  document.getElementById('signalActionFilter')?.addEventListener('change', renderSignals);

  // News filters
  document.getElementById('newsSentimentFilter')?.addEventListener('change', renderNews);

  // Risk settings form
  document.getElementById('riskSettingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
      maxPositionSize: parseFloat(document.getElementById('maxPositionSize').value),
      maxPositions: parseInt(document.getElementById('maxPositions').value),
      maxDailyLoss: parseFloat(document.getElementById('maxDailyLoss').value),
      maxTotalDrawdown: parseFloat(document.getElementById('maxTotalDrawdown').value),
      defaultStopLoss: parseFloat(document.getElementById('defaultStopLoss').value),
      defaultTakeProfit: parseFloat(document.getElementById('defaultTakeProfit').value),
      trailingStop: document.getElementById('trailingStop').checked,
    };

    const result = await patchAPI('/api/settings/risk', data);
    if (result) {
      state.riskConfig = result;
      showNotification({ message: 'Risk settings updated successfully', type: 'success' });
    }
  });
}

// Utility functions
function formatCurrency(value) {
  if (value === undefined || value === null) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value) {
  if (value === undefined || value === null) return '0.00%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function showNotification(data) {
  const message = data.message || 'Notification';
  const type = data.type || 'info';
  console.log(`[${type.toUpperCase()}] ${message}`);
  alert(message);
}
