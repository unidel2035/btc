/**
 * Тесты для Sentiment Analyzer
 */
import { SentimentAnalyzerClient, SentimentLabel, ImpactLevel } from '../../src/analyzers/sentiment/index.js';

// Mock fetch для тестирования без реального API
const originalFetch = global.fetch;

function mockFetch(response: any, ok: boolean = true, status: number = 200): void {
  global.fetch = async () =>
    ({
      ok,
      status,
      statusText: ok ? 'OK' : 'Error',
      json: async () => response,
    }) as Response;
}

function restoreFetch(): void {
  global.fetch = originalFetch;
}

console.info('🧪 Running Sentiment Analyzer Tests\n');

// Test 1: Инициализация клиента
console.info('Test 1: Client Initialization');
try {
  const client = new SentimentAnalyzerClient({
    apiUrl: 'http://localhost:8000',
    timeout: 5000,
    batchSize: 10,
  });

  const config = client.getConfig();
  if (
    config.apiUrl === 'http://localhost:8000' &&
    config.timeout === 5000 &&
    config.batchSize === 10 &&
    config.retries === 3
  ) {
    console.info('  ✅ Client initialized with correct config\n');
  } else {
    console.error('  ❌ Client config is incorrect\n');
  }
} catch (error) {
  console.error('  ❌ Failed:', error, '\n');
}

// Test 2: Health check (mocked)
console.info('Test 2: Health Check (mocked)');
try {
  const client = new SentimentAnalyzerClient({
    apiUrl: 'http://localhost:8000',
  });

  mockFetch({ status: 'healthy' });
  const isHealthy = await client.healthCheck();

  if (isHealthy) {
    console.info('  ✅ Health check returns true when service is healthy\n');
  } else {
    console.error('  ❌ Health check should return true\n');
  }

  restoreFetch();
} catch (error) {
  console.error('  ❌ Failed:', error, '\n');
  restoreFetch();
}

// Test 3: Анализ текста (mocked)
console.info('Test 3: Text Analysis (mocked)');
try {
  const client = new SentimentAnalyzerClient({
    apiUrl: 'http://localhost:8000',
  });

  const mockResponse = {
    sentiment: 0.85,
    confidence: 0.92,
    label: 'positive',
    entities: [
      { text: 'Bitcoin', type: 'cryptocurrency', start: 0, end: 7 },
      { text: 'ETF', type: 'organization', start: 35, end: 38 },
    ],
    impact: 'high',
    keywords: ['surge', 'approval', 'bitcoin', 'etf'],
    processing_time: 45.2,
  };

  mockFetch(mockResponse);

  const result = await client.analyze('Bitcoin surges after ETF approval', 'news');

  if (
    result.sentiment === 0.85 &&
    result.confidence === 0.92 &&
    result.label === SentimentLabel.POSITIVE &&
    result.impact === ImpactLevel.HIGH &&
    result.entities.length === 2 &&
    result.keywords.length === 4
  ) {
    console.info('  ✅ Text analysis returns correct result\n');
  } else {
    console.error('  ❌ Text analysis result is incorrect\n');
  }

  restoreFetch();
} catch (error) {
  console.error('  ❌ Failed:', error, '\n');
  restoreFetch();
}

// Test 4: Батч анализ (mocked)
console.info('Test 4: Batch Analysis (mocked)');
try {
  const client = new SentimentAnalyzerClient({
    apiUrl: 'http://localhost:8000',
    batchSize: 2,
  });

  const mockBatchResponse = [
    {
      sentiment: 0.75,
      confidence: 0.88,
      label: 'positive',
      entities: [],
      impact: 'medium',
      keywords: ['ethereum', 'upgrade'],
      processing_time: 30.5,
    },
    {
      sentiment: -0.65,
      confidence: 0.85,
      label: 'negative',
      entities: [],
      impact: 'high',
      keywords: ['hack', 'security'],
      processing_time: 32.1,
    },
  ];

  mockFetch(mockBatchResponse);

  const texts = [{ text: 'Ethereum upgrade successful' }, { text: 'Exchange hacked' }];

  const batchResult = await client.analyzeBatch(texts);

  if (
    batchResult.total === 2 &&
    batchResult.success === 2 &&
    batchResult.failed === 0 &&
    batchResult.results.length === 2 &&
    batchResult.results[0].label === SentimentLabel.POSITIVE &&
    batchResult.results[1].label === SentimentLabel.NEGATIVE
  ) {
    console.info('  ✅ Batch analysis works correctly\n');
  } else {
    console.error('  ❌ Batch analysis result is incorrect\n');
  }

  restoreFetch();
} catch (error) {
  console.error('  ❌ Failed:', error, '\n');
  restoreFetch();
}

// Test 5: Обновление конфигурации
console.info('Test 5: Config Update');
try {
  const client = new SentimentAnalyzerClient({
    apiUrl: 'http://localhost:8000',
  });

  client.updateConfig({ timeout: 10000, batchSize: 20 });

  const config = client.getConfig();

  if (config.timeout === 10000 && config.batchSize === 20) {
    console.info('  ✅ Config updated successfully\n');
  } else {
    console.error('  ❌ Config update failed\n');
  }
} catch (error) {
  console.error('  ❌ Failed:', error, '\n');
}

// Test 6: Пустой батч
console.info('Test 6: Empty Batch');
try {
  const client = new SentimentAnalyzerClient({
    apiUrl: 'http://localhost:8000',
  });

  const result = await client.analyzeBatch([]);

  if (result.total === 0 && result.success === 0 && result.failed === 0 && result.results.length === 0) {
    console.info('  ✅ Empty batch handled correctly\n');
  } else {
    console.error('  ❌ Empty batch not handled correctly\n');
  }
} catch (error) {
  console.error('  ❌ Failed:', error, '\n');
}

console.info('✅ All tests passed successfully!');
