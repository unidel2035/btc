/**
 * Exchange Integration Tests
 * Тестирование интеграции с криптобиржами
 */

import {
  BinanceExchange,
  BybitExchange,
  OKXExchange,
  ExchangeManager,
  MarketType,
  OrderSide,
  OrderType,
  CandleInterval,
  ExchangeError,
} from '../../src/exchanges';

/**
 * Test Runner
 */
async function runTests() {
  console.log('🧪 Starting Exchange Integration Tests...\n');

  let passed = 0;
  let failed = 0;

  const test = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.error(`❌ ${name}`);
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  };

  // ==================== Binance Tests ====================
  console.log('📊 Binance Exchange Tests\n');

  const binanceSpot = new BinanceExchange({
    marketType: MarketType.SPOT,
    testnet: true,
    enableRateLimit: false, // Отключаем для тестов
  });

  await test('Binance Spot: Initialize without API keys', async () => {
    await binanceSpot.initialize();
    if (!binanceSpot.isInitialized()) {
      throw new Error('Exchange not initialized');
    }
  });

  await test('Binance Spot: Get candles', async () => {
    const candles = await binanceSpot.getCandles('BTCUSDT', CandleInterval.ONE_HOUR, 10);
    if (candles.length === 0) {
      throw new Error('No candles returned');
    }
    if (!candles[0].open || !candles[0].close) {
      throw new Error('Invalid candle data');
    }
  });

  await test('Binance Spot: Get order book', async () => {
    const orderBook = await binanceSpot.getOrderBook('BTCUSDT', 10);
    if (orderBook.bids.length === 0 || orderBook.asks.length === 0) {
      throw new Error('Invalid order book');
    }
    if (orderBook.bids[0].price <= 0) {
      throw new Error('Invalid bid price');
    }
  });

  await test('Binance Spot: Get recent trades', async () => {
    const trades = await binanceSpot.getTrades('BTCUSDT', 10);
    if (trades.length === 0) {
      throw new Error('No trades returned');
    }
    if (!trades[0].price || !trades[0].quantity) {
      throw new Error('Invalid trade data');
    }
  });

  await test('Binance Spot: Get ticker', async () => {
    const ticker = await binanceSpot.getTicker('BTCUSDT');
    if (!ticker.lastPrice || ticker.lastPrice <= 0) {
      throw new Error('Invalid ticker data');
    }
    if (!ticker.volume24h) {
      throw new Error('Missing volume data');
    }
  });

  await test('Binance Spot: Get all tickers', async () => {
    const tickers = await binanceSpot.getAllTickers();
    if (tickers.length === 0) {
      throw new Error('No tickers returned');
    }
  });

  await test('Binance Spot: Get exchange info', async () => {
    const info = await binanceSpot.getExchangeInfo();
    if (info.symbols.length === 0) {
      throw new Error('No symbols in exchange info');
    }
    if (info.name !== 'Binance') {
      throw new Error('Invalid exchange name');
    }
  });

  await test('Binance Spot: Validate symbol', async () => {
    const isValid = await binanceSpot.validateSymbol('BTCUSDT');
    if (!isValid) {
      throw new Error('BTCUSDT should be valid');
    }
  });

  await test('Binance Spot: Format symbol', () => {
    const symbol = binanceSpot.formatSymbol('BTC', 'USDT');
    if (symbol !== 'BTCUSDT') {
      throw new Error(`Expected BTCUSDT, got ${symbol}`);
    }
    return Promise.resolve();
  });

  await test('Binance Spot: Require API keys for trading', async () => {
    try {
      await binanceSpot.getBalance();
      throw new Error('Should require API keys');
    } catch (error) {
      if (!(error instanceof ExchangeError)) {
        throw error;
      }
    }
  });

  // Binance Futures
  const binanceFutures = new BinanceExchange({
    marketType: MarketType.FUTURES,
    testnet: true,
    enableRateLimit: false,
  });

  await test('Binance Futures: Initialize', async () => {
    await binanceFutures.initialize();
    if (!binanceFutures.isInitialized()) {
      throw new Error('Exchange not initialized');
    }
  });

  await test('Binance Futures: Get candles', async () => {
    const candles = await binanceFutures.getCandles('BTCUSDT', CandleInterval.ONE_HOUR, 5);
    if (candles.length === 0) {
      throw new Error('No candles returned');
    }
  });

  await binanceSpot.disconnect();
  await binanceFutures.disconnect();

  // ==================== Bybit Tests ====================
  console.log('\n📊 Bybit Exchange Tests\n');

  const bybitSpot = new BybitExchange({
    marketType: MarketType.SPOT,
    testnet: true,
    enableRateLimit: false,
  });

  await test('Bybit Spot: Initialize', async () => {
    await bybitSpot.initialize();
    if (!bybitSpot.isInitialized()) {
      throw new Error('Exchange not initialized');
    }
  });

  await test('Bybit Spot: Get candles', async () => {
    const candles = await bybitSpot.getCandles('BTCUSDT', CandleInterval.ONE_HOUR, 10);
    if (candles.length === 0) {
      throw new Error('No candles returned');
    }
  });

  await test('Bybit Spot: Get order book', async () => {
    const orderBook = await bybitSpot.getOrderBook('BTCUSDT', 10);
    if (orderBook.bids.length === 0 || orderBook.asks.length === 0) {
      throw new Error('Invalid order book');
    }
  });

  await test('Bybit Spot: Get ticker', async () => {
    const ticker = await bybitSpot.getTicker('BTCUSDT');
    if (!ticker.lastPrice || ticker.lastPrice <= 0) {
      throw new Error('Invalid ticker data');
    }
  });

  await test('Bybit Spot: Get exchange info', async () => {
    const info = await bybitSpot.getExchangeInfo();
    if (info.name !== 'Bybit') {
      throw new Error('Invalid exchange name');
    }
  });

  await test('Bybit Spot: Format symbol', () => {
    const symbol = bybitSpot.formatSymbol('BTC', 'USDT');
    if (symbol !== 'BTCUSDT') {
      throw new Error(`Expected BTCUSDT, got ${symbol}`);
    }
    return Promise.resolve();
  });

  await bybitSpot.disconnect();

  // ==================== OKX Tests ====================
  console.log('\n📊 OKX Exchange Tests\n');

  const okxSpot = new OKXExchange({
    marketType: MarketType.SPOT,
    testnet: false,
    enableRateLimit: false,
  });

  await test('OKX Spot: Initialize (stub)', async () => {
    await okxSpot.initialize();
    if (!okxSpot.isInitialized()) {
      throw new Error('Exchange not initialized');
    }
  });

  await test('OKX Spot: Format symbol', () => {
    const symbol = okxSpot.formatSymbol('BTC', 'USDT');
    if (symbol !== 'BTC-USDT') {
      throw new Error(`Expected BTC-USDT, got ${symbol}`);
    }
    return Promise.resolve();
  });

  await test('OKX Spot: Methods throw not implemented', async () => {
    try {
      await okxSpot.getCandles('BTCUSDT', CandleInterval.ONE_HOUR);
      throw new Error('Should throw not implemented');
    } catch (error) {
      if (!(error instanceof ExchangeError)) {
        throw error;
      }
    }
  });

  await okxSpot.disconnect();

  // ==================== Exchange Manager Tests ====================
  console.log('\n📊 Exchange Manager Tests\n');

  const manager = new ExchangeManager({
    exchanges: {
      binance: {
        marketType: MarketType.SPOT,
        testnet: true,
        enableRateLimit: false,
      },
      bybit: {
        marketType: MarketType.SPOT,
        testnet: true,
        enableRateLimit: false,
      },
      okx: {
        marketType: MarketType.SPOT,
        testnet: false,
        enableRateLimit: false,
        enabled: true,
      },
    },
    defaultExchange: 'binance',
  });

  await test('Manager: Initialize all exchanges', async () => {
    await manager.initialize();
  });

  await test('Manager: Get exchange by name', () => {
    const binance = manager.getExchange('binance', MarketType.SPOT);
    if (!binance.isInitialized()) {
      throw new Error('Binance not initialized');
    }
    return Promise.resolve();
  });

  await test('Manager: Get default exchange', () => {
    const exchange = manager.getDefaultExchange();
    if (exchange.name !== 'Binance') {
      throw new Error('Default exchange is not Binance');
    }
    return Promise.resolve();
  });

  await test('Manager: Has exchange', () => {
    if (!manager.hasExchange('binance', MarketType.SPOT)) {
      throw new Error('Should have Binance spot');
    }
    if (!manager.hasExchange('bybit', MarketType.SPOT)) {
      throw new Error('Should have Bybit spot');
    }
    return Promise.resolve();
  });

  await test('Manager: List exchanges', () => {
    const list = manager.listExchanges();
    if (list.length < 2) {
      throw new Error('Should have at least 2 exchanges');
    }
    return Promise.resolve();
  });

  await test('Manager: Compare prices', async () => {
    const prices = await manager.comparePrice('BTCUSDT', ['binance', 'bybit']);
    if (prices.length === 0) {
      throw new Error('No prices returned');
    }
    if (!prices[0].lastPrice || prices[0].lastPrice <= 0) {
      throw new Error('Invalid price data');
    }
  });

  await test('Manager: Find best price (buy)', async () => {
    const best = await manager.findBestPrice('BTCUSDT', 'buy', ['binance', 'bybit']);
    if (!best) {
      throw new Error('No best price found');
    }
    if (best.price <= 0) {
      throw new Error('Invalid best price');
    }
  });

  await test('Manager: Find best price (sell)', async () => {
    const best = await manager.findBestPrice('BTCUSDT', 'sell', ['binance', 'bybit']);
    if (!best) {
      throw new Error('No best price found');
    }
    if (best.price <= 0) {
      throw new Error('Invalid best price');
    }
  });

  await test('Manager: Get rate limiter stats', () => {
    const stats = manager.getRateLimiterStats();
    if (Object.keys(stats).length === 0) {
      throw new Error('No rate limiter stats');
    }
    return Promise.resolve();
  });

  await test('Manager: Disconnect all', async () => {
    await manager.disconnect();
  });

  // ==================== Results ====================
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
