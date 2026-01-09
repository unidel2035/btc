// Types
export type {
  SocialPost,
  SocialCollectionResult,
  TwitterConfig,
  RedditConfig,
  TelegramConfig,
  SocialDeduplicationOptions,
  PostCallback,
  ErrorCallback,
  CollectorStats,
} from './types.js';

export { SocialPlatform } from './types.js';

// Collectors
export { TwitterCollector } from './twitter/TwitterCollector.js';
export { RedditCollector } from './reddit/RedditCollector.js';
export { TelegramCollector } from './telegram/TelegramCollector.js';

// Orchestrator
export { SocialCollectorOrchestrator } from './SocialCollectorOrchestrator.js';
export type { OrchestratorConfig } from './SocialCollectorOrchestrator.js';

// Utilities
export { RateLimiter } from './utils/rateLimiter.js';
export { withRetry, isTransientError } from './utils/retry.js';
export type { RetryOptions } from './utils/retry.js';
export { SocialLogger } from './utils/logger.js';
