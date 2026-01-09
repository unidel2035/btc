import type {
  Notification,
  TelegramConfig,
  BotCommandHandler,
  BotStatus,
  BalanceInfo,
  PositionInfo,
  PnLInfo,
} from './types.js';

/**
 * Telegram бот для уведомлений и команд
 */
export class TelegramBot {
  private config: TelegramConfig;
  private commandHandler?: BotCommandHandler;
  private botInfo?: { id: number; username: string };

  constructor(config: TelegramConfig) {
    this.config = config;
  }

  /**
   * Регистрация обработчика команд
   */
  registerCommandHandler(handler: BotCommandHandler): void {
    this.commandHandler = handler;
  }

  /**
   * Инициализация бота и регистрация команд
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled || !this.config.commands) {
      return;
    }

    try {
      // Получение информации о боте
      const botInfoResponse = await this.apiCall('getMe', {});
      this.botInfo = botInfoResponse.result as { id: number; username: string };

      // Регистрация команд
      await this.registerCommands();

      // Запуск обработки команд (polling)
      void this.startPolling();

      console.info(`✅ Telegram bot initialized: @${this.botInfo.username}`);
    } catch (error) {
      console.error('Failed to initialize Telegram bot:', error);
    }
  }

  /**
   * Регистрация команд в Telegram
   */
  private async registerCommands(): Promise<void> {
    const commands = [
      { command: 'status', description: 'Текущий статус бота' },
      { command: 'balance', description: 'Баланс' },
      { command: 'positions', description: 'Открытые позиции' },
      { command: 'pnl', description: 'PnL за период' },
      { command: 'stop', description: 'Остановить торговлю' },
      { command: 'start', description: 'Возобновить торговлю' },
    ];

    await this.apiCall('setMyCommands', { commands });
  }

  /**
   * Запуск polling для обработки команд
   */
  private async startPolling(): Promise<void> {
    let offset = 0;

    while (this.config.enabled && this.config.commands) {
      try {
        const updates = await this.apiCall('getUpdates', {
          offset,
          timeout: 30,
          allowed_updates: ['message'],
        });

        const result = updates.result as Array<{
          update_id: number;
          message?: {
            text?: string;
            chat: { id: number };
          };
        }>;

        for (const update of result) {
          if (update.message?.text?.startsWith('/')) {
            await this.handleCommand(update.message.text, update.message.chat.id);
          }
          offset = update.update_id + 1;
        }
      } catch (error) {
        console.error('Error in Telegram polling:', error);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5s before retry
      }
    }
  }

  /**
   * Обработка команды
   */
  private async handleCommand(command: string, chatId: number): Promise<void> {
    // Проверка, что команда от правильного чата
    if (chatId.toString() !== this.config.chatId) {
      return;
    }

    if (!this.commandHandler) {
      await this.sendMessage('⚠️ Command handler not configured', chatId);
      return;
    }

    try {
      const [cmd, ...args] = command.split(' ');

      switch (cmd) {
        case '/status':
          await this.handleStatusCommand(chatId);
          break;
        case '/balance':
          await this.handleBalanceCommand(chatId);
          break;
        case '/positions':
          await this.handlePositionsCommand(chatId);
          break;
        case '/pnl':
          await this.handlePnLCommand(chatId, args[0] as 'today' | 'week' | 'month' | 'total');
          break;
        case '/stop':
          await this.handleStopCommand(chatId);
          break;
        case '/start':
          await this.handleStartCommand(chatId);
          break;
        default:
          await this.sendMessage('❓ Unknown command', chatId);
      }
    } catch (error) {
      console.error('Error handling command:', error);
      await this.sendMessage('❌ Error processing command', chatId);
    }
  }

  /**
   * Обработка команды /status
   */
  private async handleStatusCommand(chatId: number): Promise<void> {
    const status: BotStatus = await this.commandHandler!.getStatus();

    const uptimeHours = Math.floor(status.uptime / 3600);
    const uptimeMinutes = Math.floor((status.uptime % 3600) / 60);

    const message = `
📊 *Bot Status*

🟢 Status: ${status.isRunning ? 'Running' : 'Stopped'}
⏱ Uptime: ${uptimeHours}h ${uptimeMinutes}m
📈 Open Positions: ${status.openPositions}
💰 Today PnL: ${this.formatPnL(status.todayPnL)}
💵 Total PnL: ${this.formatPnL(status.totalPnL)}
🎯 Active Strategies: ${status.activeStrategies.join(', ') || 'None'}
`.trim();

    await this.sendMessage(message, chatId);
  }

