import type { Notification, WebPushConfig } from './types.js';

/**
 * Web Push уведомления
 * Примечание: Требует настройки VAPID keys и регистрации service worker на клиенте
 */
export class WebPushNotifier {
  private config: WebPushConfig;
  private subscriptions: Set<unknown> = new Set();

  constructor(config: WebPushConfig) {
    this.config = config;
  }

  /**
   * Добавление подписки на уведомления
   */
  addSubscription(subscription: unknown): void {
    this.subscriptions.add(subscription);
  }

  /**
   * Удаление подписки
   */
  removeSubscription(subscription: unknown): void {
    this.subscriptions.delete(subscription);
  }

  /**
   * Отправка уведомления
   */
  sendNotification(notification: Notification): void {
    if (!this.config.enabled) {
      return;
    }

    // TODO: Реализация отправки web push уведомлений
    // Требует библиотеку web-push: npm install web-push
    // const webpush = require('web-push');
    //
    // webpush.setVapidDetails(
    //   'mailto:your-email@example.com',
    //   this.config.vapidPublicKey,
    //   this.config.vapidPrivateKey
    // );
    //
    // const payload = JSON.stringify({
    //   title: notification.title,
    //   body: notification.message,
    //   icon: '/icon.png',
    //   badge: '/badge.png',
    //   data: notification.data
    // });
    //
    // for (const subscription of this.subscriptions) {
    //   await webpush.sendNotification(subscription, payload);
    // }

    console.warn('Web Push notifications not fully implemented yet');
    console.info('Would send push notification:', notification.title);
  }

  /**
   * Получение количества активных подписок
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }
}
