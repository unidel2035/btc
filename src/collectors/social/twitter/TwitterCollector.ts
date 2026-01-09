import { randomUUID } from 'crypto';
import type { SocialPost, TwitterConfig, SocialCollectionResult, SocialDeduplicationOptions } from '../types.js';
import { SocialPlatform } from '../types.js';
import { RateLimiter } from '../utils/rateLimiter.js';
import { withRetry } from '../utils/retry.js';
import { SocialLogger } from '../utils/logger.js';

/**
 * Twitter API v2 Response Types
 */
interface TwitterUser {
  id: string;
  username: string;
  public_metrics?: {
    followers_count: number;
  };
}

interface TwitterTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics: {
    like_count: number;
    reply_count: number;
    retweet_count: number;
  };
}

interface TwitterApiResponse {
  data: TwitterTweet[];
  includes?: {
    users: TwitterUser[];
  };
}

/**
 * Twitter Collector для мониторинга твитов
 */
export class TwitterCollector {
  private config: TwitterConfig;
  private rateLimiter: RateLimiter;
  private logger: SocialLogger;
  private seenIds: Set<string>;
  private intervalId?: NodeJS.Timeout;

  constructor(config: TwitterConfig) {
    this.config = {
      maxResults: 10,
      pollInterval: 60000, // 1 минута по умолчанию
      ...config,
    };

    // Twitter API v2: 15 requests per 15 minutes для user timeline
    this.rateLimiter = new RateLimiter(15, 15 * 60 * 1000);
    this.logger = new SocialLogger(SocialPlatform.TWITTER);
    this.seenIds = new Set();
  }

  /**
   * Сбор твитов от указанных аккаунтов
   */
  async collectFromAccounts(): Promise<SocialPost[]> {
    if (!this.config.accounts || this.config.accounts.length === 0) {
      this.logger.warn('No accounts configured for monitoring');
      return [];
    }

    const allPosts: SocialPost[] = [];

    for (const account of this.config.accounts) {
      try {
        const posts = await this.fetchUserTimeline(account);
        allPosts.push(...posts);
      } catch (error) {
        this.logger.error(`Failed to collect from account ${account}`, error);
      }
    }

    return allPosts;
  }

  /**
   * Сбор твитов по хештегам
   */
  async collectFromHashtags(): Promise<SocialPost[]> {
    if (!this.config.hashtags || this.config.hashtags.length === 0) {
      this.logger.warn('No hashtags configured for monitoring');
      return [];
    }

    const allPosts: SocialPost[] = [];

    for (const hashtag of this.config.hashtags) {
      try {
        const posts = await this.searchByHashtag(hashtag);
        allPosts.push(...posts);
      } catch (error) {
        this.logger.error(`Failed to collect hashtag ${hashtag}`, error);
      }
    }

    return allPosts;
  }

