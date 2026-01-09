import Snoowrap, { Submission } from 'snoowrap';
import { SocialPost, RedditConfig } from '../../types/social.js';
import { AbstractCollector, SocialCollector, withRetry } from '../base.js';

/**
 * Коллектор для Reddit API
 */
export class RedditCollector extends AbstractCollector implements SocialCollector {
  private client: Snoowrap | null = null;
  private config: RedditConfig;
  private subscribers: Array<(post: SocialPost) => void> = [];
  private pollInterval: NodeJS.Timeout | null = null;
  private lastPostIds: Set<string> = new Set();

  constructor(config: RedditConfig) {
    super('RedditCollector');
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.running) {
      console.warn(`${this.name} is already running`);
      return;
    }

    try {
      // Инициализация клиента Reddit API
      this.client = new Snoowrap({
        userAgent: 'btc-trading-bot/1.0.0',
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
        username: this.config.username,
        password: this.config.password,
      });

      // Настройка rate limiting
      this.client.config({
        requestDelay: 1000, // 1 секунда между запросами
        continueAfterRatelimitError: true,
        warnings: false,
      });

      console.info(`${this.name} started successfully`);
      this.setRunning(true);

      // Запуск polling для получения новых постов
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

  async fetchPosts(limit = 25): Promise<SocialPost[]> {
    if (!this.client) {
      throw new Error('Reddit client is not initialized');
    }

    const posts: SocialPost[] = [];

    try {
      for (const subreddit of this.config.subreddits) {
        const subredditPosts = await this.fetchSubredditPosts(subreddit, limit);
        posts.push(...subredditPosts);
      }

      // Сортировка по времени и ограничение количества
      return posts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch Reddit posts: ${message}`);
    }
  }

  subscribe(callback: (post: SocialPost) => void): void {
    this.subscribers.push(callback);
  }

  unsubscribe(): void {
    this.subscribers = [];
  }

  /**
   * Получение постов из конкретного subreddit
   */
  private async fetchSubredditPosts(subredditName: string, limit: number): Promise<SocialPost[]> {
    if (!this.client) {
      throw new Error('Reddit client is not initialized');
    }

    try {
      const submissions = await withRetry(
        async () => {
          const subreddit = this.client!.getSubreddit(subredditName);
          return await subreddit.getHot({ limit: Math.min(limit, 100) });
        },
        {
          maxRetries: 3,
          initialDelayMs: 2000,
          maxDelayMs: 20000,
          backoffMultiplier: 2,
        },
        `fetchSubreddit:${subredditName}`,
      );

      return submissions.map((submission) => this.convertSubmissionToPost(submission));
    } catch (error) {
      console.error(`Error fetching posts from r/${subredditName}:`, error);
      return [];
    }
  }

  /**
   * Конвертация Reddit submission в SocialPost
   */
  private convertSubmissionToPost(submission: Submission): SocialPost {
    return {
      id: submission.id,
      platform: 'reddit' as const,
      author: submission.author.name,
      authorFollowers: undefined, // Reddit не предоставляет количество подписчиков автора
      content: submission.title + (submission.selftext ? `\n\n${submission.selftext}` : ''),
      engagement: {
        likes: submission.ups,
        comments: submission.num_comments,
        shares: 0, // Reddit не предоставляет информацию о репостах
      },
      timestamp: new Date(submission.created_utc * 1000),
      url: `https://reddit.com${submission.permalink}`,
    };
  }

  /**
   * Запуск polling для получения новых постов
   */
  private startPolling(): void {
    const interval = this.config.pollingInterval || 120000; // По умолчанию 2 минуты

    this.pollInterval = setInterval(async () => {
      try {
        const posts = await this.fetchPosts(this.config.limit || 25);

        // Уведомление подписчиков о новых постах
        for (const post of posts) {
          // Проверка, что пост новый
          if (!this.lastPostIds.has(post.id)) {
            this.lastPostIds.add(post.id);

            for (const subscriber of this.subscribers) {
              try {
                subscriber(post);
              } catch (error) {
                console.error('Error in subscriber callback:', error);
              }
            }
          }
        }

        // Ограничение размера кеша известных постов
        if (this.lastPostIds.size > 1000) {
          const ids = Array.from(this.lastPostIds);
          this.lastPostIds = new Set(ids.slice(-500));
        }
      } catch (error) {
        console.error('Error in polling:', error);
      }
    }, interval);
  }
}
