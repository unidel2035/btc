import { TwitterApi, TweetV2, UserV2 } from 'twitter-api-v2';
import { ICollector, SocialPost, CollectorConfig, CollectorStats } from '../types';
import { RateLimiter, createTwitterRateLimiter } from '../utils/rateLimiter';
import { retryOnTransientError } from '../utils/retry';
import { Logger, createLogger } from '../utils/logger';

/**
 * Конфигурация Twitter коллектора
 */
export interface TwitterCollectorConfig extends CollectorConfig {
  /** Bearer token для Twitter API v2 */
  bearerToken: string;

  /** Список аккаунтов для отслеживания */
  accounts?: string[];

  /** Список хештегов для отслеживания */
  hashtags?: string[];

  /** Максимальное количество твитов за запрос */
  maxResults?: number;
}

/**
 * Коллектор для Twitter/X API v2
 */
export class TwitterCollector implements ICollector {
  public readonly name = 'Twitter';

  private client: TwitterApi;
  private config: TwitterCollectorConfig;
  private rateLimiter: RateLimiter;
  private logger: Logger;
  private running = false;
  private intervalId?: NodeJS.Timeout;
  private stats: CollectorStats;

  constructor(config: TwitterCollectorConfig) {
    this.config = {
      pollInterval: 60000, // По умолчанию 1 минута
      batchSize: 10,
      enabled: true,
      maxResults: 10,
      accounts: ['whale_alert', 'VitalikButerin', 'CZ_Binance'],
      hashtags: ['Bitcoin', 'BTC', 'Crypto'],
      ...config,
    };

    this.client = new TwitterApi(this.config.bearerToken);
    this.rateLimiter = createTwitterRateLimiter();
    this.logger = createLogger('TwitterCollector');

    this.stats = {
      name: this.name,
      totalPosts: 0,
      successfulRequests: 0,
      failedRequests: 0,
      status: 'stopped',
    };
  }

  /**
   * Инициализация коллектора
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Twitter collector...');

    try {
      // Проверка авторизации
      await this.rateLimiter.schedule(async () => {
        await this.client.v2.me();
      });

      this.logger.info('Twitter collector initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Twitter collector', error);
      throw error;
    }
  }

  /**
   * Начать сбор данных
   */
  async start(): Promise<void> {
    if (this.running) {
      this.logger.warn('Collector is already running');
      return;
    }

    if (!this.config.enabled) {
      this.logger.warn('Collector is disabled');
      return;
    }

    this.running = true;
    this.stats.status = 'running';
    this.logger.info('Starting Twitter collector...');

    // Первый сбор сразу
    await this.collectOnce();

    // Затем по расписанию
    this.intervalId = setInterval(() => {
      this.collectOnce().catch(error => {
        this.logger.error('Error in scheduled collection', error);
      });
    }, this.config.pollInterval);
  }

  /**
   * Остановить коллектор
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping Twitter collector...');
    this.running = false;
    this.stats.status = 'stopped';

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    await this.rateLimiter.stop();
    this.logger.info('Twitter collector stopped');
  }

  /**
   * Проверка статуса
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Получить статистику
   */
  getStats(): CollectorStats {
    return { ...this.stats, lastRequest: this.stats.lastRequest };
  }

  /**
   * Сбор данных (один раз)
   */
  async collect(): Promise<SocialPost[]> {
    return this.collectOnce();
  }

  /**
   * Выполнить один цикл сбора
   */
  private async collectOnce(): Promise<SocialPost[]> {
    this.logger.info('Starting collection cycle...');
    const allPosts: SocialPost[] = [];

    try {
      // Сбор по аккаунтам
      if (this.config.accounts && this.config.accounts.length > 0) {
        const accountPosts = await this.collectFromAccounts(this.config.accounts);
        allPosts.push(...accountPosts);
      }

      // Сбор по хештегам
      if (this.config.hashtags && this.config.hashtags.length > 0) {
        const hashtagPosts = await this.collectFromHashtags(this.config.hashtags);
        allPosts.push(...hashtagPosts);
      }

      this.stats.successfulRequests++;
      this.stats.totalPosts += allPosts.length;
      this.stats.lastRequest = new Date();

      this.logger.info(`Collected ${allPosts.length} posts`);
      return allPosts;
    } catch (error) {
      this.stats.failedRequests++;
      this.logger.error('Collection cycle failed', error);
      throw error;
    }
  }

  /**
   * Собрать твиты от указанных аккаунтов
   */
  private async collectFromAccounts(accounts: string[]): Promise<SocialPost[]> {
    const posts: SocialPost[] = [];

    for (const username of accounts) {
      try {
        const accountPosts = await retryOnTransientError(async () => {
          return this.rateLimiter.schedule(async () => {
            this.logger.debug(`Fetching tweets from @${username}`);

            // Получить пользователя
            const user = await this.client.v2.userByUsername(username, {
              'user.fields': ['public_metrics'],
            });

            if (!user.data) {
              this.logger.warn(`User @${username} not found`);
              return [];
            }

            // Получить твиты
            const tweets = await this.client.v2.userTimeline(user.data.id, {
              max_results: this.config.maxResults || 10,
              'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
              exclude: ['replies', 'retweets'],
            });

            return this.processTweets(tweets.data.data || [], user.data);
          });
        });

        posts.push(...accountPosts);
      } catch (error) {
        this.logger.error(`Failed to collect from @${username}`, error);
      }
    }

    return posts;
  }

  /**
   * Собрать твиты по хештегам
   */
  private async collectFromHashtags(hashtags: string[]): Promise<SocialPost[]> {
    const posts: SocialPost[] = [];

    for (const hashtag of hashtags) {
      try {
        const hashtagPosts = await retryOnTransientError(async () => {
          return this.rateLimiter.schedule(async () => {
            this.logger.debug(`Fetching tweets for #${hashtag}`);

            const query = `#${hashtag} -is:retweet -is:reply`;
            const tweets = await this.client.v2.search(query, {
              max_results: this.config.maxResults || 10,
              'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
              'user.fields': ['public_metrics', 'username'],
              expansions: ['author_id'],
            });

            const users = tweets.includes?.users || [];
            return this.processTweets(tweets.data.data || [], undefined, users);
          });
        });

        posts.push(...hashtagPosts);
      } catch (error) {
        this.logger.error(`Failed to collect for #${hashtag}`, error);
      }
    }

    return posts;
  }

  /**
   * Обработать твиты и преобразовать в SocialPost
   */
  private processTweets(
    tweets: TweetV2[],
    user?: UserV2,
    users?: UserV2[]
  ): SocialPost[] {
    return tweets.map(tweet => {
      const author = user || users?.find(u => u.id === tweet.author_id);
      const username = author?.username || 'unknown';
      const followers = author?.public_metrics?.followers_count;

      return {
        id: tweet.id,
        platform: 'twitter' as const,
        author: username,
        authorFollowers: followers,
        content: tweet.text,
        engagement: {
          likes: tweet.public_metrics?.like_count || 0,
          comments: tweet.public_metrics?.reply_count || 0,
          shares: tweet.public_metrics?.retweet_count || 0,
        },
        timestamp: tweet.created_at ? new Date(tweet.created_at) : new Date(),
        url: `https://twitter.com/${username}/status/${tweet.id}`,
      };
    });
  }
}
