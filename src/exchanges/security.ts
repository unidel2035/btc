/**
 * Security utilities for Exchange API
 *
 * Шифрование API ключей и секретов
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash, createHmac } from 'crypto';

/**
 * Алгоритм шифрования
 */
const ALGORITHM = 'aes-256-gcm';

/**
 * Длина IV (Initialization Vector)
 */
const IV_LENGTH = 16;

/**
 * Зашифровать данные
 * @param text Текст для шифрования
 * @param masterKey Мастер-ключ (должен быть 32 байта)
 * @returns Зашифрованные данные в формате: iv:authTag:encryptedData
 */
export function encrypt(text: string, masterKey: string): string {
  // Создать ключ из мастер-ключа
  const key = createHash('sha256').update(masterKey).digest();

  // Создать случайный IV
  const iv = randomBytes(IV_LENGTH);

  // Создать шифр
  const cipher = createCipheriv(ALGORITHM, key, iv);

  // Зашифровать
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Получить тег аутентификации
  const authTag = cipher.getAuthTag();

  // Вернуть в формате: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Расшифровать данные
 * @param encryptedText Зашифрованный текст в формате: iv:authTag:encryptedData
 * @param masterKey Мастер-ключ (должен быть 32 байта)
 * @returns Расшифрованный текст
 */
export function decrypt(encryptedText: string, masterKey: string): string {
  // Создать ключ из мастер-ключа
  const key = createHash('sha256').update(masterKey).digest();

  // Разделить encryptedText на части
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0] as string, 'hex');
  const authTag = Buffer.from(parts[1] as string, 'hex');
  const encrypted = parts[2] as string;

  // Создать дешифратор
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  // Расшифровать
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Создать HMAC SHA256 подпись
 * @param message Сообщение
 * @param secret Секретный ключ
 * @returns Подпись в hex формате
 */
export function createHmacSignature(message: string, secret: string): string {
  return createHmac('sha256', secret).update(message).digest('hex');
}

/**
 * Проверить валидность мастер-ключа
 * @param masterKey Мастер-ключ
 * @returns true если валидный
 */
export function isValidMasterKey(masterKey: string): boolean {
  return masterKey.length >= 32;
}

/**
 * Сгенерировать случайный мастер-ключ
 * @returns Мастер-ключ в hex формате
 */
export function generateMasterKey(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Хэшировать строку с использованием SHA256
 * @param text Текст для хэширования
 * @returns Хэш в hex формате
 */
export function sha256Hash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
