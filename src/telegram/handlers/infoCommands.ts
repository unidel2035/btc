/**
 * Information Command Handlers for Telegram Bot
 */

import type { TelegramBotContext, TelegramBotService } from '../types.js';
import { Markup } from 'telegraf';
import * as templates from '../templates/index.js';

/**
 * /status command - Show bot status and performance
 */
export async function handleStatus(
  ctx: TelegramBotContext,
  service: TelegramBotService,
): Promise<void> {
  try {
    const stats = await getBotStats(service);
    const message = templates.statusMessage(stats);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Refresh', 'refresh_status')],
      [Markup.button.callback('« Back', 'menu_main')],
    ]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  } catch (error) {
    console.error('Error in handleStatus:', error);
    await ctx.reply(templates.errorMessage('Failed to get bot status'));
  }
}

/**
 * /balance command - Show account balance
 */
export async function handleBalance(
  ctx: TelegramBotContext,
  service: TelegramBotService,
): Promise<void> {
  try {
    const balance = await getBalanceSummary(service);
    const message = templates.balanceMessage(balance);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Refresh', 'refresh_balance')],
      [Markup.button.callback('« Back', 'menu_main')],
    ]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  } catch (error) {
    console.error('Error in handleBalance:', error);
    await ctx.reply(templates.errorMessage('Failed to get balance'));
  }
}

/**
 * /positions command - Show open positions
 */
export async function handlePositions(
  ctx: TelegramBotContext,
  service: TelegramBotService,
): Promise<void> {
  try {
    const positions = await getOpenPositions(service);
    const message = templates.positionsListMessage(positions);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Refresh', 'refresh_positions')],
      [Markup.button.callback('« Back', 'menu_main')],
    ]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  } catch (error) {
    console.error('Error in handlePositions:', error);
    await ctx.reply(templates.errorMessage('Failed to get positions'));
  }
}

/**
 * /pnl command - Show profit & loss report
 */
export async function handlePnL(
  ctx: TelegramBotContext,
  service: TelegramBotService,
): Promise<void> {
  try {
    const stats = await getBotStats(service);
    const message = templates.pnlMessage(stats);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Refresh', 'refresh_pnl')],
      [Markup.button.callback('« Back', 'menu_main')],
    ]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  } catch (error) {
    console.error('Error in handlePnL:', error);
    await ctx.reply(templates.errorMessage('Failed to get P&L report'));
  }
}

/**
 * /signals command - Show recent trading signals
 */
export async function handleSignals(
  ctx: TelegramBotContext,
  service: TelegramBotService,
): Promise<void> {
  try {
    const signals = await getRecentSignals(service);

    if (signals.length === 0) {
      await ctx.reply('🔔 *SIGNALS*\n\nNo recent signals available.', {
        parse_mode: 'Markdown',
      });
      return;
    }

    // Send each signal as a separate message
    for (const signal of signals.slice(0, 3)) {
      const message = templates.signalMessage(signal);
      await ctx.reply(message, {
        parse_mode: 'Markdown',
      });
    }

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Refresh', 'refresh_signals')],
      [Markup.button.callback('« Back', 'menu_main')],
    ]);

    await ctx.reply('Use /signals to see more signals.', {
      ...keyboard,
    });
  } catch (error) {
    console.error('Error in handleSignals:', error);
    await ctx.reply(templates.errorMessage('Failed to get signals'));
  }
}

/**
 * /screening command - Show latest screening results
 */
export async function handleScreening(
  ctx: TelegramBotContext,
  service: TelegramBotService,
): Promise<void> {
  try {
    if (!service.screeningModule) {
      await ctx.reply('🔍 Screening module is not available.');
      return;
    }

    await ctx.reply('🔍 Running screening analysis... This may take a moment.');

    // Run screening in the background
    const screening = await getScreeningResults(service);
    const message = templates.screeningMessage(screening);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Run Again', 'action_run_screening')],
      [Markup.button.callback('« Back', 'menu_main')],
    ]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  } catch (error) {
    console.error('Error in handleScreening:', error);
    await ctx.reply(templates.errorMessage('Failed to get screening results'));
  }
}

// Helper functions to get data from services

async function getBotStats(service: TelegramBotService) {
  // Mock implementation - replace with actual data from trading engine
  return {
    running: true,
    uptime: Date.now() - new Date('2026-01-10').getTime(),
    openPositions: service.tradingEngine?.getPositions().length || 0,
    dailyPnL: 0,
    weeklyPnL: 0,
    monthlyPnL: 0,
    totalPnL: 0,
    winRate: 0,
    totalTrades: 0,
  };
}

async function getBalanceSummary(service: TelegramBotService) {
  const balance = service.tradingEngine?.getBalance();

  return {
    total: balance?.total || 0,
    available: balance?.available || 0,
    inPositions: balance?.locked || 0,
    currency: balance?.currency || 'USDT',
    dailyPnL: 0,
    dailyPnLPercent: 0,
    weeklyPnL: 0,
    weeklyPnLPercent: 0,
    assets: [],
  };
}

async function getOpenPositions(service: TelegramBotService) {
  const positions = service.tradingEngine?.getPositions() || [];

  return positions.map((position) => ({
    id: position.id,
    symbol: position.symbol,
    side: position.side,
    entryPrice: position.entryPrice,
    currentPrice: position.currentPrice || position.entryPrice,
    quantity: position.quantity,
    value: (position.currentPrice || position.entryPrice) * position.quantity,
    unrealizedPnL: position.unrealizedPnL || 0,
    unrealizedPnLPercent: position.unrealizedPnLPercent || 0,
    stopLoss: position.stopLoss,
    takeProfit: position.takeProfit,
    duration: templates.formatDuration(Date.now() - position.openedAt.getTime()),
    openedAt: position.openedAt,
  }));
}

async function getRecentSignals(service: TelegramBotService) {
  // Mock implementation - replace with actual signals from strategy manager
  return [];
}

async function getScreeningResults(service: TelegramBotService) {
  if (!service.screeningModule) {
    throw new Error('Screening module not available');
  }

  const report = await service.screeningModule.runScreening();

  return {
    timestamp: new Date(),
    totalAnalyzed: report.totalProjectsAnalyzed || 0,
    qualified: report.recommendations?.length || 0,
    topPicks: (report.recommendations || []).slice(0, 5).map((rec, index) => ({
      symbol: rec.symbol,
      score: rec.totalScore,
      sector: rec.sector || 'unknown',
      rank: index + 1,
    })),
    sectors: [], // TODO: Extract sector info from recommendations
  };
}
