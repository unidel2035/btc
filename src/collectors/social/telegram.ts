import { Telegraf, Context } from 'telegraf';
import { Message } from 'telegraf/types';
import { SocialPost, TelegramConfig } from '../../types/social.js';
import { AbstractCollector, SocialCollector } from '../base.js';

/**
 * Коллектор для Telegram каналов
 */
export class TelegramCollector extends AbstractCollector implements SocialCollector {
  private bot: Telegraf | null = null;
  private config: TelegramConfig;
  private subscribers: Array<(post: SocialPost) => void> = [];
  private posts: SocialPost[] = [];

  constructor(config: TelegramConfig) {
    super('TelegramCollector');
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.running) {
      console.warn(`${this.name} is already running`);
      return;
    }

    try {
      // Создание бота для получения обновлений
      this.bot = new Telegraf(String(this.config.apiId));

      // Настройка обработчиков сообщений
      this.setupHandlers();

      // Запуск бота
      await this.bot.launch();

      console.info(`${this.name} started successfully`);
      console.info(`Monitoring channels: ${this.config.channels.join(', ')}`);
      this.setRunning(true);
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

    if (this.bot) {
      this.bot.stop();
      this.bot = null;
    }

    this.setRunning(false);
    console.info(`${this.name} stopped`);
  }

  async fetchPosts(limit = 50): Promise<SocialPost[]> {
    // Возвращаем последние собранные посты
    return this.posts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
  }

  subscribe(callback: (post: SocialPost) => void): void {
    this.subscribers.push(callback);
  }

  unsubscribe(): void {
    this.subscribers = [];
  }

  /**
   * Настройка обработчиков сообщений
   */
  private setupHandlers(): void {
    if (!this.bot) {
      return;
    }

    // Обработка канальных постов
    this.bot.on('channel_post', (ctx) => {
      this.handleChannelPost(ctx);
    });

    // Обработка текстовых сообщений (для совместимости)
    // Примечание: Telegram Bot API обрабатывает каналы через channel_post
  }

  /**
   * Обработка канального поста
   */
  private handleChannelPost(ctx: Context): void {
    const message = ctx.channelPost || ctx.message;
    if (!message || !('text' in message)) {
      return;
    }

    const channelId = ctx.chat?.id.toString();
    if (!channelId) {
      return;
    }

    // Проверяем, что канал отслеживается
    const channelUsername =
      'username' in ctx.chat! ? ctx.chat.username : undefined;
    const isMonitored =
      channelUsername && this.config.channels.includes(`@${channelUsername}`);

    if (!isMonitored) {
      return;
    }

    try {
      const post = this.convertMessageToPost(message as Message.TextMessage, channelUsername!);

      // Добавляем пост в коллекцию
      this.posts.push(post);

      // Ограничиваем размер коллекции
      if (this.posts.length > 500) {
        this.posts = this.posts.slice(-250);
      }

      // Уведомляем подписчиков
      for (const subscriber of this.subscribers) {
        try {
          subscriber(post);
        } catch (error) {
          console.error('Error in subscriber callback:', error);
        }
      }

      console.info(
        `New Telegram post from ${channelUsername}: ${post.content.substring(0, 50)}...`,
      );
    } catch (error) {
      console.error('Error handling Telegram message:', error);
    }
  }

  /**
   * Конвертация Telegram сообщения в SocialPost
   */
  private convertMessageToPost(
    message: Message.TextMessage,
    channelUsername: string,
  ): SocialPost {
    const isForwarded = 'forward_date' in message && message.forward_date;
    return {
      id: message.message_id.toString(),
      platform: 'telegram' as const,
      author: channelUsername,
      authorFollowers: undefined, // Telegram не предоставляет количество подписчиков через Bot API
      content: message.text,
      engagement: {
        likes: 0, // Bot API не предоставляет информацию о реакциях
        comments: 0,
        shares: isForwarded ? 1 : 0,
      },
      timestamp: new Date(message.date * 1000),
      url: `https://t.me/${channelUsername}/${message.message_id}`,
    };
  }
}
