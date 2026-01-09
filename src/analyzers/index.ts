import { config } from 'dotenv';
import { SentimentAnalyzerClient } from './sentiment/index.js';

config();

/**
 * Запуск анализаторов
 */
async function runAnalyzers(): Promise<void> {
  console.info('🔍 Starting analyzers...');

  // Инициализация Sentiment Analyzer
  const sentimentApiUrl = process.env.SENTIMENT_API_URL || 'http://localhost:8000';
  const sentimentAnalyzer = new SentimentAnalyzerClient({
    apiUrl: sentimentApiUrl,
    timeout: 30000,
    batchSize: 50,
  });

  // Проверка доступности сервиса
  console.info('📊 Checking sentiment analysis service...');
  const isHealthy = await sentimentAnalyzer.healthCheck();

  if (isHealthy) {
    console.info('✅ Sentiment Analysis service is ready');

    // Пример анализа
    const testText = 'Bitcoin surges 10% after ETF approval news spreads across crypto markets';
    console.info('\n📝 Testing sentiment analysis...');
    console.info('Text:', testText);

    try {
      const result = await sentimentAnalyzer.analyze(testText, 'news');
      console.info('\n📊 Analysis Result:');
      console.info('  Sentiment:', result.sentiment.toFixed(3), `(${result.label})`);
      console.info('  Confidence:', (result.confidence * 100).toFixed(1) + '%');
      console.info('  Impact:', result.impact);
      console.info('  Entities:', result.entities.map((e) => `${e.text} (${e.type})`).join(', '));
      console.info('  Keywords:', result.keywords.slice(0, 5).join(', '));
    } catch (error) {
      console.error('❌ Analysis failed:', error);
    }
  } else {
    console.warn('⚠️  Sentiment Analysis service is not available');
    console.info('   Make sure the Python microservice is running:');
    console.info('   docker-compose up sentiment-analyzer');
  }

  // TODO: Технический анализ
  // TODO: Генерация торговых сигналов

  console.info('\n✅ Analyzers started');
}

try {
  await runAnalyzers();
} catch (error) {
  console.error('Failed to run analyzers:', error);
  process.exit(1);
}
