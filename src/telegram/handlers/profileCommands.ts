/**
 * Profile Command Handlers for Telegram Bot
 */

import type { TelegramBotContext, TelegramBotService } from '../types.js';
import { Markup } from 'telegraf';
import * as templates from '../templates/index.js';
import { UserService, validateEmail, validatePhone, formatPhone, sanitizeInput, validateFullName } from '../../services/integram/index.js';
import { IntegramClient } from '../../database/integram/IntegramClient.js';

// Global UserService instance
let userService: UserService | null = null;

/**
 * Initialize UserService
 */
async function getUserService(): Promise<UserService> {
  if (userService) return userService;

  const integramConfig = {
    serverURL: process.env.INTEGRAM_URL || 'https://интеграм.рф',
    database: process.env.INTEGRAM_DATABASE || 'bts',
    login: process.env.INTEGRAM_LOGIN || '',
    password: process.env.INTEGRAM_PASSWORD || '',
  };

  const client = new IntegramClient(integramConfig);
  await client.authenticate();

  userService = new UserService(client);
  return userService;
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * /profile command - Show user profile
 */
export async function handleProfile(
  ctx: TelegramBotContext,
  _service: TelegramBotService,
): Promise<void> {
  try {
    const user = ctx.session?.user;

    if (!user) {
      await ctx.reply('❌ Профиль не найден. Попробуйте перезапустить бота командой /start');
      return;
    }

    const message = `
👤 *Ваш профиль*

👨‍💼 Имя: ${user.fullName || 'не указано'}
📧 Email: ${user.email && !user.email.includes('@telegram.temp') ? user.email : 'не указан'}
📞 Телефон: ${user.phone || 'не указан'}
📅 Дата регистрации: ${formatDate(user.registrationDate)}
${user.roleId ? `⭐ Роль: ${user.roleId}` : ''}
    `.trim();

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📝 Редактировать имя', 'profile_edit_name')],
      [Markup.button.callback('📧 Изменить email', 'profile_edit_email')],
      [Markup.button.callback('📞 Изменить телефон', 'profile_edit_phone')],
      [Markup.button.callback('🔙 Назад', 'menu_main')],
    ]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  } catch (error) {
    console.error('Error in handleProfile:', error);
    await ctx.reply(templates.errorMessage('Failed to load profile'));
  }
}

/**
 * Handle profile edit name callback
 */
export async function handleProfileEditName(ctx: TelegramBotContext): Promise<void> {
  if (!ctx.callbackQuery) return;

  if (ctx.session) {
    ctx.session.awaitingProfileInput = {
      field: 'name',
      action: 'profile_edit_name',
    };
  }

  await ctx.editMessageText(
    '📝 *Редактирование имени*\n\nВведите ваше полное имя:',
    { parse_mode: 'Markdown' }
  );

  await ctx.answerCbQuery();
}

/**
 * Handle profile edit email callback
 */
export async function handleProfileEditEmail(ctx: TelegramBotContext): Promise<void> {
  if (!ctx.callbackQuery) return;

  if (ctx.session) {
    ctx.session.awaitingProfileInput = {
      field: 'email',
      action: 'profile_edit_email',
    };
  }

  await ctx.editMessageText(
    '📧 *Изменение email*\n\nВведите ваш email адрес:\n\nПример: user@example.com',
    { parse_mode: 'Markdown' }
  );

  await ctx.answerCbQuery();
}

/**
 * Handle profile edit phone callback
 */
export async function handleProfileEditPhone(ctx: TelegramBotContext): Promise<void> {
  if (!ctx.callbackQuery) return;

  if (ctx.session) {
    ctx.session.awaitingProfileInput = {
      field: 'phone',
      action: 'profile_edit_phone',
    };
  }

  await ctx.editMessageText(
    '📞 *Изменение телефона*\n\nВведите номер телефона в международном формате:\n\nПример: +79001234567',
    { parse_mode: 'Markdown' }
  );

  await ctx.answerCbQuery();
}

/**
 * Handle profile input from user
 */
export async function handleProfileInput(
  ctx: TelegramBotContext,
  _service: TelegramBotService,
): Promise<boolean> {
  if (!ctx.session?.awaitingProfileInput || !ctx.message || !('text' in ctx.message)) {
    return false;
  }

  const { field, action } = ctx.session.awaitingProfileInput;
  const input = ctx.message.text.trim();
  const user = ctx.session.user;

  if (!user) {
    await ctx.reply('❌ Профиль не найден');
    ctx.session.awaitingProfileInput = undefined;
    return true;
  }

  try {
    const service = await getUserService();

    switch (field) {
      case 'name': {
        const validation = validateFullName(input);
        if (!validation.valid) {
          await ctx.reply(`❌ ${validation.error}\n\nПопробуйте еще раз:`);
          return true;
        }

        const sanitizedName = sanitizeInput(input);
        await service.updateProfile(user.id, { fullName: sanitizedName });

        // Update session user
        user.fullName = sanitizedName;

        await ctx.reply(`✅ Имя успешно обновлено: ${sanitizedName}`);
        break;
      }

      case 'email': {
        const validation = validateEmail(input);
        if (!validation.valid) {
          await ctx.reply(`❌ ${validation.error}\n\nПопробуйте еще раз:`);
          return true;
        }

        const sanitizedEmail = sanitizeInput(input);
        await service.updateProfile(user.id, { email: sanitizedEmail });

        // Update session user
        user.email = sanitizedEmail;

        await ctx.reply(`✅ Email успешно обновлен: ${sanitizedEmail}`);
        break;
      }

      case 'phone': {
        const validation = validatePhone(input);
        if (!validation.valid) {
          await ctx.reply(`❌ ${validation.error}\n\nПопробуйте еще раз:`);
          return true;
        }

        const formattedPhone = formatPhone(input);
        await service.updateProfile(user.id, { phone: formattedPhone });

        // Update session user
        user.phone = formattedPhone;

        await ctx.reply(`✅ Телефон успешно обновлен: ${formattedPhone}`);
        break;
      }
    }

    // Clear awaiting state
    ctx.session.awaitingProfileInput = undefined;

    // Show updated profile
    await handleProfile(ctx, _service);

    return true;
  } catch (error) {
    console.error('Error updating profile:', error);
    await ctx.reply(templates.errorMessage('Failed to update profile'));
    ctx.session.awaitingProfileInput = undefined;
    return true;
  }
}
