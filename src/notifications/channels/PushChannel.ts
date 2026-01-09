import { BaseNotificationChannel } from './BaseChannel.js';
import type { Notification, PushConfig } from '../types.js';

/**
 * Канал Push уведомлений для web
 *
 * Использует Web Push API для отправки push-уведомлений в браузер
 */
export class PushChannel extends BaseNotificationChannel {
  private endpoint: string;
  private _publicKey: string; // Для будущей реализации с web-push библиотекой
  private _privateKey: string; // Для будущей реализации с web-push библиотекой
  private subscriptions: Set<PushSubscription>;

  constructor(config: PushConfig) {
    super(config.enabled, config.minImportance);
    this.endpoint = config.endpoint;
    this._publicKey = config.publicKey;
    this._privateKey = config.privateKey;
    this.subscriptions = new Set();
  }

  get name(): string {
    return 'push';
  }

  async send(notification: Notification): Promise<void> {
    if (this.subscriptions.size === 0) {
      console.warn('No push subscriptions registered');
      return;
    }

    const payload = this.buildPushPayload(notification);

    const failedSubscriptions: PushSubscription[] = [];

    for (const subscription of this.subscriptions) {
      try {
        await this.sendToSubscription(subscription, payload);
      } catch (error) {
        console.error('Failed to send push to subscription:', error);
        failedSubscriptions.push(subscription);
      }
    }

    // Удаление неудачных подписок
    for (const subscription of failedSubscriptions) {
      this.subscriptions.delete(subscription);
    }
  }

  /**
   * Построение payload для push уведомления
   */
  private buildPushPayload(notification: Notification): string {
    const emoji = this.getEmoji(notification.importance);

    const payload = {
      title: `${emoji} ${notification.title}`,
      body: notification.message,
      icon: this.getIconForCategory(notification.category),
      badge: '/badge-icon.png',
      tag: notification.id,
      timestamp: notification.timestamp.getTime(),
      data: {
        notification,
        url: this.endpoint,
      },
      actions: [
        {
          action: 'view',
          title: 'View Details',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
        },
      ],
    };

    return JSON.stringify(payload);
  }

  /**
   * Отправка уведомления конкретной подписке
   */
  private async sendToSubscription(subscription: PushSubscription, payload: string): Promise<void> {
    // В реальной реализации здесь используется web-push библиотека
    // npm install web-push @types/web-push

    try {
      // Примерная реализация с использованием web-push
      // const webpush = await import('web-push');
      //
      // webpush.setVapidDetails(
      //   'mailto:your-email@example.com',
      //   this.publicKey,
      //   this.privateKey
      // );
      //
      // await webpush.sendNotification(subscription, payload);

      // Для демонстрации выводим в консоль
      console.log('Would send push notification to:', subscription.endpoint);
      console.log('Payload:', payload);
    } catch (error) {
      console.error('Failed to send push notification:', error);
      throw error;
    }
  }

  /**
   * Регистрация новой подписки
   */
  addSubscription(subscription: PushSubscription): void {
    this.subscriptions.add(subscription);
    console.log(`✅ Push subscription added. Total: ${this.subscriptions.size}`);
  }

  /**
   * Удаление подписки
   */
  removeSubscription(subscription: PushSubscription): void {
    this.subscriptions.delete(subscription);
    console.log(`❌ Push subscription removed. Total: ${this.subscriptions.size}`);
  }

  /**
   * Получение всех подписок
   */
  getSubscriptions(): PushSubscription[] {
    return Array.from(this.subscriptions);
  }

  /**
   * Очистка всех подписок
   */
  clearSubscriptions(): void {
    this.subscriptions.clear();
    console.log('🗑️  All push subscriptions cleared');
  }

  /**
   * Получение VAPID ключей (для настройки)
   */
  getVapidKeys(): { publicKey: string; privateKey: string } {
    return {
      publicKey: this._publicKey,
      privateKey: this._privateKey,
    };
  }

  /**
   * Получение иконки для категории
   */
  private getIconForCategory(category: string): string {
    const icons: Record<string, string> = {
      trading: '/icons/trading.png',
      signal: '/icons/signal.png',
      risk: '/icons/risk.png',
      system: '/icons/system.png',
    };

    return icons[category] || '/icons/default.png';
  }
}

/**
 * Интерфейс подписки (упрощенный)
 */
export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}
