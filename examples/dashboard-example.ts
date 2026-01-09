/**
 * Dashboard Usage Example
 * Пример использования веб-интерфейса dashboard
 */

import { storage } from '../src/dashboard/storage.js';

console.log('🎯 Dashboard Usage Example\n');

// 1. Добавление позиции
console.log('📊 1. Adding a position...');
const position = storage.addPosition({
  symbol: 'BTC/USDT',
  side: 'LONG',
  size: 0.5,
  entryPrice: 50000,
  currentPrice: 51000,
  stopLoss: 49000,
  takeProfit: 52500,
  pnl: 500,
  pnlPercent: 2.0,
});
console.log('   Position ID:', position.id);
console.log('   Symbol:', position.symbol);
console.log('   PnL:', position.pnl);

// 2. Обновление позиции
console.log('\n📈 2. Updating position price...');
const updated = storage.updatePosition(position.id, {
  currentPrice: 52000,
  pnl: 1000,
  pnlPercent: 4.0,
});
console.log('   New price:', updated?.currentPrice);
console.log('   New PnL:', updated?.pnl);

// 3. Добавление сигнала
console.log('\n📡 3. Adding a trading signal...');
const signal = storage.addSignal({
  type: 'NEWS_MOMENTUM',
  source: 'Example Strategy',
  symbol: 'BTC/USDT',
  action: 'BUY',
  strength: 85,
  confidence: 0.9,
  price: 50000,
  reason: 'Strong bullish news detected with high volume',
});
console.log('   Signal ID:', signal.id);
console.log('   Action:', signal.action);
console.log('   Confidence:', signal.confidence);

// 4. Добавление новости
console.log('\n📰 4. Adding news item...');
const news = storage.addNews({
  title: 'Bitcoin Reaches New All-Time High',
  content: 'Bitcoin has surged to a new all-time high of $100,000, driven by institutional adoption and positive regulatory developments.',
  source: 'CoinDesk',
  url: 'https://example.com/news/btc-ath',
  sentiment: 'POSITIVE',
  sentimentScore: 0.95,
  publishedAt: new Date().toISOString(),
});
console.log('   News ID:', news.id);
console.log('   Title:', news.title);
console.log('   Sentiment:', news.sentiment);

// 5. Получение метрик
console.log('\n📊 5. Getting current metrics...');
const metrics = storage.getMetrics();
console.log('   Balance:', metrics.balance);
console.log('   Equity:', metrics.equity);
console.log('   PnL:', metrics.pnl, `(${metrics.pnlPercent.toFixed(2)}%)`);
console.log('   Open Positions:', metrics.openPositions);
console.log('   Total Trades:', metrics.totalTrades);
console.log('   Win Rate:', metrics.winRate.toFixed(2) + '%');

// 6. Закрытие позиции
console.log('\n💰 6. Closing position...');
const trade = storage.closePosition(position.id, 52000, 'Target reached');
console.log('   Trade closed!');
console.log('   Entry Price:', trade?.entryPrice);
console.log('   Exit Price:', trade?.exitPrice);
console.log('   PnL:', trade?.pnl);
console.log('   Closed At:', trade?.closedAt);

// 7. Получение истории сделок
console.log('\n📜 7. Getting trade history...');
const history = storage.getTradeHistory(10);
console.log('   Total trades in history:', history.length);
if (history.length > 0) {
  console.log('   Latest trade:', {
    symbol: history[0].symbol,
    pnl: history[0].pnl,
    pnlPercent: history[0].pnlPercent.toFixed(2) + '%',
  });
}

// 8. Получение статистики производительности
console.log('\n📈 8. Getting performance stats...');
const stats = storage.getPerformanceStats();
console.log('   Total Trades:', stats.totalTrades);
console.log('   Winning Trades:', stats.winningTrades);
console.log('   Losing Trades:', stats.losingTrades);
console.log('   Win Rate:', stats.winRate.toFixed(2) + '%');
console.log('   Average Win:', stats.averageWin);
console.log('   Average Loss:', stats.averageLoss);
console.log('   Profit Factor:', stats.profitFactor.toFixed(2));
console.log('   Sharpe Ratio:', stats.sharpeRatio.toFixed(2));
console.log('   Max Drawdown:', stats.maxDrawdown.toFixed(2) + '%');

// 9. Конфигурация стратегий
console.log('\n⚙️ 9. Strategy configuration...');
const strategies = storage.getAllStrategyConfigs();
console.log('   Available strategies:', strategies.length);
strategies.forEach((strategy) => {
  console.log(`   - ${strategy.name}: ${strategy.enabled ? 'Enabled' : 'Disabled'}`);
  console.log(`     Risk per trade: ${strategy.riskPerTrade}%`);
  console.log(`     Max positions: ${strategy.maxPositions}`);
});

// 10. Риск конфигурация
console.log('\n🛡️ 10. Risk configuration...');
const riskConfig = storage.getRiskConfig();
console.log('   Max Position Size:', riskConfig.maxPositionSize + '%');
console.log('   Max Positions:', riskConfig.maxPositions);
console.log('   Max Daily Loss:', riskConfig.maxDailyLoss + '%');
console.log('   Max Total Drawdown:', riskConfig.maxTotalDrawdown + '%');
console.log('   Default Stop Loss:', riskConfig.defaultStopLoss + '%');
console.log('   Default Take Profit:', riskConfig.defaultTakeProfit + '%');
console.log('   Trailing Stop:', riskConfig.trailingStop ? 'Enabled' : 'Disabled');

// 11. Обновление риск конфигурации
console.log('\n🔧 11. Updating risk configuration...');
const updatedRisk = storage.updateRiskConfig({
  maxPositions: 10,
  maxDailyLoss: 3,
});
console.log('   Updated Max Positions:', updatedRisk.maxPositions);
console.log('   Updated Max Daily Loss:', updatedRisk.maxDailyLoss + '%');

// 12. Добавление equity точки
console.log('\n💹 12. Adding equity point...');
storage.addEquityPoint();
const equityHistory = storage.getEquityHistory(10);
console.log('   Equity history points:', equityHistory.length);
if (equityHistory.length > 0) {
  const latest = equityHistory[equityHistory.length - 1];
  console.log('   Latest equity:', latest.equity);
  console.log('   Latest balance:', latest.balance);
}

console.log('\n✅ Example completed!');
console.log('\n💡 To see the dashboard in action:');
console.log('   1. Run: npm run dashboard');
console.log('   2. Open: http://localhost:8080');
console.log('   3. Explore all pages and real-time updates!');
