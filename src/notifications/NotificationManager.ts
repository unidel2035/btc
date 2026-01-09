import { ConsoleChannel } from './channels/ConsoleChannel.js';
import { TelegramChannel } from './channels/TelegramChannel.js';
import { EmailChannel } from './channels/EmailChannel.js';
import { DiscordChannel } from './channels/DiscordChannel.js';
import { PushChannel } from './channels/PushChannel.js';
import type { INotificationChannel } from './channels/BaseChannel.js';
import {
  NotificationChannel,
  NotificationType,
  NotificationCategory,
  NotificationImportance,
} from './types.js';
import type {
  Notification,
  NotificationConfig,
  NotificationFilter,
  NotificationResult,
  NotificationStats,
  PositionData,
} from './types.js';

/**
 * Менеджер системы уведомлений
 */
export class NotificationManager {
  private config: NotificationConfig;
  private channels: Map<NotificationChannel, INotificationChannel>;
  private stats: NotificationStats;
  private notificationHistory: Notification[];
  private maxHistorySize: number = 1000;

  constructor(config: NotificationConfig) {
    this.config = config;
    this.channels = new Map();
    this.stats = this.initStats();
    this.notificationHistory = [];

    this.initializeChannels();
  }

  /**
   * Инициализация каналов уведомлений
   */
  private initializeChannels(): void {
    // Console channel
    if (this.config.console?.enabled) {
      const channel = new ConsoleChannel(
        this.config.console.enabled,
        this.config.console.minImportance,
      );
      this.channels.set(NotificationChannel.CONSOLE, channel);
    }

    // Telegram channel
    if (this.config.telegram?.enabled && this.config.telegram.botToken) {
      const channel = new TelegramChannel(this.config.telegram);
      this.channels.set(NotificationChannel.TELEGRAM, channel);
    }

    // Email channel
    if (this.config.email?.enabled) {
      const channel = new EmailChannel(this.config.email);
      this.channels.set(NotificationChannel.EMAIL, channel);
    }

    // Discord channel
    if (this.config.discord?.enabled && this.config.discord.webhookUrl) {
      const channel = new DiscordChannel(this.config.discord);
      this.channels.set(NotificationChannel.DISCORD, channel);
    }

    // Push channel
    if (this.config.push?.enabled) {
      const channel = new PushChannel(this.config.push);
      this.channels.set(NotificationChannel.PUSH, channel);
    }

    console.log(`🔔 Notification Manager initialized with ${this.channels.size} channels`);
  }

  /**
   * Отправка уведомления
   */
  async send(notification: Notification): Promise<NotificationResult[]> {
    if (!this.config.enabled) {
      return [];
    }

    // Добавление в историю
    this.addToHistory(notification);

    // Применение фильтров
    if (!this.shouldSendNotification(notification)) {
      return [];
    }

    const results: NotificationResult[] = [];

    // Отправка через каждый канал
    for (const [channelType, channel] of this.channels) {
      if (!channel.isEnabled()) {
        continue;
      }

      if (!channel.shouldSend(notification)) {
        continue;
      }

      try {
        await channel.send(notification);
        results.push({
          channel: channelType,
          success: true,
          sentAt: new Date(),
        });

        this.updateStats(channelType, notification, true);
      } catch (error) {
        console.error(`Failed to send notification via ${channelType}:`, error);
        results.push({
          channel: channelType,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          sentAt: new Date(),
        });

        this.updateStats(channelType, notification, false);
      }
    }

    return results;
  }

  /**
   * Быстрые методы для отправки типовых уведомлений
   */

  /**
   * Уведомление об открытии позиции
   */
  async notifyPositionOpened(data: PositionData): Promise<NotificationResult[]> {
    const notification: Notification = {
      id: this.generateId(),
      type: NotificationType.POSITION_OPENED,
      category: NotificationCategory.TRADING,
      importance: NotificationImportance.MEDIUM,
      title: 'Position Opened',
      message: `${data.side.toUpperCase()} position opened at ${data.entryPrice}`,
      symbol: data.symbol,
      data: {
        side: data.side,
        entryPrice: data.entryPrice,
        size: data.size,
        stopLoss: data.stopLoss,
        takeProfit: data.takeProfit,
      },
      timestamp: new Date(),
    };

    return this.send(notification);
  }

