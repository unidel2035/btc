/**
 * Модуль коллекторов социальных сетей
 * Экспорт основных компонентов для работы с социальными сетями
 */

export { TwitterCollector } from './twitter.js';
export { RedditCollector } from './reddit.js';
export { TelegramCollector } from './telegram.js';
export { SocialCollectorManager } from './manager.js';
export { loadSocialCollectorConfig, validateSocialCollectorConfig } from './config.js';
