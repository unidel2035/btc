/**
 * Unit тесты для Price Channel Breakout Strategy
 */

import { PriceChannelStrategy } from './dist/trading/strategies/PriceChannelStrategy.js';

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║   PRICE CHANNEL STRATEGY - UNIT TESTS                    ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`   ✅ ${message}`);
    passedTests++;
  } else {
    console.log(`   ❌ ${message}`);
  }
}

// Test 1: Недостаточно истории
console.log('📋 Test 1: Insufficient Price History');
const strategy1 = new PriceChannelStrategy({
  channelPeriod: 18,
});

const marketData1 = {
  symbol: 'BTC/USDT',
  price: 50000,
  volume: 1000000,
  timestamp: new Date(),
};

// Добавляем только 5 периодов (меньше 18)
for (let i = 0; i < 5; i++) {
  strategy1.analyze(marketData1, []);
}

const decision1 = strategy1.analyze(marketData1, []);
assert(decision1 === null, 'No decision when history is insufficient');
console.log('');

// Test 2: Формирование канала
console.log('📋 Test 2: Channel Formation');
const strategy2 = new PriceChannelStrategy({
  channelPeriod: 18,
  minChannelPercent: 0.5,
  maxChannelPercent: 3,
});

const prices = [
  49900, 50000, 50100, 50200, 50300, 50400,
  50350, 50300, 50250, 50200, 50150, 50100,
  50050, 50000, 49950, 49900, 49950, 50000,
];

prices.forEach((price, i) => {
  const data = {
    symbol: 'BTC/USDT',
    price,
    volume: 1000000,
    timestamp: new Date(Date.now() - (prices.length - i) * 3600000),
    ohlc: {
      open: price - 25,
      high: price + 75,
      low: price - 75,
      close: price,
    },
  };
  strategy2.analyze(data, []);
});

const channel = strategy2.getCurrentChannel();
assert(channel !== null, 'Channel should be formed');
assert(channel.high > channel.low, 'Channel high should be greater than low');
assert(channel.width > 0, 'Channel width should be positive');
assert(channel.widthPercent > 0, 'Channel width percent should be positive');
console.log(`   ℹ️  Channel: [${channel.low.toFixed(2)}, ${channel.high.toFixed(2)}], width: ${channel.widthPercent.toFixed(2)}%`);
console.log('');

// Test 3: Пробой верхней границы (LONG)
console.log('📋 Test 3: Upper Breakout (LONG Signal)');
const upperBreakoutPrice = channel.high + (channel.width * 0.15);
const breakoutData = {
  symbol: 'BTC/USDT',
  price: upperBreakoutPrice,
  volume: 2000000,
  timestamp: new Date(),
  volatility: 0.12,
};

const decision3 = strategy2.analyze(breakoutData, []);
assert(decision3 !== null, 'Decision should be generated on breakout');
assert(decision3?.direction === 'long', 'Direction should be LONG for upper breakout');
assert(decision3?.confidence > 0, 'Confidence should be positive');
assert(decision3?.stopLoss !== undefined, 'Stop loss should be defined');
assert(decision3?.takeProfit !== undefined, 'Take profit should be defined');
console.log(`   ℹ️  Direction: ${decision3?.direction}, Confidence: ${(decision3?.confidence * 100).toFixed(1)}%`);
console.log('');

// Test 4: Пробой нижней границы (SHORT)
console.log('📋 Test 4: Lower Breakout (SHORT Signal)');
const strategy4 = new PriceChannelStrategy({
  channelPeriod: 18,
  minChannelPercent: 0.5,
  maxChannelPercent: 3,
});

// Снова накапливаем историю
prices.forEach((price, i) => {
  const data = {
    symbol: 'BTC/USDT',
    price,
    volume: 1000000,
    timestamp: new Date(Date.now() - (prices.length - i) * 3600000),
    ohlc: {
      open: price - 25,
      high: price + 75,
      low: price - 75,
      close: price,
    },
  };
  strategy4.analyze(data, []);
});

const channel4 = strategy4.getCurrentChannel();
const lowerBreakoutPrice = channel4.low - (channel4.width * 0.15);
const shortData = {
  symbol: 'BTC/USDT',
  price: lowerBreakoutPrice,
  volume: 2000000,
  timestamp: new Date(),
  volatility: 0.12,
};

const decision4 = strategy4.analyze(shortData, []);
assert(decision4 !== null, 'Decision should be generated on lower breakout');
assert(decision4?.direction === 'short', 'Direction should be SHORT for lower breakout');
assert(decision4?.confidence > 0, 'Confidence should be positive');
assert(decision4?.stopLoss !== undefined, 'Stop loss should be defined');
assert(decision4?.takeProfit !== undefined, 'Take profit should be defined');
console.log(`   ℹ️  Direction: ${decision4?.direction}, Confidence: ${(decision4?.confidence * 100).toFixed(1)}%`);
console.log('');

