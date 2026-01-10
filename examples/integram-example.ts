/**
 * Integram Database Integration Example
 *
 * Пример использования Integram в качестве облачной базы данных
 */

import { config } from 'dotenv';
import { IntegramClient, IntegramStorage } from '../src/database/integram/index.js';

config();

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║      🗄️  Integram Integration Example         ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');

  // 1. Создаем клиент Integram
  const client = new IntegramClient({
    serverURL: process.env.INTEGRAM_URL || 'https://интеграм.рф',
    database: process.env.INTEGRAM_DATABASE || 'bts',
    login: process.env.INTEGRAM_LOGIN || 'd',
    password: process.env.INTEGRAM_PASSWORD || 'd',
  });

  console.log('📡 Connecting to Integram...');
  const info = client.getDatabaseInfo();
  console.log(`   Server: ${info.serverURL}`);
  console.log(`   Database: ${info.database}`);
  console.log(`   Login: ${info.login}`);
  console.log('');

  try {
    // 2. Аутентификация
    await client.authenticate();
    console.log('✅ Authentication successful');
    console.log('');

    // 3. Проверка подключения
    const isConnected = await client.ping();
    console.log(`🔌 Connection status: ${isConnected ? 'Connected' : 'Disconnected'}`);
    console.log('');

    // 4. Создаем IntegramStorage
    console.log('🗄️  Initializing IntegramStorage...');
    const storage = new IntegramStorage(client);
    await storage.initialize();
    console.log('✅ IntegramStorage initialized');
    console.log('');

    // 5. Демо: добавление позиции
    console.log('📊 Demo: Adding a position...');
    const position = await storage.addPosition({
      symbol: 'BTC/USDT',
      side: 'LONG',
      size: 0.1,
      entryPrice: 45000,
      currentPrice: 45500,
      pnl: 50,
      pnlPercent: 1.11,
    });
    console.log('   Position added:', position.id);
    console.log('');

    // 6. Получение позиций
    console.log('📊 Demo: Fetching positions...');
    const positions = await storage.getPositions();
    console.log(`   Found ${positions.length} positions`);
    if (positions.length > 0) {
      console.log('   Latest position:', {
        id: positions[0].id,
        symbol: positions[0].symbol,
        side: positions[0].side,
        pnl: positions[0].pnl,
      });
    }
    console.log('');

    // 7. Добавление сигнала
    console.log('🔔 Demo: Adding a signal...');
    const signal = await storage.addSignal({
      type: 'technical',
      source: 'example',
      symbol: 'BTC/USDT',
      action: 'BUY',
      strength: 85,
      confidence: 0.9,
      price: 45000,
      reason: 'Example signal for demo',
    });
    console.log('   Signal added:', signal.id);
    console.log('');

    // 8. Получение сигналов
    console.log('🔔 Demo: Fetching signals...');
    const signals = await storage.getSignals(10);
    console.log(`   Found ${signals.length} signals`);
    if (signals.length > 0) {
      console.log('   Latest signal:', {
        id: signals[0].id,
        symbol: signals[0].symbol,
        action: signals[0].action,
        strength: signals[0].strength,
      });
    }
    console.log('');

    // 9. Добавление новости
    console.log('📰 Demo: Adding news...');
    const news = await storage.addNews({
      title: 'BTC Price Surge',
      content: 'Bitcoin price reached new highs today',
      source: 'example',
      url: 'https://example.com',
      sentiment: 'POSITIVE',
      sentimentScore: 0.8,
      publishedAt: new Date().toISOString(),
    });
    console.log('   News added:', news.id);
    console.log('');

    // 10. Получение метрик
    console.log('📈 Demo: Fetching metrics...');
    const metrics = await storage.getMetrics();
    console.log('   Dashboard Metrics:');
    console.log(`      Balance: $${metrics.balance.toFixed(2)}`);
    console.log(`      Equity: $${metrics.equity.toFixed(2)}`);
    console.log(`      P&L: $${metrics.pnl.toFixed(2)} (${metrics.pnlPercent.toFixed(2)}%)`);
    console.log(`      Open Positions: ${metrics.openPositions}`);
    console.log(`      Total Trades: ${metrics.totalTrades}`);
    console.log(`      Win Rate: ${metrics.winRate.toFixed(2)}%`);
    console.log('');

    console.log('✨ Example completed successfully!');
    console.log('');
    console.log('💡 Tips:');
    console.log('   1. View data in web interface: ' + info.serverURL);
    console.log('   2. Configure table IDs in .env after creating tables');
    console.log('   3. Run: npm run integram:setup for setup instructions');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('');
    console.error('Troubleshooting:');
    console.error('   1. Check credentials in .env file');
    console.error('   2. Verify network connection');
    console.error('   3. Ensure tables are created in Integram web interface');
    console.error('   4. Run: npm run integram:setup');
    console.error('');
    process.exit(1);
  }
}

main();
