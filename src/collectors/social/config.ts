import {
  SocialCollectorConfig,
  TwitterConfig,
  RedditConfig,
  TelegramConfig,
} from '../../types/social.js';

/**
 * Загрузка конфигурации из переменных окружения
 */
export function loadSocialCollectorConfig(): SocialCollectorConfig {
  return {
    enabled: process.env.SOCIAL_COLLECTOR_ENABLED === 'true',
    twitter: loadTwitterConfig(),
    reddit: loadRedditConfig(),
    telegram: loadTelegramConfig(),
  };
}

/**
 * Загрузка конфигурации Twitter
 */
function loadTwitterConfig(): TwitterConfig | undefined {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;

  if (!bearerToken) {
    return undefined;
  }

  return {
    bearerToken,
    accounts: parseStringArray(process.env.TWITTER_ACCOUNTS),
    hashtags: parseStringArray(process.env.TWITTER_HASHTAGS),
    maxResults: parseInt(process.env.TWITTER_MAX_RESULTS || '10', 10),
    pollingInterval: parseInt(process.env.TWITTER_POLLING_INTERVAL || '60000', 10),
  };
}

/**
 * Загрузка конфигурации Reddit
 */
function loadRedditConfig(): RedditConfig | undefined {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;

  if (!clientId || !clientSecret || !username || !password) {
    return undefined;
  }

  return {
    clientId,
    clientSecret,
    username,
    password,
    subreddits: parseStringArray(process.env.REDDIT_SUBREDDITS),
    limit: parseInt(process.env.REDDIT_LIMIT || '25', 10),
    pollingInterval: parseInt(process.env.REDDIT_POLLING_INTERVAL || '120000', 10),
  };
}

/**
 * Загрузка конфигурации Telegram
 */
function loadTelegramConfig(): TelegramConfig | undefined {
  const apiId = process.env.TELEGRAM_API_ID;
  const apiHash = process.env.TELEGRAM_API_HASH;

  if (!apiId || !apiHash) {
    return undefined;
  }

  return {
    apiId: parseInt(apiId, 10),
    apiHash,
    channels: parseStringArray(process.env.TELEGRAM_CHANNELS),
    pollingInterval: parseInt(process.env.TELEGRAM_POLLING_INTERVAL || '30000', 10),
  };
}

/**
 * Парсинг строки с массивом значений, разделенных запятыми
 */
function parseStringArray(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Валидация конфигурации
 */
export function validateSocialCollectorConfig(config: SocialCollectorConfig): string[] {
  const errors: string[] = [];

  if (!config.enabled) {
    return errors;
  }

  // Проверка наличия хотя бы одного настроенного коллектора
  if (!config.twitter && !config.reddit && !config.telegram) {
    errors.push(
      'At least one social collector must be configured when SOCIAL_COLLECTOR_ENABLED is true',
    );
  }

  // Валидация Twitter
  if (config.twitter) {
    if (config.twitter.accounts.length === 0 && config.twitter.hashtags.length === 0) {
      errors.push('Twitter collector requires at least one account or hashtag');
    }
  }

  // Валидация Reddit
  if (config.reddit) {
    if (config.reddit.subreddits.length === 0) {
      errors.push('Reddit collector requires at least one subreddit');
    }
  }

  // Валидация Telegram
  if (config.telegram) {
    if (config.telegram.channels.length === 0) {
      errors.push('Telegram collector requires at least one channel');
    }
  }

  return errors;
}
