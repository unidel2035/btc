/**
 * Тесты для модуля безопасности (шифрование API ключей)
 */

import {
  encrypt,
  decrypt,
  encryptExchangeKeys,
  decryptExchangeKeys,
  generateMasterPassword,
  hashPassword,
  verifyPassword,
  isValidIP,
  isIPWhitelisted,
} from '../../src/exchanges/security.js';

/**
 * Тест шифрования и расшифровки
 */
function testEncryptDecrypt(): boolean {
  console.log('🧪 Test: Encrypt/Decrypt');

  const originalText = 'my-secret-api-key-12345';
  const masterPassword = 'super-secret-password';

  // Шифруем
  const encrypted = encrypt(originalText, masterPassword);

  // Проверяем, что зашифрованный текст отличается от оригинала
  if (encrypted.encrypted === originalText) {
    console.error('❌ Encrypted text should differ from original');
    return false;
  }

  // Расшифровываем
  const decrypted = decrypt(encrypted, masterPassword);

  // Проверяем, что расшифрованный текст совпадает с оригиналом
  if (decrypted !== originalText) {
    console.error(`❌ Decrypted text mismatch: ${decrypted} !== ${originalText}`);
    return false;
  }

  console.log('✅ Encrypt/Decrypt test passed');
  return true;
}

/**
 * Тест шифрования ключей биржи
 */
function testExchangeKeysEncryption(): boolean {
  console.log('🧪 Test: Exchange Keys Encryption');

  const apiKey = 'binance-api-key-123';
  const apiSecret = 'binance-api-secret-456';
  const passphrase = 'okx-passphrase-789';
  const masterPassword = 'master-password-xyz';

  // Шифруем ключи
  const encrypted = encryptExchangeKeys(apiKey, apiSecret, masterPassword, passphrase);

  // Проверяем, что все поля зашифрованы
  if (!encrypted.apiKey || !encrypted.apiSecret || !encrypted.passphrase) {
    console.error('❌ Not all fields were encrypted');
    return false;
  }

  // Расшифровываем ключи
  const decrypted = decryptExchangeKeys(encrypted, masterPassword);

  // Проверяем, что расшифрованные ключи совпадают с оригиналами
  if (
    decrypted.apiKey !== apiKey ||
    decrypted.apiSecret !== apiSecret ||
    decrypted.passphrase !== passphrase
  ) {
    console.error('❌ Decrypted keys mismatch');
    return false;
  }

  console.log('✅ Exchange Keys Encryption test passed');
  return true;
}

/**
 * Тест генерации мастер-пароля
 */
function testMasterPasswordGeneration(): boolean {
  console.log('🧪 Test: Master Password Generation');

  const password1 = generateMasterPassword();
  const password2 = generateMasterPassword();

  // Проверяем, что пароли не пустые
  if (!password1 || !password2) {
    console.error('❌ Generated passwords are empty');
    return false;
  }

  // Проверяем, что пароли различаются
  if (password1 === password2) {
    console.error('❌ Generated passwords should be unique');
    return false;
  }

  // Проверяем длину
  if (password1.length < 20 || password2.length < 20) {
    console.error('❌ Generated passwords are too short');
    return false;
  }

  console.log('✅ Master Password Generation test passed');
  return true;
}

/**
 * Тест хеширования пароля
 */
function testPasswordHashing(): boolean {
  console.log('🧪 Test: Password Hashing');

  const password = 'my-secure-password';

  // Хешируем пароль
  const hashed = hashPassword(password);

  // Проверяем, что хеш не совпадает с паролем
  if (hashed === password) {
    console.error('❌ Hashed password should differ from original');
    return false;
  }

  // Проверяем правильный пароль
  if (!verifyPassword(password, hashed)) {
    console.error('❌ Password verification failed for correct password');
    return false;
  }

  // Проверяем неправильный пароль
  if (verifyPassword('wrong-password', hashed)) {
    console.error('❌ Password verification should fail for wrong password');
    return false;
  }

  console.log('✅ Password Hashing test passed');
  return true;
}

/**
 * Тест валидации IP адресов
 */
function testIPValidation(): boolean {
  console.log('🧪 Test: IP Validation');

  // Валидные IPv4
  const validIPs = ['192.168.1.1', '10.0.0.1', '172.16.0.1', '8.8.8.8'];

  for (const ip of validIPs) {
    if (!isValidIP(ip)) {
      console.error(`❌ Valid IP rejected: ${ip}`);
      return false;
    }
  }

  // Невалидные IP
  const invalidIPs = ['256.1.1.1', '1.1.1', 'abc.def.ghi.jkl', '192.168.1.256'];

  for (const ip of invalidIPs) {
    if (isValidIP(ip)) {
      console.error(`❌ Invalid IP accepted: ${ip}`);
      return false;
    }
  }

  console.log('✅ IP Validation test passed');
  return true;
}

/**
 * Тест IP whitelist
 */
function testIPWhitelist(): boolean {
  console.log('🧪 Test: IP Whitelist');

  const whitelist = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];

  // Проверяем IP в whitelist
  if (!isIPWhitelisted('192.168.1.1', whitelist)) {
    console.error('❌ Whitelisted IP should be allowed');
    return false;
  }

  // Проверяем IP не в whitelist
  if (isIPWhitelisted('8.8.8.8', whitelist)) {
    console.error('❌ Non-whitelisted IP should be rejected');
    return false;
  }

  console.log('✅ IP Whitelist test passed');
  return true;
}

/**
 * Тест с неправильным паролем при расшифровке
 */
function testDecryptWithWrongPassword(): boolean {
  console.log('🧪 Test: Decrypt with Wrong Password');

  const originalText = 'secret-data';
  const correctPassword = 'correct-password';
  const wrongPassword = 'wrong-password';

  const encrypted = encrypt(originalText, correctPassword);

  try {
    decrypt(encrypted, wrongPassword);
    console.error('❌ Should throw error when decrypting with wrong password');
    return false;
  } catch (error) {
    console.log('✅ Decrypt with Wrong Password test passed');
    return true;
  }
}

/**
 * Запуск всех тестов
 */
async function runTests(): Promise<void> {
  console.log('\n📊 Running Security Module Tests...\n');
  console.log('═'.repeat(60));

  const tests = [
    testEncryptDecrypt,
    testExchangeKeysEncryption,
    testMasterPasswordGeneration,
    testPasswordHashing,
    testIPValidation,
    testIPWhitelist,
    testDecryptWithWrongPassword,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ Test failed with exception:`, error);
      failed++;
    }
    console.log('');
  }

  console.log('═'.repeat(60));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.error('❌ Some tests failed!');
    process.exit(1);
  } else {
    console.log('✅ All tests passed successfully!\n');
  }
}

// Запуск тестов
runTests();