  /**
   * Обработка команды /balance
   */
  private async handleBalanceCommand(chatId: number): Promise<void> {
    const balance: BalanceInfo = await this.commandHandler!.getBalance();

    const message = `
💰 *Balance*

💵 Total: ${balance.totalBalance.toFixed(2)} ${balance.currency}
✅ Available: ${balance.availableBalance.toFixed(2)} ${balance.currency}
🔒 Used Margin: ${balance.usedMargin.toFixed(2)} ${balance.currency}
📊 Unrealized PnL: ${this.formatPnL(balance.unrealizedPnL)}
`.trim();

    await this.sendMessage(message, chatId);
  }

  /**
   * Обработка команды /positions
   */
  private async handlePositionsCommand(chatId: number): Promise<void> {
    const positions: PositionInfo[] = await this.commandHandler!.getPositions();

    if (positions.length === 0) {
      await this.sendMessage('📭 No open positions', chatId);
      return;
    }

    let message = '📊 *Open Positions*\n\n';

    for (const pos of positions) {
      const emoji = pos.side === 'long' ? '🟢' : '🔴';
      const pnlEmoji = pos.unrealizedPnL >= 0 ? '📈' : '📉';

      message += `${emoji} *${pos.symbol}* (${pos.side.toUpperCase()})\n`;
      message += `   Entry: ${pos.entryPrice.toFixed(2)}\n`;
      message += `   Current: ${pos.currentPrice.toFixed(2)}\n`;
      message += `   Quantity: ${pos.quantity}\n`;
      message += `   ${pnlEmoji} PnL: ${this.formatPnL(pos.unrealizedPnL)} (${pos.unrealizedPnLPercent.toFixed(2)}%)\n\n`;
    }

    await this.sendMessage(message.trim(), chatId);
  }

  /**
   * Обработка команды /pnl
   */
  private async handlePnLCommand(
    chatId: number,
    period: 'today' | 'week' | 'month' | 'total' = 'today',
  ): Promise<void> {
    const pnl: PnLInfo = await this.commandHandler!.getPnL(period);

    const periodEmoji = {
      today: '📅',
      week: '📆',
      month: '🗓',
      total: '📊',
    };

    const message = `
${periodEmoji[period]} *PnL - ${period.toUpperCase()}*

💰 Realized PnL: ${this.formatPnL(pnl.realizedPnL)}
📊 Unrealized PnL: ${this.formatPnL(pnl.unrealizedPnL)}
💵 Total PnL: ${this.formatPnL(pnl.totalPnL)}

📈 Win Rate: ${(pnl.winRate * 100).toFixed(1)}%
🔢 Total Trades: ${pnl.totalTrades}
✅ Profitable: ${pnl.profitableTrades}
`.trim();

    await this.sendMessage(message, chatId);
  }

  /**
   * Обработка команды /stop
   */
  private async handleStopCommand(chatId: number): Promise<void> {
    const success = await this.commandHandler!.stopTrading();

    const message = success
      ? '🛑 *Trading Stopped*\n\nAll trading activities have been paused.'
      : '❌ Failed to stop trading';

    await this.sendMessage(message, chatId);
  }

  /**
   * Обработка команды /start
   */
  private async handleStartCommand(chatId: number): Promise<void> {
    const success = await this.commandHandler!.startTrading();

    const message = success
      ? '✅ *Trading Started*\n\nTrading activities have been resumed.'
      : '❌ Failed to start trading';

    await this.sendMessage(message, chatId);
  }

  /**
   * Форматирование PnL с эмодзи
   */
  private formatPnL(pnl: number): string {
    const emoji = pnl >= 0 ? '✅' : '❌';
    const sign = pnl >= 0 ? '+' : '';
    return `${emoji} ${sign}${pnl.toFixed(2)}`;
  }

  /**
   * Отправка уведомления
   */
  async sendNotification(notification: Notification): Promise<void> {
    const emoji = this.getNotificationEmoji(notification.importance);
    const text = `${emoji} *${notification.title}*\n\n${notification.message}`;

    await this.sendMessage(text, parseInt(this.config.chatId));
  }

  /**
   * Получение эмодзи для уровня важности
   */
  private getNotificationEmoji(importance: string): string {
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

  /**
   * Отправка сообщения
   */
  private async sendMessage(text: string, chatId: number): Promise<void> {
    await this.apiCall('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    });
  }

  /**
   * Вызов Telegram API
   */
  private async apiCall(
    method: string,
    params: Record<string, unknown>,
  ): Promise<{
    ok: boolean;
    result?: unknown;
  }> {
    const url = `https://api.telegram.org/bot${this.config.botToken}/${method}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.statusText}`);
    }

    return (await response.json()) as { ok: boolean; result?: unknown };
  }
}
