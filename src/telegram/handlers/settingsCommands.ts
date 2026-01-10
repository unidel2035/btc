/**
 * Settings Command Handlers for Telegram Bot
 */

import type { TelegramBotContext, TelegramBotService } from '../types.js';
import { Markup } from 'telegraf';
import * as templates from '../templates/index.js';
import { getDefaultNotificationSettings } from '../middleware/auth.js';

/**
 * /settings command - Show and manage notification settings
 */
export async function handleSettings(
  ctx: TelegramBotContext,
  service: TelegramBotService,
): Promise<void> {
  try {
    const settings = ctx.session?.notificationSettings || getDefaultNotificationSettings();
    const message = templates.settingsMessage(settings);

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('🔔 Trade Alerts', 'settings_trade_alerts'),
        Markup.button.callback('⚠️ System Alerts', 'settings_system_alerts'),
      ],
      [
        Markup.button.callback('📊 Reports', 'settings_reports'),
        Markup.button.callback('🔕 Quiet Hours', 'settings_quiet_hours'),
      ],
      [Markup.button.callback('« Back', 'menu_main')],
    ]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  } catch (error) {
    console.error('Error in handleSettings:', error);
    await ctx.reply(templates.errorMessage('Failed to get settings'));
  }
}

/**
 * Handle trade alerts settings callback
 */
export async function handleTradeAlertsSettings(ctx: TelegramBotContext): Promise<void> {
  if (!ctx.callbackQuery) return;

  const settings = ctx.session?.notificationSettings || getDefaultNotificationSettings();

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback(
        `${settings.tradeAlerts.positionOpened ? '✅' : '❌'} Position Opened`,
        'toggle_position_opened',
      ),
    ],
    [
      Markup.button.callback(
        `${settings.tradeAlerts.positionClosed ? '✅' : '❌'} Position Closed`,
        'toggle_position_closed',
      ),
    ],
    [
      Markup.button.callback(
        `${settings.tradeAlerts.stopLossHit ? '✅' : '❌'} Stop Loss Hit`,
        'toggle_stop_loss',
      ),
    ],
    [
      Markup.button.callback(
        `${settings.tradeAlerts.takeProfitHit ? '✅' : '❌'} Take Profit Hit`,
        'toggle_take_profit',
      ),
    ],
    [
      Markup.button.callback(
        `${settings.tradeAlerts.trailingStopUpdated ? '✅' : '❌'} Trailing Stop Updated`,
        'toggle_trailing_stop',
      ),
    ],
    [Markup.button.callback('« Back', 'menu_settings')],
  ]);

  await ctx.editMessageText('🔔 *Trade Alerts*\n\nToggle notifications:', {
    parse_mode: 'Markdown',
    ...keyboard,
  });

  await ctx.answerCbQuery();
}

/**
 * Handle system alerts settings callback
 */
export async function handleSystemAlertsSettings(ctx: TelegramBotContext): Promise<void> {
  if (!ctx.callbackQuery) return;

  const settings = ctx.session?.notificationSettings || getDefaultNotificationSettings();

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback(
        `${settings.systemAlerts.criticalErrors ? '✅' : '❌'} Critical Errors`,
        'toggle_critical_errors',
      ),
    ],
    [
      Markup.button.callback(
        `${settings.systemAlerts.dailyDrawdownLimit ? '✅' : '❌'} Daily Drawdown Limit`,
        'toggle_drawdown_limit',
      ),
    ],
    [
      Markup.button.callback(
        `${settings.systemAlerts.positionLossThreshold > 0 ? '✅' : '❌'} Position Loss > ${settings.systemAlerts.positionLossThreshold}%`,
        'toggle_position_loss',
      ),
    ],
    [
      Markup.button.callback(
        `${settings.systemAlerts.apiRateLimits ? '✅' : '❌'} API Rate Limits`,
        'toggle_rate_limits',
      ),
    ],
    [Markup.button.callback('« Back', 'menu_settings')],
  ]);

  await ctx.editMessageText('⚠️ *System Alerts*\n\nToggle notifications:', {
    parse_mode: 'Markdown',
    ...keyboard,
  });

  await ctx.answerCbQuery();
}

