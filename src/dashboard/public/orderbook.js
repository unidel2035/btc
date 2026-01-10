/**
 * Order Book Component
 * Visualizes market depth with bid/ask levels
 */

class OrderBook {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.bids = [];
    this.asks = [];
    this.maxDepth = 15;
    this.updateInterval = null;
  }

  initialize() {
    if (!this.container) {
      console.error('Order book container not found');
      return;
    }

    this.render();
    this.startUpdates();
  }

  generateMockData() {
    const currentPrice = 50000;
    const bids = [];
    const asks = [];

    // Generate bids (buy orders) below current price
    for (let i = 0; i < this.maxDepth; i++) {
      const price = currentPrice - (i + 1) * (Math.random() * 10 + 5);
      const amount = Math.random() * 2 + 0.1;
      const total = price * amount;
      bids.push({ price, amount, total });
    }

    // Generate asks (sell orders) above current price
    for (let i = 0; i < this.maxDepth; i++) {
      const price = currentPrice + (i + 1) * (Math.random() * 10 + 5);
      const amount = Math.random() * 2 + 0.1;
      const total = price * amount;
      asks.push({ price, amount, total });
    }

    this.bids = bids;
    this.asks = asks.reverse(); // Display asks from highest to lowest
  }

  render() {
    const maxBidTotal = Math.max(...this.bids.map(b => b.total));
    const maxAskTotal = Math.max(...this.asks.map(a => a.total));
    const maxTotal = Math.max(maxBidTotal, maxAskTotal);

    const asksHtml = this.asks.map(ask => {
      const percentage = (ask.total / maxTotal) * 100;
      return `
        <div class="orderbook-row ask-row">
          <div class="orderbook-depth" style="width: ${percentage}%"></div>
          <span class="orderbook-price ask-price">${ask.price.toFixed(2)}</span>
          <span class="orderbook-amount">${ask.amount.toFixed(4)}</span>
          <span class="orderbook-total">${ask.total.toFixed(2)}</span>
        </div>
      `;
    }).join('');

    const currentPriceHtml = `
      <div class="orderbook-spread">
        <span class="spread-price">${this.bids[0] ? this.bids[0].price.toFixed(2) : '50000.00'}</span>
        <span class="spread-label">≈ Spread</span>
      </div>
    `;

    const bidsHtml = this.bids.map(bid => {
      const percentage = (bid.total / maxTotal) * 100;
      return `
        <div class="orderbook-row bid-row">
          <div class="orderbook-depth bid-depth" style="width: ${percentage}%"></div>
          <span class="orderbook-price bid-price">${bid.price.toFixed(2)}</span>
          <span class="orderbook-amount">${bid.amount.toFixed(4)}</span>
          <span class="orderbook-total">${bid.total.toFixed(2)}</span>
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="orderbook-header">
        <span>Price(USDT)</span>
        <span>Amount(BTC)</span>
        <span>Total</span>
      </div>
      <div class="orderbook-asks">
        ${asksHtml}
      </div>
      ${currentPriceHtml}
      <div class="orderbook-bids">
        ${bidsHtml}
      </div>
    `;
  }

  update() {
    // Simulate price movements
    const change = (Math.random() - 0.5) * 100;

    this.bids = this.bids.map(bid => ({
      ...bid,
      price: bid.price + change,
      amount: bid.amount * (0.95 + Math.random() * 0.1),
    }));

    this.asks = this.asks.map(ask => ({
      ...ask,
      price: ask.price + change,
      amount: ask.amount * (0.95 + Math.random() * 0.1),
    }));

    // Recalculate totals
    this.bids.forEach(bid => bid.total = bid.price * bid.amount);
    this.asks.forEach(ask => ask.total = ask.price * ask.amount);

    this.render();
  }

  startUpdates() {
    this.generateMockData();
    this.render();

    this.updateInterval = setInterval(() => {
      this.update();
    }, 1000);
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
window.orderBook = null;

function initOrderBook() {
  if (!window.orderBook) {
    window.orderBook = new OrderBook('orderbookContainer');
    window.orderBook.initialize();
  }
}

function cleanupOrderBook() {
  if (window.orderBook) {
    window.orderBook.destroy();
    window.orderBook = null;
  }
}
