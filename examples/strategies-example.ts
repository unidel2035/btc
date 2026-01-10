/**
 * Пример использования торговых стратегий
 */

import {
  NewsMomentumStrategy,
  SentimentSwingStrategy,
  PriceChannelStrategy,
  StrategyManager,
  CombinationMode,
  type MarketData,
  type Signal,
  SignalType,
  SignalSentiment,
} from '../src/trading/strategies/index.js';

// Создание тестовых рыночных данных
const marketData: MarketData = {
  symbol: 'BTC/USDT',
  price: 50000,
  volume: 1500000,
  timestamp: new Date(),
  ohlc: {
    open: 49800,
    high: 50200,
    low: 49500,
    close: 50000,
  },
  volatility: 0.15, // 15% волатильности
};

// Создание тестовых сигналов
const signals: Signal[] = [
  {
    id: 'signal-1',
    type: 'news' as SignalType,
    sentiment: 'bullish' as SignalSentiment,
    impact: 0.85,
    source: 'CoinDesk',
    timestamp: new Date(Date.now() - 30 * 1000), // 30 секунд назад
    data: {
      title: 'Major institution announces Bitcoin adoption',
    },
  },
  {
    id: 'signal-2',
    type: 'news' as SignalType,
    sentiment: 'bullish' as SignalSentiment,
    impact: 0.78,
    source: 'CoinTelegraph',
    timestamp: new Date(Date.now() - 45 * 1000), // 45 секунд назад
    data: {
      title: 'Bitcoin ETF sees record inflows',
    },
  },
  {
    id: 'signal-3',
    type: 'sentiment' as SignalType,
    sentiment: 'bullish' as SignalSentiment,
    impact: 0.65,
    source: 'Twitter Sentiment Analysis',
    timestamp: new Date(Date.now() - 300 * 1000), // 5 минут назад
    data: {
      positive_count: 1250,
      total_count: 1500,
    },
  },
];

console.log('═══════════════════════════════════════════════════════');
console.log('     TRADING STRATEGIES DEMO');
console.log('═══════════════════════════════════════════════════════\n');

// ========================================
// Пример 1: News Momentum Strategy
// ========================================
console.log('📰 Example 1: News Momentum Strategy');
console.log('─────────────────────────────────────────────────────\n');

const newsStrategy = new NewsMomentumStrategy({
  impactThreshold: 0.7,
  reactionTimeSeconds: 60,
  exitTimeSeconds: 3600, // 1 час
});

console.log('Market Data:');
console.log(`  Symbol: ${marketData.symbol}`);
console.log(`  Price: $${marketData.price.toLocaleString()}`);
console.log(`  Volatility: ${((marketData.volatility ?? 0) * 100).toFixed(1)}%\n`);

console.log('Signals:');
signals.forEach((signal, i) => {
  console.log(`  ${i + 1}. ${signal.type} (${signal.sentiment})`);
  console.log(`     Impact: ${signal.impact}, Source: ${signal.source}`);
});

const decision1 = newsStrategy.analyze(marketData, signals);

console.log('\nDecision:');
if (decision1) {
  console.log(`  ✅ Trade Signal Generated!`);
  console.log(`  Direction: ${decision1.direction.toUpperCase()}`);
  console.log(`  Confidence: ${(decision1.confidence * 100).toFixed(1)}%`);
  console.log(`  Position Size: ${decision1.positionSize.toFixed(2)}% of capital`);
  console.log(`  Entry Price: $${decision1.entryPrice.toLocaleString()}`);
  console.log(`  Stop Loss: $${decision1.stopLoss?.toLocaleString()}`);
  console.log(`  Take Profit: $${decision1.takeProfit?.toLocaleString()}`);
  console.log(`  Timeframe: ${decision1.timeframe ? (decision1.timeframe / 60).toFixed(0) : 'N/A'} minutes`);
  console.log(`  Reason: ${decision1.reason}`);
} else {
  console.log('  ❌ No trade decision (criteria not met)');
}