// Test 5: Требование подтверждения сигналом
console.log('📋 Test 5: Require Signal Confirmation');
const strategy5 = new PriceChannelStrategy({
  channelPeriod: 18,
  minChannelPercent: 0.5,
  maxChannelPercent: 3,
  requireSignalConfirmation: true,
});

// Накапливаем историю
prices.forEach((price, i) => {
  const data = {
    symbol: 'BTC/USDT',
    price,
    volume: 1000000,
    timestamp: new Date(Date.now() - (prices.length - i) * 3600000),
    ohlc: {
      open: price - 25,
      high: price + 75,
      low: price - 75,
      close: price,
    },
  };
  strategy5.analyze(data, []);
});

const channel5 = strategy5.getCurrentChannel();
const breakoutPrice5 = channel5.high + (channel5.width * 0.15);

// Без сигналов
const decision5a = strategy5.analyze({
  symbol: 'BTC/USDT',
  price: breakoutPrice5,
  volume: 2000000,
  timestamp: new Date(),
  volatility: 0.12,
}, []);

assert(decision5a === null, 'No decision without signals when confirmation required');

// С сигналами
const signals = [{
  id: 'signal-1',
  type: 'news',
  sentiment: 'bullish',
  impact: 0.85,
  source: 'test',
  timestamp: new Date(),
  data: {},
}];

const decision5b = strategy5.analyze({
  symbol: 'BTC/USDT',
  price: breakoutPrice5,
  volume: 2000000,
  timestamp: new Date(),
  volatility: 0.12,
}, signals);

assert(decision5b !== null, 'Decision should be generated with signals when confirmation required');
console.log('');

// Test 6: Очистка истории
console.log('📋 Test 6: Clear History');
const strategy6 = new PriceChannelStrategy({
  channelPeriod: 18,
});

// Накапливаем историю
for (let i = 0; i < 20; i++) {
  strategy6.analyze({
    symbol: 'BTC/USDT',
    price: 50000 + i * 10,
    volume: 1000000,
    timestamp: new Date(),
  }, []);
}

const channelBefore = strategy6.getCurrentChannel();
assert(channelBefore !== null, 'Channel should exist before clear');

strategy6.clearHistory();
const channelAfter = strategy6.getCurrentChannel();
assert(channelAfter === null, 'Channel should be null after clear');
console.log('');

// Test 7: Статистика
console.log('📋 Test 7: Statistics');
const stats = strategy2.getStats();
assert(typeof stats.totalSignals === 'number', 'Total signals should be a number');
assert(typeof stats.totalTrades === 'number', 'Total trades should be a number');
assert(stats.totalTrades > 0, 'Should have executed trades');
console.log(`   ℹ️  Total trades: ${stats.totalTrades}`);
console.log('');

// Test 8: Multiple Timeframes
console.log('📋 Test 8: Multiple Timeframes');
const strategy8 = new PriceChannelStrategy({
  channelPeriod: 18,
  useMultipleTimeframes: true,
});

// Накапливаем достаточно истории для всех таймфреймов (108 периодов)
for (let i = 0; i < 110; i++) {
  strategy8.analyze({
    symbol: 'BTC/USDT',
    price: 50000 + Math.sin(i / 10) * 500,
    volume: 1000000,
    timestamp: new Date(Date.now() - (110 - i) * 3600000),
    ohlc: {
      open: 50000,
      high: 50500,
      low: 49500,
      close: 50000,
    },
  }, []);
}

const channel8 = strategy8.getCurrentChannel();
assert(channel8 !== null, 'Channel should be formed with multiple timeframes');
console.log(`   ℹ️  Channel with multiple timeframes: [${channel8.low.toFixed(2)}, ${channel8.high.toFixed(2)}]`);
console.log('');

// Итоги
console.log('╔══════════════════════════════════════════════════════════╗');
console.log(`║   TEST RESULTS: ${passedTests}/${totalTests} PASSED${' '.repeat(28 - passedTests.toString().length - totalTests.toString().length)}║`);
console.log('╚══════════════════════════════════════════════════════════╝\n');

if (passedTests === totalTests) {
  console.log('✅ Все тесты пройдены успешно!\n');
  process.exit(0);
} else {
  console.log(`❌ Провалено тестов: ${totalTests - passedTests}\n`);
  process.exit(1);
}
