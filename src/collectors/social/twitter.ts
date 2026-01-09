import { TwitterApi, TweetV2, UserV2 } from 'twitter-api-v2';
import { SocialPost, TwitterConfig } from '../../types/social.js';
import { AbstractCollector, SocialCollector, withRetry } from '../base.js';

/**
 * Коллектор для Twitter/X API v2
 */
export class TwitterCollector extends AbstractCollector implements SocialCollector {
  private client: TwitterApi | null = null;
  private config: TwitterConfig;
  private subscribers: Array<(post: SocialPost) => void> = [];
  private pollInterval: NodeJS.Timeout | null = null;
  private lastTweetId: string | null = null;

  constructor(config: TwitterConfig) {
    super('TwitterCollector');
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.running) {
      console.warn(`${this.name} is already running`);
      return;
    }

    try {
      // Инициализация клиента Twitter API
      this.client = new TwitterApi(this.config.bearerToken);

      console.info(`${this.name} started successfully`);
      this.setRunning(true);

      // Запуск polling для получения новых твитов
      this.startPolling();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to start ${this.name}: ${message}`);
    }
  }

  async stop(): Promise<void> {
    if (!this.running) {
      console.warn(`${this.name} is not running`);
      return;
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.client = null;
    this.setRunning(false);
    console.info(`${this.name} stopped`);
  }

  async fetchPosts(limit = 10): Promise<SocialPost[]> {
    if (!this.client) {
      throw new Error('Twitter client is not initialized');
    }

    const posts: SocialPost[] = [];

    try {
      // Поиск по хештегам
      if (this.config.hashtags.length > 0) {
        const hashtagPosts = await this.fetchByHashtags(limit);
        posts.push(...hashtagPosts);
      }

      // Получение твитов от отслеживаемых аккаунтов
      if (this.config.accounts.length > 0) {
        const accountPosts = await this.fetchByAccounts(limit);
        posts.push(...accountPosts);
      }

      // Удаление дубликатов и сортировка по времени
      const uniquePosts = this.deduplicatePosts(posts);
      return uniquePosts
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch Twitter posts: ${message}`);
    }
  }

  subscribe(callback: (post: SocialPost) => void): void {
    this.subscribers.push(callback);
  }

  unsubscribe(): void {
    this.subscribers = [];
  }

  /**
   * Поиск твитов по хештегам
   */
  private async fetchByHashtags(limit: number): Promise<SocialPost[]> {
    if (!this.client) {
      throw new Error('Twitter client is not initialized');
    }

    const query = this.config.hashtags.map((tag) => `#${tag}`).join(' OR ');

    const result = await withRetry(
      async () => {
        return await this.client!.v2.search(query, {
          max_results: Math.min(limit, 100),
          'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'text'],
          expansions: ['author_id'],
          'user.fields': ['username', 'public_metrics'],
        });
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
      },
      'fetchByHashtags',
    );

    return this.convertTweetsToPosts(result.data.data || [], result.includes);
  }

  /**
   * Получение твитов от отслеживаемых аккаунтов
   */
  private async fetchByAccounts(limit: number): Promise<SocialPost[]> {
    if (!this.client) {
      throw new Error('Twitter client is not initialized');
    }

    const posts: SocialPost[] = [];

    for (const username of this.config.accounts) {
      try {
        const user = await withRetry(
          async () => {
            return await this.client!.v2.userByUsername(username, {
              'user.fields': ['public_metrics'],
            });
          },
          {
            maxRetries: 3,
            initialDelayMs: 1000,
            maxDelayMs: 10000,
            backoffMultiplier: 2,
          },
          `fetchUser:${username}`,
        );

        if (!user.data) {
          console.warn(`User ${username} not found`);
          continue;
        }

        const timeline = await withRetry(
          async () => {
            return await this.client!.v2.userTimeline(user.data.id, {
              max_results: Math.min(limit, 100),
              'tweet.fields': ['created_at', 'public_metrics', 'text'],
            });
          },
          {
            maxRetries: 3,
            initialDelayMs: 1000,
            maxDelayMs: 10000,
            backoffMultiplier: 2,
          },
          `fetchTimeline:${username}`,
        );

        const userPosts = this.convertTweetsToPosts(timeline.data.data || [], {
          users: [user.data],
        });
        posts.push(...userPosts);
      } catch (error) {
        console.error(`Error fetching tweets from ${username}:`, error);
      }
    }

    return posts;
  }

  /**
   * Конвертация твитов в SocialPost
   */
  private convertTweetsToPosts(
    tweets: TweetV2[],
    includes?: { users?: UserV2[] },
  ): SocialPost[] {
    return tweets.map((tweet) => {
      const author = includes?.users?.find((u) => u.id === tweet.author_id)?.username || 'unknown';
      const authorFollowers = includes?.users?.find((u) => u.id === tweet.author_id)?.public_metrics
        ?.followers_count;

      return {
        id: tweet.id,
        platform: 'twitter' as const,
        author,
        authorFollowers,
        content: tweet.text,
        engagement: {
          likes: tweet.public_metrics?.like_count || 0,
          comments: tweet.public_metrics?.reply_count || 0,
          shares: tweet.public_metrics?.retweet_count || 0,
        },
        timestamp: tweet.created_at ? new Date(tweet.created_at) : new Date(),
        url: `https://twitter.com/${author}/status/${tweet.id}`,
      };
    });
  }

  /**
   * Удаление дубликатов постов
   */
  private deduplicatePosts(posts: SocialPost[]): SocialPost[] {
    const seen = new Set<string>();
    return posts.filter((post) => {
      if (seen.has(post.id)) {
        return false;
      }
      seen.add(post.id);
      return true;
    });
  }

  /**
   * Запуск polling для получения новых твитов
   */
  private startPolling(): void {
    const interval = this.config.pollingInterval || 60000; // По умолчанию 1 минута

    this.pollInterval = setInterval(async () => {
      try {
        const posts = await this.fetchPosts(this.config.maxResults || 10);

        // Уведомление подписчиков о новых постах
        for (const post of posts) {
          // Проверка, что пост новый (после последнего известного ID)
          if (!this.lastTweetId || post.id > this.lastTweetId) {
            for (const subscriber of this.subscribers) {
              try {
                subscriber(post);
              } catch (error) {
                console.error('Error in subscriber callback:', error);
              }
            }
          }
        }

        // Обновление последнего ID
        if (posts.length > 0) {
          this.lastTweetId = posts[0]!.id;
        }
      } catch (error) {
        console.error('Error in polling:', error);
      }
    }, interval);
  }
}