console.log('\nStrategy Statistics:');
const stats1 = newsStrategy.getStats();
console.log(`  Total Signals: ${stats1.totalSignals}`);
console.log(`  Total Trades: ${stats1.totalTrades}`);
console.log(`  Last Executed: ${stats1.lastExecuted?.toISOString() || 'Never'}`);

// ========================================
// Пример 2: Sentiment Swing Strategy
// ========================================
console.log('\n\n📊 Example 2: Sentiment Swing Strategy');
console.log('─────────────────────────────────────────────────────\n');

const sentimentStrategy = new SentimentSwingStrategy({
  aggregationPeriodHours: 4,
  trendThreshold: 0.6,
  reversalDetection: true,
  continuationDetection: true,
  holdingPeriodHours: 24,
});

console.log('First Analysis (building history)...');
sentimentStrategy.analyze(marketData, signals);

console.log('Second Analysis (trend detection)...');
const decision2 = sentimentStrategy.analyze(marketData, signals);

console.log('\nDecision:');
if (decision2) {
  console.log(`  ✅ Trade Signal Generated!`);
  console.log(`  Direction: ${decision2.direction.toUpperCase()}`);
  console.log(`  Confidence: ${(decision2.confidence * 100).toFixed(1)}%`);
  console.log(`  Position Size: ${decision2.positionSize.toFixed(2)}% of capital`);
  console.log(`  Entry Price: $${decision2.entryPrice.toLocaleString()}`);
  console.log(`  Stop Loss: $${decision2.stopLoss?.toLocaleString()}`);
  console.log(`  Take Profit: $${decision2.takeProfit?.toLocaleString()}`);
  console.log(`  Timeframe: ${decision2.timeframe ? (decision2.timeframe / 3600).toFixed(0) : 'N/A'} hours`);
  console.log(`  Reason: ${decision2.reason}`);
} else {
  console.log('  ℹ️  No trade decision yet (building trend history)');
}

console.log('\nSentiment History:');
const history = sentimentStrategy.getHistory();
history.forEach((h, i) => {
  console.log(`  Period ${i + 1}:`);
  console.log(`    Bullish: ${h.bullishCount}, Bearish: ${h.bearishCount}, Neutral: ${h.neutralCount}`);
  console.log(`    Trend: ${h.trend}, Avg Impact: ${h.avgImpact.toFixed(2)}`);
});

// ========================================
// Пример 3: Strategy Manager
// ========================================
console.log('\n\n🎯 Example 3: Strategy Manager (Combined Strategies)');
console.log('─────────────────────────────────────────────────────\n');

const manager = new StrategyManager({
  mode: CombinationMode.BEST_CONFIDENCE,
});

manager.addStrategy(newsStrategy);
manager.addStrategy(sentimentStrategy);

console.log('Registered Strategies:');
manager.getAllStrategies().forEach((s) => {
  console.log(`  - ${s.name}: ${s.description}`);
});

console.log('\nAnalyzing with combined strategies...');
const combinedDecision = manager.analyze(marketData, signals);

console.log('\nCombined Decision:');
if (combinedDecision) {
  console.log(`  ✅ Trade Signal Generated!`);
  console.log(`  Direction: ${combinedDecision.direction.toUpperCase()}`);
  console.log(`  Confidence: ${(combinedDecision.confidence * 100).toFixed(1)}%`);
  console.log(`  Position Size: ${combinedDecision.positionSize.toFixed(2)}% of capital`);
  console.log(`  Entry Price: $${combinedDecision.entryPrice.toLocaleString()}`);
  console.log(`  Reason: ${combinedDecision.reason}`);
  console.log(`  Based on ${combinedDecision.signals.length} signals`);
} else {
  console.log('  ❌ No trade decision from combined strategies');
}

console.log('\nCombined Statistics:');
const allStats = manager.getStats();
for (const [name, stats] of allStats) {
  console.log(`  ${name}:`);
  console.log(`    Signals: ${stats.totalSignals}, Trades: ${stats.totalTrades}`);
}

