/**
 * Exchange Integration Example
 *
 * Пример использования модуля интеграции с биржами
 */

import { config as loadEnv } from 'dotenv';
import {
  ExchangeManager,
  createExchangeConfig,
  validateExchangeConfig,
} from '../src/exchanges/index.js';

// Загрузить переменные окружения
loadEnv();

/**
 * Основная функция примера
 */
async function main(): Promise<void> {
  console.log('🚀 Exchange Integration Example\n');

  // Создать конфигурацию
  console.log('📝 Creating exchange configuration...');
  const config = createExchangeConfig();

  // Валидировать конфигурацию
  const validation = validateExchangeConfig(config);
  if (!validation.valid) {
    console.error('❌ Configuration validation failed:');
    validation.errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }

  console.log('✅ Configuration validated');
  console.log(`📊 Available exchanges: ${Object.keys(config.exchanges).join(', ')}\n`);

  // Создать менеджер бирж
  const manager = new ExchangeManager(config);

  // Проверить соединение со всеми биржами
  console.log('🔍 Checking connection to exchanges...');
  const pingResults = await manager.pingAll();

  for (const [name, isAlive] of pingResults) {
    console.log(`  ${name}: ${isAlive ? '✅ Connected' : '❌ Failed'}`);
  }
  console.log('');

  // Получить первую доступную биржу для примеров
  const exchangeName = manager.getExchangeNames()[0];
  if (!exchangeName) {
    console.error('❌ No exchanges available');
    process.exit(1);
  }

  const exchange = manager.getExchange(exchangeName);
  if (!exchange) {
    console.error(`❌ Exchange ${exchangeName} not found`);
    process.exit(1);
  }

  console.log(`📈 Using ${exchangeName} for examples\n`);

  // Пример 1: Получить тикер
  console.log('📊 Example 1: Get Ticker');
  try {
    const ticker = await exchange.getTicker('BTCUSDT');
    console.log(`  Symbol: ${ticker.symbol}`);
    console.log(`  Last Price: $${ticker.lastPrice.toFixed(2)}`);
    console.log(`  Bid: $${ticker.bidPrice.toFixed(2)}`);
    console.log(`  Ask: $${ticker.askPrice.toFixed(2)}`);
    console.log(`  24h Change: ${ticker.priceChange24h.toFixed(2)}%`);
    console.log(`  24h Volume: ${ticker.volume24h.toFixed(2)}`);
    console.log(`  24h High: $${ticker.high24h.toFixed(2)}`);
    console.log(`  24h Low: $${ticker.low24h.toFixed(2)}`);
  } catch (error) {
    console.error(`  ❌ Error: ${(error as Error).message}`);
  }
  console.log('');

  // Пример 2: Получить свечи
  console.log('📊 Example 2: Get Candles (last 5 1-hour candles)');
  try {
    const candles = await exchange.getCandles('BTCUSDT', '1h', 5);
    console.log(`  Retrieved ${candles.length} candles:`);
    for (const candle of candles) {
      const time = new Date(candle.timestamp).toLocaleString();
      console.log(
        `  [${time}] O: $${candle.open.toFixed(2)}, H: $${candle.high.toFixed(2)}, L: $${candle.low.toFixed(2)}, C: $${candle.close.toFixed(2)}, V: ${candle.volume.toFixed(2)}`
      );
    }
  } catch (error) {
    console.error(`  ❌ Error: ${(error as Error).message}`);
  }
  console.log('');

  // Пример 3: Получить order book
  console.log('📊 Example 3: Get Order Book (top 5 levels)');
  try {
    const orderBook = await exchange.getOrderBook('BTCUSDT', 5);
    console.log(`  Symbol: ${orderBook.symbol}`);
    console.log('  Asks (sellers):');
    orderBook.asks.forEach((ask) => {
      console.log(`    $${ask.price.toFixed(2)} × ${ask.quantity.toFixed(4)}`);
    });
    console.log('  Bids (buyers):');
    orderBook.bids.forEach((bid) => {
      console.log(`    $${bid.price.toFixed(2)} × ${bid.quantity.toFixed(4)}`);
    });
    const spread = orderBook.asks[0]!.price - orderBook.bids[0]!.price;
    console.log(`  Spread: $${spread.toFixed(2)}`);
  } catch (error) {
    console.error(`  ❌ Error: ${(error as Error).message}`);
  }
  console.log('');

  // Пример 4: Получить недавние сделки
  console.log('📊 Example 4: Get Recent Trades (last 5)');
  try {
    const trades = await exchange.getTrades('BTCUSDT', { limit: 5 });
    console.log(`  Retrieved ${trades.length} trades:`);
    for (const trade of trades) {
      const time = new Date(trade.timestamp).toLocaleString();
      console.log(
        `  [${time}] ${trade.side} ${trade.quantity.toFixed(4)} @ $${trade.price.toFixed(2)}`
      );
    }
  } catch (error) {
    console.error(`  ❌ Error: ${(error as Error).message}`);
  }
  console.log('');

  // Пример 5: Сравнение цен на разных биржах
  if (manager.getExchangeNames().length > 1) {
    console.log('📊 Example 5: Compare Prices Across Exchanges');
    try {
      const tickers = await manager.getTickerFromMultiple('BTCUSDT');
      console.log('  BTC/USDT prices:');
      for (const [name, ticker] of tickers) {
        console.log(`    ${name}: $${ticker.lastPrice.toFixed(2)}`);
      }

      const bestBid = await manager.findBestBidPrice('BTCUSDT');
      const bestAsk = await manager.findBestAskPrice('BTCUSDT');

      if (bestBid && bestAsk) {
        console.log(`  Best Bid: ${bestBid.exchange} at $${bestBid.price.toFixed(2)}`);
        console.log(`  Best Ask: ${bestAsk.exchange} at $${bestAsk.price.toFixed(2)}`);

        if (bestBid.exchange !== bestAsk.exchange) {
          const spread = bestBid.price - bestAsk.price;
          console.log(`  Arbitrage opportunity: $${spread.toFixed(2)}`);
        }
      }
    } catch (error) {
      console.error(`  ❌ Error: ${(error as Error).message}`);
    }
    console.log('');
  }

  // Пример 6: Получить баланс (требует API ключи с правами на чтение)
  console.log('📊 Example 6: Get Balance');
  try {
    const balance = await exchange.getBalance();
    console.log(`  Retrieved balance for ${balance.length} assets:`);

    const significantBalance = balance.filter((b) => b.total > 0.01);
    if (significantBalance.length > 0) {
      for (const asset of significantBalance.slice(0, 10)) {
        console.log(`  ${asset.asset}:`);
        console.log(`    Free: ${asset.free.toFixed(4)}`);
        console.log(`    Locked: ${asset.locked.toFixed(4)}`);
        console.log(`    Total: ${asset.total.toFixed(4)}`);
      }
    } else {
      console.log('  No significant balances found (all < 0.01)');
    }
  } catch (error) {
    console.error(`  ❌ Error: ${(error as Error).message}`);
    console.log('  Note: Balance requires valid API credentials');
  }
  console.log('');

  // Пример 7: WebSocket real-time ticker (запустится на 10 секунд)
  console.log('📊 Example 7: WebSocket Real-time Ticker (10 seconds)');
  try {
    let tickerCount = 0;
    exchange.subscribeToTicker('BTCUSDT', (ticker) => {
      tickerCount++;
      if (tickerCount <= 5) {
        // Показать только первые 5 обновлений
        const time = new Date(ticker.timestamp).toLocaleString();
        console.log(`  [${time}] BTC: $${ticker.lastPrice.toFixed(2)}`);
      }
    });

    console.log('  Listening to ticker updates...');

    // Подождать 10 секунд
    await new Promise((resolve) => setTimeout(resolve, 10000));

    exchange.unsubscribeAll();
    console.log(`  Received ${tickerCount} ticker updates`);
  } catch (error) {
    console.error(`  ❌ Error: ${(error as Error).message}`);
  }
  console.log('');

  // Пример 8: Rate limit информация
  console.log('📊 Example 8: Rate Limit Information');
  const limits = exchange.getLimits();
  console.log(`  Exchange: ${limits.exchange}`);
  console.log(`  Requests per minute: ${limits.requestsPerMinute}`);
  console.log(`  Orders per second: ${limits.ordersPerSecond}`);
  console.log(`  Current requests: ${limits.currentRequests}`);
  console.log(`  Reset in: ${(limits.resetTime / 1000).toFixed(2)}s`);
  console.log('');

  // Отписаться от всех WebSocket подписок
  manager.unsubscribeAll();

  console.log('✅ Example completed successfully!');
  console.log('\n💡 Tips:');
  console.log('  - Set EXCHANGE_LOGGING=true to see detailed logs');
  console.log('  - Use testnet for testing: BINANCE_TESTNET=true');
  console.log('  - Encrypt your API keys with generateMasterKey()');
  console.log('\n⚠️  Remember: Never commit your API keys to version control!');
}

// Запустить пример
main().catch((error: Error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
