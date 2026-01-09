import {
  NotificationCategory,
  NotificationImportance,
  NotificationChannel,
  type Notification,
  type NotificationConfig,
} from './types.js';

/**
 * Сервис управления уведомлениями
 */
export class NotificationService {
  private config: NotificationConfig;
  private handlers: Map<NotificationChannel, (notification: Notification) => Promise<void> | void> =
    new Map();

  constructor(config: NotificationConfig) {
    this.config = config;
  }

  /**
   * Регистрация обработчика для канала
   */
  registerHandler(
    channel: NotificationChannel,
    handler: (notification: Notification) => Promise<void> | void,
  ): void {
    this.handlers.set(channel, handler);
  }

  /**
   * Отправка уведомления
   */
  async send(notification: Notification): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // Фильтр по категориям
    if (
      this.config.categories &&
      this.config.categories.length > 0 &&
      !this.config.categories.includes(notification.category)
    ) {
      return;
    }

    // Фильтр по важности
    if (this.config.minImportance && !this.meetsMinImportance(notification.importance)) {
      return;
    }

    // Отправка в активные каналы
    const promises: Promise<void>[] = [];

    // Telegram
    if (
      this.config.telegram?.enabled &&
      this.meetsChannelImportance(notification.importance, this.config.telegram.minImportance)
    ) {
      const handler = this.handlers.get(NotificationChannel.TELEGRAM);
      if (handler) {
        promises.push(this.sendToChannel(NotificationChannel.TELEGRAM, handler, notification));
      }
    }

    // Email
    if (
      this.config.email?.enabled &&
      this.meetsChannelImportance(notification.importance, this.config.email.minImportance)
    ) {
      const handler = this.handlers.get(NotificationChannel.EMAIL);
      if (handler) {
        promises.push(this.sendToChannel(NotificationChannel.EMAIL, handler, notification));
      }
    }

    // Discord
    if (
      this.config.discord?.enabled &&
      this.meetsChannelImportance(notification.importance, this.config.discord.minImportance)
    ) {
      const handler = this.handlers.get(NotificationChannel.DISCORD);
      if (handler) {
        promises.push(this.sendToChannel(NotificationChannel.DISCORD, handler, notification));
      }
    }

    // Web Push
    if (
      this.config.webPush?.enabled &&
      this.meetsChannelImportance(notification.importance, this.config.webPush.minImportance)
    ) {
      const handler = this.handlers.get(NotificationChannel.PUSH);
      if (handler) {
        promises.push(this.sendToChannel(NotificationChannel.PUSH, handler, notification));
      }
    }

    // Webhook
    if (
      this.config.webhook?.enabled &&
      this.meetsChannelImportance(notification.importance, this.config.webhook.minImportance)
    ) {
      const handler = this.handlers.get(NotificationChannel.WEBHOOK);
      if (handler) {
        promises.push(this.sendToChannel(NotificationChannel.WEBHOOK, handler, notification));
      }
    }

    // Console всегда включен для логирования
    const consoleHandler = this.handlers.get(NotificationChannel.CONSOLE);
    if (consoleHandler) {
      promises.push(this.sendToChannel(NotificationChannel.CONSOLE, consoleHandler, notification));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Отправка в конкретный канал с обработкой ошибок
   */
  private async sendToChannel(
    channel: NotificationChannel,
    handler: (notification: Notification) => Promise<void> | void,
    notification: Notification,
  ): Promise<void> {
    try {
      await handler(notification);
    } catch (error) {
      console.error(`Failed to send notification to ${channel}:`, error);
    }
  }

  /**
   * Проверка соответствия минимальной важности
   */
  private meetsMinImportance(importance: NotificationImportance): boolean {
    if (!this.config.minImportance) {
      return true;
    }

    const levels = [
      NotificationImportance.LOW,
      NotificationImportance.MEDIUM,
      NotificationImportance.HIGH,
      NotificationImportance.CRITICAL,
    ];

    const importanceLevel = levels.indexOf(importance);
    const minLevel = levels.indexOf(this.config.minImportance);

    return importanceLevel >= minLevel;
  }

  /**
   * Проверка соответствия важности для конкретного канала
   */
  private meetsChannelImportance(
    importance: NotificationImportance,
    channelMinImportance?: NotificationImportance,
  ): boolean {
    if (!channelMinImportance) {
      return true;
    }

    const levels = [
      NotificationImportance.LOW,
      NotificationImportance.MEDIUM,
      NotificationImportance.HIGH,
      NotificationImportance.CRITICAL,
    ];

    const importanceLevel = levels.indexOf(importance);
    const minLevel = levels.indexOf(channelMinImportance);

    return importanceLevel >= minLevel;
  }

  /**
   * Создание уведомления с генерацией ID
   */
  createNotification(params: {
    category: NotificationCategory;
    type: string;
    importance: NotificationImportance;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }): Notification {
    return {
      id: this.generateId(),
      timestamp: new Date(),
      ...params,
    };
  }

  /**
   * Генерация уникального ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Обновление конфигурации
   */
  updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.info('📢 Notification configuration updated');
  }

  /**
   * Получение текущей конфигурации
   */
  getConfig(): NotificationConfig {
    return { ...this.config };
  }
}
