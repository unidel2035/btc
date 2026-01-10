/**
 * Basic Command Handlers for Telegram Bot
 */

import type { TelegramBotContext } from '../types.js';
import { Markup } from 'telegraf';
import * as templates from '../templates/index.js';

/**
 * /start command - Welcome message with main menu
 */
export async function handleStart(ctx: TelegramBotContext): Promise<void> {
  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('📊 Обзор', 'menu_dashboard'),
      Markup.button.callback('💰 Баланс', 'menu_balance'),
    ],
    [
      Markup.button.callback('📈 Позиции', 'menu_positions'),
      Markup.button.callback('📉 P&L', 'menu_pnl'),
    ],
    [
      Markup.button.callback('🔔 Сигналы', 'menu_signals'),
      Markup.button.callback('🔍 Скрининг', 'menu_screening'),
    ],
    [
      Markup.button.callback('▶️ Запустить', 'action_start_trading'),
      Markup.button.callback('⏸️ Остановить', 'action_stop_trading'),
    ],
    [
      Markup.button.callback('⚙️ Настройки', 'menu_settings'),
      Markup.button.callback('❓ Помощь', 'menu_help'),
    ],
  ]);

  await ctx.reply(templates.welcomeMessage(), {
    parse_mode: 'Markdown',
    ...keyboard,
  });
}

/**
 * /help command - Show available commands
 */
export async function handleHelp(ctx: TelegramBotContext): Promise<void> {
  await ctx.reply(templates.helpMessage(), {
    parse_mode: 'Markdown',
  });
}

/**
 * Unknown command handler
 */
export async function handleUnknown(ctx: TelegramBotContext): Promise<void> {
  await ctx.reply('❓ Неизвестная команда. Используйте /help для просмотра доступных команд.');
}

/**
 * Main menu callback handler
 */
export async function handleMainMenu(ctx: TelegramBotContext): Promise<void> {
  if (!ctx.callbackQuery) return;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('📊 Обзор', 'menu_dashboard'),
      Markup.button.callback('💰 Баланс', 'menu_balance'),
    ],
    [
      Markup.button.callback('📈 Позиции', 'menu_positions'),
      Markup.button.callback('📉 P&L', 'menu_pnl'),
    ],
    [
      Markup.button.callback('🔔 Сигналы', 'menu_signals'),
      Markup.button.callback('🔍 Скрининг', 'menu_screening'),
    ],
    [
      Markup.button.callback('▶️ Запустить', 'action_start_trading'),
      Markup.button.callback('⏸️ Остановить', 'action_stop_trading'),
    ],
    [
      Markup.button.callback('⚙️ Настройки', 'menu_settings'),
      Markup.button.callback('❓ Помощь', 'menu_help'),
    ],
  ]);

  await ctx.editMessageText('🤖 *ТОРГОВЫЙ БОТ BTC*\n\nВыберите опцию:', {
    parse_mode: 'Markdown',
    ...keyboard,
  });

  await ctx.answerCbQuery();
}
