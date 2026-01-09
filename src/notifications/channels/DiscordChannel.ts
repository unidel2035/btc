import { BaseNotificationChannel } from './BaseChannel.js';
import type { Notification, DiscordConfig } from '../types.js';

/**
 * Канал уведомлений в Discord через webhook
 */
export class DiscordChannel extends BaseNotificationChannel {
  private webhookUrl: string;
  private username: string;
  private avatarUrl?: string;

  constructor(config: DiscordConfig) {
    super(config.enabled, config.minImportance);
    this.webhookUrl = config.webhookUrl;
    this.username = config.username || 'Trading Bot';
    this.avatarUrl = config.avatarUrl;
  }

  get name(): string {
    return 'discord';
  }

  async send(notification: Notification): Promise<void> {
    if (!this.webhookUrl) {
      console.warn('Discord webhook URL not configured');
      return;
    }

    try {
      const payload = this.buildDiscordPayload(notification);

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Discord webhook error: ${error}`);
      }
    } catch (error) {
      console.error('Failed to send Discord notification:', error);
      throw error;
    }
  }

  /**
   * Построение payload для Discord webhook
   */
  private buildDiscordPayload(notification: Notification): Record<string, unknown> {
    const embed = {
      title: notification.title,
      description: notification.message,
      color: this.getColorForImportance(notification.importance),
      timestamp: notification.timestamp.toISOString(),
      fields: [] as Array<{ name: string; value: string; inline: boolean }>,
      footer: {
        text: `${notification.category} | ${notification.type}`,
      },
    };

    // Добавление символа в поля
    if (notification.symbol) {
      embed.fields.push({
        name: 'Symbol',
        value: notification.symbol,
        inline: true,
      });
    }

    // Добавление важности
    embed.fields.push({
      name: 'Importance',
      value: this.capitalizeFirstLetter(notification.importance),
      inline: true,
    });

    // Добавление данных
    if (notification.data) {
      const dataFields = this.formatDataForDiscord(notification.data);
      embed.fields.push(...dataFields);
    }

    return {
      username: this.username,
      avatar_url: this.avatarUrl,
      embeds: [embed],
    };
  }

  /**
   * Получение цвета для уровня важности
   */
  private getColorForImportance(importance: string): number {
    const colors: Record<string, number> = {
      low: 0x3498db, // Синий
      medium: 0xf39c12, // Оранжевый
      high: 0xe67e22, // Темно-оранжевый
      critical: 0xe74c3c, // Красный
    };

    return colors[importance] || 0x95a5a6; // Серый по умолчанию
  }

  /**
   * Форматирование данных для Discord
   */
  private formatDataForDiscord(
    data: Record<string, unknown>,
  ): Array<{ name: string; value: string; inline: boolean }> {
    const fields: Array<{ name: string; value: string; inline: boolean }> = [];

    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) continue;

      const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
      const capitalizedKey = formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);

      let formattedValue: string;
      if (typeof value === 'number') {
        formattedValue = this.formatNumber(value);
      } else if (typeof value === 'boolean') {
        formattedValue = value ? '✅ Yes' : '❌ No';
      } else if (typeof value === 'object') {
        formattedValue = JSON.stringify(value, null, 2);
      } else {
        formattedValue = String(value);
      }

      // Ограничение длины значения (Discord имеет лимит 1024 символа на поле)
      if (formattedValue.length > 1024) {
        formattedValue = formattedValue.substring(0, 1021) + '...';
      }

      fields.push({
        name: capitalizedKey,
        value: formattedValue,
        inline: typeof value === 'number' || typeof value === 'boolean',
      });
    }

    return fields;
  }

  /**
   * Капитализация первой буквы
   */
  private capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
