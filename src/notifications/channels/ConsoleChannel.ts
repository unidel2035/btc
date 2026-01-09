import { BaseNotificationChannel } from './BaseChannel.js';
import type { Notification } from '../types.js';

/**
 * Канал уведомлений в консоль
 */
export class ConsoleChannel extends BaseNotificationChannel {
  get name(): string {
    return 'console';
  }

  async send(notification: Notification): Promise<void> {
    const emoji = this.getEmoji(notification.importance);
    const timestamp = this.formatDate(notification.timestamp);
    const symbol = notification.symbol ? `[${notification.symbol}]` : '';

    console.log(`${emoji} [${timestamp}] ${symbol} ${notification.title}`);
    console.log(`   ${notification.message}`);

    if (notification.data) {
      console.log('   Data:', JSON.stringify(notification.data, null, 2));
    }

    console.log(''); // Empty line for readability
  }
}
