/**
 * Reddit API коллектор для мониторинга криптовалютных subreddits
 */

import Snoowrap, { Submission } from 'snoowrap';
import type { SocialPost, RedditConfig, SocialCollectionResult, SocialPlatform } from '../types.js';
import { Logger } from '../utils/logger.js';
import { RateLimiter } from '../utils/rateLimiter.js';
import { withRetry } from '../utils/retry.js';
import { SocialPlatform as Platform } from '../types.js';

export class RedditCollector {
  private client: Snoowrap;
  private config: RedditConfig;
  private logger: Logger;
  private rateLimiter: RateLimiter;
  private seenPostIds: Set<string>;

  constructor(config: RedditConfig) {
    this.config = config;
    this.logger = new Logger('RedditCollector');
    this.seenPostIds = new Set();

    // Инициализация Reddit клиента
    this.client = new Snoowrap({
      userAgent: config.userAgent,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      refreshToken: '', // Для read-only доступа не требуется
    });

    // Reddit API: 60 запросов в минуту
    this.rateLimiter = new RateLimiter({
      maxRequests: 60,
      timeWindow: 60 * 1000, // 1 минута
      minDelay: 1000, // Минимум 1 секунда между запросами
    });
  }

  /**
   * Сбор постов из указанных subreddits
   */
  async collectFromSubreddits(): Promise<SocialPost[]> {
    const subreddits = this.config.subreddits || ['Bitcoin', 'CryptoCurrency', 'CryptoMarkets'];
    const sortBy = this.config.sortBy || 'hot';
    const limit = this.config.limit || 25;

    const allPosts: SocialPost[] = [];

    for (const subreddit of subreddits) {
      try {
        this.logger.info(`Collecting from r/${subreddit} (${sortBy})`);

        const posts = await withRetry(async () => {
          await this.rateLimiter.throttle();

          const subredditObj = this.client.getSubreddit(subreddit);
          let submissions: Submission[] = [];

          switch (sortBy) {
            case 'hot':
              submissions = await subredditObj.getHot({ limit });
              break;
            case 'new':
              submissions = await subredditObj.getNew({ limit });
              break;
            case 'top':
              submissions = await subredditObj.getTop({
                time: this.config.timeFilter || 'day',
                limit,
              });
              break;
            case 'rising':
              submissions = await subredditObj.getRising({ limit });
              break;
            default:
              submissions = await subredditObj.getHot({ limit });
          }

          return this.convertSubmissionsToSocialPosts(submissions);
        });

        allPosts.push(...posts);
        this.logger.info(`Collected ${posts.length} posts from r/${subreddit}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to collect from r/${subreddit}: ${errorMessage}`);
      }
    }

    return allPosts;
  }

  /**
   * Сбор trending topics (top posts за последний час)
   */
  async collectTrendingTopics(): Promise<SocialPost[]> {
    const subreddits = this.config.subreddits || ['Bitcoin', 'CryptoCurrency', 'CryptoMarkets'];
    const allPosts: SocialPost[] = [];

    for (const subreddit of subreddits) {
      try {
        this.logger.info(`Collecting trending topics from r/${subreddit}`);

        const posts = await withRetry(async () => {
          await this.rateLimiter.throttle();

          const subredditObj = this.client.getSubreddit(subreddit);
          const submissions = await subredditObj.getTop({
            time: 'hour',
            limit: 10,
          });

          return this.convertSubmissionsToSocialPosts(submissions);
        });

        allPosts.push(...posts);
        this.logger.info(`Collected ${posts.length} trending posts from r/${subreddit}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to collect trending from r/${subreddit}: ${errorMessage}`);
      }
    }

    return allPosts;
  }

  /**
   * Основной метод сбора данных
   */
  async collect(): Promise<SocialPost[]> {
    this.logger.info('Starting Reddit data collection');

    const posts = await this.collectFromSubreddits();

    // Дедупликация
    const uniquePosts = posts.filter((post) => {
      if (this.seenPostIds.has(post.id)) {
        return false;
      }
      this.seenPostIds.add(post.id);
      return true;
    });

    this.logger.info(
      `Collection complete: ${uniquePosts.length} unique posts, ` +
        `${posts.length - uniquePosts.length} duplicates`,
    );

    return uniquePosts;
  }

  /**
   * Запуск сбора с отчетом о результатах
   */
  async run(): Promise<SocialCollectionResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      const allPosts = await this.collect();
      const totalCollected = allPosts.length + (allPosts.length - this.seenPostIds.size);
      const duplicates = totalCollected - allPosts.length;

      const duration = Date.now() - startTime;
      this.logger.info(`Completed in ${duration}ms`);

      return {
        platform: Platform.REDDIT,
        success: true,
        postsCount: allPosts.length,
        duplicatesSkipped: duplicates,
        collectedAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Collection failed: ${errorMessage}`);

      errors.push(errorMessage);

      return {
        platform: Platform.REDDIT,
        success: false,
        postsCount: 0,
        duplicatesSkipped: 0,
        errors,
        collectedAt: new Date(),
      };
    }
  }

  /**
   * Конвертация Reddit submission в SocialPost
   */
  private convertSubmissionsToSocialPosts(submissions: Submission[]): SocialPost[] {
    return submissions.map((submission) => ({
      id: submission.id,
      platform: Platform.REDDIT,
      author: submission.author.name,
      authorFollowers: undefined, // Reddit не предоставляет информацию о подписчиках
      content: submission.selftext || submission.title,
      engagement: {
        likes: submission.ups,
        comments: submission.num_comments,
        shares: 0, // Reddit не имеет прямого share функционала
      },
      timestamp: new Date(submission.created_utc * 1000),
      url: `https://reddit.com${submission.permalink}`,
      collectedAt: new Date(),
    }));
  }

  /**
   * Очистка кеша
   */
  clearCache(): void {
    this.seenPostIds.clear();
    this.logger.info('Cache cleared');
  }

  /**
   * Получение статистики
   */
  getStats(): { platform: SocialPlatform; cachedPosts: number } {
    return {
      platform: Platform.REDDIT,
      cachedPosts: this.seenPostIds.size,
    };
  }
}
