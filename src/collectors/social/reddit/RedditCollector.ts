import Snoowrap, { Submission, Subreddit } from 'snoowrap';
import { ICollector, SocialPost, CollectorConfig, CollectorStats } from '../types';
import { RateLimiter, createRedditRateLimiter } from '../utils/rateLimiter';
import { retryOnTransientError } from '../utils/retry';
import { Logger, createLogger } from '../utils/logger';

/**
 * Конфигурация Reddit коллектора
 */
export interface RedditCollectorConfig extends CollectorConfig {
  /** Client ID приложения Reddit */
  clientId: string;

  /** Client Secret приложения Reddit */
  clientSecret: string;

  /** Имя пользователя Reddit */
  username: string;

  /** Пароль пользователя Reddit */
  password: string;

  /** User agent для идентификации */
  userAgent: string;

  /** Список subreddits для отслеживания */
  subreddits?: string[];

  /** Тип сортировки (hot, new, top, rising) */
  sort?: 'hot' | 'new' | 'top' | 'rising';

  /** Временной период для top (hour, day, week, month, year, all) */
  timeFilter?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
}

/**
 * Коллектор для Reddit API
 */
export class RedditCollector implements ICollector {
  public readonly name = 'Reddit';

  private client: Snoowrap;
  private config: RedditCollectorConfig;
  private rateLimiter: RateLimiter;
  private logger: Logger;
  private running = false;
  private intervalId?: NodeJS.Timeout;
  private stats: CollectorStats;

  constructor(config: RedditCollectorConfig) {
    this.config = {
      pollInterval: 120000, // По умолчанию 2 минуты
      batchSize: 25,
      enabled: true,
      subreddits: ['Bitcoin', 'CryptoCurrency', 'CryptoMarkets'],
      sort: 'hot',
      ...config,
    };

    this.client = new Snoowrap({
      userAgent: this.config.userAgent,
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      username: this.config.username,
      password: this.config.password,
    });

    // Настройка для автоматического разворачивания ответов
    this.client.config({ continueAfterRatelimitError: false });

    this.rateLimiter = createRedditRateLimiter();
    this.logger = createLogger('RedditCollector');

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
    this.logger.info('Initializing Reddit collector...');

    try {
      // Проверка авторизации
      await this.rateLimiter.schedule(async () => {
        await this.client.getMe();
      });

      this.logger.info('Reddit collector initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Reddit collector', error);
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
    this.logger.info('Starting Reddit collector...');

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
    this.logger.info('Stopping Reddit collector...');
    this.running = false;
    this.stats.status = 'stopped';

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    await this.rateLimiter.stop();
    this.logger.info('Reddit collector stopped');
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
      if (this.config.subreddits && this.config.subreddits.length > 0) {
        for (const subredditName of this.config.subreddits) {
          try {
            const posts = await this.collectFromSubreddit(subredditName);
            allPosts.push(...posts);
          } catch (error) {
            this.logger.error(`Failed to collect from r/${subredditName}`, error);
          }
        }
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
   * Собрать посты из subreddit
   */
  private async collectFromSubreddit(subredditName: string): Promise<SocialPost[]> {
    return retryOnTransientError(async () => {
      return this.rateLimiter.schedule(async () => {
        this.logger.debug(`Fetching posts from r/${subredditName}`);

        const subreddit: Subreddit = this.client.getSubreddit(subredditName);
        let submissions: Submission[];

        // Получить посты в зависимости от типа сортировки
        switch (this.config.sort) {
          case 'new':
            submissions = await subreddit.getNew({ limit: this.config.batchSize });
            break;
          case 'top':
            submissions = await subreddit.getTop({
              limit: this.config.batchSize,
              time: this.config.timeFilter || 'day',
            });
            break;
          case 'rising':
            submissions = await subreddit.getRising({ limit: this.config.batchSize });
            break;
          case 'hot':
          default:
            submissions = await subreddit.getHot({ limit: this.config.batchSize });
            break;
        }

        return this.processSubmissions(submissions, subredditName);
      });
    });
  }

  /**
   * Обработать посты и преобразовать в SocialPost
   */
  private processSubmissions(
    submissions: Submission[],
    subredditName: string
  ): SocialPost[] {
    return submissions.map(submission => {
      // Получить текст поста (заголовок + текст)
      const content = submission.selftext
        ? `${submission.title}\n\n${submission.selftext}`
        : submission.title;

      return {
        id: submission.id,
        platform: 'reddit' as const,
        author: submission.author.name,
        authorFollowers: undefined, // Reddit не предоставляет количество подписчиков напрямую
        content: content,
        engagement: {
          likes: submission.ups || 0,
          comments: submission.num_comments || 0,
          shares: submission.num_crossposts || 0,
        },
        timestamp: new Date(submission.created_utc * 1000),
        url: `https://reddit.com${submission.permalink}`,
      };
    });
  }

  /**
   * Получить trending topics из subreddit
   */
  async getTrendingTopics(subredditName: string, limit = 10): Promise<string[]> {
    return retryOnTransientError(async () => {
      return this.rateLimiter.schedule(async () => {
        this.logger.debug(`Fetching trending topics from r/${subredditName}`);

        const subreddit = this.client.getSubreddit(subredditName);
        const submissions = await subreddit.getHot({ limit });

        // Извлечь ключевые слова из заголовков
        const topics = submissions.map(s => s.title);
        return topics;
      });
    });
  }

  /**
   * Проанализировать комментарии к посту
   */
  async analyzeComments(submissionId: string): Promise<SocialPost[]> {
    return retryOnTransientError(async () => {
      return this.rateLimiter.schedule(async () => {
        this.logger.debug(`Analyzing comments for submission ${submissionId}`);

        const submission = await this.client.getSubmission(submissionId).fetch();
        const comments = await submission.comments.fetchAll({ amount: 100 });

        return comments
          .filter(comment => comment.body && comment.body.length > 0)
          .map(comment => ({
            id: comment.id,
            platform: 'reddit' as const,
            author: comment.author.name,
            authorFollowers: undefined,
            content: comment.body,
            engagement: {
              likes: comment.ups || 0,
              comments: 0,
              shares: 0,
            },
            timestamp: new Date(comment.created_utc * 1000),
            url: `https://reddit.com${comment.permalink}`,
          }));
      });
    });
  }
}
