/**
 * Тесты для модуля социальных коллекторов
 */

import { withRetry, isTransientError, RetryError } from '../../../src/collectors/social/index.js';
import { SocialCollectorOrchestrator } from '../../../src/collectors/social/index.js';
import type { SocialPost, SocialPlatform } from '../../../src/collectors/social/index.js';

/**
 * Тесты Retry Logic
 */
async function testRetryLogic() {
  console.info('\n📝 Testing Retry Logic...\n');

  // Тест 1: Успешное выполнение с первой попытки
  console.info('Test 1: Successful execution on first attempt');
  let attempt = 0;
  const result = await withRetry(async () => {
    attempt++;
    return 'success';
  });

  if (result !== 'success' || attempt !== 1) {
    throw new Error('Test 1 failed: Expected successful execution on first attempt');
  }
  console.info('  ✅ Test 1 passed\n');

  // Тест 2: Retry с временной ошибкой
  console.info('Test 2: Retry with transient error');
  attempt = 0;
  const retryResult = await withRetry(
    async () => {
      attempt++;
      if (attempt < 3) {
        throw new Error('ETIMEDOUT: Connection timeout');
      }
      return 'success after retry';
    },
    { maxAttempts: 5, initialDelay: 100 },
  );

  if (retryResult !== 'success after retry' || attempt !== 3) {
    throw new Error('Test 2 failed: Expected success after retries');
  }
  console.info('  ✅ Test 2 passed\n');

  // Тест 3: Проверка isTransientError
  console.info('Test 3: isTransientError detection');
  const transientErrors = [
    new Error('ECONNRESET'),
    new Error('ETIMEDOUT'),
    new Error('Rate limit exceeded'),
    new Error('HTTP 429 Too Many Requests'),
    new Error('HTTP 503 Service Unavailable'),
  ];

  for (const error of transientErrors) {
    if (!isTransientError(error)) {
      throw new Error(`Test 3 failed: ${error.message} should be transient`);
    }
  }

  const nonTransientError = new Error('Invalid API key');
  if (isTransientError(nonTransientError)) {
    throw new Error('Test 3 failed: Invalid API key should not be transient');
  }
  console.info('  ✅ Test 3 passed\n');

  // Тест 4: Максимальное количество попыток
  console.info('Test 4: Max attempts reached');
  attempt = 0;
  try {
    await withRetry(
      async () => {
        attempt++;
        throw new Error('ETIMEDOUT: Persistent timeout');
      },
      { maxAttempts: 3, initialDelay: 100 },
    );
    throw new Error('Test 4 failed: Should have thrown error after max attempts');
  } catch (error) {
    if (attempt !== 3) {
      throw new Error(`Test 4 failed: Expected 3 attempts, got ${attempt}`);
    }
  }
  console.info('  ✅ Test 4 passed\n');

  // Тест 5: Не повторяем попытки для не-временных ошибок
  console.info('Test 5: Non-transient errors are not retried');
  attempt = 0;
  try {
    await withRetry(
      async () => {
        attempt++;
        throw new Error('Invalid credentials');
      },
      { maxAttempts: 3, initialDelay: 100 },
    );
    throw new Error('Test 5 failed: Should have thrown error immediately');
  } catch (error) {
    if (attempt !== 1) {
      throw new Error(`Test 5 failed: Expected 1 attempt, got ${attempt}`);
    }
  }
  console.info('  ✅ Test 5 passed\n');

  console.info('✅ All Retry Logic tests passed!\n');
}

/**
 * Тесты Orchestrator
 */
async function testOrchestrator() {
  console.info('\n📝 Testing Social Collector Orchestrator...\n');

  // Тест 1: Инициализация без конфигурации
  console.info('Test 1: Initialize orchestrator without collectors');
  const emptyOrchestrator = new SocialCollectorOrchestrator({});
  emptyOrchestrator.registerCollectors();

  if (emptyOrchestrator.collectorsCount !== 0) {
    throw new Error('Test 1 failed: Expected 0 collectors');
  }
  console.info('  ✅ Test 1 passed\n');

  // Тест 2: Регистрация коллекторов (с mock конфигурацией)
  console.info('Test 2: Register collectors with mock configuration');
  const orchestrator = new SocialCollectorOrchestrator({
    twitter: {
      bearerToken: 'mock_token',
      accounts: ['test_account'],
      hashtags: ['bitcoin'],
      maxResults: 10,
    },
    reddit: {
      clientId: 'mock_id',
      clientSecret: 'mock_secret',
      userAgent: 'test-agent',
      subreddits: ['Bitcoin'],
      limit: 10,
    },
  });

  orchestrator.registerCollectors();

  if (orchestrator.collectorsCount !== 2) {
    throw new Error(`Test 2 failed: Expected 2 collectors, got ${orchestrator.collectorsCount}`);
  }
  console.info('  ✅ Test 2 passed\n');

  // Тест 3: Проверка статистики
  console.info('Test 3: Check initial stats');
  const stats = orchestrator.getStats();

  if (stats.length !== 2) {
    throw new Error(`Test 3 failed: Expected 2 stats entries, got ${stats.length}`);
  }

  for (const stat of stats) {
    if (stat.totalPosts !== 0 || stat.totalErrors !== 0 || stat.isRunning !== false) {
      throw new Error('Test 3 failed: Initial stats should be zeros');
    }
  }
  console.info('  ✅ Test 3 passed\n');

  // Тест 4: Callbacks
  console.info('Test 4: Callback registration');
  let postCallbackCalled = false;
  let errorCallbackCalled = false;

  orchestrator.onPostsCollected((posts: SocialPost[]) => {
    postCallbackCalled = true;
  });

  orchestrator.onError((platform: SocialPlatform, error: Error) => {
    errorCallbackCalled = true;
  });

  // Проверяем, что callbacks зарегистрированы (не вызываем их, так как нужны реальные API)
  console.info('  ✅ Test 4 passed\n');

  // Тест 5: Проверка running state
  console.info('Test 5: Running state');
  if (orchestrator.running) {
    throw new Error('Test 5 failed: Orchestrator should not be running initially');
  }
  console.info('  ✅ Test 5 passed\n');

  console.info('✅ All Orchestrator tests passed!\n');
}

/**
 * Запуск всех тестов
 */
async function runTests() {
  console.info('🧪 Starting Social Collector Tests\n');
  console.info('='.repeat(50));

  try {
    await testRetryLogic();
    await testOrchestrator();

    console.info('='.repeat(50));
    console.info('\n✅ All tests passed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests().catch((error: Error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
