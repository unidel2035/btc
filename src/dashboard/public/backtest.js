/**
 * Backtesting UI Logic
 * Handles backtest form submission, results display, and visualization
 */

(function () {
  'use strict';

  let backtestResults = null;
  let equityChart = null;
  let priceChart = null;

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const form = document.getElementById('backtestForm');
    const exportBtn = document.getElementById('exportBacktest');

    if (form) {
      form.addEventListener('submit', handleBacktestSubmit);
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', handleExport);
    }

    // Period change handler for custom dates
    const periodSelect = document.getElementById('backtestPeriod');
    if (periodSelect) {
      periodSelect.addEventListener('change', handlePeriodChange);
    }
  }

  function handlePeriodChange(event) {
    // If custom period is selected, we could add date pickers here
    // For now, we'll just use the predefined periods
    console.log('Period changed:', event.target.value);
  }

  async function handleBacktestSubmit(event) {
    event.preventDefault();

    // Get form values
    const strategy = document.getElementById('backtestStrategy').value;
    const period = document.getElementById('backtestPeriod').value;
    const symbol = document.getElementById('backtestSymbol').value;
    const initialCapital = parseFloat(document.getElementById('backtestCapital').value);
    const positionSize = parseFloat(document.getElementById('backtestPositionSize').value);
    const timeframe = document.getElementById('backtestTimeframe').value;
    const fees = parseFloat(document.getElementById('backtestFees').value);
    const slippage = parseFloat(document.getElementById('backtestSlippage').value);
    const allowShorts = document.getElementById('backtestAllowShorts').checked;

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Prepare request payload
    const payload = {
      strategy,
      symbol,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      initialCapital,
      positionSize,
      timeframe,
      fees,
      slippage,
      allowShorts,
    };

    // Show progress
    showProgress();

    try {
      // Make API request
      const response = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const results = await response.json();
      backtestResults = results;

      // Hide progress
      hideProgress();

      // Display results
      displayResults(results);

      // Enable export button
      const exportBtn = document.getElementById('exportBacktest');
      if (exportBtn) {
        exportBtn.disabled = false;
      }
    } catch (error) {
      console.error('Backtest error:', error);
      hideProgress();
      alert(`Failed to run backtest: ${error.message}`);
    }
  }

  function showProgress() {
    const progress = document.getElementById('backtestProgress');
    const runBtn = document.getElementById('runBacktest');

    if (progress) {
      progress.style.display = 'block';
    }

    if (runBtn) {
      runBtn.disabled = true;
    }

    // Animate progress bar
    const progressBar = document.getElementById('backtestProgressBar');
    if (progressBar) {
      let width = 0;
      const interval = setInterval(() => {
        if (width >= 90) {
          clearInterval(interval);
        } else {
          width += 10;
          progressBar.style.width = width + '%';
        }
      }, 200);
      progressBar.dataset.interval = interval;
    }
  }

  function hideProgress() {
    const progress = document.getElementById('backtestProgress');
    const runBtn = document.getElementById('runBacktest');
    const progressBar = document.getElementById('backtestProgressBar');

    if (progress) {
      progress.style.display = 'none';
    }

    if (runBtn) {
      runBtn.disabled = false;
    }

    if (progressBar) {
      if (progressBar.dataset.interval) {
        clearInterval(parseInt(progressBar.dataset.interval));
      }
      progressBar.style.width = '100%';
      setTimeout(() => {
        progressBar.style.width = '0%';
      }, 500);
    }
  }

  function displayResults(results) {
    // Show results container
    const container = document.getElementById('backtestResultsContainer');
    if (container) {
      container.style.display = 'block';
    }

    // Update metrics
    updateMetric('btTotalReturn', formatPercent(results.totalReturn), results.totalReturn >= 0);
    updateMetric('btWinRate', formatPercent(results.winRate), results.winRate >= 50);
    updateMetric('btSharpeRatio', results.sharpeRatio.toFixed(2), results.sharpeRatio >= 1);
    updateMetric('btMaxDrawdown', formatPercent(results.maxDrawdown), false);
    updateMetric('btProfitFactor', results.profitFactor.toFixed(2), results.profitFactor >= 1);
    updateMetric('btTotalTrades', results.totalTrades, results.totalTrades > 0);
    updateMetric('btAvgWin', formatPercent(results.avgWin), results.avgWin > 0);
    updateMetric('btAvgLoss', formatPercent(results.avgLoss), false);

    // Draw equity curve
    drawEquityCurve(results.equityCurve);

    // Draw price chart with trades
    drawPriceChart(results);

    // Display trade list
    displayTradeList(results.trades);

    // Scroll to results
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function updateMetric(elementId, value, isPositive) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;

      // Update color classes
      element.classList.remove('positive', 'negative');
      if (typeof isPositive === 'boolean') {
        element.classList.add(isPositive ? 'positive' : 'negative');
      }
    }
  }

  function formatPercent(value) {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  function formatCurrency(value) {
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${Math.abs(value).toFixed(2)}`;
  }

  function drawEquityCurve(equityCurve) {
    const canvas = document.getElementById('backtestEquityChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy previous chart if exists
    if (equityChart) {
      equityChart.destroy();
    }

    // Prepare data
    const labels = equityCurve.map((point) => new Date(point.timestamp).toLocaleDateString());
    const equityData = equityCurve.map((point) => point.equity);
    const drawdownData = equityCurve.map((point) => point.drawdown);

    // Create chart
    equityChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Equity',
            data: equityData,
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            yAxisID: 'y',
          },
          {
            label: 'Drawdown (%)',
            data: drawdownData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              color: '#a0aec0',
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.datasetIndex === 0) {
                  label += '$' + context.parsed.y.toFixed(2);
                } else {
                  label += context.parsed.y.toFixed(2) + '%';
                }
                return label;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              color: '#2d3748',
            },
            ticks: {
              color: '#a0aec0',
              maxTicksLimit: 10,
            },
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: {
              color: '#2d3748',
            },
            ticks: {
              color: '#a0aec0',
              callback: function (value) {
                return '$' + value.toFixed(0);
              },
            },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              color: '#a0aec0',
              callback: function (value) {
                return value.toFixed(1) + '%';
              },
            },
          },
        },
      },
    });

    // Set canvas height
    canvas.style.height = '400px';
  }

  function drawPriceChart(results) {
    const container = document.getElementById('backtestPriceChart');
    if (!container) return;

    // Clear previous chart
    container.innerHTML = '';

    // For now, we'll create a placeholder message
    // In a full implementation, this would use lightweight-charts to show
    // candlestick data with entry/exit markers
    const message = document.createElement('div');
    message.className = 'chart-placeholder';
    message.style.cssText = 'padding: 40px; text-align: center; color: #a0aec0;';
    message.textContent =
      `Price chart with ${results.totalTrades} trades will be displayed here. ` +
      'Full implementation requires candlestick data from the backtest.';
    container.appendChild(message);

    // TODO: Implement full price chart with lightweight-charts
    // showing entry/exit points, stop-loss, take-profit levels
  }

  function displayTradeList(trades) {
    const tbody = document.getElementById('backtestTradesBody');
    if (!tbody) return;

    // Clear existing rows
    tbody.innerHTML = '';

    if (!trades || trades.length === 0) {
      const row = tbody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 9;
      cell.textContent = 'No trades executed';
      cell.style.textAlign = 'center';
      cell.style.color = '#a0aec0';
      return;
    }

    // Add rows for each trade
    trades.forEach((trade) => {
      const row = tbody.insertRow();

      // Entry Time
      const entryCell = row.insertCell();
      entryCell.textContent = new Date(trade.entryTime).toLocaleString();

      // Exit Time
      const exitCell = row.insertCell();
      exitCell.textContent = trade.exitTime ? new Date(trade.exitTime).toLocaleString() : '-';

      // Direction
      const directionCell = row.insertCell();
      directionCell.textContent = trade.direction.toUpperCase();
      directionCell.className =
        trade.direction === 'long' ? 'badge badge-success' : 'badge badge-danger';

      // Entry Price
      const entryPriceCell = row.insertCell();
      entryPriceCell.textContent = '$' + trade.entryPrice.toFixed(2);

      // Exit Price
      const exitPriceCell = row.insertCell();
      exitPriceCell.textContent = trade.exitPrice ? '$' + trade.exitPrice.toFixed(2) : '-';

      // Quantity
      const quantityCell = row.insertCell();
      quantityCell.textContent = trade.quantity.toFixed(6);

      // P&L
      const pnlCell = row.insertCell();
      if (trade.pnl !== undefined) {
        pnlCell.textContent = formatCurrency(trade.pnl);
        pnlCell.className = trade.pnl >= 0 ? 'positive' : 'negative';
      } else {
        pnlCell.textContent = '-';
      }

      // P&L %
      const pnlPercentCell = row.insertCell();
      if (trade.pnlPercent !== undefined) {
        pnlPercentCell.textContent = formatPercent(trade.pnlPercent);
        pnlPercentCell.className = trade.pnlPercent >= 0 ? 'positive' : 'negative';
      } else {
        pnlPercentCell.textContent = '-';
      }

      // Exit Reason
      const reasonCell = row.insertCell();
      reasonCell.textContent = trade.exitReason ? trade.exitReason.replace(/-/g, ' ') : '-';
      reasonCell.style.textTransform = 'capitalize';
    });
  }

  function handleExport() {
    if (!backtestResults) {
      alert('No backtest results to export');
      return;
    }

    // Create export dialog or directly export as JSON
    const dataStr = JSON.stringify(backtestResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `backtest-results-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Also offer CSV export for trades
    exportTradesCSV();
  }

  function exportTradesCSV() {
    if (!backtestResults || !backtestResults.trades) return;

    const trades = backtestResults.trades;
    const headers = [
      'Entry Time',
      'Exit Time',
      'Direction',
      'Entry Price',
      'Exit Price',
      'Quantity',
      'P&L',
      'P&L %',
      'Exit Reason',
    ];

    const rows = trades.map((trade) => [
      new Date(trade.entryTime).toISOString(),
      trade.exitTime ? new Date(trade.exitTime).toISOString() : '',
      trade.direction,
      trade.entryPrice,
      trade.exitPrice || '',
      trade.quantity,
      trade.pnl || '',
      trade.pnlPercent || '',
      trade.exitReason || '',
    ]);

    const csvContent = headers.join(',') + '\n' + rows.map((row) => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `backtest-trades-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Expose functions for debugging
  window.backtestUI = {
    getResults: () => backtestResults,
    displayResults,
  };
})();
