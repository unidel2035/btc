/**
 * Пример использования Sentiment Analyzer
 */
import { config } from 'dotenv';
import { SentimentAnalyzerClient } from '../src/analyzers/sentiment/index.js';

config();

async function main(): Promise<void> {
  console.info('🧪 Sentiment Analyzer Example\n');

  // Инициализация клиента
  const sentimentApiUrl = process.env.SENTIMENT_API_URL || 'http://localhost:8000';
  const analyzer = new SentimentAnalyzerClient({
    apiUrl: sentimentApiUrl,
    timeout: 30000,
    batchSize: 10,
  });

  // 1. Проверка здоровья сервиса
  console.info('1️⃣  Health Check');
  const isHealthy = await analyzer.healthCheck();
  console.info(`   Status: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}\n`);

  if (!isHealthy) {
    console.error('❌ Sentiment service is not available. Please start it with:');
    console.error('   docker-compose up sentiment-analyzer');
    process.exit(1);
  }

  // 2. Анализ одного текста - положительная новость
  console.info('2️⃣  Single Text Analysis - Positive News');
  const positiveText = 'Bitcoin surges 10% after major ETF approval, driving cryptocurrency adoption worldwide';
  console.info(`   Text: "${positiveText}"\n`);

  try {
    const result1 = await analyzer.analyze(positiveText, 'news');
    console.info('   Results:');
    console.info(`   - Sentiment: ${result1.sentiment.toFixed(3)} (${result1.label})`);
    console.info(`   - Confidence: ${(result1.confidence * 100).toFixed(1)}%`);
    console.info(`   - Impact: ${result1.impact}`);
    console.info(`   - Entities: ${result1.entities.map((e) => `${e.text} (${e.type})`).join(', ')}`);
    console.info(`   - Keywords: ${result1.keywords.slice(0, 5).join(', ')}\n`);
  } catch (error) {
    console.error('   Error:', error);
  }

  // 3. Анализ негативной новости
  console.info('3️⃣  Single Text Analysis - Negative News');
  const negativeText = 'Major crypto exchange hacked, Bitcoin crashes 15% as investors panic sell';
  console.info(`   Text: "${negativeText}"\n`);

  try {
    const result2 = await analyzer.analyze(negativeText, 'news');
    console.info('   Results:');
    console.info(`   - Sentiment: ${result2.sentiment.toFixed(3)} (${result2.label})`);
    console.info(`   - Confidence: ${(result2.confidence * 100).toFixed(1)}%`);
    console.info(`   - Impact: ${result2.impact}`);
    console.info(`   - Entities: ${result2.entities.map((e) => `${e.text} (${e.type})`).join(', ')}`);
    console.info(`   - Keywords: ${result2.keywords.slice(0, 5).join(', ')}\n`);
  } catch (error) {
    console.error('   Error:', error);
  }

  // 4. Анализ нейтральной новости
  console.info('4️⃣  Single Text Analysis - Neutral News');
  const neutralText = 'Bitcoin price remains stable around $45,000 as market consolidates';
  console.info(`   Text: "${neutralText}"\n`);

  try {
    const result3 = await analyzer.analyze(neutralText, 'news');
    console.info('   Results:');
    console.info(`   - Sentiment: ${result3.sentiment.toFixed(3)} (${result3.label})`);
    console.info(`   - Confidence: ${(result3.confidence * 100).toFixed(1)}%`);
    console.info(`   - Impact: ${result3.impact}`);
    console.info(`   - Entities: ${result3.entities.map((e) => `${e.text} (${e.type})`).join(', ')}`);
    console.info(`   - Keywords: ${result3.keywords.slice(0, 5).join(', ')}\n`);
  } catch (error) {
    console.error('   Error:', error);
  }

  // 5. Батч анализ нескольких новостей
  console.info('5️⃣  Batch Analysis');
  const newsItems = [
    { text: 'Ethereum 2.0 upgrade completed successfully, network efficiency improves', type: 'news' },
    { text: 'SEC charges crypto company with fraud, regulatory concerns rise', type: 'news' },
    { text: 'New DeFi protocol launches on Solana blockchain', type: 'news' },
    { text: 'Coinbase announces partnership with major banking institution', type: 'news' },
    { text: 'Bitcoin mining difficulty reaches all-time high', type: 'news' },
  ];

  console.info(`   Analyzing ${newsItems.length} news items...\n`);

  try {
    const batchResult = await analyzer.analyzeBatch(newsItems);

    console.info('   Batch Results:');
    console.info(`   - Total: ${batchResult.total}`);
    console.info(`   - Success: ${batchResult.success}`);
    console.info(`   - Failed: ${batchResult.failed}\n`);

    if (batchResult.results.length > 0) {
      console.info('   Individual Results:');
      batchResult.results.forEach((result, index) => {
        const shortText = newsItems[index].text.substring(0, 50) + '...';
        console.info(
          `   ${index + 1}. "${shortText}" => ${result.sentiment.toFixed(2)} (${result.label}, ${result.impact})`
        );
      });
    }

    if (batchResult.errors.length > 0) {
      console.info('\n   Errors:');
      batchResult.errors.forEach((error, index) => {
        console.error(`   ${index + 1}. ${error}`);
      });
    }
  } catch (error) {
    console.error('   Batch analysis error:', error);
  }

  console.info('\n✅ Example completed successfully!');
}

// Запуск примера
main().catch((error) => {
  console.error('❌ Example failed:', error);
  process.exit(1);
});
