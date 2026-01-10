/**
 * Authentication Middleware for Telegram Bot
 */

import type { TelegramBotContext, TelegramBotConfig } from '../types.js';
import type { MiddlewareFn } from 'telegraf';
import { UserService } from '../../services/integram/index.js';
import { IntegramClient } from '../../database/integram/IntegramClient.js';

/**
 * Whitelist middleware - only allow authorized users
 * If whitelist is empty or contains -1, all users are allowed
 */
export function createWhitelistMiddleware(
  config: TelegramBotConfig,
): MiddlewareFn<TelegramBotContext> {
  return async (ctx, next) => {
    const userId = ctx.from?.id;

    if (!userId) {
      await ctx.reply('❌ Невозможно идентифицировать пользователя');
      return;
    }

    // Check if whitelist is enabled
    const isWhitelistEnabled = config.whitelist.length > 0 && !config.whitelist.includes(-1);

    // Check if user is in whitelist (if whitelist is enabled)
    if (isWhitelistEnabled && !config.whitelist.includes(userId)) {
      console.warn(`Unauthorized access attempt from user ${userId} (@${ctx.from?.username})`);
      await ctx.reply('❌ Доступ запрещен. Вы не авторизованы для использования этого бота.');
      return;
    }

    // Log user access
    if (!isWhitelistEnabled) {
      console.log(`[Telegram] New user access: ${userId} (@${ctx.from?.username})`);
    }

    // Initialize session if not exists
    if (!ctx.session) {
      ctx.session = {
        userId,
        username: ctx.from?.username,
        isAuthenticated: true,
        lastCommand: undefined,
        lastCommandTime: undefined,
        awaitingPin: false,
        pendingAction: undefined,
        notificationSettings: getDefaultNotificationSettings(),
      };
    }

    await next();
  };
}

/**
 * PIN verification middleware - require PIN for critical operations
 */
export function createPinMiddleware(
  config: TelegramBotConfig,
  requirePin: boolean = false,
): MiddlewareFn<TelegramBotContext> {
  return async (ctx, next) => {
    if (!requirePin || !config.pinCode) {
      await next();
      return;
    }

    // Check if session is awaiting PIN
    if (ctx.session?.awaitingPin) {
      const enteredPin = ctx.message && 'text' in ctx.message ? ctx.message.text : '';

      if (enteredPin === config.pinCode) {
        ctx.session.awaitingPin = false;
        await next();
      } else {
        await ctx.reply('❌ Неверный PIN-код. Действие отменено.');
        ctx.session.awaitingPin = false;
        ctx.session.pendingAction = undefined;
      }
      return;
    }

    // Set awaiting PIN flag for next message
    if (ctx.session) {
      ctx.session.awaitingPin = true;
    }

    await next();
  };
}

/**
 * Get default notification settings
 */
export function getDefaultNotificationSettings() {
  return {
    tradeAlerts: {
      positionOpened: true,
      positionClosed: true,
      stopLossHit: true,
      takeProfitHit: true,
      trailingStopUpdated: false,
    },
    systemAlerts: {
      criticalErrors: true,
      dailyDrawdownLimit: true,
      positionLossThreshold: 5,
      apiRateLimits: false,
    },
    reports: {
      dailySummary: true,
      dailySummaryTime: '09:00',
      weeklySummary: true,
      monthlySummary: false,
    },
    quietHours: {
      enabled: false,
      startTime: '23:00',
      endTime: '07:00',
    },
  };
}

/**
 * Logging middleware - log all commands
 */
export function createLoggingMiddleware(): MiddlewareFn<TelegramBotContext> {
  return async (ctx, next) => {
    const userId = ctx.from?.id;
    const username = ctx.from?.username;
    const command = ctx.message && 'text' in ctx.message ? ctx.message.text : 'unknown';

    console.log(`[Telegram] User ${userId} (@${username}) executed: ${command}`);

    await next();
  };
}

/**
 * User middleware - load or create user from Integram database
 * This middleware automatically registers new users and loads existing users
 */
export function createUserMiddleware(config: TelegramBotConfig): MiddlewareFn<TelegramBotContext> {
  let userService: UserService | null = null;

  // Initialize UserService with Integram credentials
  const initUserService = async () => {
    if (userService) return userService;

    try {
      const integramConfig = {
        serverURL: process.env.INTEGRAM_URL || 'https://интеграм.рф',
        database: process.env.INTEGRAM_DATABASE || 'bts',
        login: process.env.INTEGRAM_LOGIN || '',
        password: process.env.INTEGRAM_PASSWORD || '',
      };

      const client = new IntegramClient(integramConfig);
      await client.authenticate();

      userService = new UserService(client);
      console.log('✅ UserService initialized');
      return userService;
    } catch (error) {
      console.error('❌ Failed to initialize UserService:', error);
      throw error;
    }
  };

  return async (ctx, next) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      await next();
      return;
    }

    try {
      // Initialize service if needed
      const service = await initUserService();

      // Find or create user
      let user = await service.findByTelegramId(telegramId);

      if (!user) {
        // Create new user
        console.log(`📝 Creating new user for Telegram ID ${telegramId}`);
        user = await service.createUser({
          id: telegramId,
          username: ctx.from.username,
          first_name: ctx.from.first_name,
          last_name: ctx.from.last_name,
        });

        // Send welcome message
        await ctx.reply(
          `🎉 *Добро пожаловать в торговый бот BTC!*\n\n` +
          `Вы успешно зарегистрированы.\n\n` +
          `👤 Имя: ${user.fullName || user.username}\n` +
          `🆔 ID: ${user.id}\n\n` +
          `Рекомендуем заполнить дополнительную информацию:\n` +
          `/profile - Перейти в профиль`,
          { parse_mode: 'Markdown' }
        );
      } else {
        // Update activity for existing user
        await service.updateActivity(user.id);
      }

      // Store user in session
      if (ctx.session) {
        ctx.session.user = user;
      }
    } catch (error) {
      console.error('Error in user middleware:', error);
      // Continue even if user loading fails (graceful degradation)
    }

    await next();
  };
}
