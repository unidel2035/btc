/**
 * Экспорты модуля интеграции с биржами
 */

// Типы
export * from './types.js';

// Базовый класс
export { BaseExchange } from './BaseExchange.js';

// Реализации бирж
export { BinanceExchange } from './BinanceExchange.js';
export { BybitExchange } from './BybitExchange.js';

// Менеджер бирж
export { ExchangeManager } from './ExchangeManager.js';

// Конфигурация
export {
  getBinanceConfig,
  getBybitConfig,
  getOKXConfig,
  validateConfig,
  getEnabledExchangeConfigs,
  logActiveConfigs,
} from './config.js';

// Безопасность
export {
  encrypt,
  decrypt,
  encryptExchangeKeys,
  decryptExchangeKeys,
  generateMasterPassword,
  hashPassword,
  verifyPassword,
  isValidIP,
  isIPWhitelisted,
  type EncryptedData,
  type EncryptedExchangeKeys,
} from './security.js';