  /**
   * Получение timeline пользователя
   */
  private async fetchUserTimeline(username: string): Promise<SocialPost[]> {
    return withRetry(async () => {
      return this.rateLimiter.execute(async () => {
        this.logger.debug(`Fetching timeline for @${username}`);

        // Сначала получаем ID пользователя
        const userId = await this.getUserId(username);

        // Затем получаем твиты
        const url = `https://api.twitter.com/2/users/${userId}/tweets`;
        const params = new URLSearchParams({
          max_results: String(this.config.maxResults),
          'tweet.fields': 'created_at,public_metrics,author_id',
          expansions: 'author_id',
          'user.fields': 'public_metrics',
        });

        const response = await fetch(`${url}?${params}`, {
          headers: {
            Authorization: `Bearer ${this.config.bearerToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as TwitterApiResponse;
        return this.transformTweets(data);
      });
    });
  }

  /**
   * Поиск твитов по хештегу
   */
  private async searchByHashtag(hashtag: string): Promise<SocialPost[]> {
    return withRetry(async () => {
      return this.rateLimiter.execute(async () => {
        this.logger.debug(`Searching for hashtag #${hashtag}`);

        const query = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
        const url = 'https://api.twitter.com/2/tweets/search/recent';
        const params = new URLSearchParams({
          query,
          max_results: String(this.config.maxResults),
          'tweet.fields': 'created_at,public_metrics,author_id',
          expansions: 'author_id',
          'user.fields': 'public_metrics',
        });

        const response = await fetch(`${url}?${params}`, {
          headers: {
            Authorization: `Bearer ${this.config.bearerToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as TwitterApiResponse;
        return this.transformTweets(data);
      });
    });
  }

  /**
   * Получение ID пользователя по username
   */
  private async getUserId(username: string): Promise<string> {
    const cleanUsername = username.replace('@', '');
    const url = `https://api.twitter.com/2/users/by/username/${cleanUsername}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.config.bearerToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user ID for @${username}: ${response.status}`);
    }

    const data = (await response.json()) as { data: { id: string } };
    return data.data.id;
  }

  /**
   * Преобразование Twitter API response в SocialPost[]
   */
  private transformTweets(data: TwitterApiResponse): SocialPost[] {
    if (!data.data || data.data.length === 0) {
      return [];
    }

    const users = new Map<string, TwitterUser>();
    if (data.includes?.users) {
      for (const user of data.includes.users) {
        users.set(user.id, user);
      }
    }

    const posts: SocialPost[] = [];

    for (const tweet of data.data) {
      const user = users.get(tweet.author_id);

      posts.push({
        id: tweet.id,
        platform: 'twitter',
        author: user?.username || tweet.author_id,
        authorFollowers: user?.public_metrics?.followers_count,
        content: tweet.text,
        engagement: {
          likes: tweet.public_metrics.like_count,
          comments: tweet.public_metrics.reply_count,
          shares: tweet.public_metrics.retweet_count,
        },
        timestamp: new Date(tweet.created_at),
        url: `https://twitter.com/i/web/status/${tweet.id}`,
      });
    }

    return posts;
  }

  /**
   * Запуск периодического сбора
   */
  async run(
    onPosts?: (posts: SocialPost[]) => void | Promise<void>,
    deduplicationOptions: SocialDeduplicationOptions = {
      checkId: true,
      checkContent: false,
    },
  ): Promise<SocialCollectionResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let totalPosts = 0;
    let duplicatesSkipped = 0;

    try {
      this.logger.info('Starting Twitter collection...');

      // Собираем из всех источников
      const accountPosts = await this.collectFromAccounts();
      const hashtagPosts = await this.collectFromHashtags();
      const allPosts = [...accountPosts, ...hashtagPosts];

      this.logger.info(`Collected ${allPosts.length} raw tweets`);

      // Дедупликация
      const uniquePosts: SocialPost[] = [];
      for (const post of allPosts) {
        if (this.isDuplicate(post, deduplicationOptions)) {
          duplicatesSkipped++;
          continue;
        }

        uniquePosts.push(post);
        if (deduplicationOptions.checkId) {
          this.seenIds.add(post.id);
        }
      }

      totalPosts = uniquePosts.length;

      // Callback с результатами
      if (onPosts && uniquePosts.length > 0) {
        await onPosts(uniquePosts);
      }

      const duration = Date.now() - startTime;
      this.logger.info(`Completed in ${duration}ms. Unique: ${totalPosts}, Duplicates: ${duplicatesSkipped}`);

      return {
        platform: SocialPlatform.TWITTER,
        success: true,
        postsCount: totalPosts,
        duplicatesSkipped,
        collectedAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Collection failed', error);

      errors.push(errorMessage);

      return {
        platform: SocialPlatform.TWITTER,
        success: false,
        postsCount: 0,
        duplicatesSkipped: 0,
        errors,
        collectedAt: new Date(),
      };
    }
  }

  /**
   * Запуск с периодическим опросом
   */
  startPolling(
    onPosts?: (posts: SocialPost[]) => void | Promise<void>,
    deduplicationOptions?: SocialDeduplicationOptions,
  ): void {
    if (this.intervalId) {
      this.logger.warn('Polling already started');
      return;
    }

    this.logger.info(`Starting polling with interval ${this.config.pollInterval}ms`);

    // Первый запуск сразу
    void this.run(onPosts, deduplicationOptions);

    // Периодические запуски
    this.intervalId = setInterval(() => {
      void this.run(onPosts, deduplicationOptions);
    }, this.config.pollInterval);
  }

  /**
   * Остановка периодического опроса
   */
  stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      this.logger.info('Polling stopped');
    }
  }

  /**
   * Проверка на дубликат
   */
  private isDuplicate(post: SocialPost, options: SocialDeduplicationOptions): boolean {
    if (options.checkId && this.seenIds.has(post.id)) {
      return true;
    }

    if (options.checkContent && options.similarityThreshold !== undefined) {
      // Можно добавить проверку схожести контента
      // Пока пропускаем для простоты
    }

    return false;
  }

  /**
   * Очистка кеша
   */
  clearCache(): void {
    this.seenIds.clear();
    this.logger.info('Cache cleared');
  }

  /**
   * Получение статистики
   */
  getStats(): { cachedIds: number; rateLimitStats: { availableTokens: number; maxTokens: number } } {
    return {
      cachedIds: this.seenIds.size,
      rateLimitStats: this.rateLimiter.getStats(),
    };
  }
}
