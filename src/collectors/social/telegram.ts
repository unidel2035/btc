import { Telegraf, Context } from 'telegraf';
import { Message } from 'telegraf/typings/core/types/typegram';
import type {
  SocialPost,
  TelegramCollectorConfig,
  CollectionResult,
  Engagement,
  MediaAttachment,
} from './types.js';
import { withRetry, SocialRateLimiter, extractHashtags, extractMentions } from './utils.js';

/**
 * Коллектор данных из Telegram
 */
export class TelegramCollector {
  private bot: Telegraf;
  private config: TelegramCollectorConfig;
  private rateLimiter: SocialRateLimiter;
  private isRunning: boolean;
  private collectedPosts: SocialPost[];

  constructor(config: TelegramCollectorConfig, rateLimiter: SocialRateLimiter) {
    this.config = {
      pollInterval: 60000, // 1 минута по умолчанию
      ...config,
    };

    this.bot = new Telegraf(config.botToken);
    this.rateLimiter = rateLimiter;
    this.isRunning = false;
    this.collectedPosts = [];

    // Создаем rate limiter для Telegram
    this.rateLimiter.createTelegramLimiter();
  }

  /**
   * Запускает мониторинг Telegram каналов
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Telegram collector is already running');
      return;
    }

    this.isRunning = true;
    console.info('✈️ Telegram collector started');

    // Настраиваем обработчик сообщений из каналов
    this.setupMessageHandler();

    // Запускаем бота
    await this.bot.launch();

    console.info('✅ Telegram bot is running');
  }

  /**
   * Останавливает мониторинг Telegram
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    await this.bot.stop();
    console.info('🛑 Telegram collector stopped');
  }

  /**
   * Собирает данные из Telegram
   * Примечание: Telegram Bot API не позволяет напрямую читать историю каналов
   * Этот метод собирает сообщения, которые были получены с момента запуска бота
   */
  async collect(): Promise<CollectionResult> {
    const posts = [...this.collectedPosts];
    this.collectedPosts = []; // Очищаем после сбора

    console.info(`📊 Collected ${posts.length} messages from Telegram`);

    return {
      platform: 'telegram',
      posts,
      collectedAt: new Date(),
      count: posts.length,
    };
  }

  /**
   * Получает последние сообщения из канала через Telegram API
   * Требует, чтобы бот был администратором канала
   */
  async collectFromChannel(channelUsername: string, limit = 10): Promise<SocialPost[]> {
    const posts: SocialPost[] = [];

    try {
      const messages = await withRetry(
        async () => {
          return await this.rateLimiter.execute('telegram', async () => {
            // Используем getUpdates для получения сообщений
            // @ts-expect-error - telegraf getUpdates signature mismatch
            const updates = await this.bot.telegram.getUpdates();

            const channelPosts = updates
              .filter((update) => 'channel_post' in update)
              .map((update) => update.channel_post)
              .filter((msg) => msg !== undefined && 'text' in msg) as Message.TextMessage[];

            return channelPosts.slice(0, limit);
          });
        },
        { maxRetries: 3 },
      );

      for (const message of messages) {
        const post = await this.convertMessageToPost(message, channelUsername);
        posts.push(post);
      }
    } catch (error) {
      console.error(`Error collecting from Telegram channel ${channelUsername}:`, error);
    }

    return posts;
  }

