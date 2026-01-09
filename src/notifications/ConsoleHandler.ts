import type { Notification } from './types.js';

/**
 * Обработчик уведомлений для консоли
 */
export class ConsoleHandler {
  /**
   * Отправка уведомления в консоль
   */
  sendNotification(notification: Notification): void {
    const timestamp = notification.timestamp.toISOString();
    const emoji = this.getEmoji(notification.importance);
    const category = `[${notification.category.toUpperCase()}]`;

    console.info(
      `🔔 ${emoji} ${timestamp} ${category} ${notification.title}\n   ${notification.message}`,
    );

    if (notification.data) {
      console.info('   Data:', JSON.stringify(notification.data, null, 2));
    }
  }

  /**
   * Получение эмодзи для уровня важности
   */
  private getEmoji(importance: string): string {
    switch (importance) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return 'ℹ️';
      case 'low':
        return '💡';
      default:
        return '🔔';
    }
  }
}
