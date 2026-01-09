import { BaseNotificationChannel } from './BaseChannel.js';
import type { Notification, TelegramConfig } from '../types.js';

/**
 * Канал уведомлений в Telegram
 */
export class TelegramChannel extends BaseNotificationChannel {
  private botToken: string;
  private chatId: string;
  private commandHandlers: Map<string, () => Promise<string>>;
  private isPolling: boolean = false;
  private lastUpdateId: number = 0;

  constructor(config: TelegramConfig) {
    super(config.enabled, config.minImportance);
    this.botToken = config.botToken;
    this.chatId = config.chatId;
    this.commandHandlers = new Map();

    // Регистрация стандартных команд
    this.registerDefaultCommands();
  }

  get name(): string {
    return 'telegram';
  }

  async send(notification: Notification): Promise<void> {
    if (!this.botToken || !this.chatId) {
      console.warn('Telegram credentials not configured');
      return;
    }

    const text = this.formatNotification(notification);

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Telegram API error: ${error}`);
      }
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
      throw error;
    }
  }

  /**
   * Форматирование уведомления для Telegram
   */
  private formatNotification(notification: Notification): string {
    const emoji = this.getEmoji(notification.importance);
    const timestamp = this.formatDate(notification.timestamp);
    const symbol = notification.symbol ? `*${notification.symbol}*` : '';

    let text = `${emoji} ${symbol} *${notification.title}*\n\n`;
    text += `${notification.message}\n\n`;
    text += `_${timestamp}_`;

    // Добавление специфичных данных в зависимости от типа
    if (notification.data) {
      text += '\n\n' + this.formatData(notification.data);
    }

    return text;
  }

  /**
   * Форматирование данных для отображения
   */
  private formatData(data: Record<string, unknown>): string {
    let formatted = '📊 *Details:*\n';

    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) continue;

      const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
      const capitalizedKey = formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);

      if (typeof value === 'number') {
        formatted += `• ${capitalizedKey}: \`${this.formatNumber(value)}\`\n`;
      } else if (typeof value === 'boolean') {
        formatted += `• ${capitalizedKey}: ${value ? '✅' : '❌'}\n`;
      } else {
        formatted += `• ${capitalizedKey}: \`${value}\`\n`;
      }
    }

    return formatted;
  }

  /**
   * Регистрация обработчика команды
   */
  registerCommand(command: string, handler: () => Promise<string>): void {
    this.commandHandlers.set(command, handler);
  }

  /**
   * Регистрация стандартных команд
   */
  private registerDefaultCommands(): void {
    this.registerCommand('/start', async () => {
      return (
        '🤖 *Trading Bot Started*\n\n' +
        'Available commands:\n' +
        '/status - Current bot status\n' +
        '/balance - Account balance\n' +
        '/positions - Open positions\n' +
        '/pnl - Profit and Loss for period\n' +
        '/stop - Stop trading\n' +
        '/start - Resume trading\n' +
        '/help - Show this help message'
      );
    });

    this.registerCommand('/help', async () => {
      return (
        '📖 *Available Commands:*\n\n' +
        '/status - Current bot status\n' +
        '/balance - Account balance\n' +
        '/positions - Open positions\n' +
        '/pnl - Profit and Loss\n' +
        '/stop - Stop trading\n' +
        '/start - Resume trading'
      );
    });
  }

  /**
   * Запуск прослушивания команд
   */
  async startCommandListener(): Promise<void> {
    if (this.isPolling) {
      console.warn('Telegram command listener already running');
      return;
    }

    this.isPolling = true;
    console.log('🤖 Telegram bot command listener started');

    while (this.isPolling) {
      try {
        await this.pollUpdates();
        await this.sleep(1000); // Опрос каждую секунду
      } catch (error) {
        console.error('Error polling Telegram updates:', error);
        await this.sleep(5000); // Ждем дольше при ошибке
      }
    }
  }

  /**
   * Остановка прослушивания команд
   */
  stopCommandListener(): void {
    this.isPolling = false;
    console.log('🤖 Telegram bot command listener stopped');
  }

  /**
   * Опрос обновлений от Telegram
   */
  private async pollUpdates(): Promise<void> {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/getUpdates`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          offset: this.lastUpdateId + 1,
          timeout: 30,
        }),
      });

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        ok: boolean;
        result: Array<{
          update_id: number;
          message?: {
            chat: { id: string | number };
            text?: string;
          };
        }>;
      };

      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          this.lastUpdateId = update.update_id;

          if (update.message?.text && update.message.chat) {
            await this.handleCommand(update.message.text, String(update.message.chat.id));
          }
        }
      }
    } catch (error) {
      console.error('Failed to poll Telegram updates:', error);
    }
  }

  /**
   * Обработка команды
   */
  private async handleCommand(text: string, chatId: string): Promise<void> {
    const commandPart = text.split(' ')[0];
    if (!commandPart) {
      return; // Пустая команда
    }

    const command = commandPart.toLowerCase();
    const handler = this.commandHandlers.get(command);
    if (!handler) {
      return; // Игнорируем неизвестные команды
    }

    try {
      const response = await handler();
      await this.sendMessage(chatId, response);
    } catch (error) {
      console.error(`Error handling command ${command}:`, error);
      await this.sendMessage(chatId, '❌ Error executing command');
    }
  }

  /**
   * Отправка сообщения в конкретный чат
   */
  private async sendMessage(chatId: string, text: string): Promise<void> {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
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
      console.error('Failed to send Telegram message:', error);
    }
  }

  /**
   * Вспомогательная функция для задержки
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Установка webhook (альтернатива polling)
   */
  async setWebhook(url: string): Promise<void> {
    try {
      const apiUrl = `https://api.telegram.org/bot${this.botToken}/setWebhook`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to set webhook: ${response.statusText}`);
      }

      console.log('✅ Telegram webhook set successfully');
    } catch (error) {
      console.error('Failed to set Telegram webhook:', error);
      throw error;
    }
  }

  /**
   * Удаление webhook
   */
  async deleteWebhook(): Promise<void> {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/deleteWebhook`;
      const response = await fetch(url, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete webhook: ${response.statusText}`);
      }

      console.log('✅ Telegram webhook deleted successfully');
    } catch (error) {
      console.error('Failed to delete Telegram webhook:', error);
      throw error;
    }
  }
}
