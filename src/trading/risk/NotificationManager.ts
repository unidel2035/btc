import type { NotificationConfig, NotificationChannel, RiskEventType } from './types.js';

/**
 * Менеджер уведомлений о риск-событиях
 */
export class NotificationManager {
  private config: NotificationConfig;

  constructor(config: NotificationConfig) {
    this.config = config;
  }

  /**
   * Отправка уведомления
   */
  async sendNotification(notification: {
    type: RiskEventType | string;
    message: string;
    symbol?: string;
    data?: unknown;
  }): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    for (const channel of this.config.channels) {
      try {
        await this.sendToChannel(channel, notification);
      } catch (error) {
        console.error(`Failed to send notification to ${channel}:`, error);
      }
    }
  }

  /**
   * Отправка предупреждения о приближении к лимиту
   */
  async sendWarning(warning: { type: string; message: string; percent: number }): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const notification = {
      type: 'limit_warning',
      message: `⚠️  WARNING: ${warning.message}`,
      data: warning,
    };

    for (const channel of this.config.channels) {
      try {
        await this.sendToChannel(channel, notification);
      } catch (error) {
        console.error(`Failed to send warning to ${channel}:`, error);
      }
    }
  }

  /**
   * Отправка в конкретный канал
   */
  private async sendToChannel(
    channel: NotificationChannel,
    notification: {
      type: string;
      message: string;
      symbol?: string;
      data?: unknown;
    },
  ): Promise<void> {
    switch (channel) {
      case 'console':
        this.sendToConsole(notification);
        break;
      case 'telegram':
        await this.sendToTelegram(notification);
        break;
      case 'email':
        await this.sendToEmail(notification);
        break;
      case 'webhook':
        await this.sendToWebhook(notification);
        break;
      default:
        console.warn(`Unknown notification channel: ${channel}`);
    }
  }

  /**
   * Отправка в консоль
   */
  private sendToConsole(notification: {
    type: string;
    message: string;
    symbol?: string;
    data?: unknown;
  }): void {
    const timestamp = new Date().toISOString();
    const symbol = notification.symbol ? `[${notification.symbol}]` : '';
    console.info(`🔔 [${timestamp}] ${symbol} ${notification.message}`);

    if (notification.data) {
      console.info('   Data:', JSON.stringify(notification.data, null, 2));
    }
  }

  /**
   * Отправка в Telegram
   */
  private async sendToTelegram(notification: {
    type: string;
    message: string;
    symbol?: string;
    data?: unknown;
  }): Promise<void> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.warn('Telegram credentials not configured');
      return;
    }

    try {
      const symbol = notification.symbol ? `[${notification.symbol}]` : '';
      const text = `🔔 ${symbol} ${notification.message}`;

      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
        }),
      });

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
    }
  }

  /**
   * Отправка по email
   */
  private async sendToEmail(notification: {
    type: string;
    message: string;
    symbol?: string;
    data?: unknown;
  }): Promise<void> {
    // TODO: Реализация отправки email
    // Можно использовать nodemailer или внешний API (SendGrid, Mailgun, etc.)
    console.warn('Email notifications not yet implemented');
    console.info('Would send email:', notification.message);
  }

  /**
   * Отправка на webhook
   */
  private async sendToWebhook(notification: {
    type: string;
    message: string;
    symbol?: string;
    data?: unknown;
  }): Promise<void> {
    const webhookUrl = process.env.RISK_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn('Webhook URL not configured');
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          type: notification.type,
          message: notification.message,
          symbol: notification.symbol,
          data: notification.data,
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
    }
  }

  /**
   * Обновление конфигурации уведомлений
   */
  updateConfig(newConfig: Partial<NotificationConfig>): void {
    Object.assign(this.config, newConfig);
    console.info('🔔 Notification configuration updated');
  }

  /**
   * Получение текущей конфигурации
   */
  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  /**
   * Включение/выключение уведомлений
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.info(`🔔 Notifications ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Добавление канала уведомлений
   */
  addChannel(channel: NotificationChannel): void {
    if (!this.config.channels.includes(channel)) {
      this.config.channels.push(channel);
      console.info(`🔔 Notification channel added: ${channel}`);
    }
  }

  /**
   * Удаление канала уведомлений
   */
  removeChannel(channel: NotificationChannel): void {
    const index = this.config.channels.indexOf(channel);
    if (index !== -1) {
      this.config.channels.splice(index, 1);
      console.info(`🔔 Notification channel removed: ${channel}`);
    }
  }

  /**
   * Тестовое уведомление
   */
  async sendTest(): Promise<void> {
    await this.sendNotification({
      type: 'test',
      message: 'Test notification from Risk Manager',
    });
  }
}
