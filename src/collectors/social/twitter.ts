import { TwitterApi, TweetV2, UserV2 } from 'twitter-api-v2';
import type { SocialPost, TwitterCollectorConfig, CollectionResult, Engagement } from './types.js';
import { withRetry, SocialRateLimiter, extractHashtags, extractMentions } from './utils.js';

/**
 * Коллектор данных из Twitter/X
 */
export class TwitterCollector {
  private client: TwitterApi;
  private config: TwitterCollectorConfig;
  private rateLimiter: SocialRateLimiter;
  private isRunning: boolean;
  private intervalId?: NodeJS.Timeout;

  constructor(config: TwitterCollectorConfig, rateLimiter: SocialRateLimiter) {
    this.config = {
      maxResults: 10,
      pollInterval: 60000, // 1 минута по умолчанию
      ...config,
    };
    this.client = new TwitterApi(config.bearerToken);
    this.rateLimiter = rateLimiter;
    this.isRunning = false;

    // Создаем rate limiter для Twitter
    this.rateLimiter.createTwitterLimiter();
  }

  /**
   * Запускает мониторинг Twitter
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Twitter collector is already running');
      return;
    }

    this.isRunning = true;
    console.info('🐦 Twitter collector started');

    // Первый сбор данных сразу
    await this.collect();

    // Затем периодический сбор
    this.intervalId = setInterval(() => {
      void this.collect();
    }, this.config.pollInterval);
  }

  /**
   * Останавливает мониторинг Twitter
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.isRunning = false;
    console.info('🛑 Twitter collector stopped');
  }

  /**
   * Собирает данные из Twitter
   */
  async collect(): Promise<CollectionResult> {
    const posts: SocialPost[] = [];
    const errors: Error[] = [];

    try {
      // Мониторинг аккаунтов
      if (this.config.accounts.length > 0) {
        try {
          const accountPosts = await this.collectFromAccounts();
          posts.push(...accountPosts);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          errors.push(err);
          console.error('Error collecting from accounts:', err.message);
        }
      }

      // Мониторинг хештегов
      if (this.config.hashtags.length > 0) {
        try {
          const hashtagPosts = await this.collectFromHashtags();
          posts.push(...hashtagPosts);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          errors.push(err);
          console.error('Error collecting from hashtags:', err.message);
        }
      }

      console.info(`📊 Collected ${posts.length} posts from Twitter`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push(err);
      console.error('Error in Twitter collection:', err.message);
    }

    return {
      platform: 'twitter',
      posts,
      collectedAt: new Date(),
      count: posts.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Собирает твиты от указанных аккаунтов
   */
  private async collectFromAccounts(): Promise<SocialPost[]> {
    const posts: SocialPost[] = [];

    for (const username of this.config.accounts) {
      try {
        const userPosts = await withRetry(
          async () => {
            return await this.rateLimiter.execute('twitter', async () => {
              // Получаем информацию о пользователе
              const user = await this.client.v2.userByUsername(username, {
                'user.fields': ['public_metrics'],
              });

              if (!user.data) {
                throw new Error(`User ${username} not found`);
              }

              // Получаем последние твиты пользователя
              const tweets = await this.client.v2.userTimeline(user.data.id, {
                max_results: this.config.maxResults,
                'tweet.fields': ['created_at', 'public_metrics', 'entities'],
                expansions: ['attachments.media_keys'],
                'media.fields': ['url', 'preview_image_url', 'type'],
              });

              return { user: user.data, tweets: tweets.data.data };
            });
          },
          { maxRetries: 3 },
        );

        if (userPosts.tweets) {
          const convertedPosts = userPosts.tweets.map((tweet) =>
            this.convertTweetToPost(tweet, userPosts.user),
          );
          posts.push(...convertedPosts);
        }
      } catch (error) {
        console.error(`Error collecting tweets from @${username}:`, error);
      }
    }

    return posts;
  }

  /**
   * Собирает твиты по хештегам
   */
  private async collectFromHashtags(): Promise<SocialPost[]> {
    const posts: SocialPost[] = [];

    for (const hashtag of this.config.hashtags) {
      try {
        const tweets = await withRetry(
          async () => {
            return await this.rateLimiter.execute('twitter', async () => {
              const query = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
              const result = await this.client.v2.search(query, {
                max_results: this.config.maxResults,
                'tweet.fields': ['created_at', 'public_metrics', 'entities', 'author_id'],
                expansions: ['author_id', 'attachments.media_keys'],
                'user.fields': ['public_metrics', 'username'],
                'media.fields': ['url', 'preview_image_url', 'type'],
              });

              return result;
            });
          },
          { maxRetries: 3 },
        );

        if (tweets.data.data) {
          for (const tweet of tweets.data.data) {
            // Находим автора из includes
            const author = tweets.includes?.users?.find((u) => u.id === tweet.author_id);
            const post = this.convertTweetToPost(tweet, author);
            posts.push(post);
          }
        }
      } catch (error) {
        console.error(`Error collecting tweets for hashtag ${hashtag}:`, error);
      }
    }

    return posts;
  }

  /**
   * Конвертирует твит в SocialPost
   */
  private convertTweetToPost(tweet: TweetV2, author?: UserV2): SocialPost {
    const engagement: Engagement = {
      likes: tweet.public_metrics?.like_count ?? 0,
      comments: tweet.public_metrics?.reply_count ?? 0,
      shares: tweet.public_metrics?.retweet_count ?? 0,
      views: tweet.public_metrics?.impression_count,
    };

    const hashtags = extractHashtags(tweet.text);
    const mentions = extractMentions(tweet.text);

    return {
      id: `twitter_${tweet.id}`,
      platform: 'twitter',
      author: author?.username ?? 'unknown',
      authorFollowers: author?.public_metrics?.followers_count,
      content: tweet.text,
      engagement,
      timestamp: tweet.created_at ? new Date(tweet.created_at) : new Date(),
      url: `https://twitter.com/${author?.username ?? 'i'}/status/${tweet.id}`,
      hashtags: hashtags.length > 0 ? hashtags : undefined,
      mentions: mentions.length > 0 ? mentions : undefined,
    };
  }

  /**
   * Проверяет соединение с Twitter API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.v2.me();
      console.info('✅ Twitter API connection successful');
      return true;
    } catch (error) {
      console.error('❌ Twitter API connection failed:', error);
      return false;
    }
  }
}
