/**
 * Пример использования интеграции с криптобиржами
 */

import {
  ExchangeManager,
  getBinanceConfig,
  getBybitConfig,
  logActiveConfigs,
  MarketType,
  CandleInterval,
  OrderType,
  OrderSide,
  TimeInForce,
  ExchangeName,
} from '../src/exchanges/index.js';

/**
 * Пример получения рыночных данных
 */
async function marketDataExample(manager: ExchangeManager): Promise<void> {
  console.log('\n📊 Market Data Example\n');
  console.log('═'.repeat(60));

  // Получаем биржу Binance Spot
  const binance = manager.getExchange(ExchangeName.BINANCE, MarketType.SPOT);

  if (!binance) {
    console.error('❌ Binance exchange not found');
    return;
  }

  try {
    // 1. Получение свечей (OHLCV)
    console.log('\n📈 Getting BTC/USDT candles...');
    const candles = await binance.getCandles('BTCUSDT', CandleInterval.ONE_HOUR, 10);
    console.log(`✅ Fetched ${candles.length} candles`);
    console.log('Latest candle:', {
      timestamp: new Date(candles[candles.length - 1].timestamp),
      open: candles[candles.length - 1].open,
      high: candles[candles.length - 1].high,
      low: candles[candles.length - 1].low,
      close: candles[candles.length - 1].close,
      volume: candles[candles.length - 1].volume,
    });

    // 2. Получение текущей цены (ticker)
    console.log('\n💰 Getting BTC/USDT ticker...');
    const ticker = await binance.getTicker('BTCUSDT');
    console.log('✅ Current price:', {
      last: ticker.last,
      bid: ticker.bid,
      ask: ticker.ask,
      volume24h: ticker.volume24h,
      change24h: ticker.changePercent24h.toFixed(2) + '%',
    });

    // 3. Получение order book (стакан)
    console.log('\n📚 Getting order book...');
    const orderBook = await binance.getOrderBook('BTCUSDT', 5);
    console.log('✅ Order book depth:', {
      bidsCount: orderBook.bids.length,
      asksCount: orderBook.asks.length,
      topBid: orderBook.bids[0],
      topAsk: orderBook.asks[0],
    });

    // 4. Получение последних сделок
    console.log('\n📝 Getting recent trades...');
    const trades = await binance.getRecentTrades('BTCUSDT', 5);
    console.log(`✅ Fetched ${trades.length} recent trades`);
    console.log('Latest trade:', trades[0]);
  } catch (error) {
    console.error('❌ Market data example failed:', error);
  }
}

/**
 * Пример получения информации об аккаунте
 */
async function accountInfoExample(manager: ExchangeManager): Promise<void> {
  console.log('\n💼 Account Info Example\n');
  console.log('═'.repeat(60));

  const binance = manager.getExchange(ExchangeName.BINANCE, MarketType.SPOT);

  if (!binance) {
    console.error('❌ Binance exchange not found');
    return;
  }

  try {
    // Получение баланса
    console.log('\n💰 Getting account balance...');
    const balances = await binance.getBalance();

    // Фильтруем балансы с ненулевым значением
    const nonZeroBalances = balances.filter((b) => b.total > 0);

    console.log(`✅ Account has ${nonZeroBalances.length} assets with non-zero balance`);

    for (const balance of nonZeroBalances.slice(0, 5)) {
      console.log(`   ${balance.asset}: ${balance.total} (free: ${balance.free}, locked: ${balance.locked})`);
    }

    // Получение баланса конкретного актива
    console.log('\n💵 Getting USDT balance...');
    const usdtBalance = await binance.getAssetBalance('USDT');

    if (usdtBalance) {
      console.log('✅ USDT Balance:', usdtBalance);
    } else {
      console.log('⚠️  No USDT balance found');
    }
  } catch (error) {
    console.error('❌ Account info example failed:', error);
  }
}

/**
 * Пример работы с ордерами (ТОЛЬКО ДЛЯ TESTNET!)
 */
async function tradingExample(manager: ExchangeManager): Promise<void> {
  console.log('\n📝 Trading Example (Testnet Only)\n');
  console.log('═'.repeat(60));

  const binance = manager.getExchange(ExchangeName.BINANCE, MarketType.SPOT);

  if (!binance) {
    console.error('❌ Binance exchange not found');
    return;
  }

  // ВАЖНО: Проверяем, что мы в testnet
  const exchangeInfo = binance.getExchangeInfo();
  if (!exchangeInfo.testnet) {
    console.warn('⚠️  Skipping trading example - not in testnet mode');
    console.warn('   To enable, set BINANCE_TESTNET=true in .env');
    return;
  }

  try {
    console.log('\n🧪 Running in TESTNET mode - safe to test orders\n');

    // Получаем текущую цену
    const ticker = await binance.getTicker('BTCUSDT');
    console.log(`Current BTC/USDT price: ${ticker.last}`);

    // Пример лимитного ордера на покупку (ниже рыночной цены)
    const buyPrice = ticker.last * 0.95; // 5% ниже рынка
    console.log(`\n📥 Placing limit BUY order at ${buyPrice.toFixed(2)}...`);

    const order = await binance.placeOrder({
      symbol: 'BTCUSDT',
      type: OrderType.LIMIT,
      side: OrderSide.BUY,
      quantity: 0.001,
      price: buyPrice,
      timeInForce: TimeInForce.GTC,
    });

    console.log('✅ Order placed:', {
      id: order.id,
      status: order.status,
      type: order.type,
      side: order.side,
      price: order.price,
      quantity: order.quantity,
    });

    // Получение информации об ордере
    console.log('\n🔍 Getting order info...');
    const orderInfo = await binance.getOrder('BTCUSDT', order.id);
    console.log('✅ Order info:', orderInfo.status);

    // Получение открытых ордеров
    console.log('\n📋 Getting open orders...');
    const openOrders = await binance.getOpenOrders('BTCUSDT');
    console.log(`✅ Found ${openOrders.length} open orders`);

    // Отмена ордера
    console.log(`\n❌ Cancelling order ${order.id}...`);
    const cancelResult = await binance.cancelOrder('BTCUSDT', order.id);

    if (cancelResult.success) {
      console.log('✅ Order cancelled successfully');
    } else {
      console.error('❌ Failed to cancel order:', cancelResult.error);
    }
  } catch (error) {
    console.error('❌ Trading example failed:', error);
  }
}