/**
 * Handle reports settings callback
 */
export async function handleReportsSettings(ctx: TelegramBotContext): Promise<void> {
  if (!ctx.callbackQuery) return;

  const settings = ctx.session?.notificationSettings || getDefaultNotificationSettings();

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback(
        `${settings.reports.dailySummary ? '✅' : '❌'} Daily Summary`,
        'toggle_daily_summary',
      ),
    ],
    [
      Markup.button.callback(
        `${settings.reports.weeklySummary ? '✅' : '❌'} Weekly Summary`,
        'toggle_weekly_summary',
      ),
    ],
    [
      Markup.button.callback(
        `${settings.reports.monthlySummary ? '✅' : '❌'} Monthly Summary`,
        'toggle_monthly_summary',
      ),
    ],
    [Markup.button.callback('« Back', 'menu_settings')],
  ]);

  await ctx.editMessageText(
    `📊 *Reports*\n\nDaily summary time: ${settings.reports.dailySummaryTime} UTC\n\nToggle reports:`,
    {
      parse_mode: 'Markdown',
      ...keyboard,
    },
  );

  await ctx.answerCbQuery();
}

/**
 * Toggle notification setting
 */
export async function toggleNotificationSetting(
  ctx: TelegramBotContext,
  setting: string,
): Promise<void> {
  if (!ctx.session || !ctx.session.notificationSettings) {
    ctx.session!.notificationSettings = getDefaultNotificationSettings();
  }

  const settings = ctx.session.notificationSettings;

  // Toggle the setting based on the callback data
  switch (setting) {
    case 'position_opened':
      settings.tradeAlerts.positionOpened = !settings.tradeAlerts.positionOpened;
      await handleTradeAlertsSettings(ctx);
      break;
    case 'position_closed':
      settings.tradeAlerts.positionClosed = !settings.tradeAlerts.positionClosed;
      await handleTradeAlertsSettings(ctx);
      break;
    case 'stop_loss':
      settings.tradeAlerts.stopLossHit = !settings.tradeAlerts.stopLossHit;
      await handleTradeAlertsSettings(ctx);
      break;
    case 'take_profit':
      settings.tradeAlerts.takeProfitHit = !settings.tradeAlerts.takeProfitHit;
      await handleTradeAlertsSettings(ctx);
      break;
    case 'trailing_stop':
      settings.tradeAlerts.trailingStopUpdated = !settings.tradeAlerts.trailingStopUpdated;
      await handleTradeAlertsSettings(ctx);
      break;
    case 'critical_errors':
      settings.systemAlerts.criticalErrors = !settings.systemAlerts.criticalErrors;
      await handleSystemAlertsSettings(ctx);
      break;
    case 'drawdown_limit':
      settings.systemAlerts.dailyDrawdownLimit = !settings.systemAlerts.dailyDrawdownLimit;
      await handleSystemAlertsSettings(ctx);
      break;
    case 'position_loss':
      settings.systemAlerts.positionLossThreshold =
        settings.systemAlerts.positionLossThreshold > 0 ? 0 : 5;
      await handleSystemAlertsSettings(ctx);
      break;
    case 'rate_limits':
      settings.systemAlerts.apiRateLimits = !settings.systemAlerts.apiRateLimits;
      await handleSystemAlertsSettings(ctx);
      break;
    case 'daily_summary':
      settings.reports.dailySummary = !settings.reports.dailySummary;
      await handleReportsSettings(ctx);
      break;
    case 'weekly_summary':
      settings.reports.weeklySummary = !settings.reports.weeklySummary;
      await handleReportsSettings(ctx);
      break;
    case 'monthly_summary':
      settings.reports.monthlySummary = !settings.reports.monthlySummary;
      await handleReportsSettings(ctx);
      break;
  }

  await ctx.answerCbQuery('✅ Setting updated');
}
