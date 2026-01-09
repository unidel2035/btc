import type { Notification, DiscordConfig } from './types.js';

/**
 * Discord webhook для уведомлений
 */
export class DiscordWebhook {
  private config: DiscordConfig;

  constructor(config: DiscordConfig) {
    this.config = config;
  }

  /**
   * Отправка уведомления
   */
  async sendNotification(notification: Notification): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      const embed = this.createEmbed(notification);

      const payload = {
        username: this.config.username || 'Trading Bot',
        avatar_url: this.config.avatarUrl,
        embeds: [embed],
      };

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Discord webhook error: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send Discord notification:', error);
      throw error;
    }
  }

  /**
   * Создание embed для Discord
   */
  private createEmbed(notification: Notification): {
    title: string;
    description: string;
    color: number;
    timestamp: string;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
  } {
    const color = this.getColorForImportance(notification.importance);

    const embed: {
      title: string;
      description: string;
      color: number;
      timestamp: string;
      fields?: Array<{ name: string; value: string; inline?: boolean }>;
    } = {
      title: `${this.getEmojiForImportance(notification.importance)} ${notification.title}`,
      description: notification.message,
      color,
      timestamp: notification.timestamp.toISOString(),
    };

    // Добавление полей из данных
    if (notification.data) {
      embed.fields = this.createFieldsFromData(notification.data);
    }

    return embed;
  }

  /**
   * Создание полей из данных уведомления
   */
  private createFieldsFromData(
    data: unknown,
  ): Array<{ name: string; value: string; inline?: boolean }> {
    const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

    if (!data || typeof data !== 'object') {
      return fields;
    }

    const dataRecord = data as Record<string, unknown>;

    // Обработка торговых данных
    if ('symbol' in dataRecord && typeof dataRecord.symbol === 'string') {
      fields.push({
        name: 'Symbol',
        value: dataRecord.symbol,
        inline: true,
      });
    }

    if ('side' in dataRecord && typeof dataRecord.side === 'string') {
      fields.push({
        name: 'Side',
        value: dataRecord.side.toUpperCase(),
        inline: true,
      });
    }

    if ('pnl' in dataRecord && typeof dataRecord.pnl === 'number') {
      const pnlEmoji = dataRecord.pnl >= 0 ? '📈' : '📉';
      fields.push({
        name: 'PnL',
        value: `${pnlEmoji} ${dataRecord.pnl.toFixed(2)}`,
        inline: true,
      });
    }

    if ('pnlPercent' in dataRecord && typeof dataRecord.pnlPercent === 'number') {
      fields.push({
        name: 'PnL %',
        value: `${dataRecord.pnlPercent.toFixed(2)}%`,
        inline: true,
      });
    }

    if ('entryPrice' in dataRecord && typeof dataRecord.entryPrice === 'number') {
      fields.push({
        name: 'Entry Price',
        value: dataRecord.entryPrice.toString(),
        inline: true,
      });
    }

    if ('exitPrice' in dataRecord && typeof dataRecord.exitPrice === 'number') {
      fields.push({
        name: 'Exit Price',
        value: dataRecord.exitPrice.toString(),
        inline: true,
      });
    }

    // Обработка риск данных
    if ('metric' in dataRecord && typeof dataRecord.metric === 'string') {
      fields.push({
        name: 'Metric',
        value: dataRecord.metric,
        inline: true,
      });
    }

    if ('currentValue' in dataRecord && typeof dataRecord.currentValue === 'number') {
      fields.push({
        name: 'Current Value',
        value: dataRecord.currentValue.toString(),
        inline: true,
      });
    }

    if ('limitValue' in dataRecord && typeof dataRecord.limitValue === 'number') {
      fields.push({
        name: 'Limit',
        value: dataRecord.limitValue.toString(),
        inline: true,
      });
    }

    return fields;
  }

  /**
   * Получение цвета для уровня важности
   */
  private getColorForImportance(importance: string): number {
    switch (importance) {
      case 'critical':
        return 0xff0000; // Red
      case 'high':
        return 0xff9900; // Orange
      case 'medium':
        return 0x0099ff; // Blue
      case 'low':
        return 0x00ff00; // Green
      default:
        return 0x808080; // Gray
    }
  }

  /**
   * Получение эмодзи для уровня важности
   */
  private getEmojiForImportance(importance: string): string {
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
