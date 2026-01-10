/**
 * Market Depth Chart Component
 * Visual representation of order book depth
 */

class MarketDepthChart {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.chart = null;
    this.updateInterval = null;
  }

  initialize() {
    if (!this.container) {
      console.error('Market depth container not found');
      return;
    }

    this.createChart();
    this.startUpdates();
  }

  createChart() {
    const ctx = this.container;
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Bids',
            data: [],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            stepped: 'before',
            tension: 0,
          },
          {
            label: 'Asks',
            data: [],
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            stepped: 'after',
            tension: 0,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#a0aec0',
              font: {
                size: 11
              }
            }
          },
          tooltip: {
            callbacks: {
              title: (context) => {
                return `Price: $${context[0].label}`;
              },
              label: (context) => {
                return `${context.dataset.label}: ${context.parsed.y.toFixed(4)} BTC`;
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Price (USDT)',
              color: '#a0aec0'
            },
            ticks: {
              color: '#a0aec0',
              maxTicksLimit: 8,
              callback: function(value, index, ticks) {
                return '$' + this.getLabelForValue(value);
              }
            },
            grid: {
              color: '#2d3748',
              drawBorder: false
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Cumulative Amount (BTC)',
              color: '#a0aec0'
            },
            ticks: {
              color: '#a0aec0',
              callback: function(value) {
                return value.toFixed(2);
              }
            },
            grid: {
              color: '#2d3748',
              drawBorder: false
            }
          }
        }
      }
    });
  }

  generateDepthData() {
    const currentPrice = 50000;
    const depth = 25;

    // Generate bids (cumulative from highest to lowest)
    const bids = [];
    let cumulativeBidAmount = 0;
    for (let i = 0; i < depth; i++) {
      const price = currentPrice - (i * (Math.random() * 10 + 10));
      const amount = Math.random() * 0.5 + 0.1;
      cumulativeBidAmount += amount;
      bids.push({ price: price.toFixed(2), amount: cumulativeBidAmount });
    }
    bids.reverse(); // Order from low to high price

    // Generate asks (cumulative from lowest to highest)
    const asks = [];
    let cumulativeAskAmount = 0;
    for (let i = 0; i < depth; i++) {
      const price = currentPrice + (i * (Math.random() * 10 + 10));
      const amount = Math.random() * 0.5 + 0.1;
      cumulativeAskAmount += amount;
      asks.push({ price: price.toFixed(2), amount: cumulativeAskAmount });
    }

    return { bids, asks };
  }

  updateChart() {
    if (!this.chart) return;

    const { bids, asks } = this.generateDepthData();

    // Combine bid and ask data for x-axis
    const allPrices = [...bids.map(b => b.price), ...asks.map(a => a.price)];

    // Create data points
    const bidData = bids.map(b => ({ x: b.price, y: b.amount }));
    const askData = asks.map(a => ({ x: a.price, y: a.amount }));

    this.chart.data.labels = allPrices;
    this.chart.data.datasets[0].data = bidData;
    this.chart.data.datasets[1].data = askData;
    this.chart.update('none'); // Update without animation for real-time feel
  }

  startUpdates() {
    this.updateChart();

    // Update every 2 seconds
    this.updateInterval = setInterval(() => {
      this.updateChart();
    }, 2000);
  }

  stopUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  destroy() {
    this.stopUpdates();
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}

// Global instance
window.marketDepthChart = null;

function initMarketDepthChart() {
  if (!window.marketDepthChart && document.getElementById('marketDepthChart')) {
    window.marketDepthChart = new MarketDepthChart('marketDepthChart');
    window.marketDepthChart.initialize();
  }
}

function cleanupMarketDepthChart() {
  if (window.marketDepthChart) {
    window.marketDepthChart.destroy();
    window.marketDepthChart = null;
  }
}
