/**
 * Telegram Bot for Trading Bot Remote Control
 */

import { Telegraf, session } from 'telegraf';
import type { TelegramBotContext, TelegramBotConfig, TelegramBotService } from './types.js';
import { createWhitelistMiddleware, createLoggingMiddleware, createUserMiddleware } from './middleware/auth.js';
import { createRateLimitMiddleware, cleanupRateLimitStore } from './middleware/rateLimit.js';
import * as basicCommands from './handlers/basicCommands.js';
import * as infoCommands from './handlers/infoCommands.js';
import * as tradingCommands from './handlers/tradingCommands.js';
import * as settingsCommands from './handlers/settingsCommands.js';
import * as profileCommands from './handlers/profileCommands.js';
import type { PaperTradingEngine } from '../trading/paper/PaperTradingEngine.js';
import type { ScreeningModule } from '../analyzers/screening/ScreeningModule.js';
import type { NotificationManager } from '../notifications/NotificationManager.js';
import * as templates from './templates/index.js';

/**
 * Telegram Bot class
 */
export class TelegramBot {
  private bot: Telegraf<TelegramBotContext>;
  private service: TelegramBotService;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    config: TelegramBotConfig,
    tradingEngine?: PaperTradingEngine,
    screeningModule?: ScreeningModule,
    notificationManager?: NotificationManager,
  ) {
    this.bot = new Telegraf<TelegramBotContext>(config.token);

    this.service = {
      config,
      tradingEngine,
      screeningModule,
      notificationManager,
    };

    this.setupMiddleware();
    this.setupCommands();
    this.setupCallbacks();
    this.setupCleanup();

    console.log('🤖 Telegram Bot initialized');
    console.log(
      `   Features: ${Object.entries(config.features)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(', ')}`,
    );
    const accessMode = config.whitelist.includes(-1)
      ? 'PUBLIC ACCESS (all users allowed)'
      : `PRIVATE ACCESS (${config.whitelist.length} user(s) allowed)`;
    console.log(`   Access: ${accessMode}`);
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Session management
    this.bot.use(session());

    // Logging
    this.bot.use(createLoggingMiddleware());

    // Authentication & authorization
    this.bot.use(createWhitelistMiddleware(this.service.config));

    // User management - load or create user from Integram
    this.bot.use(createUserMiddleware(this.service.config));

    // Rate limiting
    this.bot.use(createRateLimitMiddleware(this.service.config));

    // Error handling
    this.bot.catch((err: unknown, ctx: TelegramBotContext) => {
      console.error('Telegram Bot error:', err);
      ctx.reply(templates.errorMessage('An unexpected error occurred')).catch(console.error);
    });
  }

  /**
   * Setup command handlers
   */
  private setupCommands(): void {
    // Basic commands
    this.bot.command('start', basicCommands.handleStart);
    this.bot.command('help', basicCommands.handleHelp);

    // Information commands
    this.bot.command('status', (ctx) => infoCommands.handleStatus(ctx, this.service));
    this.bot.command('balance', (ctx) => infoCommands.handleBalance(ctx, this.service));
    this.bot.command('positions', (ctx) => infoCommands.handlePositions(ctx, this.service));
    this.bot.command('pnl', (ctx) => infoCommands.handlePnL(ctx, this.service));
    this.bot.command('signals', (ctx) => infoCommands.handleSignals(ctx, this.service));
    this.bot.command('screening', (ctx) => infoCommands.handleScreening(ctx, this.service));

    // Trading control commands
    if (this.service.config.features.trading) {
      this.bot.command('start_trading', (ctx) =>
        tradingCommands.handleStartTrading(ctx, this.service),
      );
      this.bot.command('stop_trading', (ctx) =>
        tradingCommands.handleStopTrading(ctx, this.service),
      );
    }

    if (this.service.config.features.positions) {
      this.bot.command('close_position', (ctx) =>
        tradingCommands.handleClosePosition(ctx, this.service),
      );
    }

    // Settings commands
    this.bot.command('settings', (ctx) => settingsCommands.handleSettings(ctx, this.service));

    // Profile commands
    this.bot.command('profile', (ctx) => profileCommands.handleProfile(ctx, this.service));

    // Unknown command
    this.bot.on('text', async (ctx) => {
      // Check if awaiting profile input
      if (ctx.session?.awaitingProfileInput) {
        const handled = await profileCommands.handleProfileInput(ctx, this.service);
        if (handled) return;
      }

      // Check if awaiting PIN
      if (ctx.session?.awaitingPin) {
        await tradingCommands.handlePinConfirmation(ctx, this.service);
        return;
      }

      // Unknown command
      await basicCommands.handleUnknown(ctx);
    });
  }

  /**
   * Setup callback query handlers (inline keyboard buttons)
   */
  private setupCallbacks(): void {
    // Main menu
    this.bot.action('menu_main', basicCommands.handleMainMenu);
    this.bot.action('menu_help', basicCommands.handleHelp);

    // Information menu
    this.bot.action('menu_dashboard', (ctx) => infoCommands.handleStatus(ctx, this.service));
    this.bot.action('menu_balance', (ctx) => infoCommands.handleBalance(ctx, this.service));
    this.bot.action('menu_positions', (ctx) => infoCommands.handlePositions(ctx, this.service));
    this.bot.action('menu_pnl', (ctx) => infoCommands.handlePnL(ctx, this.service));
    this.bot.action('menu_signals', (ctx) => infoCommands.handleSignals(ctx, this.service));
    this.bot.action('menu_screening', (ctx) => infoCommands.handleScreening(ctx, this.service));

    // Refresh actions
    this.bot.action('refresh_status', (ctx) => infoCommands.handleStatus(ctx, this.service));
    this.bot.action('refresh_balance', (ctx) => infoCommands.handleBalance(ctx, this.service));
    this.bot.action('refresh_positions', (ctx) => infoCommands.handlePositions(ctx, this.service));
    this.bot.action('refresh_pnl', (ctx) => infoCommands.handlePnL(ctx, this.service));
    this.bot.action('refresh_signals', (ctx) => infoCommands.handleSignals(ctx, this.service));

    // Trading actions
    if (this.service.config.features.trading) {
      this.bot.action('action_start_trading', (ctx) =>
        tradingCommands.handleStartTrading(ctx, this.service),
      );
      this.bot.action('action_stop_trading', (ctx) =>
        tradingCommands.handleStopTrading(ctx, this.service),
      );
    }

    // Screening actions
    this.bot.action('action_run_screening', (ctx) =>
      infoCommands.handleScreening(ctx, this.service),
    );

    // Settings menu
    this.bot.action('menu_settings', (ctx) => settingsCommands.handleSettings(ctx, this.service));
    this.bot.action('settings_trade_alerts', settingsCommands.handleTradeAlertsSettings);
    this.bot.action('settings_system_alerts', settingsCommands.handleSystemAlertsSettings);
    this.bot.action('settings_reports', settingsCommands.handleReportsSettings);

    // Profile menu
    this.bot.action('menu_profile', (ctx) => profileCommands.handleProfile(ctx, this.service));
    this.bot.action('profile_edit_name', profileCommands.handleProfileEditName);
    this.bot.action('profile_edit_email', profileCommands.handleProfileEditEmail);
    this.bot.action('profile_edit_phone', profileCommands.handleProfileEditPhone);

    // Toggle settings
    this.bot.action(/^toggle_(.+)$/, (ctx) => {
      const match = ctx.match;
      if (match && match[1]) {
        return settingsCommands.toggleNotificationSetting(ctx, match[1]);
      }
      return Promise.resolve();
    });
  }

  /**
   * Setup cleanup tasks
   */
  private setupCleanup(): void {
    // Clean up rate limit store every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        cleanupRateLimitStore(this.service.config.rateLimit.windowMs);
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    try {
      console.log('🚀 Starting Telegram Bot...');
      await this.bot.launch();
      console.log('✅ Telegram Bot started successfully');

      // Graceful shutdown
      process.once('SIGINT', () => {
        void this.stop('SIGINT');
      });
      process.once('SIGTERM', () => {
        void this.stop('SIGTERM');
      });
    } catch (error) {
      console.error('Failed to start Telegram Bot:', error);
      throw error;
    }
  }

  /**
   * Stop the bot
   */
  stop(signal?: string): void {
    console.log(`🛑 Stopping Telegram Bot${signal ? ` (${signal})` : ''}...`);

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.bot.stop(signal);
    console.log('✅ Telegram Bot stopped');
  }

  /**
   * Send notification to all authorized users
   */
  async sendNotification(
    message: string,
    parseMode: 'Markdown' | 'HTML' = 'Markdown',
  ): Promise<void> {
    try {
      for (const userId of this.service.config.whitelist) {
        await this.bot.telegram.sendMessage(userId, message, {
          parse_mode: parseMode,
        });
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Send position opened notification
   */
  async notifyPositionOpened(position: {
    symbol: string;
    side: 'long' | 'short';
    entryPrice: number;
    quantity: number;
    value: number;
    stopLoss?: number;
    takeProfit?: number;
  }): Promise<void> {
    const message = templates.notifyPositionOpened({
      id: '',
      ...position,
      currentPrice: position.entryPrice,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      duration: '0s',
      openedAt: new Date(),
    });

    await this.sendNotification(message);
  }

  /**
   * Send position closed notification
   */
  async notifyPositionClosed(position: {
    symbol: string;
    side: 'long' | 'short';
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    pnl: number;
    pnlPercent: number;
    duration: number;
  }): Promise<void> {
    const message = templates.notifyPositionClosed({
      id: '',
      symbol: position.symbol,
      side: position.side,
      entryPrice: position.entryPrice,
      currentPrice: position.exitPrice,
      quantity: position.quantity,
      value: position.exitPrice * position.quantity,
      unrealizedPnL: position.pnl,
      unrealizedPnLPercent: position.pnlPercent,
      duration: templates.formatDuration(position.duration),
      openedAt: new Date(Date.now() - position.duration),
    });

    await this.sendNotification(message);
  }

  /**
   * Get bot instance (for advanced usage)
   */
  getBot(): Telegraf<TelegramBotContext> {
    return this.bot;
  }
}
