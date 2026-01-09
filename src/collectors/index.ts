import { config } from 'dotenv';

config();

/**
 * Запуск коллекторов данных
 */
async function runCollectors(): Promise<void> {
  console.info('📊 Starting data collectors...');

  // TODO: Инициализация и запуск коллекторов
  // - Новостные агрегаторы
  // - Социальные сети (Twitter, Reddit, Telegram)
  // - Рыночные данные с бирж

  console.info('✅ Data collectors started');
}

runCollectors().catch((error: Error) => {
  console.error('Failed to run collectors:', error);
  process.exit(1);
});
