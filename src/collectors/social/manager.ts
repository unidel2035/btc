import { SocialPost } from '../../types/social.js';
import { SocialCollector } from '../base.js';
import { TwitterCollector } from './twitter.js';
import { RedditCollector } from './reddit.js';
import { TelegramCollector } from './telegram.js';
import { loadSocialCollectorConfig, validateSocialCollectorConfig } from './config.js';

/**
 * Менеджер социальных коллекторов
 * Управляет жизненным циклом всех коллекторов социальных сетей
 */
export class SocialCollectorManager {
  private collectors: Map<string, SocialCollector> = new Map();
  private subscribers: Array<(post: SocialPost) => void> = [];
  private isRunning = false;

  constructor() {
    this.initializeCollectors();
  }

  /**
   * Инициализация коллекторов на основе конфигурации
   */
  private initializeCollectors(): void {
    const config = loadSocialCollectorConfig();

    if (!config.enabled) {
      console.info('Social collectors are disabled in configuration');
      return;
    }

    // Валидация конфигурации
    const errors = validateSocialCollectorConfig(config);
    if (errors.length > 0) {
      console.error('Social collector configuration errors:');
      for (const error of errors) {
        console.error(`  - ${error}`);
      }
      throw new Error('Invalid social collector configuration');
    }

    // Инициализация Twitter коллектора
    if (config.twitter) {
      try {
        const collector = new TwitterCollector(config.twitter);
        this.collectors.set('twitter', collector);
        console.info('Twitter collector initialized');
      } catch (error) {
        console.error('Failed to initialize Twitter collector:', error);
      }
    }

    // Инициализация Reddit коллектора
    if (config.reddit) {
      try {
        const collector = new RedditCollector(config.reddit);
        this.collectors.set('reddit', collector);
        console.info('Reddit collector initialized');
      } catch (error) {
        console.error('Failed to initialize Reddit collector:', error);
      }
    }

    // Инициализация Telegram коллектора
    if (config.telegram) {
      try {
        const collector = new TelegramCollector(config.telegram);
        this.collectors.set('telegram', collector);
        console.info('Telegram collector initialized');
      } catch (error) {
        console.error('Failed to initialize Telegram collector:', error);
      }
    }

    console.info(`Initialized ${this.collectors.size} social collector(s)`);
  }

  /**
   * Запуск всех коллекторов
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Social collector manager is already running');
      return;
    }

    if (this.collectors.size === 0) {
      console.warn('No social collectors configured');
      return;
    }

    console.info('Starting social collectors...');

    // Подписка коллекторов на обработчик постов
    for (const collector of this.collectors.values()) {
      collector.subscribe(this.handleNewPost.bind(this));
    }

    // Запуск всех коллекторов параллельно
    const startPromises = Array.from(this.collectors.entries()).map(async ([name, collector]) => {
      try {
        await collector.start();
        console.info(`✓ ${name} collector started`);
      } catch (error) {
        console.error(`✗ Failed to start ${name} collector:`, error);
      }
    });

    await Promise.allSettled(startPromises);

    this.isRunning = true;
    console.info('Social collector manager started successfully');
  }

  /**
   * Остановка всех коллекторов
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.warn('Social collector manager is not running');
      return;
    }

    console.info('Stopping social collectors...');

    // Остановка всех коллекторов параллельно
    const stopPromises = Array.from(this.collectors.entries()).map(async ([name, collector]) => {
      try {
        await collector.stop();
        console.info(`✓ ${name} collector stopped`);
      } catch (error) {
        console.error(`✗ Failed to stop ${name} collector:`, error);
      }
    });

    await Promise.allSettled(stopPromises);

    this.isRunning = false;
    console.info('Social collector manager stopped');
  }

  /**
   * Получение постов из всех коллекторов
   */
  async fetchAllPosts(limit = 50): Promise<SocialPost[]> {
    const allPosts: SocialPost[] = [];

    const fetchPromises = Array.from(this.collectors.entries()).map(async ([name, collector]) => {
      try {
        const posts = await collector.fetchPosts(limit);
        allPosts.push(...posts);
      } catch (error) {
        console.error(`Error fetching posts from ${name}:`, error);
      }
    });

    await Promise.allSettled(fetchPromises);

    // Сортировка по времени и ограничение количества
    return allPosts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
  }

  /**
   * Подписка на новые посты от всех коллекторов
   */
  subscribe(callback: (post: SocialPost) => void): void {
    this.subscribers.push(callback);
  }

  /**
   * Отписка от получения новых постов
   */
  unsubscribe(): void {
    this.subscribers = [];
  }

  /**
   * Получение статуса коллекторов
   */
  getStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};

    for (const [name, collector] of this.collectors.entries()) {
      status[name] = collector.isRunning();
    }

    return status;
  }

  /**
   * Обработка нового поста от коллектора
   */
  private handleNewPost(post: SocialPost): void {
    console.info(`New post from ${post.platform}: ${post.content.substring(0, 50)}...`);

    // Уведомление всех подписчиков
    for (const subscriber of this.subscribers) {
      try {
        subscriber(post);
      } catch (error) {
        console.error('Error in subscriber callback:', error);
      }
    }
  }
}