  /**
   * Уведомление о закрытии позиции
   */
  async notifyPositionClosed(data: PositionData): Promise<NotificationResult[]> {
    const importance =
      data.pnl && data.pnl > 0 ? NotificationImportance.MEDIUM : NotificationImportance.HIGH;

    const notification: Notification = {
      id: this.generateId(),
      type: NotificationType.POSITION_CLOSED,
      category: NotificationCategory.TRADING,
      importance,
      title: 'Position Closed',
      message: `${data.side.toUpperCase()} position closed with ${data.pnl && data.pnl > 0 ? 'profit' : 'loss'}: ${data.pnl?.toFixed(2)} (${data.pnlPercent?.toFixed(2)}%)`,
      symbol: data.symbol,
      data: {
        side: data.side,
        entryPrice: data.entryPrice,
        exitPrice: data.exitPrice,
        size: data.size,
        pnl: data.pnl,
        pnlPercent: data.pnlPercent,
        duration: data.duration,
      },
      timestamp: new Date(),
    };

    return this.send(notification);
  }

  /**
   * Уведомление о срабатывании stop-loss
   */
  async notifyStopLoss(data: PositionData): Promise<NotificationResult[]> {
    const notification: Notification = {
      id: this.generateId(),
      type: NotificationType.STOP_LOSS_TRIGGERED,
      category: NotificationCategory.TRADING,
      importance: NotificationImportance.HIGH,
      title: 'Stop-Loss Triggered',
      message: `Stop-loss triggered for ${data.side.toUpperCase()} position at ${data.exitPrice}`,
      symbol: data.symbol,
      data: {
        side: data.side,
        entryPrice: data.entryPrice,
        exitPrice: data.exitPrice,
        stopLoss: data.stopLoss,
        pnl: data.pnl,
        pnlPercent: data.pnlPercent,
      },
      timestamp: new Date(),
    };

    return this.send(notification);
  }

  /**
   * Уведомление о срабатывании take-profit
   */
  async notifyTakeProfit(data: PositionData): Promise<NotificationResult[]> {
    const notification: Notification = {
      id: this.generateId(),
      type: NotificationType.TAKE_PROFIT_TRIGGERED,
      category: NotificationCategory.TRADING,
      importance: NotificationImportance.MEDIUM,
      title: 'Take-Profit Triggered',
      message: `Take-profit triggered for ${data.side.toUpperCase()} position at ${data.exitPrice}`,
      symbol: data.symbol,
      data: {
        side: data.side,
        entryPrice: data.entryPrice,
        exitPrice: data.exitPrice,
        takeProfit: data.takeProfit,
        pnl: data.pnl,
        pnlPercent: data.pnlPercent,
      },
      timestamp: new Date(),
    };

    return this.send(notification);
  }

  /**
   * Уведомление о новостном сигнале
   */
  async notifyNewsSignal(
    symbol: string,
    message: string,
    data?: Record<string, unknown>,
  ): Promise<NotificationResult[]> {
    const notification: Notification = {
      id: this.generateId(),
      type: NotificationType.NEWS_SIGNAL,
      category: NotificationCategory.SIGNAL,
      importance: NotificationImportance.HIGH,
      title: 'Important News Signal',
      message,
      symbol,
      data,
      timestamp: new Date(),
    };

    return this.send(notification);
  }

  /**
   * Уведомление о whale alert
   */
  async notifyWhaleAlert(
    symbol: string,
    message: string,
    data?: Record<string, unknown>,
  ): Promise<NotificationResult[]> {
    const notification: Notification = {
      id: this.generateId(),
      type: NotificationType.WHALE_ALERT,
      category: NotificationCategory.SIGNAL,
      importance: NotificationImportance.HIGH,
      title: 'Whale Alert',
      message,
      symbol,
      data,
      timestamp: new Date(),
    };

    return this.send(notification);
  }

  /**
   * Уведомление о достижении дневного лимита
   */
  async notifyDailyLimit(currentValue: number, limitValue: number): Promise<NotificationResult[]> {
    const notification: Notification = {
      id: this.generateId(),
      type: NotificationType.DAILY_LIMIT_WARNING,
      category: NotificationCategory.RISK,
      importance: NotificationImportance.CRITICAL,
      title: 'Daily Loss Limit Warning',
      message: `Approaching daily loss limit: ${currentValue.toFixed(2)}% of ${limitValue}%`,
      data: {
        currentValue,
        limitValue,
        percentage: (currentValue / limitValue) * 100,
      },
      timestamp: new Date(),
    };

    return this.send(notification);
  }

  /**
   * Уведомление о просадке
   */
  async notifyDrawdown(
    currentDrawdown: number,
    maxDrawdown: number,
  ): Promise<NotificationResult[]> {
    const notification: Notification = {
      id: this.generateId(),
      type: NotificationType.DRAWDOWN_WARNING,
      category: NotificationCategory.RISK,
      importance: NotificationImportance.CRITICAL,
      title: 'Drawdown Warning',
      message: `High drawdown detected: ${currentDrawdown.toFixed(2)}% (limit: ${maxDrawdown}%)`,
      data: {
        currentDrawdown,
        maxDrawdown,
        percentage: (currentDrawdown / maxDrawdown) * 100,
      },
      timestamp: new Date(),
    };

    return this.send(notification);
  }

