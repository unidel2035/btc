/**
 * Social Media Collectors Module
 *
 * Модуль для мониторинга криптовалютных обсуждений в социальных сетях
 */

// Types
export * from './types';

// Collectors
export { TwitterCollector } from './twitter/TwitterCollector';
export type { TwitterCollectorConfig } from './twitter/TwitterCollector';

export { RedditCollector } from './reddit/RedditCollector';
export type { RedditCollectorConfig } from './reddit/RedditCollector';

export { TelegramCollector } from './telegram/TelegramCollector';
export type { TelegramCollectorConfig } from './telegram/TelegramCollector';

// Orchestrator
export { SocialCollectorOrchestrator } from './SocialCollectorOrchestrator';
export type { OrchestratorConfig } from './SocialCollectorOrchestrator';

// Utils
export { RateLimiter, createTwitterRateLimiter, createRedditRateLimiter, createTelegramRateLimiter } from './utils/rateLimiter';
export { retryWithBackoff, retryOnTransientError, isTransientError, sleep, Retry } from './utils/retry';
export { Logger, createLogger, LogLevel } from './utils/logger';
