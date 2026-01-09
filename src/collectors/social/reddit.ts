import Snoowrap, { Submission, Comment } from 'snoowrap';
import type { SocialPost, RedditCollectorConfig, CollectionResult, Engagement } from './types.js';
import { withRetry, SocialRateLimiter, extractHashtags, extractMentions } from './utils.js';

/**
 * Коллектор данных из Reddit
 */
export class RedditCollector {
  private client: Snoowrap;
  private config: RedditCollectorConfig;
  private rateLimiter: SocialRateLimiter;
  private isRunning: boolean;
  private intervalId?: NodeJS.Timeout;

  constructor(config: RedditCollectorConfig, rateLimiter: SocialRateLimiter) {
    this.config = {
      sortBy: 'hot',
      limit: 25,
      pollInterval: 120000, // 2 минуты по умолчанию
      ...config,
    };

    this.client = new Snoowrap({
      userAgent: config.userAgent,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      // Reddit требует refresh token для OAuth, но для read-only доступа можно использовать client credentials
      username: '',
      password: '',
    });

    // Настройка для избежания слишком частых запросов
    this.client.config({
      requestDelay: 1000,
      warnings: false,
      continueAfterRatelimitError: true,
    });

    this.rateLimiter = rateLimiter;
    this.isRunning = false;

    // Создаем rate limiter для Reddit
    this.rateLimiter.createRedditLimiter();
  }

  /**
   * Запускает мониторинг Reddit
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Reddit collector is already running');
      return;
    }

    this.isRunning = true;
    console.info('🤖 Reddit collector started');

    // Первый сбор данных сразу
    await this.collect();

    // Затем периодический сбор
    this.intervalId = setInterval(() => {
      void this.collect();
    }, this.config.pollInterval);
  }

  /**
   * Останавливает мониторинг Reddit
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
    console.info('🛑 Reddit collector stopped');
  }

  /**
   * Собирает данные из Reddit
   */
  async collect(): Promise<CollectionResult> {
    const posts: SocialPost[] = [];
    const errors: Error[] = [];

    try {
      for (const subreddit of this.config.subreddits) {
        try {
          const subredditPosts = await this.collectFromSubreddit(subreddit);
          posts.push(...subredditPosts);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          errors.push(err);
          console.error(`Error collecting from r/${subreddit}:`, err.message);
        }
      }

      console.info(`📊 Collected ${posts.length} posts from Reddit`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push(err);
      console.error('Error in Reddit collection:', err.message);
    }

    return {
      platform: 'reddit',
      posts,
      collectedAt: new Date(),
      count: posts.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Собирает посты из конкретного subreddit
   */
  private async collectFromSubreddit(subredditName: string): Promise<SocialPost[]> {
    const posts: SocialPost[] = [];

    try {
      const submissions = await withRetry(
        async () => {
          return await this.rateLimiter.execute('reddit', async () => {
            const subreddit = this.client.getSubreddit(subredditName);
            let listing;

            switch (this.config.sortBy) {
              case 'hot':
                listing = await subreddit.getHot({ limit: this.config.limit });
                break;
              case 'new':
                listing = await subreddit.getNew({ limit: this.config.limit });
                break;
              case 'top':
                listing = await subreddit.getTop({
                  time: this.config.timeFilter ?? 'day',
                  limit: this.config.limit,
                });
                break;
              case 'rising':
                listing = await subreddit.getRising({ limit: this.config.limit });
                break;
              default:
                listing = await subreddit.getHot({ limit: this.config.limit });
            }

            return listing;
          });
        },
        { maxRetries: 3 },
      );

      for (const submission of submissions) {
        const post = this.convertSubmissionToPost(submission);
        posts.push(post);
      }
    } catch (error) {
      console.error(`Error collecting from r/${subredditName}:`, error);
    }

    return posts;
  }

  /**
   * Собирает комментарии из поста (опционально)
   */
  async collectComments(submissionId: string): Promise<SocialPost[]> {
    const posts: SocialPost[] = [];

    try {
      const sub = this.client.getSubmission(submissionId);
      // @ts-expect-error - snoowrap type definitions issue with Submission.fetch()
      const submission: Submission = await sub.fetch();

      // Получаем комментарии
      const comments = await submission.comments.fetchAll();

      for (const comment of comments) {
        if (comment instanceof Comment) {
          const post = this.convertCommentToPost(comment);
          posts.push(post);
        }
      }
    } catch (error) {
      console.error(`Error collecting comments from ${submissionId}:`, error);
    }

    return posts;
  }

  /**
   * Конвертирует Reddit submission в SocialPost
   */
  private convertSubmissionToPost(submission: Submission): SocialPost {
    const engagement: Engagement = {
      likes: submission.ups - submission.downs,
      comments: submission.num_comments,
      shares: 0, // Reddit не предоставляет информацию о shares
    };

    const content = submission.selftext
      ? `${submission.title}\n\n${submission.selftext}`
      : submission.title;

    const hashtags = extractHashtags(content);
    const mentions = extractMentions(content);

    return {
      id: `reddit_${submission.id}`,
      platform: 'reddit',
      author: submission.author.name,
      authorFollowers: undefined, // Reddit не предоставляет follower count через API
      content,
      engagement,
      timestamp: new Date(submission.created_utc * 1000),
      url: `https://reddit.com${submission.permalink}`,
      hashtags: hashtags.length > 0 ? hashtags : undefined,
      mentions: mentions.length > 0 ? mentions : undefined,
    };
  }

  /**
   * Конвертирует Reddit comment в SocialPost
   */
  private convertCommentToPost(comment: Comment): SocialPost {
    const engagement: Engagement = {
      likes: comment.ups - comment.downs,
      comments: 0, // Не считаем вложенные комментарии
      shares: 0,
    };

    const hashtags = extractHashtags(comment.body);
    const mentions = extractMentions(comment.body);

    return {
      id: `reddit_${comment.id}`,
      platform: 'reddit',
      author: comment.author.name,
      authorFollowers: undefined,
      content: comment.body,
      engagement,
      timestamp: new Date(comment.created_utc * 1000),
      url: `https://reddit.com${comment.permalink}`,
      hashtags: hashtags.length > 0 ? hashtags : undefined,
      mentions: mentions.length > 0 ? mentions : undefined,
    };
  }

  /**
   * Проверяет соединение с Reddit API
   */
  async testConnection(): Promise<boolean> {
    try {
      const sub = this.client.getSubreddit('Bitcoin');
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      void sub.fetch();
      console.info('✅ Reddit API connection successful');
      return true;
    } catch (error) {
      console.error('❌ Reddit API connection failed:', error);
      return false;
    }
  }
}