  /**
   * Системное уведомление
   */
  async notifySystem(
    type: NotificationType,
    title: string,
    message: string,
    importance: NotificationImportance = NotificationImportance.MEDIUM,
    data?: Record<string, unknown>,
  ): Promise<NotificationResult[]> {
    const notification: Notification = {
      id: this.generateId(),
      type,
      category: NotificationCategory.SYSTEM,
      importance,
      title,
      message,
      data,
      timestamp: new Date(),
    };

    return this.send(notification);
  }

  /**
   * Проверка, должно ли уведомление быть отправлено согласно фильтрам
   */
  private shouldSendNotification(notification: Notification): boolean {
    if (!this.config.filters || this.config.filters.length === 0) {
      return true;
    }

    // Если хотя бы один фильтр совпадает, отправляем
    return this.config.filters.some((filter) => this.matchesFilter(notification, filter));
  }

  /**
   * Проверка совпадения уведомления с фильтром
   */
  private matchesFilter(notification: Notification, filter: NotificationFilter): boolean {
    // Проверка типа
    if (filter.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      if (!types.includes(notification.type)) {
        return false;
      }
    }

    // Проверка категории
    if (filter.category) {
      const categories = Array.isArray(filter.category) ? filter.category : [filter.category];
      if (!categories.includes(notification.category)) {
        return false;
      }
    }

    // Проверка важности
    if (filter.importance) {
      const importances = Array.isArray(filter.importance)
        ? filter.importance
        : [filter.importance];
      if (!importances.includes(notification.importance)) {
        return false;
      }
    }

    // Проверка символа
    if (filter.symbol && notification.symbol) {
      const symbols = Array.isArray(filter.symbol) ? filter.symbol : [filter.symbol];
      if (!symbols.includes(notification.symbol)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Добавление уведомления в историю
   */
  private addToHistory(notification: Notification): void {
    this.notificationHistory.unshift(notification);

    // Ограничение размера истории
    if (this.notificationHistory.length > this.maxHistorySize) {
      this.notificationHistory = this.notificationHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Обновление статистики
   */
  private updateStats(
    channel: NotificationChannel,
    notification: Notification,
    success: boolean,
  ): void {
    this.stats.total++;
    this.stats.byChannel[channel] = (this.stats.byChannel[channel] || 0) + 1;
    this.stats.byImportance[notification.importance] =
      (this.stats.byImportance[notification.importance] || 0) + 1;
    this.stats.byCategory[notification.category] =
      (this.stats.byCategory[notification.category] || 0) + 1;

    if (!success) {
      this.stats.failed++;
    }

    this.stats.lastSent = new Date();
  }

  /**
   * Инициализация статистики
   */
  private initStats(): NotificationStats {
    return {
      total: 0,
      byChannel: {} as Record<NotificationChannel, number>,
      byImportance: {} as Record<NotificationImportance, number>,
      byCategory: {} as Record<NotificationCategory, number>,
      failed: 0,
    };
  }

  /**
   * Получение статистики
   */
  getStats(): NotificationStats {
    return { ...this.stats };
  }

  /**
   * Получение истории уведомлений
   */
  getHistory(limit?: number): Notification[] {
    if (limit) {
      return this.notificationHistory.slice(0, limit);
    }
    return [...this.notificationHistory];
  }

  /**
   * Очистка истории
   */
  clearHistory(): void {
    this.notificationHistory = [];
    console.log('🗑️  Notification history cleared');
  }

  /**
   * Получение конкретного канала
   */
  getChannel<T extends INotificationChannel>(channelType: NotificationChannel): T | undefined {
    return this.channels.get(channelType) as T | undefined;
  }

  /**
   * Включение/выключение уведомлений
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`🔔 Notifications ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Проверка, включены ли уведомления
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Обновление конфигурации
   */
  updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔔 Notification configuration updated');

    // Переинициализация каналов
    this.channels.clear();
    this.initializeChannels();
  }

  /**
   * Генерация уникального ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Тестовое уведомление
   */
  async sendTest(): Promise<NotificationResult[]> {
    const notification: Notification = {
      id: this.generateId(),
      type: NotificationType.BOT_RESTART,
      category: NotificationCategory.SYSTEM,
      importance: NotificationImportance.LOW,
      title: 'Test Notification',
      message: 'This is a test notification from the Notification System',
      data: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
      },
      timestamp: new Date(),
    };

    return this.send(notification);
  }
}
