import { randomUUID } from 'crypto';
import type { SocialPost, RedditConfig, SocialCollectionResult, SocialDeduplicationOptions } from '../types.js';
import { SocialPlatform } from '../types.js';
import { RateLimiter } from '../utils/rateLimiter.js';
import { withRetry } from '../utils/retry.js';
import { SocialLogger } from '../utils/logger.js';

/**
 * Reddit API Response Types
 */
interface RedditPost {
  id: string;
  author: string;
  title: string;
  selftext: string;
  subreddit: string;
  created_utc: number;
  score: number;
  num_comments: number;
  permalink: string;
  url: string;
}

interface RedditListing {
  data: {
    children: Array<{
      data: RedditPost;
    }>;
  };
}

/**
 * Reddit Collector для мониторинга постов
 */
export class RedditCollector {
  private config: RedditConfig;
  private rateLimiter: RateLimiter;
  private logger: SocialLogger;
  private seenIds: Set<string>;
  private intervalId?: NodeJS.Timeout;
  private accessToken?: string;
  private tokenExpiry?: number;

  constructor(config: RedditConfig) {
    this.config = {
      sortBy: 'hot',
      maxResults: 25,
      pollInterval: 120000, // 2 минуты по умолчанию
      ...config,
    };

    // Reddit API: 60 requests per minute
    this.rateLimiter = new RateLimiter(60, 60 * 1000);
    this.logger = new SocialLogger(SocialPlatform.REDDIT);
    this.seenIds = new Set();
  }

  /**
   * Получение OAuth токена
   */
  private async getAccessToken(): Promise<string> {
    // Если токен еще валиден, возвращаем его
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    return withRetry(async () => {
      this.logger.debug('Fetching new access token');

      const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');

      const response = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'password',
          username: this.config.username,
          password: this.config.password,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get Reddit access token: ${response.status}`);
      }

      const data = (await response.json()) as { access_token: string; expires_in: number };

      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60000; // Обновляем за минуту до истечения

      return this.accessToken;
    });
  }

  /**
   * Сбор постов из subreddit
   */
  private async fetchSubredditPosts(subreddit: string): Promise<SocialPost[]> {
    return withRetry(async () => {
      return this.rateLimiter.execute(async () => {
        const token = await this.getAccessToken();
        this.logger.debug(`Fetching posts from r/${subreddit}`);

        const url = `https://oauth.reddit.com/r/${subreddit}/${this.config.sortBy}`;
        const params = new URLSearchParams({
          limit: String(this.config.maxResults),
        });

        const response = await fetch(`${url}?${params}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'btc-trading-bot/0.1.0',
          },
        });

        if (!response.ok) {
          throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as RedditListing;
        return this.transformPosts(data);
      });
    });
  }

  /**
   * Сбор постов из всех настроенных subreddits
   */
  async collectFromSubreddits(): Promise<SocialPost[]> {
    if (!this.config.subreddits || this.config.subreddits.length === 0) {
      this.logger.warn('No subreddits configured for monitoring');
      return [];
    }

    const allPosts: SocialPost[] = [];

    for (const subreddit of this.config.subreddits) {
      try {
        const posts = await this.fetchSubredditPosts(subreddit);
        allPosts.push(...posts);
      } catch (error) {
        this.logger.error(`Failed to collect from r/${subreddit}`, error);
      }
    }

    return allPosts;
  }

  /**
   * Преобразование Reddit API response в SocialPost[]
   */
  private transformPosts(listing: RedditListing): SocialPost[] {
    if (!listing.data?.children || listing.data.children.length === 0) {
      return [];
    }

    const posts: SocialPost[] = [];

    for (const child of listing.data.children) {
      const post = child.data;

      posts.push({
        id: post.id,
        platform: 'reddit',
        author: post.author,
        authorFollowers: undefined, // Reddit API не предоставляет количество подписчиков в этом endpoint
        content: post.selftext || post.title,
        engagement: {
          likes: post.score,
          comments: post.num_comments,
          shares: 0, // Reddit не имеет прямого аналога shares
        },
        timestamp: new Date(post.created_utc * 1000),
        url: `https://reddit.com${post.permalink}`,
      });
    }

    return posts;
  }

  /**
   * Запуск сбора
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
      this.logger.info('Starting Reddit collection...');

      // Собираем посты
      const allPosts = await this.collectFromSubreddits();

      this.logger.info(`Collected ${allPosts.length} raw posts`);

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
        platform: SocialPlatform.REDDIT,
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
        platform: SocialPlatform.REDDIT,
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
    this.accessToken = undefined;
    this.tokenExpiry = undefined;
    this.logger.info('Cache cleared');
  }

  /**
   * Получение статистики
   */
  getStats(): {
    cachedIds: number;
    hasValidToken: boolean;
    rateLimitStats: { availableTokens: number; maxTokens: number };
  } {
    return {
      cachedIds: this.seenIds.size,
      hasValidToken: Boolean(this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry),
      rateLimitStats: this.rateLimiter.getStats(),
    };
  }
}
