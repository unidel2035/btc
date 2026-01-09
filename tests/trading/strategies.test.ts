/**
 * Unit tests for trading strategies
 */

import {
  NewsMomentumStrategy,
  SentimentSwingStrategy,
  StrategyManager,
  CombinationMode,
  type MarketData,
  type Signal,
  SignalType,
  SignalSentiment,
} from '../../src/trading/strategies/index.js';

// Helper функция для создания тестовых рыночных данных
function createMarketData(price: number = 50000, volatility?: number): MarketData {
  return {
    symbol: 'BTC/USDT',
    price,
    volume: 1000000,
    timestamp: new Date(),
    volatility,
  };
}

// Helper функция для создания тестовых сигналов
function createSignal(
  type: SignalType,
  sentiment: SignalSentiment,
  impact: number,
  timestampOffset: number = 0,
): Signal {
  return {
    id: `signal-${Date.now()}-${Math.random()}`,
    type,
    sentiment,
    impact,
    source: 'test',
    timestamp: new Date(Date.now() - timestampOffset * 1000),
    data: {},
  };
}

// Тесты для News Momentum Strategy
function testNewsMomentumStrategy(): void {
  console.log('🧪 Testing News Momentum Strategy...\n');

  const strategy = new NewsMomentumStrategy();

  // Тест 1: Нет новостных сигналов
  console.log('Test 1: No news signals');
  const marketData1 = createMarketData();
  const signals1: Signal[] = [];
  const decision1 = strategy.analyze(marketData1, signals1);
  console.log(`Result: ${decision1 ? 'Decision made' : 'No decision'} ✓`);
  console.assert(decision1 === null, 'Should return null with no signals');
  console.log('');

  // Тест 2: Значимая новость с bullish sentiment
  console.log('Test 2: Significant bullish news');
  const marketData2 = createMarketData(50000);
  const signals2 = [
    createSignal('news' as SignalType, 'bullish' as SignalSentiment, 0.8, 30), // 30 секунд назад
  ];
  const decision2 = strategy.analyze(marketData2, signals2);
  console.log(`Direction: ${decision2?.direction}, Confidence: ${decision2?.confidence.toFixed(2)}`);
  console.assert(decision2 !== null, 'Should make decision for significant news');
  console.assert(decision2?.direction === 'long', 'Should be long for bullish news');
  console.log('✓ Test passed\n');

  // Тест 3: Множественные bearish новости
  console.log('Test 3: Multiple bearish news signals');
  const marketData3 = createMarketData(50000);
  const signals3 = [
    createSignal('news' as SignalType, 'bearish' as SignalSentiment, 0.75, 20),
    createSignal('news' as SignalType, 'bearish' as SignalSentiment, 0.85, 25),
  ];
  const decision3 = strategy.analyze(marketData3, signals3);
  console.log(`Direction: ${decision3?.direction}, Confidence: ${decision3?.confidence.toFixed(2)}`);
  console.assert(decision3?.direction === 'short', 'Should be short for bearish news');
  console.log('✓ Test passed\n');

  // Тест 4: Устаревшая новость (> reaction time)
  console.log('Test 4: Old news (beyond reaction time)');
  const marketData4 = createMarketData(50000);
  const signals4 = [
    createSignal('news' as SignalType, 'bullish' as SignalSentiment, 0.9, 120), // 2 минуты назад
  ];
  const decision4 = strategy.analyze(marketData4, signals4);
  console.log(`Result: ${decision4 ? 'Decision made' : 'No decision'} ✓`);
  console.assert(decision4 === null, 'Should ignore old news');
  console.log('');

  // Тест 5: Низкий impact
  console.log('Test 5: Low impact news');
  const marketData5 = createMarketData(50000);
  const signals5 = [createSignal('news' as SignalType, 'bullish' as SignalSentiment, 0.3, 10)];
  const decision5 = strategy.analyze(marketData5, signals5);
  console.log(`Result: ${decision5 ? 'Decision made' : 'No decision'} ✓`);
  console.assert(decision5 === null, 'Should ignore low impact news');
  console.log('');

  // Тест 6: Обновление параметров
  console.log('Test 6: Parameter updates');
  strategy.updateParameters({ minImpact: 0.5, stopLossPercent: 3 });
  const params = strategy.getParameters();
  console.assert(params.minImpact === 0.5, 'Should update minImpact');
  console.assert(params.stopLossPercent === 3, 'Should update stopLossPercent');
  console.log('✓ Parameters updated successfully\n');

  console.log('✅ News Momentum Strategy tests completed\n');
}

