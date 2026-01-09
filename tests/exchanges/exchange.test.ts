/**
 * Exchange Module Tests
 *
 * Юнит-тесты для модуля интеграции с биржами
 */

import {
  ExchangeManager,
  createExchangeConfig,
  validateExchangeConfig,
  encrypt,
  decrypt,
  generateMasterKey,
  isValidMasterKey,
  createHmacSignature,
  sha256Hash,
} from '../../src/exchanges/index.js';

/**
 * Тест 1: Создание конфигурации
 */
function testConfigCreation(): void {
  console.log('Test 1: Config Creation');

  // Сохранить оригинальные переменные окружения
  const originalEnv = { ...process.env };

  // Установить тестовые переменные
  process.env.BINANCE_API_KEY = 'test_key';
  process.env.BINANCE_SECRET = 'test_secret';
  process.env.BINANCE_TESTNET = 'true';

  const config = createExchangeConfig();

  if (!config.exchanges.binance) {
    throw new Error('Binance config not created');
  }

  if (config.exchanges.binance.apiKey !== 'test_key') {
    throw new Error('API key mismatch');
  }

  if (config.exchanges.binance.testnet !== true) {
    throw new Error('Testnet flag mismatch');
  }

  // Восстановить переменные окружения
  process.env = originalEnv;

  console.log('  ✅ Config created successfully');
}

/**
 * Тест 2: Валидация конфигурации
 */
function testConfigValidation(): void {
  console.log('Test 2: Config Validation');

  // Валидная конфигурация
  const validConfig = {
    exchanges: {
      binance: {
        apiKey: 'valid_key',
        apiSecret: 'valid_secret',
      },
    },
  };

  const validResult = validateExchangeConfig(validConfig);
  if (!validResult.valid) {
    throw new Error('Valid config marked as invalid');
  }

  // Невалидная конфигурация (пустые ключи)
  const invalidConfig = {
    exchanges: {
      binance: {
        apiKey: '',
        apiSecret: 'secret',
      },
    },
  };

  const invalidResult = validateExchangeConfig(invalidConfig);
  if (invalidResult.valid) {
    throw new Error('Invalid config marked as valid');
  }

  if (invalidResult.errors.length === 0) {
    throw new Error('No validation errors returned');
  }

  // Пустая конфигурация
  const emptyConfig = {
    exchanges: {},
  };

  const emptyResult = validateExchangeConfig(emptyConfig);
  if (emptyResult.valid) {
    throw new Error('Empty config marked as valid');
  }

  console.log('  ✅ Config validation works correctly');
}

/**
 * Тест 3: Шифрование и расшифрование
 */
function testEncryption(): void {
  console.log('Test 3: Encryption/Decryption');

  const masterKey = generateMasterKey();
  const originalText = 'my_secret_api_key_12345';

  // Зашифровать
  const encrypted = encrypt(originalText, masterKey);

  if (encrypted === originalText) {
    throw new Error('Text not encrypted');
  }

  // Расшифровать
  const decrypted = decrypt(encrypted, masterKey);

  if (decrypted !== originalText) {
    throw new Error(`Decryption failed: expected "${originalText}", got "${decrypted}"`);
  }

  // Проверить что нельзя расшифровать с другим ключом
  const wrongKey = generateMasterKey();
  try {
    decrypt(encrypted, wrongKey);
    throw new Error('Should fail with wrong key');
  } catch (error) {
    // Ожидаемая ошибка
  }

  console.log('  ✅ Encryption/Decryption works correctly');
}

/**
 * Тест 4: Валидация мастер-ключа
 */
function testMasterKeyValidation(): void {
  console.log('Test 4: Master Key Validation');

  const validKey = generateMasterKey();
  if (!isValidMasterKey(validKey)) {
    throw new Error('Generated master key marked as invalid');
  }

  const shortKey = 'short';
  if (isValidMasterKey(shortKey)) {
    throw new Error('Short key marked as valid');
  }

  const longKey = 'a'.repeat(32);
  if (!isValidMasterKey(longKey)) {
    throw new Error('32-char key marked as invalid');
  }

  console.log('  ✅ Master key validation works correctly');
}

/**
 * Тест 5: HMAC подпись
 */
function testHmacSignature(): void {
  console.log('Test 5: HMAC Signature');

  const message = 'test_message';
  const secret = 'test_secret';

  const signature1 = createHmacSignature(message, secret);
  const signature2 = createHmacSignature(message, secret);

  // Одинаковые входные данные должны давать одинаковую подпись
  if (signature1 !== signature2) {
    throw new Error('HMAC signatures do not match');
  }

  // Разные секреты должны давать разные подписи
  const signature3 = createHmacSignature(message, 'different_secret');
  if (signature1 === signature3) {
    throw new Error('HMAC signatures should differ with different secrets');
  }

  // Проверить формат (должна быть hex строка)
  if (!/^[a-f0-9]+$/.test(signature1)) {
    throw new Error('HMAC signature not in hex format');
  }

  console.log('  ✅ HMAC signature works correctly');
}

/**
 * Тест 6: SHA256 хэш
 */
function testSha256Hash(): void {
  console.log('Test 6: SHA256 Hash');

  const text = 'test_text';
  const hash1 = sha256Hash(text);
  const hash2 = sha256Hash(text);

  // Одинаковый текст должен давать одинаковый хэш
  if (hash1 !== hash2) {
    throw new Error('SHA256 hashes do not match');
  }

  // Разный текст должен давать разный хэш
  const hash3 = sha256Hash('different_text');
  if (hash1 === hash3) {
    throw new Error('SHA256 hashes should differ for different texts');
  }

  // Проверить формат (должна быть hex строка длиной 64)
  if (!/^[a-f0-9]{64}$/.test(hash1)) {
    throw new Error('SHA256 hash not in correct format');
  }

  console.log('  ✅ SHA256 hash works correctly');
}