/**
 * Пример работы с фьючерсами
 */
async function futuresExample(manager: ExchangeManager): Promise<void> {
  console.log('\n🔮 Futures Example\n');
  console.log('═'.repeat(60));

  const binanceFutures = manager.getExchange(ExchangeName.BINANCE, MarketType.FUTURES);

  if (!binanceFutures) {
    console.error('❌ Binance Futures exchange not found');
    return;
  }

  try {
    // Получение текущей цены
    console.log('\n💰 Getting BTC/USDT perpetual ticker...');
    const ticker = await binanceFutures.getTicker('BTCUSDT');
    console.log('✅ Current perpetual price:', ticker.last);

    // Получение позиций
    console.log('\n📊 Getting open positions...');
    const positions = await binanceFutures.getPositions();

    if (positions.length > 0) {
      console.log(`✅ Found ${positions.length} open positions`);
      for (const pos of positions) {
        console.log(`   ${pos.symbol}: ${pos.side} ${pos.size} @ ${pos.entryPrice}`);
        console.log(`   Unrealized PnL: ${pos.unrealizedPnl}`);
      }
    } else {
      console.log('⚠️  No open positions');
    }

    // Пример изменения плеча (только для testnet)
    const exchangeInfo = binanceFutures.getExchangeInfo();
    if (exchangeInfo.testnet) {
      console.log('\n⚙️  Setting leverage to 10x...');
      const leverageResult = await binanceFutures.setLeverage('BTCUSDT', 10);

      if (leverageResult.success) {
        console.log('✅ Leverage set successfully');
      } else {
        console.error('❌ Failed to set leverage:', leverageResult.error);
      }
    }
  } catch (error) {
    console.error('❌ Futures example failed:', error);
  }
}

/**
 * Пример работы с несколькими биржами
 */
async function multiExchangeExample(manager: ExchangeManager): Promise<void> {
  console.log('\n🌐 Multi-Exchange Example\n');
  console.log('═'.repeat(60));

  const exchanges = manager.getAllExchanges();

  console.log(`\n📊 Comparing BTC/USDT prices across ${exchanges.length} exchanges:\n`);

  for (const exchange of exchanges) {
    try {
      const ticker = await exchange.getTicker('BTCUSDT');
      const info = exchange.getExchangeInfo();

      console.log(`${info.name.toUpperCase()} (${info.marketType}):`);
      console.log(`   Price: ${ticker.last}`);
      console.log(`   24h Volume: ${ticker.volume24h}`);
      console.log(`   24h Change: ${ticker.changePercent24h.toFixed(2)}%`);
      console.log('');
    } catch (error) {
      console.error(`❌ Failed to get ticker from ${exchange.getName()}:`, error);
    }
  }
}

/**
 * Главная функция
 */
async function main(): Promise<void> {
  console.log('\n🚀 Exchange Integration Example\n');
  console.log('═'.repeat(60));

  // Показываем активные конфигурации
  logActiveConfigs();

  // Создаем менеджер бирж
  const manager = new ExchangeManager();

  try {
    // Добавляем биржи
    console.log('\n📊 Adding exchanges...\n');

    // Binance Spot
    const binanceConfig = getBinanceConfig();
    if (binanceConfig.apiKey && binanceConfig.apiSecret) {
      manager.addExchange(binanceConfig, MarketType.SPOT);
      console.log('✅ Added Binance Spot');

      // Binance Futures
      manager.addExchange(binanceConfig, MarketType.FUTURES);
      console.log('✅ Added Binance Futures');
    }

    // Bybit Spot
    const bybitConfig = getBybitConfig();
    if (bybitConfig.apiKey && bybitConfig.apiSecret) {
      manager.addExchange(bybitConfig, MarketType.SPOT);
      console.log('✅ Added Bybit Spot');

      // Bybit Futures
      manager.addExchange(bybitConfig, MarketType.FUTURES);
      console.log('✅ Added Bybit Futures');
    }

    // Инициализация (проверка подключения)
    console.log('\n🔌 Initializing exchanges...\n');
    await manager.initialize();

    // Показываем статистику
    const stats = manager.getStats();
    console.log('\n📊 Manager Stats:', stats);

    // Запускаем примеры
    await marketDataExample(manager);
    await accountInfoExample(manager);
    await tradingExample(manager);
    await futuresExample(manager);
    await multiExchangeExample(manager);

    console.log('\n═'.repeat(60));
    console.log('✅ All examples completed!\n');
  } catch (error) {
    console.error('\n❌ Example failed:', error);
  } finally {
    // Очистка ресурсов
    console.log('\n🧹 Cleaning up...');
    await manager.cleanup();
    console.log('✅ Cleanup completed\n');
  }
}

// Запуск примера
main().catch(console.error);
