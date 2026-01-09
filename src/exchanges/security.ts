import crypto from 'crypto';

/**
 * Модуль для шифрования API ключей и секретов
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Генерация ключа шифрования из мастер-пароля
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Зашифрованные данные
 */
export interface EncryptedData {
  encrypted: string; // base64
  iv: string; // base64
  tag: string; // base64
  salt: string; // base64
}

/**
 * Шифрование строки
 */
export function encrypt(text: string, masterPassword: string): EncryptedData {
  // Генерируем соль и IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Получаем ключ из мастер-пароля
  const key = deriveKey(masterPassword, salt);

  // Создаем cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Шифруем данные
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  // Получаем authentication tag
  const tag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    salt: salt.toString('base64'),
  };
}

/**
 * Расшифровка строки
 */
export function decrypt(encryptedData: EncryptedData, masterPassword: string): string {
  // Декодируем данные из base64
  const salt = Buffer.from(encryptedData.salt, 'base64');
  const iv = Buffer.from(encryptedData.iv, 'base64');
  const tag = Buffer.from(encryptedData.tag, 'base64');

  // Получаем ключ из мастер-пароля
  const key = deriveKey(masterPassword, salt);

  // Создаем decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  // Расшифровываем данные
  let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Шифрование API ключей биржи
 */
export interface EncryptedExchangeKeys {
  apiKey: EncryptedData;
  apiSecret: EncryptedData;
  passphrase?: EncryptedData;
}

/**
 * Шифрование ключей биржи
 */
export function encryptExchangeKeys(
  apiKey: string,
  apiSecret: string,
  masterPassword: string,
  passphrase?: string,
): EncryptedExchangeKeys {
  const result: EncryptedExchangeKeys = {
    apiKey: encrypt(apiKey, masterPassword),
    apiSecret: encrypt(apiSecret, masterPassword),
  };

  if (passphrase) {
    result.passphrase = encrypt(passphrase, masterPassword);
  }

  return result;
}

/**
 * Расшифровка ключей биржи
 */
export function decryptExchangeKeys(
  encryptedKeys: EncryptedExchangeKeys,
  masterPassword: string,
): {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
} {
  const result = {
    apiKey: decrypt(encryptedKeys.apiKey, masterPassword),
    apiSecret: decrypt(encryptedKeys.apiSecret, masterPassword),
    passphrase: encryptedKeys.passphrase
      ? decrypt(encryptedKeys.passphrase, masterPassword)
      : undefined,
  };

  return result;
}

/**
 * Генерация случайного мастер-пароля
 */
export function generateMasterPassword(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64');
}

/**
 * Хеширование строки (для хранения паролей)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');

  return `${salt.toString('base64')}:${hash.toString('base64')}`;
}

/**
 * Проверка пароля
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [saltB64, hashB64] = hashedPassword.split(':');
  const salt = Buffer.from(saltB64, 'base64');
  const hash = Buffer.from(hashB64, 'base64');

  const derivedHash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');

  return crypto.timingSafeEqual(hash, derivedHash);
}

/**
 * Валидация IP адреса (для IP whitelist)
 */
export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.');
    return parts.every((part) => parseInt(part) >= 0 && parseInt(part) <= 255);
  }

  return ipv6Regex.test(ip);
}

/**
 * Проверка IP в whitelist
 */
export function isIPWhitelisted(ip: string, whitelist: string[]): boolean {
  return whitelist.includes(ip);
}
