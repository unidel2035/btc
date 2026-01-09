/**
 * Telegram коллектор для мониторинга публичных каналов
 */

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { Api } from 'telegram/tl/index.js';
import type { SocialPost, TelegramConfig, SocialCollectionResult, SocialPlatform } from '../types.js';
import { Logger } from '../utils/logger.js';
import { RateLimiter } from '../utils/rateLimiter.js';
import { withRetry } from '../utils/retry.js';
import { SocialPlatform as Platform } from '../types.js';

export class TelegramCollector {
  private client: TelegramClient;
  private config: TelegramConfig;
  private logger: Logger;
  private rateLimiter: RateLimiter;
  private seenMessageIds: Set<string>;
  private isConnected: boolean = false;

  constructor(config: TelegramConfig) {
    this.config = config;
    this.logger = new Logger('TelegramCollector');
    this.seenMessageIds = new Set();

    const session = new StringSession(config.sessionString || '');
    this.client = new TelegramClient(session, parseInt(config.apiId), config.apiHash, {
      connectionRetries: 5,
    });

    // Telegram API: 20 запросов в минуту для осторожного использования
    this.rateLimiter = new RateLimiter({
      maxRequests: 20,
      timeWindow: 60 * 1000, // 1 минута
      minDelay: 3000, // Минимум 3 секунды между запросами
    });
  }

  /**
   * Подключение к Telegram
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      this.logger.info('Connecting to Telegram...');
      await this.client.connect();
      this.isConnected = true;
      this.logger.info('Connected to Telegram successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to connect to Telegram: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Отключение от Telegram
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
      this.logger.info('Disconnected from Telegram');
    }
  }

  /**
   * Сбор сообщений из указанных каналов
   */
  async collectFromChannels(): Promise<SocialPost[]> {
    const channels = this.config.channels || [];
    if (channels.length === 0) {
      this.logger.info('No channels configured, skipping');
      return [];
    }

    await this.connect();

    const allPosts: SocialPost[] = [];

    for (const channelUsername of channels) {
      try {
        this.logger.info(`Collecting from @${channelUsername}`);

        const posts = await withRetry(async () => {
          await this.rateLimiter.throttle();

          // Получаем канал
          const channel = await this.client.getEntity(channelUsername);

          // Получаем сообщения
          await this.rateLimiter.throttle();
          const messages = await this.client.getMessages(channel, {
            limit: this.config.limit || 20,
          });

          // Получаем информацию о канале для подсчета подписчиков
          let participantsCount: number | undefined;
          if ('broadcast' in channel && channel.broadcast) {
            try {
              await this.rateLimiter.throttle();
              const fullChannel = (await this.client.invoke(
                new Api.channels.GetFullChannel({ channel }),
              )) as Api.messages.ChatFull;

              if (fullChannel.fullChat && 'participantsCount' in fullChannel.fullChat) {
                participantsCount = fullChannel.fullChat.participantsCount;
              }
            } catch (error) {
              // Игнорируем ошибки получения полной информации о канале
              this.logger.warn(`Could not get full channel info for @${channelUsername}`);
            }
          }

          return this.convertMessagesToSocialPosts(
            messages,
            channelUsername,
            participantsCount,
          );
        });

        allPosts.push(...posts);
        this.logger.info(`Collected ${posts.length} messages from @${channelUsername}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to collect from @${channelUsername}: ${errorMessage}`);
      }
    }

    return allPosts;
  }

  /**
   * Основной метод сбора данных
   */
  async collect(): Promise<SocialPost[]> {
    this.logger.info('Starting Telegram data collection');

    const posts = await this.collectFromChannels();

    // Дедупликация
    const uniquePosts = posts.filter((post) => {
      if (this.seenMessageIds.has(post.id)) {
        return false;
      }
      this.seenMessageIds.add(post.id);
      return true;
    });

    this.logger.info(
      `Collection complete: ${uniquePosts.length} unique messages, ` +
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
      const totalCollected = allPosts.length + (allPosts.length - this.seenMessageIds.size);
      const duplicates = totalCollected - allPosts.length;

      const duration = Date.now() - startTime;
      this.logger.info(`Completed in ${duration}ms`);

      return {
        platform: Platform.TELEGRAM,
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
        platform: Platform.TELEGRAM,
        success: false,
        postsCount: 0,
        duplicatesSkipped: 0,
        errors,
        collectedAt: new Date(),
      };
    }
  }

  /**
   * Конвертация Telegram сообщений в SocialPost
   */
  private convertMessagesToSocialPosts(
    messages: Api.Message[],
    channelUsername: string,
    channelSubscribers?: number,
  ): SocialPost[] {
    return messages
      .filter((msg) => msg.message) // Только текстовые сообщения
      .map((msg) => {
        const messageId = msg.id.toString();
        const channelId = 'peerId' in msg && msg.peerId ? this.getPeerId(msg.peerId) : '';

        return {
          id: `${channelId}_${messageId}`,
          platform: Platform.TELEGRAM,
          author: channelUsername,
          authorFollowers: channelSubscribers,
          content: msg.message,
          engagement: {
            likes: msg.forwards || 0,
            comments: msg.replies?.replies || 0,
            shares: msg.forwards || 0,
          },
          timestamp: new Date(msg.date * 1000),
          url: `https://t.me/${channelUsername}/${messageId}`,
          collectedAt: new Date(),
        };
      });
  }

  /**
   * Получение peer ID из объекта Peer
   */
  private getPeerId(peer: Api.TypePeer): string {
    if ('channelId' in peer && peer.channelId) {
      return peer.channelId.toString();
    }
    if ('chatId' in peer && peer.chatId) {
      return peer.chatId.toString();
    }
    if ('userId' in peer && peer.userId) {
      return peer.userId.toString();
    }
    return '';
  }

  /**
   * Очистка кеша
   */
  clearCache(): void {
    this.seenMessageIds.clear();
    this.logger.info('Cache cleared');
  }

  /**
   * Получение статистики
   */
  getStats(): { platform: SocialPlatform; cachedMessages: number } {
    return {
      platform: Platform.TELEGRAM,
      cachedMessages: this.seenMessageIds.size,
    };
  }
}
