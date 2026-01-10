/**
 * Recent Trades Component
 * Displays latest market trades with time, price, and amount
 */

class RecentTrades {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.trades = [];
    this.maxTrades = 20;
    this.updateInterval = null;
  }

  initialize() {
    if (!this.container) {
      console.error('Recent trades container not found');
      return;
    }

    this.render();
    this.startUpdates();
  }

  generateMockTrade() {
    const currentPrice = 50000 + (Math.random() - 0.5) * 500;
    const amount = Math.random() * 1 + 0.01;
    const isBuy = Math.random() > 0.5;
    const time = new Date();

    return {
      time,
      price: currentPrice,
      amount,
      isBuy,
      total: currentPrice * amount,
    };
  }

  addTrade(trade) {
    this.trades.unshift(trade);
    if (this.trades.length > this.maxTrades) {
      this.trades = this.trades.slice(0, this.maxTrades);
    }
    this.render();
  }

  render() {
    if (this.trades.length === 0) {
      this.container.innerHTML =
        '<p class="text-muted" style="text-align: center; padding: 1rem;">No trades yet</p>';
      return;
    }

    const tradesHtml = this.trades
      .map((trade, index) => {
        const timeStr = trade.time.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });

        const isRecent = index === 0;
        const animationClass = isRecent ? 'trade-flash' : '';

        return `
        <div class="trade-row ${animationClass}">
          <span class="trade-time">${timeStr}</span>
          <span class="trade-price ${trade.isBuy ? 'trade-buy' : 'trade-sell'}">
            ${trade.price.toFixed(2)}
          </span>
          <span class="trade-amount">${trade.amount.toFixed(4)}</span>
        </div>
      `;
      })
      .join('');

    this.container.innerHTML = `
      <div class="trades-header">
        <span>Time</span>
        <span>Price(USDT)</span>
        <span>Amount(BTC)</span>
      </div>
      <div class="trades-list">
        ${tradesHtml}
      </div>
    `;
  }

  startUpdates() {
    // Initialize with some trades
    for (let i = 0; i < 10; i++) {
      this.addTrade(this.generateMockTrade());
    }

    // Add new trades periodically
    this.updateInterval = setInterval(
      () => {
        this.addTrade(this.generateMockTrade());
      },
      2000 + Math.random() * 3000,
    );
  }

  stopUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  destroy() {
    this.stopUpdates();
  }
}

// Global instance
window.recentTrades = null;

function initRecentTrades() {
  if (!window.recentTrades) {
    window.recentTrades = new RecentTrades('recentTradesContainer');
    window.recentTrades.initialize();
  }
}

function cleanupRecentTrades() {
  if (window.recentTrades) {
    window.recentTrades.destroy();
    window.recentTrades = null;
  }
}