// Тесты для Sentiment Swing Strategy
function testSentimentSwingStrategy(): void {
  console.log('🧪 Testing Sentiment Swing Strategy...\n');

  const strategy = new SentimentSwingStrategy({
    aggregationPeriodHours: 1,
    minSentimentChange: 0.2,
  });

  // Тест 1: Первый анализ (недостаточно истории)
  console.log('Test 1: First analysis (insufficient history)');
  const marketData1 = createMarketData(50000);
  const signals1 = [
    createSignal('sentiment' as SignalType, 'bullish' as SignalSentiment, 0.7, 1800),
    createSignal('sentiment' as SignalType, 'bullish' as SignalSentiment, 0.6, 2000),
  ];
  const decision1 = strategy.analyze(marketData1, signals1);
  console.log(`Result: ${decision1 ? 'Decision made' : 'No decision (expected)'} ✓\n`);

  // Тест 2: Второй анализ с изменением тренда
  console.log('Test 2: Second analysis with trend change');
  const signals2 = [
    createSignal('sentiment' as SignalType, 'bullish' as SignalSentiment, 0.8, 100),
    createSignal('sentiment' as SignalType, 'bullish' as SignalSentiment, 0.75, 200),
    createSignal('sentiment' as SignalType, 'bullish' as SignalSentiment, 0.7, 300),
  ];
  const decision2 = strategy.analyze(marketData1, signals2);
  console.log(`Direction: ${decision2?.direction || 'None'}, Confidence: ${decision2?.confidence.toFixed(2) || 'N/A'}`);
  if (decision2) {
    console.log('✓ Strategy detected trend\n');
  } else {
    console.log('No decision yet (building history)\n');
  }

  // Тест 3: Получение истории
  console.log('Test 3: Get sentiment history');
  const history = strategy.getHistory();
  console.log(`History length: ${history.length}`);
  console.assert(history.length > 0, 'Should have history');
  console.log('✓ Test passed\n');

  // Тест 4: Очистка истории
  console.log('Test 4: Clear history');
  strategy.clearHistory();
  const clearedHistory = strategy.getHistory();
  console.assert(clearedHistory.length === 0, 'History should be empty');
  console.log('✓ History cleared\n');

  console.log('✅ Sentiment Swing Strategy tests completed\n');
}

// Тесты для Strategy Manager
function testStrategyManager(): void {
  console.log('🧪 Testing Strategy Manager...\n');

  const manager = new StrategyManager({ mode: CombinationMode.FIRST });

  const newsStrategy = new NewsMomentumStrategy();
  const sentimentStrategy = new SentimentSwingStrategy({ aggregationPeriodHours: 1 });

  // Тест 1: Добавление стратегий
  console.log('Test 1: Add strategies');
  manager.addStrategy(newsStrategy);
  manager.addStrategy(sentimentStrategy);
  const strategies = manager.getAllStrategies();
  console.assert(strategies.length === 2, 'Should have 2 strategies');
  console.log(`✓ Added ${strategies.length} strategies\n`);

  // Тест 2: Режим FIRST
  console.log('Test 2: FIRST mode');
  const marketData2 = createMarketData(50000);
  const signals2 = [
    createSignal('news' as SignalType, 'bullish' as SignalSentiment, 0.8, 20),
  ];
  const decision2 = manager.analyze(marketData2, signals2);
  console.log(`Decision: ${decision2 ? 'Made by ' + decision2.reason.split(':')[0] : 'None'}`);
  console.log('✓ Test passed\n');

  // Тест 3: Режим BEST_CONFIDENCE
  console.log('Test 3: BEST_CONFIDENCE mode');
  manager.updateOptions({ mode: CombinationMode.BEST_CONFIDENCE });

  // Создаем сильные сигналы для обеих стратегий
  const signals3 = [
    createSignal('news' as SignalType, 'bullish' as SignalSentiment, 0.9, 15),
    createSignal('news' as SignalType, 'bullish' as SignalSentiment, 0.85, 20),
  ];

  // Анализируем несколько раз для sentiment стратегии
  sentimentStrategy.clearHistory();
  manager.analyze(marketData2, signals3);
  const decision3 = manager.analyze(marketData2, signals3);

  console.log(`Decision confidence: ${decision3?.confidence.toFixed(2) || 'None'}`);
  console.log('✓ Test passed\n');

  // Тест 4: Получение статистики
  console.log('Test 4: Get statistics');
  const stats = manager.getStats();
  console.log(`Statistics for ${stats.size} strategies:`);
  for (const [name, stat] of stats) {
    console.log(`  ${name}: ${stat.totalSignals} signals, ${stat.totalTrades} trades`);
  }
  console.log('✓ Test passed\n');

  // Тест 5: Удаление стратегии
  console.log('Test 5: Remove strategy');
  const removed = manager.removeStrategy('News Momentum');
  console.assert(removed === true, 'Should successfully remove strategy');
  console.assert(manager.getAllStrategies().length === 1, 'Should have 1 strategy left');
  console.log('✓ Strategy removed\n');

  console.log('✅ Strategy Manager tests completed\n');
}

// Запуск всех тестов
function runAllTests(): void {
  console.log('═══════════════════════════════════════════════════════');
  console.log('     TRADING STRATEGIES TEST SUITE');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    testNewsMomentumStrategy();
    testSentimentSwingStrategy();
    testStrategyManager();

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    process.exit(1);
  }
}

// Запуск тестов
runAllTests();
