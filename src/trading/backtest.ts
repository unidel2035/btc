import { config } from 'dotenv';

config();

/**
 * Backtesting engine для тестирования торговых стратегий
 */
function runBacktest(): void {
  console.info('📈 Starting backtesting...');

  // Парсинг аргументов командной строки
  const args = process.argv.slice(2);
  const strategy = args.find((arg) => arg.startsWith('--strategy='))?.split('=')[1];
  const from = args.find((arg) => arg.startsWith('--from='))?.split('=')[1];

  console.info(`Strategy: ${strategy || 'default'}`);
  console.info(`From date: ${from || 'not specified'}`);

  // TODO: Реализация backtesting
  // - Загрузка исторических данных
  // - Применение стратегии
  // - Расчет метрик производительности

  console.info('✅ Backtesting completed');
}

try {
  runBacktest();
} catch (error) {
  console.error('Failed to run backtest:', error);
  process.exit(1);
}
