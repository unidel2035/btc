/**
 * Exchange Configuration
 *
 * Конфигурация бирж для торгового бота
 */

import type { ExchangeManagerConfig } from './ExchangeManager.js';

/**
 * Создать конфигурацию Exchange Manager из переменных окружения
 */
export function createExchangeConfig(): ExchangeManagerConfig {
  const config: ExchangeManagerConfig = {
    masterKey: process.env.EXCHANGE_MASTER_KEY,
    enableLogging: process.env.EXCHANGE_LOGGING === 'true',
    exchanges: {},
  };

  // Binance конфигурация
  if (process.env.BINANCE_API_KEY && process.env.BINANCE_SECRET) {
    config.exchanges.binance = {
      apiKey: process.env.BINANCE_API_KEY,
      apiSecret: process.env.BINANCE_SECRET,
      testnet: process.env.BINANCE_TESTNET === 'true',
      encrypted: process.env.BINANCE_ENCRYPTED === 'true',
    };
  }

  // Bybit конфигурация
  if (process.env.BYBIT_API_KEY && process.env.BYBIT_SECRET) {
    config.exchanges.bybit = {
      apiKey: process.env.BYBIT_API_KEY,
      apiSecret: process.env.BYBIT_SECRET,
      testnet: process.env.BYBIT_TESTNET === 'true',
      encrypted: process.env.BYBIT_ENCRYPTED === 'true',
    };
  }

  return config;
}

/**
 * Валидировать конфигурацию бирж
 */
export function validateExchangeConfig(config: ExchangeManagerConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Проверить что хотя бы одна биржа настроена
  if (Object.keys(config.exchanges).length === 0) {
    errors.push('No exchanges configured. Please set API keys in environment variables.');
  }

  // Проверить Binance
  if (config.exchanges.binance) {
    if (!config.exchanges.binance.apiKey || config.exchanges.binance.apiKey.trim() === '') {
      errors.push('Binance API key is empty');
    }
    if (!config.exchanges.binance.apiSecret || config.exchanges.binance.apiSecret.trim() === '') {
      errors.push('Binance API secret is empty');
    }
  }

  // Проверить Bybit
  if (config.exchanges.bybit) {
    if (!config.exchanges.bybit.apiKey || config.exchanges.bybit.apiKey.trim() === '') {
      errors.push('Bybit API key is empty');
    }
    if (!config.exchanges.bybit.apiSecret || config.exchanges.bybit.apiSecret.trim() === '') {
      errors.push('Bybit API secret is empty');
    }
  }

  // Проверить мастер-ключ если используется шифрование
  const needsMasterKey =
    (config.exchanges.binance?.encrypted || config.exchanges.bybit?.encrypted) ?? false;

  if (needsMasterKey && !config.masterKey) {
    errors.push('Master key is required when encrypted credentials are used');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Получить доступные биржи из конфигурации
 */
export function getAvailableExchanges(config: ExchangeManagerConfig): string[] {
  return Object.keys(config.exchanges);
}

/**
 * Проверить доступна ли определенная биржа
 */
export function isExchangeAvailable(config: ExchangeManagerConfig, exchange: string): boolean {
  return exchange in config.exchanges;
}
