import { SocialCollectorOrchestrator } from '../../../src/collectors/social/SocialCollectorOrchestrator.js';
import { SocialPlatform } from '../../../src/collectors/social/types.js';
import type { SocialPost } from '../../../src/collectors/social/types.js';

/**
 * Тесты для SocialCollectorOrchestrator
 */

console.info('🧪 Testing SocialCollectorOrchestrator...\n');

let passed = 0;
let failed = 0;

// Test 1: Создание оркестратора с пустой конфигурацией
console.info('Test 1: Create orchestrator with empty config');
try {
  const orchestrator = new SocialCollectorOrchestrator({});
  const stats = orchestrator.getStats();

  if (stats.size === 0) {
    console.info('✅ Empty orchestrator created successfully');
    passed++;
  } else {
    console.error(`❌ Expected 0 collectors, got ${stats.size}`);
    failed++;
  }
} catch (error) {
  console.error('❌ Failed to create empty orchestrator:', error);
  failed++;
}

// Test 2: Регистрация Twitter коллектора
console.info('\nTest 2: Register Twitter collector');
try {
  const orchestrator = new SocialCollectorOrchestrator({
    enableTwitter: true,
    twitter: {
      bearerToken: 'test_token',
      accounts: ['test_account'],
      hashtags: ['bitcoin'],
    },
  });

  const stats = orchestrator.getStats();
  const twitterStats = orchestrator.getCollectorStats(SocialPlatform.TWITTER);

  if (stats.size === 1 && twitterStats && twitterStats.platform === SocialPlatform.TWITTER) {
    console.info('✅ Twitter collector registered successfully');
    passed++;
  } else {
    console.error('❌ Twitter collector not registered properly');
    failed++;
  }
} catch (error) {
  console.error('❌ Failed to register Twitter collector:', error);
  failed++;
}

// Test 3: Регистрация Reddit коллектора
console.info('\nTest 3: Register Reddit collector');
try {
  const orchestrator = new SocialCollectorOrchestrator({
    enableReddit: true,
    reddit: {
      clientId: 'test_id',
      clientSecret: 'test_secret',
      username: 'test_user',
      password: 'test_pass',
      subreddits: ['Bitcoin'],
    },
  });

  const stats = orchestrator.getStats();
  const redditStats = orchestrator.getCollectorStats(SocialPlatform.REDDIT);

  if (stats.size === 1 && redditStats && redditStats.platform === SocialPlatform.REDDIT) {
    console.info('✅ Reddit collector registered successfully');
    passed++;
  } else {
    console.error('❌ Reddit collector not registered properly');
    failed++;
  }
} catch (error) {
  console.error('❌ Failed to register Reddit collector:', error);
  failed++;
}

// Test 4: Регистрация всех коллекторов
console.info('\nTest 4: Register all collectors');
try {
  const orchestrator = new SocialCollectorOrchestrator({
    enableTwitter: true,
    twitter: {
      bearerToken: 'test_token',
    },
    enableReddit: true,
    reddit: {
      clientId: 'test_id',
      clientSecret: 'test_secret',
      username: 'test_user',
      password: 'test_pass',
      subreddits: ['Bitcoin'],
    },
    enableTelegram: true,
    telegram: {
      apiId: 12345,
      apiHash: 'test_hash',
      channels: ['bitcoin'],
    },
  });

  const stats = orchestrator.getStats();

  if (stats.size === 3) {
    console.info('✅ All collectors registered successfully');
    passed++;
  } else {
    console.error(`❌ Expected 3 collectors, got ${stats.size}`);
    failed++;
  }
} catch (error) {
  console.error('❌ Failed to register all collectors:', error);
  failed++;
}

// Test 5: Регистрация post callback
console.info('\nTest 5: Register post callback');
try {
  const orchestrator = new SocialCollectorOrchestrator({});
  let callbackCalled = false;
  const posts: SocialPost[] = [];

  orchestrator.onPosts((receivedPosts) => {
    callbackCalled = true;
    posts.push(...receivedPosts);
  });

  // Manually trigger callback (since we don't want to make real API calls)
  // В реальном тесте это бы вызывалось через mock collector
  if (!callbackCalled) {
    console.info('✅ Post callback registered (not triggered in test)');
    passed++;
  } else {
    console.error('❌ Callback should not be called yet');
    failed++;
  }
} catch (error) {
  console.error('❌ Failed to register post callback:', error);
  failed++;
}

// Test 6: Регистрация error callback
console.info('\nTest 6: Register error callback');
try {
  const orchestrator = new SocialCollectorOrchestrator({});
  let errorCallbackCalled = false;

  orchestrator.onError((error, platform) => {
    errorCallbackCalled = true;
    console.info(`Error from ${platform}: ${error.message}`);
  });

  if (!errorCallbackCalled) {
    console.info('✅ Error callback registered (not triggered in test)');
    passed++;
  } else {
    console.error('❌ Error callback should not be called yet');
    failed++;
  }
} catch (error) {
  console.error('❌ Failed to register error callback:', error);
  failed++;
}

// Test 7: Начальная статистика коллектора
console.info('\nTest 7: Initial collector stats');
try {
  const orchestrator = new SocialCollectorOrchestrator({
    enableTwitter: true,
    twitter: {
      bearerToken: 'test_token',
    },
  });

  const twitterStats = orchestrator.getCollectorStats(SocialPlatform.TWITTER);

  if (
    twitterStats &&
    twitterStats.totalPosts === 0 &&
    twitterStats.successfulCollections === 0 &&
    twitterStats.failedCollections === 0 &&
    !twitterStats.isRunning
  ) {
    console.info('✅ Initial stats are correct');
    passed++;
  } else {
    console.error('❌ Initial stats are incorrect:', twitterStats);
    failed++;
  }
} catch (error) {
  console.error('❌ Failed to get initial stats:', error);
  failed++;
}

// Test 8: isAnyCollectorRunning
console.info('\nTest 8: isAnyCollectorRunning check');
try {
  const orchestrator = new SocialCollectorOrchestrator({
    enableTwitter: true,
    twitter: {
      bearerToken: 'test_token',
    },
  });

  const isRunning = orchestrator.isAnyCollectorRunning();

  if (!isRunning) {
    console.info('✅ No collectors running initially');
    passed++;
  } else {
    console.error('❌ Collectors should not be running initially');
    failed++;
  }
} catch (error) {
  console.error('❌ Failed to check running status:', error);
  failed++;
}

// Итоговый результат
console.info(`\n${'='.repeat(50)}`);
console.info(`Test Results: ${passed} passed, ${failed} failed`);
console.info(`${'='.repeat(50)}\n`);

if (failed > 0) {
  process.exit(1);
}

console.info('✅ All orchestrator tests passed!\n');