/**
 * Тест 7: ExchangeManager инициализация
 */
function testExchangeManagerInit(): void {
  console.log('Test 7: ExchangeManager Initialization');

  const config = {
    exchanges: {
      binance: {
        apiKey: 'test_key',
        apiSecret: 'test_secret',
        testnet: true,
      },
      bybit: {
        apiKey: 'test_key',
        apiSecret: 'test_secret',
        testnet: true,
      },
    },
  };

  const manager = new ExchangeManager(config);

  // Проверить что биржи добавлены
  if (!manager.hasExchange('binance')) {
    throw new Error('Binance not added to manager');
  }

  if (!manager.hasExchange('bybit')) {
    throw new Error('Bybit not added to manager');
  }

  // Проверить получение бирж
  const binance = manager.getExchange('binance');
  if (!binance) {
    throw new Error('Cannot get Binance exchange');
  }

  if (binance.name !== 'binance') {
    throw new Error('Binance exchange name mismatch');
  }

  // Проверить список бирж
  const names = manager.getExchangeNames();
  if (!names.includes('binance') || !names.includes('bybit')) {
    throw new Error('Exchange names list incomplete');
  }

  // Проверить количество бирж
  const exchanges = manager.getAllExchanges();
  if (exchanges.length !== 2) {
    throw new Error(`Expected 2 exchanges, got ${exchanges.length}`);
  }

  console.log('  ✅ ExchangeManager initialized correctly');
}

/**
 * Тест 8: ExchangeManager с шифрованием
 */
function testExchangeManagerEncryption(): void {
  console.log('Test 8: ExchangeManager with Encryption');

  const masterKey = generateMasterKey();
  const apiKey = 'my_api_key';
  const apiSecret = 'my_api_secret';

  // Зашифровать ключи
  const encryptedKey = encrypt(apiKey, masterKey);
  const encryptedSecret = encrypt(apiSecret, masterKey);

  const config = {
    masterKey,
    exchanges: {
      binance: {
        apiKey: encryptedKey,
        apiSecret: encryptedSecret,
        encrypted: true,
        testnet: true,
      },
    },
  };

  // Создать менеджер с зашифрованными ключами
  const manager = new ExchangeManager(config);

  if (!manager.hasExchange('binance')) {
    throw new Error('Binance not added with encrypted keys');
  }

  console.log('  ✅ ExchangeManager works with encrypted credentials');
}

/**
 * Тест 9: ExchangeManager - шифрование ключей
 */
function testExchangeManagerEncryptCredentials(): void {
  console.log('Test 9: ExchangeManager Encrypt Credentials');

  const masterKey = generateMasterKey();
  const config = {
    masterKey,
    exchanges: {
      binance: {
        apiKey: 'test',
        apiSecret: 'test',
        testnet: true,
      },
    },
  };

  const manager = new ExchangeManager(config);

  const apiKey = 'my_key';
  const apiSecret = 'my_secret';

  const encrypted = manager.encryptCredentials(apiKey, apiSecret);

  if (encrypted.apiKey === apiKey || encrypted.apiSecret === apiSecret) {
    throw new Error('Credentials not encrypted');
  }

  // Проверить что можно расшифровать
  const decryptedKey = decrypt(encrypted.apiKey, masterKey);
  const decryptedSecret = decrypt(encrypted.apiSecret, masterKey);

  if (decryptedKey !== apiKey || decryptedSecret !== apiSecret) {
    throw new Error('Encrypted credentials cannot be decrypted correctly');
  }

  console.log('  ✅ ExchangeManager encrypts credentials correctly');
}

/**
 * Тест 10: Symbol нормализация
 */
function testSymbolNormalization(): void {
  console.log('Test 10: Symbol Normalization');

  const config = {
    exchanges: {
      binance: {
        apiKey: 'test',
        apiSecret: 'test',
        testnet: true,
      },
    },
  };

  const manager = new ExchangeManager(config);
  const exchange = manager.getExchange('binance');

  if (!exchange) {
    throw new Error('Cannot get exchange');
  }

  // Тестирование через защищенный метод (используем any для доступа)
  const normalizeSymbol = (exchange as unknown as { normalizeSymbol: (s: string) => string })
    .normalizeSymbol;

  const tests = [
    ['BTC/USDT', 'BTCUSDT'],
    ['BTC-USDT', 'BTCUSDT'],
    ['btc usdt', 'BTCUSDT'],
    ['BTCUSDT', 'BTCUSDT'],
  ];

  for (const [input, expected] of tests) {
    const result = normalizeSymbol.call(exchange, input);
    if (result !== expected) {
      throw new Error(`Symbol normalization failed: ${input} -> ${result} (expected ${expected})`);
    }
  }

  console.log('  ✅ Symbol normalization works correctly');
}

/**
 * Запустить все тесты
 */
async function runTests(): Promise<void> {
  console.log('🧪 Running Exchange Module Tests\n');

  const tests = [
    testConfigCreation,
    testConfigValidation,
    testEncryption,
    testMasterKeyValidation,
    testHmacSignature,
    testSha256Hash,
    testExchangeManagerInit,
    testExchangeManagerEncryption,
    testExchangeManagerEncryptCredentials,
    testSymbolNormalization,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      test();
      passed++;
    } catch (error) {
      console.error(`  ❌ FAILED: ${(error as Error).message}`);
      failed++;
    }
  }

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.error('\n❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed successfully!');
  }
}

// Запустить тесты
runTests().catch((error: Error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
