import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { ICollector, SocialPost, CollectorConfig, CollectorStats } from '../types';
import { RateLimiter, createTelegramRateLimiter } from '../utils/rateLimiter';
import { retryOnTransientError } from '../utils/retry';
import { Logger, createLogger } from '../utils/logger';

/**
 * Конфигурация Telegram коллектора
 */
export interface TelegramCollectorConfig extends CollectorConfig {
  /** API ID приложения Telegram */
  apiId: number;

  /** API Hash приложения Telegram */
  apiHash: string;

  /** Session string для авторизации */
  sessionString?: string;

  /** Список каналов/групп для отслеживания */
  channels?: string[];

  /** Лимит сообщений за запрос */
  messageLimit?: number;
}

/**
 * Коллектор для Telegram API
 */
export class TelegramCollector implements ICollector {
  public readonly name = 'Telegram';

  private client: TelegramClient;
  private config: TelegramCollectorConfig;
  private rateLimiter: RateLimiter;
  private logger: Logger;
  private running = false;
  private intervalId?: NodeJS.Timeout;
  private stats: CollectorStats;
  private lastMessageIds: Map<string, number>;

  constructor(config: TelegramCollectorConfig) {
    this.config = {
      pollInterval: 60000, // По умолчанию 1 минута
      batchSize: 20,
      enabled: true,
      messageLimit: 20,
      channels: [],
      ...config,
    };

    const session = new StringSession(this.config.sessionString || '');
    this.client = new TelegramClient(session, this.config.apiId, this.config.apiHash, {
      connectionRetries: 5,
    });

    this.rateLimiter = createTelegramRateLimiter();
    this.logger = createLogger('TelegramCollector');
    this.lastMessageIds = new Map();

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
    this.logger.info('Initializing Telegram collector...');

    try {
      await this.client.connect();

      // Проверка авторизации
      if (!(await this.client.isUserAuthorized())) {
        this.logger.warn('Telegram client is not authorized. Please authorize manually.');
        throw new Error('Not authorized. Run authorization flow separately.');
      }

      this.logger.info('Telegram collector initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Telegram collector', error);
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
    this.logger.info('Starting Telegram collector...');

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
    this.logger.info('Stopping Telegram collector...');
    this.running = false;
    this.stats.status = 'stopped';

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    await this.rateLimiter.stop();
    await this.client.disconnect();
    this.logger.info('Telegram collector stopped');
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
      if (this.config.channels && this.config.channels.length > 0) {
        for (const channelUsername of this.config.channels) {
          try {
            const posts = await this.collectFromChannel(channelUsername);
            allPosts.push(...posts);
          } catch (error) {
            this.logger.error(`Failed to collect from ${channelUsername}`, error);
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
   * Собрать сообщения из канала
   */
  private async collectFromChannel(channelUsername: string): Promise<SocialPost[]> {
    return retryOnTransientError(async () => {
      return this.rateLimiter.schedule(async () => {
        this.logger.debug(`Fetching messages from ${channelUsername}`);

        try {
          // Получить entity канала
          const entity = await this.client.getEntity(channelUsername);

          // Получить последние сообщения
          const messages = await this.client.getMessages(entity, {
            limit: this.config.messageLimit || 20,
          });

          // Фильтровать только новые сообщения
          const lastMessageId = this.lastMessageIds.get(channelUsername) || 0;
          const newMessages = messages.filter(msg => msg.id > lastMessageId);

          // Обновить ID последнего сообщения
          if (messages.length > 0) {
            this.lastMessageIds.set(channelUsername, messages[0].id);
          }

          return this.processMessages(newMessages, channelUsername, entity);
        } catch (error) {
          this.logger.error(`Error fetching from ${channelUsername}`, error);
          throw error;
        }
      });
    });
  }

  /**
   * Обработать сообщения и преобразовать в SocialPost
   */
  private processMessages(
    messages: Api.Message[],
    channelUsername: string,
    entity: Api.TypeEntityLike
  ): SocialPost[] {
    const posts: SocialPost[] = [];

    for (const message of messages) {
      if (!message.message || message.message.trim().length === 0) {
        continue; // Пропустить пустые сообщения
      }

      // Получить информацию о канале
      let channelName = channelUsername;
      let subscribersCount: number | undefined;

      if ('title' in entity) {
        channelName = entity.title || channelUsername;
      }

      if ('participantsCount' in entity) {
        subscribersCount = entity.participantsCount;
      }

      posts.push({
        id: `${channelUsername}_${message.id}`,
        platform: 'telegram' as const,
        author: channelName,
        authorFollowers: subscribersCount,
        content: message.message,
        engagement: {
          likes: message.forwards || 0,
          comments: message.replies?.replies || 0,
          shares: message.forwards || 0,
        },
        timestamp: new Date(message.date * 1000),
        url: this.buildMessageUrl(channelUsername, message.id),
      });
    }

    return posts;
  }

  /**
   * Построить URL сообщения
   */
  private buildMessageUrl(channelUsername: string, messageId: number): string {
    const cleanUsername = channelUsername.replace('@', '');
    return `https://t.me/${cleanUsername}/${messageId}`;
  }

  /**
   * Получить информацию о канале
   */
  async getChannelInfo(channelUsername: string): Promise<{
    title: string;
    subscribers?: number;
    description?: string;
  }> {
    return retryOnTransientError(async () => {
      return this.rateLimiter.schedule(async () => {
        const entity = await this.client.getEntity(channelUsername);

        if ('title' in entity) {
          return {
            title: entity.title || channelUsername,
            subscribers: 'participantsCount' in entity ? entity.participantsCount : undefined,
            description: 'about' in entity ? entity.about : undefined,
          };
        }

        return {
          title: channelUsername,
          subscribers: undefined,
          description: undefined,
        };
      });
    });
  }

  /**
   * Получить session string для сохранения
   */
  getSessionString(): string {
    return this.client.session.save() as string;
  }
}
