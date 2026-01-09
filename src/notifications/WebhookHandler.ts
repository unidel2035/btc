import type { Notification } from './types.js';

/**
 * Обработчик webhook уведомлений
 */
export class WebhookHandler {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  /**
   * Отправка уведомления на webhook
   */
  async sendNotification(notification: Notification): Promise<void> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: notification.id,
          timestamp: notification.timestamp.toISOString(),
          category: notification.category,
          type: notification.type,
          importance: notification.importance,
          title: notification.title,
          message: notification.message,
          data: notification.data,
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
      throw error;
    }
  }
}