  /**
   * Настраивает обработчик входящих сообщений
   */
  private setupMessageHandler(): void {
    // Обработка сообщений из каналов
    this.bot.on('channel_post', async (ctx: Context) => {
      try {
        if (!ctx.channelPost || !('text' in ctx.channelPost) || !ctx.chat) {
          return;
        }

        const message = ctx.channelPost as Message.TextMessage;
        const chat = ctx.chat;

        // Проверяем, что это один из отслеживаемых каналов
        const channelUsername =
          'username' in chat ? (chat.username ?? String(chat.id)) : String(chat.id);
        if (!this.isMonitoredChannel(channelUsername)) {
          return;
        }

        const post = await this.convertMessageToPost(message, channelUsername);
        this.collectedPosts.push(post);

        console.info(`📨 New message from ${channelUsername}: ${post.id}`);
      } catch (error) {
        console.error('Error processing channel post:', error);
      }
    });

    // Обработка текстовых сообщений (для групп/чатов)
    this.bot.on('text', async (ctx: Context) => {
      try {
        if (!ctx.message || !('text' in ctx.message) || !ctx.chat) {
          return;
        }

        const message = ctx.message as Message.TextMessage;
        const chat = ctx.chat;

        // Проверяем тип чата
        if (chat.type !== 'channel' && chat.type !== 'supergroup') {
          return;
        }

        const channelUsername =
          'username' in chat ? (chat.username ?? String(chat.id)) : String(chat.id);
        if (!this.isMonitoredChannel(channelUsername)) {
          return;
        }

        const post = await this.convertMessageToPost(message, channelUsername);
        this.collectedPosts.push(post);
      } catch (error) {
        console.error('Error processing text message:', error);
      }
    });
  }

  /**
   * Проверяет, является ли канал отслеживаемым
   */
  private isMonitoredChannel(channelIdentifier: string): boolean {
    return this.config.channels.some((channel) => {
      const normalizedChannel = channel.startsWith('@') ? channel.slice(1) : channel;
      const normalizedIdentifier = channelIdentifier.startsWith('@')
        ? channelIdentifier.slice(1)
        : channelIdentifier;
      return (
        normalizedIdentifier === normalizedChannel ||
        channelIdentifier === channel ||
        normalizedIdentifier.includes(normalizedChannel)
      );
    });
  }

  /**
   * Конвертирует Telegram сообщение в SocialPost
   */
  private async convertMessageToPost(
    message: Message.TextMessage,
    channelUsername: string,
  ): Promise<SocialPost> {
    const text = message.text;
    const chatId = message.chat.id;
    const messageId = message.message_id;

    // Получаем статистику сообщения (views)
    const views = 0;

    const engagement: Engagement = {
      likes: 0, // Telegram не предоставляет информацию о реакциях через Bot API
      comments: 0, // Комментарии доступны только в некоторых типах каналов
      shares: 0, // forward_date не всегда доступен
      views,
    };

    // Обработка медиа
    const media: MediaAttachment[] = [];

    const hashtags = extractHashtags(text);
    const mentions = extractMentions(text);

    // Формируем URL сообщения
    const messageUrl =
      channelUsername && !channelUsername.startsWith('-')
        ? `https://t.me/${channelUsername}/${messageId}`
        : `https://t.me/c/${String(chatId).replace('-100', '')}/${messageId}`;

    return {
      id: `telegram_${chatId}_${messageId}`,
      platform: 'telegram',
      author: channelUsername,
      authorFollowers: undefined, // Telegram Bot API не предоставляет количество подписчиков
      content: text,
      engagement,
      timestamp: new Date(message.date * 1000),
      url: messageUrl,
      hashtags: hashtags.length > 0 ? hashtags : undefined,
      mentions: mentions.length > 0 ? mentions : undefined,
      media: media.length > 0 ? media : undefined,
    };
  }

  /**
   * Проверяет соединение с Telegram Bot API
   */
  async testConnection(): Promise<boolean> {
    try {
      const me = await this.bot.telegram.getMe();
      console.info(`✅ Telegram Bot API connection successful. Bot: @${me.username}`);
      return true;
    } catch (error) {
      console.error('❌ Telegram Bot API connection failed:', error);
      return false;
    }
  }

  /**
   * Получает информацию о канале
   */
  async getChannelInfo(channelUsername: string): Promise<void> {
    try {
      const chat = await this.bot.telegram.getChat(channelUsername);
      console.info('Channel info:', {
        id: chat.id,
        type: chat.type,
        title: 'title' in chat ? chat.title : 'N/A',
        username: 'username' in chat ? chat.username : 'N/A',
      });
    } catch (error) {
      console.error(`Error getting channel info for ${channelUsername}:`, error);
    }
  }
}