// ========================================
// Пример 4: Price Channel Strategy
// ========================================
console.log('\n\n📈 Example 4: Price Channel Breakout Strategy');
console.log('─────────────────────────────────────────────────────\n');

const priceChannelStrategy = new PriceChannelStrategy({
  channelPeriod: 18,
  minChannelPercent: 0.5,
  maxChannelPercent: 3,
  breakoutThreshold: 0.1,
  requireSignalConfirmation: false,
});

console.log('Building price history...');
const basePrice = 50000;
const priceHistory = [
  50000, 50100, 50200, 50300, 50400, 50350, 50300, 50250, 50200, 50150,
  50100, 50050, 50000, 49950, 49900, 49950, 50000, 50050, 50100, 50150,
];

priceHistory.forEach((price, i) => {
  const historicalData: MarketData = {
    symbol: 'BTC/USDT',
    price,
    volume: 1000000,
    timestamp: new Date(Date.now() - (priceHistory.length - i) * 3600000), // 1 час назад за каждый период
    ohlc: {
      open: price - 50,
      high: price + 75,
      low: price - 75,
      close: price,
    },
  };
  priceChannelStrategy.analyze(historicalData, []);
});

const currentChannel = priceChannelStrategy.getCurrentChannel();
console.log('\nCurrent Price Channel:');
console.log(`  High: $${currentChannel?.high.toLocaleString()}`);
console.log(`  Low: $${currentChannel?.low.toLocaleString()}`);
console.log(`  Width: $${currentChannel?.width.toFixed(2)} (${currentChannel?.widthPercent.toFixed(2)}%)`);

// Симулируем пробой верхней границы
const breakoutPrice = (currentChannel?.high ?? 50400) + 50;
const breakoutData: MarketData = {
  symbol: 'BTC/USDT',
  price: breakoutPrice,
  volume: 2000000,
  timestamp: new Date(),
  volatility: 0.1,
};

console.log(`\nSimulating upper breakout at $${breakoutPrice.toLocaleString()}...`);
const decision4 = priceChannelStrategy.analyze(breakoutData, signals);

console.log('\nDecision:');
if (decision4) {
  console.log(`  ✅ Breakout Signal Generated!`);
  console.log(`  Direction: ${decision4.direction.toUpperCase()}`);
  console.log(`  Confidence: ${(decision4.confidence * 100).toFixed(1)}%`);
  console.log(`  Position Size: ${decision4.positionSize.toFixed(2)}% of capital`);
  console.log(`  Entry Price: $${decision4.entryPrice.toLocaleString()}`);
  console.log(`  Stop Loss: $${decision4.stopLoss?.toLocaleString()}`);
  console.log(`  Take Profit: $${decision4.takeProfit?.toLocaleString()}`);
  console.log(`  Reason: ${decision4.reason}`);
} else {
  console.log('  ℹ️  No breakout detected (price within channel or channel invalid)');
}

// ========================================
// Пример 5: Обновление параметров
// ========================================
console.log('\n\n⚙️  Example 5: Dynamic Parameter Updates');
console.log('─────────────────────────────────────────────────────\n');

console.log('Original Parameters:');
const origParams = newsStrategy.getParameters();
console.log(`  Min Impact: ${origParams.minImpact}`);
console.log(`  Stop Loss: ${origParams.stopLossPercent}%`);
console.log(`  Take Profit: ${origParams.takeProfitPercent}%`);

console.log('\nUpdating parameters...');
newsStrategy.updateParameters({
  minImpact: 0.6,
  stopLossPercent: 1.5,
  takeProfitPercent: 6,
});

const newParams = newsStrategy.getParameters();
console.log('\nUpdated Parameters:');
console.log(`  Min Impact: ${newParams.minImpact}`);
console.log(`  Stop Loss: ${newParams.stopLossPercent}%`);
console.log(`  Take Profit: ${newParams.takeProfitPercent}%`);

console.log('\n═══════════════════════════════════════════════════════');
console.log('     DEMO COMPLETED');
console.log('═══════════════════════════════════════════════════════\n');
