/**
 * Twitter/X API v2 коллектор для мониторинга криптовалютных обсуждений
 */

import { TwitterApi, TweetV2, UserV2 } from 'twitter-api-v2';
import type { SocialPost, TwitterConfig, SocialCollectionResult, SocialPlatform } from '../types.js';
import { Logger } from '../utils/logger.js';
import { RateLimiter } from '../utils/rateLimiter.js';
import { withRetry } from '../utils/retry.js';
import { SocialPlatform as Platform } from '../types.js';

export class TwitterCollector {
  private client: TwitterApi;
  private config: TwitterConfig;
  private logger: Logger;
  private rateLimiter: RateLimiter;
  private seenTweetIds: Set<string>;

  constructor(config: TwitterConfig) {
    this.config = config;
    this.client = new TwitterApi(config.bearerToken);
    this.logger = new Logger('TwitterCollector');
    this.seenTweetIds = new Set();

    // Twitter API v2: 15 запросов / 15 минут для большинства endpoints
    this.rateLimiter = new RateLimiter({
      maxRequests: 15,
      timeWindow: 15 * 60 * 1000, // 15 минут
      minDelay: 1000, // Минимум 1 секунда между запросами
    });
  }

  /**
   * Сбор твитов по ключевым аккаунтам
   */
  async collectFromAccounts(): Promise<SocialPost[]> {
    if (!this.config.accounts || this.config.accounts.length === 0) {
      this.logger.info('No accounts configured, skipping');
      return [];
    }

    const allPosts: SocialPost[] = [];

    for (const username of this.config.accounts) {
      try {
        this.logger.info(`Collecting tweets from @${username}`);

        const posts = await withRetry(async () => {
          await this.rateLimiter.throttle();

          // Получаем пользователя
          const user = await this.client.v2.userByUsername(username, {
            'user.fields': ['public_metrics'],
          });

          if (!user.data) {
            throw new Error(`User @${username} not found`);
          }

          // Получаем твиты пользователя
          await this.rateLimiter.throttle();
          const tweets = await this.client.v2.userTimeline(user.data.id, {
            max_results: this.config.maxResults || 10,
            'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
            expansions: ['author_id'],
          });

          return this.convertTweetsToSocialPosts(tweets.data.data || [], user.data);
        });

        allPosts.push(...posts);
        this.logger.info(`Collected ${posts.length} tweets from @${username}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to collect from @${username}: ${errorMessage}`);
      }
    }

    return allPosts;
  }

  /**
   * Сбор твитов по хештегам
   */
  async collectFromHashtags(): Promise<SocialPost[]> {
    if (!this.config.hashtags || this.config.hashtags.length === 0) {
      this.logger.info('No hashtags configured, skipping');
      return [];
    }

    const allPosts: SocialPost[] = [];

    for (const hashtag of this.config.hashtags) {
      try {
        this.logger.info(`Collecting tweets for #${hashtag}`);

        const posts = await withRetry(async () => {
          await this.rateLimiter.throttle();

          const tweets = await this.client.v2.search(`#${hashtag}`, {
            max_results: this.config.maxResults || 10,
            'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
            expansions: ['author_id'],
            'user.fields': ['public_metrics'],
          });

          const users = tweets.includes?.users || [];
          return this.convertTweetsToSocialPosts(tweets.data.data || [], undefined, users);
        });

        allPosts.push(...posts);
        this.logger.info(`Collected ${posts.length} tweets for #${hashtag}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to collect for #${hashtag}: ${errorMessage}`);
      }
    }

    return allPosts;
  }

  /**
   * Основной метод сбора данных
   */
  async collect(): Promise<SocialPost[]> {
    this.logger.info('Starting Twitter data collection');

    const [accountPosts, hashtagPosts] = await Promise.all([
      this.collectFromAccounts(),
      this.collectFromHashtags(),
    ]);

    const allPosts = [...accountPosts, ...hashtagPosts];

    // Дедупликация
    const uniquePosts = allPosts.filter((post) => {
      if (this.seenTweetIds.has(post.id)) {
        return false;
      }
      this.seenTweetIds.add(post.id);
      return true;
    });

    this.logger.info(
      `Collection complete: ${uniquePosts.length} unique tweets, ` +
        `${allPosts.length - uniquePosts.length} duplicates`,
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
      const totalCollected = allPosts.length + (allPosts.length - this.seenTweetIds.size);
      const duplicates = totalCollected - allPosts.length;

      const duration = Date.now() - startTime;
      this.logger.info(`Completed in ${duration}ms`);

      return {
        platform: Platform.TWITTER,
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
        platform: Platform.TWITTER,
        success: false,
        postsCount: 0,
        duplicatesSkipped: 0,
        errors,
        collectedAt: new Date(),
      };
    }
  }

  /**
   * Конвертация твитов в SocialPost
   */
  private convertTweetsToSocialPosts(
    tweets: TweetV2[],
    primaryUser?: UserV2,
    users?: UserV2[],
  ): SocialPost[] {
    return tweets.map((tweet) => {
      // Находим автора твита
      const author =
        primaryUser ||
        (users && tweet.author_id
          ? users.find((u) => u.id === tweet.author_id)
          : undefined);

      const authorUsername = author?.username || 'unknown';
      const authorFollowers = author?.public_metrics?.followers_count;

      return {
        id: tweet.id,
        platform: Platform.TWITTER,
        author: authorUsername,
        authorFollowers,
        content: tweet.text,
        engagement: {
          likes: tweet.public_metrics?.like_count || 0,
          comments: tweet.public_metrics?.reply_count || 0,
          shares: tweet.public_metrics?.retweet_count || 0,
        },
        timestamp: tweet.created_at ? new Date(tweet.created_at) : new Date(),
        url: `https://twitter.com/${authorUsername}/status/${tweet.id}`,
        collectedAt: new Date(),
      };
    });
  }

  /**
   * Очистка кеша
   */
  clearCache(): void {
    this.seenTweetIds.clear();
    this.logger.info('Cache cleared');
  }

  /**
   * Получение статистики
   */
  getStats(): { platform: SocialPlatform; cachedTweets: number } {
    return {
      platform: Platform.TWITTER,
      cachedTweets: this.seenTweetIds.size,
    };
  }
}
