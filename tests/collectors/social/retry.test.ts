import { withRetry, isTransientError } from '../../../src/collectors/social/utils/retry.js';

/**
 * Тесты для retry logic
 */

console.info('🧪 Testing retry logic...\n');

// Test 1: Проверка isTransientError
console.info('Test 1: isTransientError detection');
const transientErrors = [
  new Error('Network timeout'),
  new Error('Rate limit exceeded'),
  new Error('500 Internal Server Error'),
  new Error('502 Bad Gateway'),
  new Error('ECONNRESET'),
];

const nonTransientErrors = [new Error('Invalid API key'), new Error('404 Not Found'), new Error('Permission denied')];

let passed = 0;
let failed = 0;

for (const error of transientErrors) {
  if (isTransientError(error)) {
    console.info(`✅ Correctly identified transient error: ${error.message}`);
    passed++;
  } else {
    console.error(`❌ Failed to identify transient error: ${error.message}`);
    failed++;
  }
}

for (const error of nonTransientErrors) {
  if (!isTransientError(error)) {
    console.info(`✅ Correctly identified non-transient error: ${error.message}`);
    passed++;
  } else {
    console.error(`❌ Incorrectly identified non-transient error as transient: ${error.message}`);
    failed++;
  }
}

// Test 2: Успешное выполнение без ретраев
console.info('\nTest 2: Successful execution without retries');
let callCount = 0;

const successFn = async (): Promise<string> => {
  callCount++;
  return 'success';
};

try {
  const result = await withRetry(successFn, {
    maxAttempts: 3,
    initialDelayMs: 10,
    maxDelayMs: 100,
    backoffMultiplier: 2,
  });

  if (result === 'success' && callCount === 1) {
    console.info('✅ Function executed successfully on first try');
    passed++;
  } else {
    console.error(`❌ Unexpected result or call count. Result: ${result}, Calls: ${callCount}`);
    failed++;
  }
} catch (error) {
  console.error('❌ Unexpected error:', error);
  failed++;
}

// Test 3: Retry на transient error и успешное завершение
console.info('\nTest 3: Retry on transient error and eventual success');
callCount = 0;

const retrySuccessFn = async (): Promise<string> => {
  callCount++;
  if (callCount < 3) {
    throw new Error('Network timeout');
  }
  return 'success after retry';
};

try {
  const result = await withRetry(retrySuccessFn, {
    maxAttempts: 3,
    initialDelayMs: 10,
    maxDelayMs: 100,
    backoffMultiplier: 2,
  });

  if (result === 'success after retry' && callCount === 3) {
    console.info('✅ Function succeeded after retries');
    passed++;
  } else {
    console.error(`❌ Unexpected result or call count. Result: ${result}, Calls: ${callCount}`);
    failed++;
  }
} catch (error) {
  console.error('❌ Unexpected error:', error);
  failed++;
}

// Test 4: Non-transient error прерывает retry
console.info('\nTest 4: Non-transient error stops retries immediately');
callCount = 0;

const nonTransientFn = async (): Promise<string> => {
  callCount++;
  throw new Error('Invalid API key');
};

try {
  await withRetry(nonTransientFn, {
    maxAttempts: 3,
    initialDelayMs: 10,
    maxDelayMs: 100,
    backoffMultiplier: 2,
  });

  console.error('❌ Should have thrown an error');
  failed++;
} catch (error) {
  if (callCount === 1 && error instanceof Error && error.message === 'Invalid API key') {
    console.info('✅ Non-transient error stopped retries immediately');
    passed++;
  } else {
    console.error(`❌ Unexpected behavior. Calls: ${callCount}, Error: ${error}`);
    failed++;
  }
}

// Test 5: Максимальное количество попыток
console.info('\nTest 5: Max attempts reached');
callCount = 0;

const alwaysFailFn = async (): Promise<string> => {
  callCount++;
  throw new Error('Rate limit exceeded');
};

try {
  await withRetry(alwaysFailFn, {
    maxAttempts: 3,
    initialDelayMs: 10,
    maxDelayMs: 100,
    backoffMultiplier: 2,
  });

  console.error('❌ Should have thrown an error');
  failed++;
} catch (error) {
  if (callCount === 3 && error instanceof Error && error.message === 'Rate limit exceeded') {
    console.info('✅ Max attempts reached and error thrown');
    passed++;
  } else {
    console.error(`❌ Unexpected behavior. Calls: ${callCount}, Error: ${error}`);
    failed++;
  }
}

// Итоговый результат
console.info(`\n${'='.repeat(50)}`);
console.info(`Test Results: ${passed} passed, ${failed} failed`);
console.info(`${'='.repeat(50)}\n`);

if (failed > 0) {
  process.exit(1);
}

console.info('✅ All retry logic tests passed!\n');
