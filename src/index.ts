import { config } from 'dotenv';
import { startApiServer } from './api/server.js';

// Загружаем переменные окружения
config();

/**
 * Главная функция запуска торгового бота
 */
async function main(): Promise<void> {
  console.info('🤖 BTC Trading Bot starting...');
  console.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.info(`Trading enabled: ${process.env.TRADING_ENABLED === 'true'}`);
  console.info(`Paper trading: ${process.env.PAPER_TRADING === 'true'}`);

  // Запуск API сервера для health checks и метрик
  const apiPort = parseInt(process.env.API_PORT || '3000', 10);
  await startApiServer(apiPort);

  // TODO: Инициализация модулей
  // - Подключение к базе данных
  // - Инициализация коллекторов данных
  // - Запуск анализаторов
  // - Настройка торговых стратегий

  console.info('✅ BTC Trading Bot started successfully');
  console.info('Press Ctrl+C to stop');
}

// Обработка ошибок и завершения
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.info('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.info('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

// Запуск приложения
main().catch((error: Error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
