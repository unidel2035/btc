/**
 * Security utilities for API key management
 * Шифрование и безопасное хранение API ключей
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
// const AUTH_TAG_LENGTH = 16;
// const SALT_LENGTH = 64;

/**
 * Получить ключ шифрования из переменной окружения или сгенерировать новый
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (key) {
    return crypto.scryptSync(key, 'salt', KEY_LENGTH);
  }

  // В production обязательно должен быть установлен ENCRYPTION_KEY
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_KEY must be set in production environment');
  }

  // В dev режиме генерируем временный ключ
  console.warn('⚠️  Using temporary encryption key. Set ENCRYPTION_KEY in production!');
  return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Зашифровать данные
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Формат: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Расшифровать данные
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format');
  }

  const iv = Buffer.from(parts[0]!, 'hex');
  const authTag = Buffer.from(parts[1]!, 'hex');
  const encrypted = parts[2]!;

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Проверить, зашифрованы ли данные
 */
export function isEncrypted(text: string): boolean {
  const parts = text.split(':');
  return parts.length === 3 && parts.every((part) => /^[0-9a-f]+$/.test(part));
}

/**
 * Безопасно получить API ключ (расшифровать если нужно)
 */
export function getApiKey(keyOrEncrypted: string): string {
  if (!keyOrEncrypted) {
    throw new Error('API key is required');
  }

  if (isEncrypted(keyOrEncrypted)) {
    return decrypt(keyOrEncrypted);
  }

  return keyOrEncrypted;
}

/**
 * Создать HMAC подпись для запроса
 */
export function createHmacSignature(secret: string, message: string): string {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

/**
 * Создать RSA подпись (для некоторых бирж)
 */
export function createRsaSignature(privateKey: string, message: string): string {
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(message);
  return sign.sign(privateKey, 'base64');
}

/**
 * Валидировать IP whitelist
 */
export function validateIpWhitelist(ip: string, whitelist: string[]): boolean {
  if (whitelist.length === 0) {
    return true;
  }

  return whitelist.some((allowedIp) => {
    // Поддержка CIDR нотации
    if (allowedIp.includes('/')) {
      // TODO: Implement CIDR matching if needed
      return false;
    }
    return ip === allowedIp;
  });
}

/**
 * Маскировать API ключ для логирования
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) {
    return '***';
  }
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
}

/**
 * Генерировать случайный client order ID
 */
export function generateClientOrderId(prefix = 'order'): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Хеш для кеширования
 */
export function createCacheKey(...parts: (string | number)[]): string {
  return crypto.createHash('sha256').update(parts.join(':')).digest('hex').substring(0, 16);
}
