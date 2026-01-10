/**
 * Trading Control Command Handlers for Telegram Bot
 */

import type { TelegramBotContext, TelegramBotService } from '../types.js';
import * as templates from '../templates/index.js';

/**
 * /start_trading command - Start automated trading
 */
export async function handleStartTrading(
  ctx: TelegramBotContext,
  service: TelegramBotService,
): Promise<void> {
  try {
    if (!service.config.features.trading) {
      await ctx.reply('❌ Trading control is disabled in configuration.');
      return;
    }

    // Check if PIN is required
    if (service.config.pinCode && !ctx.session?.awaitingPin) {
      ctx.session!.awaitingPin = true;
      ctx.session!.pendingAction = {
        type: 'start_trading',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      };

      await ctx.reply(
        templates.confirmationMessage('Start Trading', 'This will enable automated trading.'),
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // Start trading
    await ctx.reply('▶️ Starting automated trading...');

    // TODO: Integrate with actual trading manager
    // await service.tradingManager.start();

    await ctx.reply(templates.successMessage('Automated trading started successfully!'));
  } catch (error) {
    console.error('Error in handleStartTrading:', error);
    await ctx.reply(templates.errorMessage('Failed to start trading'));
  }
}

/**
 * /stop_trading command - Stop automated trading (emergency stop)
 */
export async function handleStopTrading(
  ctx: TelegramBotContext,
  service: TelegramBotService,
): Promise<void> {
  try {
    if (!service.config.features.trading) {
      await ctx.reply('❌ Trading control is disabled in configuration.');
      return;
    }

    // Check if PIN is required
    if (service.config.pinCode && !ctx.session?.awaitingPin) {
      ctx.session!.awaitingPin = true;
      ctx.session!.pendingAction = {
        type: 'stop_trading',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      await ctx.reply(
        templates.confirmationMessage(
          'Stop Trading',
          'This will stop automated trading. Open positions will remain open.',
        ),
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // Stop trading
    await ctx.reply('⏸️ Stopping automated trading...');

    // TODO: Integrate with actual trading manager
    // await service.tradingManager.stop();

    await ctx.reply(templates.successMessage('Automated trading stopped!'));
  } catch (error) {
    console.error('Error in handleStopTrading:', error);
    await ctx.reply(templates.errorMessage('Failed to stop trading'));
  }
}

/**
 * /close_position command - Close a specific position
 */
export async function handleClosePosition(
  ctx: TelegramBotContext,
  service: TelegramBotService,
): Promise<void> {
  try {
    if (!service.config.features.positions) {
      await ctx.reply('❌ Position management is disabled in configuration.');
      return;
    }

    // Extract symbol from command
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const parts = text.split(' ');

    if (parts.length < 2) {
      await ctx.reply('❌ Usage: /close\\_position <symbol>\nExample: /close\\_position BTC/USDT');
      return;
    }

    const symbol = parts[1].toUpperCase();

    // Check if position exists
    const positions = service.tradingEngine?.getPositions() || [];
    const position = positions.find((p) => p.symbol === symbol);

    if (!position) {
      await ctx.reply(`❌ No open position found for ${symbol}`);
      return;
    }

    // Check if PIN is required
    if (service.config.pinCode && !ctx.session?.awaitingPin) {
      ctx.session!.awaitingPin = true;
      ctx.session!.pendingAction = {
        type: 'close_position',
        data: { symbol },
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      const currentPnL = position.unrealizedPnL || 0;
      await ctx.reply(
        templates.confirmationMessage(
          `Close Position: ${symbol}`,
          `Current P&L: ${templates.formatCurrency(currentPnL)}`,
        ),
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // Close position
    await ctx.reply(`🔄 Closing position ${symbol}...`);

    // TODO: Integrate with actual trading engine
    // await service.tradingEngine.closePosition(position.id);

    await ctx.reply(templates.successMessage(`Position ${symbol} closed successfully!`));
  } catch (error) {
    console.error('Error in handleClosePosition:', error);
    await ctx.reply(templates.errorMessage('Failed to close position'));
  }
}

/**
 * Handle PIN confirmation for pending actions
 */
export async function handlePinConfirmation(
  ctx: TelegramBotContext,
  service: TelegramBotService,
): Promise<void> {
  if (!ctx.session?.awaitingPin || !ctx.session.pendingAction) {
    return;
  }

  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';

  // Verify PIN
  if (text !== service.config.pinCode) {
    await ctx.reply('❌ Invalid PIN. Action cancelled.');
    ctx.session.awaitingPin = false;
    ctx.session.pendingAction = undefined;
    return;
  }

  // Check if action has expired
  if (new Date() > ctx.session.pendingAction.expiresAt) {
    await ctx.reply('❌ Action expired. Please try again.');
    ctx.session.awaitingPin = false;
    ctx.session.pendingAction = undefined;
    return;
  }

  // Execute pending action
  const action = ctx.session.pendingAction;
  ctx.session.awaitingPin = false;
  ctx.session.pendingAction = undefined;

  switch (action.type) {
    case 'start_trading':
      await handleStartTrading(ctx, service);
      break;
    case 'stop_trading':
      await handleStopTrading(ctx, service);
      break;
    case 'close_position':
      await handleClosePosition(ctx, service);
      break;
    case 'close_all':
      await handleCloseAllPositions(ctx, service);
      break;
  }
}

/**
 * Close all positions (emergency)
 */
async function handleCloseAllPositions(
  ctx: TelegramBotContext,
  service: TelegramBotService,
): Promise<void> {
  try {
    const positions = service.tradingEngine?.getPositions() || [];

    if (positions.length === 0) {
      await ctx.reply('ℹ️ No open positions to close.');
      return;
    }

    await ctx.reply(`🔄 Closing ${positions.length} positions...`);

    // TODO: Integrate with actual trading engine
    // for (const position of positions) {
    //   await service.tradingEngine.closePosition(position.id);
    // }

    await ctx.reply(templates.successMessage(`All ${positions.length} positions closed!`));
  } catch (error) {
    console.error('Error in handleCloseAllPositions:', error);
    await ctx.reply(templates.errorMessage('Failed to close all positions'));
  }
}
