/**
 * Exchange Integration Examples
 * Примеры использования интеграции с биржами
 */

import {
  BinanceExchange,
  BybitExchange,
  ExchangeManager,
  MarketType,
  OrderSide,
  OrderType,
  CandleInterval,
  TimeInForce,
} from '../src/exchanges';

async function main() {
  console.log('🚀 Exchange Integration Examples\n');

  // ==================== Example 1: Binance Spot Market Data ====================
  console.log('📊 Example 1: Binance Spot Market Data\n');

  const binanceSpot = new BinanceExchange({
    marketType: MarketType.SPOT,
    testnet: true, // Использовать testnet
  });

  await binanceSpot.initialize();

  // Получить свечи (OHLCV)
  const candles = await binanceSpot.getCandles('BTCUSDT', CandleInterval.ONE_HOUR, 5);
  console.log('Latest 5 hourly candles for BTCUSDT:');
  candles.forEach((candle) => {
    console.log(
      `  ${new Date(candle.timestamp).toISOString()} - O: ${candle.open}, H: ${candle.high}, L: ${candle.low}, C: ${candle.close}, V: ${candle.volume}`,
    );
  });
  console.log();

  // Получить order book
  const orderBook = await binanceSpot.getOrderBook('BTCUSDT', 5);
  console.log('Order Book (top 5):');
  console.log('Bids (buy orders):');
  orderBook.bids.slice(0, 5).forEach((bid) => {
    console.log(`  Price: ${bid.price}, Qty: ${bid.quantity}`);
  });
  console.log('Asks (sell orders):');
  orderBook.asks.slice(0, 5).forEach((ask) => {
    console.log(`  Price: ${ask.price}, Qty: ${ask.quantity}`);
  });
  console.log();

  // Получить тикер
  const ticker = await binanceSpot.getTicker('BTCUSDT');
  console.log('BTCUSDT Ticker:');
  console.log(`  Last Price: $${ticker.lastPrice}`);
  console.log(`  24h Change: ${ticker.priceChangePercent24h.toFixed(2)}%`);
  console.log(`  24h Volume: ${ticker.volume24h.toFixed(2)} BTC`);
  console.log(`  24h High: $${ticker.high24h}`);
  console.log(`  24h Low: $${ticker.low24h}`);
  console.log();

  // Получить последние сделки
  const trades = await binanceSpot.getTrades('BTCUSDT', 5);
  console.log('Latest 5 trades:');
  trades.forEach((trade) => {
    console.log(
      `  ${new Date(trade.timestamp).toISOString()} - ${trade.side.toUpperCase()} ${trade.quantity} @ $${trade.price}`,
    );
  });
  console.log();

  await binanceSpot.disconnect();

  // ==================== Example 2: Binance Futures ====================
  console.log('📊 Example 2: Binance Futures\n');

  const binanceFutures = new BinanceExchange({
    marketType: MarketType.FUTURES,
    testnet: true,
  });

  await binanceFutures.initialize();

  // Получить свечи для futures
  const futuresCandles = await binanceFutures.getCandles('BTCUSDT', CandleInterval.FIFTEEN_MINUTES, 3);
  console.log('Latest 3 candles (15m) for BTCUSDT Futures:');
  futuresCandles.forEach((candle) => {
    console.log(`  ${new Date(candle.timestamp).toISOString()} - Close: $${candle.close}`);
  });
  console.log();

  await binanceFutures.disconnect();

  // ==================== Example 3: Bybit ====================
  console.log('📊 Example 3: Bybit Spot\n');

  const bybit = new BybitExchange({
    marketType: MarketType.SPOT,
    testnet: true,
  });

  await bybit.initialize();

  const bybitTicker = await bybit.getTicker('BTCUSDT');
  console.log('Bybit BTCUSDT:');
  console.log(`  Price: $${bybitTicker.lastPrice}`);
  console.log(`  24h Volume: ${bybitTicker.volume24h.toFixed(2)}`);
  console.log();

  await bybit.disconnect();

  // ==================== Example 4: Trading (requires API keys) ====================
  console.log('📊 Example 4: Trading Operations (requires API keys)\n');

  // ВАЖНО: Для реальной торговли нужны API ключи
  const tradingExchange = new BinanceExchange({
    marketType: MarketType.SPOT,
    testnet: true,
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_SECRET,
  });

  if (process.env.BINANCE_API_KEY && process.env.BINANCE_SECRET) {
    await tradingExchange.initialize();

    // Получить баланс
    try {
      const balances = await tradingExchange.getBalance();
      console.log('Account Balances:');
      balances
        .filter((b) => b.total > 0)
        .forEach((balance) => {
          console.log(`  ${balance.asset}: ${balance.free} (locked: ${balance.locked})`);
        });
      console.log();

      // Пример размещения лимитного ордера (не будет выполнен без достаточного баланса)
      console.log('Example: Place limit buy order (not executed)');
      console.log('  Symbol: BTCUSDT');
      console.log('  Side: BUY');
      console.log('  Type: LIMIT');
      console.log('  Quantity: 0.001');
      console.log('  Price: 30000');
      console.log();

      // Получить открытые ордера
      const openOrders = await tradingExchange.getOpenOrders('BTCUSDT');
      console.log(`Open orders for BTCUSDT: ${openOrders.length}`);
      console.log();
    } catch (error) {
      console.log('Trading operations require valid API keys');
      console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
      console.log();
    }

    await tradingExchange.disconnect();
  } else {
    console.log('⚠️  Skipping trading example (no API keys)');
    console.log('Set BINANCE_API_KEY and BINANCE_SECRET to test trading operations\n');
  }

  // ==================== Example 5: Exchange Manager ====================
  console.log('📊 Example 5: Exchange Manager (Multiple Exchanges)\n');

  const manager = new ExchangeManager({
    exchanges: {
      binance: {
        marketType: MarketType.SPOT,
        testnet: true,
        apiKey: process.env.BINANCE_API_KEY,
        apiSecret: process.env.BINANCE_SECRET,
      },
      bybit: {
        marketType: MarketType.SPOT,
        testnet: true,
        apiKey: process.env.BYBIT_API_KEY,
        apiSecret: process.env.BYBIT_SECRET,
      },
    },
    defaultExchange: 'binance',
  });

  await manager.initialize();

  // Список доступных бирж
  console.log('Available exchanges:');
  manager.listExchanges();
  console.log();

  // Сравнить цены на разных биржах
  const priceComparison = await manager.comparePrice('BTCUSDT');
  console.log('Price comparison for BTCUSDT:');
  priceComparison.forEach((price) => {
    console.log(`  ${price.exchange} (${price.marketType}): $${price.lastPrice.toFixed(2)}`);
  });
  console.log();

  // Найти лучшую цену для покупки
  const bestBuyPrice = await manager.findBestPrice('BTCUSDT', 'buy');
  if (bestBuyPrice) {
    console.log('Best price to BUY BTCUSDT:');
    console.log(`  Exchange: ${bestBuyPrice.exchange}`);
    console.log(`  Price: $${bestBuyPrice.price.toFixed(2)}`);
    console.log();
  }

  // Найти лучшую цену для продажи
  const bestSellPrice = await manager.findBestPrice('BTCUSDT', 'sell');
  if (bestSellPrice) {
    console.log('Best price to SELL BTCUSDT:');
    console.log(`  Exchange: ${bestSellPrice.exchange}`);
    console.log(`  Price: $${bestSellPrice.price.toFixed(2)}`);
    console.log();
  }

  // Получить агрегированный order book
  const aggregatedOrderBook = await manager.getAggregatedOrderBook('BTCUSDT', 3);
  console.log('Aggregated Order Book (top 3 levels):');
  aggregatedOrderBook.forEach((data) => {
    console.log(`\n  ${data.exchange} (${data.marketType}):`);
    console.log('  Bids:');
    data.orderBook.bids.slice(0, 3).forEach((bid) => {
      console.log(`    ${bid.price} : ${bid.quantity}`);
    });
    console.log('  Asks:');
    data.orderBook.asks.slice(0, 3).forEach((ask) => {
      console.log(`    ${ask.price} : ${ask.quantity}`);
    });
  });
  console.log();

  await manager.disconnect();

  console.log('✅ All examples completed!');
}

// Run examples
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
