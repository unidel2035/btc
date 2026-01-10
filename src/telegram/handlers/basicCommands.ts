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
      Markup.button.callback('📊 Dashboard', 'menu_dashboard'),
      Markup.button.callback('💰 Balance', 'menu_balance'),
    ],
    [
      Markup.button.callback('📈 Positions', 'menu_positions'),
      Markup.button.callback('📉 P&L', 'menu_pnl'),
    ],
    [
      Markup.button.callback('🔔 Signals', 'menu_signals'),
      Markup.button.callback('🔍 Screening', 'menu_screening'),
    ],
    [
      Markup.button.callback('▶️ Start', 'action_start_trading'),
      Markup.button.callback('⏸️ Pause', 'action_stop_trading'),
    ],
    [
      Markup.button.callback('⚙️ Settings', 'menu_settings'),
      Markup.button.callback('❓ Help', 'menu_help'),
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
  await ctx.reply('❓ Unknown command. Use /help to see available commands.');
}

/**
 * Main menu callback handler
 */
export async function handleMainMenu(ctx: TelegramBotContext): Promise<void> {
  if (!ctx.callbackQuery) return;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('📊 Dashboard', 'menu_dashboard'),
      Markup.button.callback('💰 Balance', 'menu_balance'),
    ],
    [
      Markup.button.callback('📈 Positions', 'menu_positions'),
      Markup.button.callback('📉 P&L', 'menu_pnl'),
    ],
    [
      Markup.button.callback('🔔 Signals', 'menu_signals'),
      Markup.button.callback('🔍 Screening', 'menu_screening'),
    ],
    [
      Markup.button.callback('▶️ Start', 'action_start_trading'),
      Markup.button.callback('⏸️ Pause', 'action_stop_trading'),
    ],
    [
      Markup.button.callback('⚙️ Settings', 'menu_settings'),
      Markup.button.callback('❓ Help', 'menu_help'),
    ],
  ]);

  await ctx.editMessageText('🤖 *BTC TRADING BOT*\n\nSelect an option:', {
    parse_mode: 'Markdown',
    ...keyboard,
  });

  await ctx.answerCbQuery();
}
