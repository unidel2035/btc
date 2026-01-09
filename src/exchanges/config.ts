import dotenv from 'dotenv';
import { ExchangeName, MarketType, type ExchangeConfig } from './types.js';

// Загружаем переменные окружения
dotenv.config();

/**
 * Получение конфигурации Binance из переменных окружения
 */
export function getBinanceConfig(testnet: boolean = false): ExchangeConfig {
  return {
    name: ExchangeName.BINANCE,
    apiKey: process.env.BINANCE_API_KEY || '',
    apiSecret: process.env.BINANCE_SECRET || '',
    testnet: testnet || process.env.BINANCE_TESTNET === 'true',
    timeout: 10000,
    recvWindow: 5000,
    enableRateLimit: true,
    rateLimit: 1200, // 1200 requests per minute
  };
}

/**
 * Получение конфигурации Bybit из переменных окружения
 */
export function getBybitConfig(testnet: boolean = false): ExchangeConfig {
  return {
    name: ExchangeName.BYBIT,
    apiKey: process.env.BYBIT_API_KEY || '',
    apiSecret: process.env.BYBIT_SECRET || '',
    testnet: testnet || process.env.BYBIT_TESTNET === 'true',
    timeout: 10000,
    recvWindow: 5000,
    enableRateLimit: true,
    rateLimit: 600, // 600 requests per minute
  };
}

/**
 * Получение конфигурации OKX из переменных окружения
 */
export function getOKXConfig(testnet: boolean = false): ExchangeConfig {
  return {
    name: ExchangeName.OKX,
    apiKey: process.env.OKX_API_KEY || '',
    apiSecret: process.env.OKX_SECRET || '',
    passphrase: process.env.OKX_PASSPHRASE || '',
    testnet: testnet || process.env.OKX_TESTNET === 'true',
    timeout: 10000,
    enableRateLimit: true,
    rateLimit: 600, // 600 requests per minute
  };
}

/**
 * Проверка валидности конфигурации
 */
export function validateConfig(config: ExchangeConfig): boolean {
  if (!config.apiKey || !config.apiSecret) {
    console.error(`[${config.name}] Missing API key or secret`);
    return false;
  }

  if (config.name === ExchangeName.OKX && !config.passphrase) {
    console.error(`[${config.name}] Missing passphrase`);
    return false;
  }

  return true;
}

/**
 * Получение всех включенных конфигураций бирж
 */
export function getEnabledExchangeConfigs(): Array<{
  config: ExchangeConfig;
  marketTypes: MarketType[];
}> {
  const configs: Array<{ config: ExchangeConfig; marketTypes: MarketType[] }> = [];

  // Binance
  const binanceConfig = getBinanceConfig();
  if (validateConfig(binanceConfig)) {
    configs.push({
      config: binanceConfig,
      marketTypes: [MarketType.SPOT, MarketType.FUTURES],
    });
  }

  // Bybit
  const bybitConfig = getBybitConfig();
  if (validateConfig(bybitConfig)) {
    configs.push({
      config: bybitConfig,
      marketTypes: [MarketType.SPOT, MarketType.FUTURES],
    });
  }

  // OKX (пока не реализован)
  // const okxConfig = getOKXConfig();
  // if (validateConfig(okxConfig)) {
  //   configs.push({
  //     config: okxConfig,
  //     marketTypes: [MarketType.SPOT, MarketType.FUTURES],
  //   });
  // }

  return configs;
}

/**
 * Логирование активных конфигураций (без секретов)
 */
export function logActiveConfigs(): void {
  console.info('📊 Active Exchange Configurations:');
  console.info('═'.repeat(60));

  const configs = getEnabledExchangeConfigs();

  if (configs.length === 0) {
    console.warn('⚠️  No valid exchange configurations found');
    console.info('Please set API keys in .env file');
    return;
  }

  for (const { config, marketTypes } of configs) {
    const apiKeyMasked = config.apiKey ? `${config.apiKey.slice(0, 8)}...` : 'NOT SET';
    const testnetStatus = config.testnet ? '🧪 TESTNET' : '🔴 PRODUCTION';

    console.info(`✅ ${config.name.toUpperCase()}`);
    console.info(`   API Key: ${apiKeyMasked}`);
    console.info(`   Status: ${testnetStatus}`);
    console.info(`   Markets: ${marketTypes.join(', ')}`);
    console.info(`   Rate Limit: ${config.rateLimit} req/min`);
  }

  console.info('═'.repeat(60));
}
