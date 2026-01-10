/**
 * Message Templates for Telegram Bot
 * Formats data for clean and readable Telegram messages
 */

import type {
  PositionSummary,
  BalanceSummary,
  SignalSummary,
  ScreeningSummary,
  TradingStats,
  NotificationSettings,
} from '../types.js';

/**
 * Format number with commas and fixed decimals
 */
export function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format percentage
 */
export function formatPercent(percent: number, decimals: number = 2): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${formatNumber(percent, decimals)}%`;
}

/**
 * Format currency value
 */
export function formatCurrency(amount: number, currency: string = 'USDT'): string {
  return `${formatNumber(amount, 2)} ${currency}`;
}

/**
 * Format duration from milliseconds
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Format timestamp to readable date
 */
export function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  });
}

/**
 * Get PnL emoji based on value
 */
export function getPnLEmoji(pnl: number): string {
  if (pnl > 0) return '🟢';
  if (pnl < 0) return '🔴';
  return '⚪';
}

/**
 * Welcome message template
 */
export function welcomeMessage(): string {
  return `
🤖 *BTC TRADING BOT*

Welcome to your trading bot control center!

Use the menu below or type commands:
• /status - Check bot status
• /balance - View your balance
• /positions - See open positions
• /pnl - Check profit & loss
• /help - Show all commands

Let's start trading! 🚀
`.trim();
}

/**
 * Help message template
 */
export function helpMessage(): string {
  return `
📚 *AVAILABLE COMMANDS*

*📊 Information*
/status - Current bot status
/balance - Balance overview
/positions - Open positions list
/pnl - Profit & loss report
/signals - Recent trading signals
/screening - Latest screening results

*🎮 Trading Control*
/start\\_trading - Start auto trading
/stop\\_trading - Stop auto trading
/close\\_position <symbol> - Close position

*⚙️ Settings*
/settings - Notification settings
/help - Show this help

*Security:* Critical operations require PIN confirmation.
`.trim();
}

/**
 * Status message template
 */
export function statusMessage(stats: TradingStats): string {
  const statusEmoji = stats.running ? '🟢' : '🔴';
  const statusText = stats.running ? 'ACTIVE' : 'STOPPED';

  return `
🤖 *BOT STATUS*

Status: ${statusEmoji} ${statusText}
Uptime: ${formatDuration(stats.uptime)}
Open Positions: ${stats.openPositions}

*Performance*
Daily P&L: ${getPnLEmoji(stats.dailyPnL)} ${formatCurrency(stats.dailyPnL)}
Weekly P&L: ${getPnLEmoji(stats.weeklyPnL)} ${formatCurrency(stats.weeklyPnL)}
Total P&L: ${getPnLEmoji(stats.totalPnL)} ${formatCurrency(stats.totalPnL)}

Win Rate: ${formatPercent(stats.winRate * 100)}
Total Trades: ${stats.totalTrades}
`.trim();
}

/**
 * Balance message template
 */
export function balanceMessage(balance: BalanceSummary): string {
  const assetsList = balance.assets
    .slice(0, 5)
    .map(
      (asset) =>
        `• ${asset.asset}: ${formatNumber(asset.amount, 4)} (${formatCurrency(asset.value)})`,
    )
    .join('\n');

  return `
💰 *BALANCE*

Total: ${formatCurrency(balance.total, balance.currency)}
Available: ${formatCurrency(balance.available, balance.currency)}
In Positions: ${formatCurrency(balance.inPositions, balance.currency)}

*Performance*
Daily P&L: ${getPnLEmoji(balance.dailyPnL)} ${formatCurrency(balance.dailyPnL)} (${formatPercent(balance.dailyPnLPercent)})
Weekly P&L: ${getPnLEmoji(balance.weeklyPnL)} ${formatCurrency(balance.weeklyPnL)} (${formatPercent(balance.weeklyPnLPercent)})

*Assets*
${assetsList}
`.trim();
}

/**
 * Single position message template
 */
export function positionMessage(position: PositionSummary): string {
  const sideEmoji = position.side === 'long' ? '📈' : '📉';
  const pnlEmoji = getPnLEmoji(position.unrealizedPnL);

  return `
${sideEmoji} *${position.side.toUpperCase()} ${position.symbol}*

Entry: ${formatCurrency(position.entryPrice)}
Current: ${formatCurrency(position.currentPrice)} (${formatPercent(position.unrealizedPnLPercent)})
Size: ${formatNumber(position.quantity, 4)} (${formatCurrency(position.value)})

${pnlEmoji} P&L: ${formatCurrency(position.unrealizedPnL)} (${formatPercent(position.unrealizedPnLPercent)})

Stop Loss: ${position.stopLoss ? formatCurrency(position.stopLoss) : 'Not set'}
Take Profit: ${position.takeProfit ? formatCurrency(position.takeProfit) : 'Not set'}

Duration: ${position.duration}
Opened: ${formatTimestamp(position.openedAt)}
`.trim();
}

/**
 * Positions list message template
 */
export function positionsListMessage(positions: PositionSummary[]): string {
  if (positions.length === 0) {
    return '📊 *POSITIONS*\n\nNo open positions.';
  }

  const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
  const totalPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
  const avgPnLPercent =
    positions.reduce((sum, p) => sum + p.unrealizedPnLPercent, 0) / positions.length;

  const positionsList = positions
    .map((p) => {
      const sideEmoji = p.side === 'long' ? '📈' : '📉';
      const pnlEmoji = getPnLEmoji(p.unrealizedPnL);
      return `${sideEmoji} *${p.symbol}* ${p.side.toUpperCase()}\n  ${formatCurrency(p.currentPrice)} | ${pnlEmoji} ${formatPercent(p.unrealizedPnLPercent)}`;
    })
    .join('\n\n');

  return `
📊 *POSITIONS* (${positions.length})

${positionsList}

*Summary*
Total Value: ${formatCurrency(totalValue)}
Total P&L: ${getPnLEmoji(totalPnL)} ${formatCurrency(totalPnL)}
Avg P&L: ${formatPercent(avgPnLPercent)}
`.trim();
}

/**
 * P&L report message template
 */
export function pnlMessage(stats: TradingStats): string {
  return `
📈 *PROFIT & LOSS*

*Today*
${getPnLEmoji(stats.dailyPnL)} ${formatCurrency(stats.dailyPnL)}

*This Week*
${getPnLEmoji(stats.weeklyPnL)} ${formatCurrency(stats.weeklyPnL)}

*This Month*
${getPnLEmoji(stats.monthlyPnL)} ${formatCurrency(stats.monthlyPnL)}

*Total*
${getPnLEmoji(stats.totalPnL)} ${formatCurrency(stats.totalPnL)}

*Statistics*
Win Rate: ${formatPercent(stats.winRate * 100)}
Total Trades: ${stats.totalTrades}
`.trim();
}

/**
 * Signal message template
 */
export function signalMessage(signal: SignalSummary): string {
  const directionEmoji = signal.direction === 'long' ? '📈' : '📉';
  const confidenceStars = '⭐'.repeat(Math.round(signal.confidence * 5));

  const reasonsList = signal.reasons.map((reason) => `• ${reason}`).join('\n');
  const sourcesList = signal.sources.join(', ');

  return `
${directionEmoji} *SIGNAL: ${signal.symbol}*

Direction: ${signal.direction.toUpperCase()}
Confidence: ${confidenceStars} (${formatPercent(signal.confidence * 100)})
Score: ${formatNumber(signal.score, 1)}

*Reasons*
${reasonsList}

Sources: ${sourcesList}
Time: ${formatTimestamp(signal.timestamp)}
`.trim();
}

/**
 * Screening results message template
 */
export function screeningMessage(screening: ScreeningSummary): string {
  const topPicksList = screening.topPicks
    .slice(0, 5)
    .map(
      (pick) =>
        `${pick.rank}. *${pick.symbol}* - Score: ${formatNumber(pick.score, 1)} (${pick.sector})`,
    )
    .join('\n');

  const sectorsList = screening.sectors
    .slice(0, 3)
    .map(
      (sector) =>
        `• ${sector.sector}: ${formatNumber(sector.score, 1)} (${sector.projects} projects)`,
    )
    .join('\n');

  return `
🔍 *SCREENING RESULTS*

Analyzed: ${screening.totalAnalyzed} projects
Qualified: ${screening.qualified} projects
Time: ${formatTimestamp(screening.timestamp)}

*Top Picks*
${topPicksList}

*Top Sectors*
${sectorsList}
`.trim();
}

/**
 * Settings message template
 */
export function settingsMessage(settings: NotificationSettings): string {
  const checkbox = (enabled: boolean) => (enabled ? '✅' : '❌');

  return `
⚙️ *NOTIFICATION SETTINGS*

*🔔 Trade Alerts*
${checkbox(settings.tradeAlerts.positionOpened)} Position opened
${checkbox(settings.tradeAlerts.positionClosed)} Position closed
${checkbox(settings.tradeAlerts.stopLossHit)} Stop Loss hit
${checkbox(settings.tradeAlerts.takeProfitHit)} Take Profit hit
${checkbox(settings.tradeAlerts.trailingStopUpdated)} Trailing stop updated

*⚠️ System Alerts*
${checkbox(settings.systemAlerts.criticalErrors)} Critical errors
${checkbox(settings.systemAlerts.dailyDrawdownLimit)} Daily drawdown limit
${checkbox(settings.systemAlerts.positionLossThreshold > 0)} Position loss > ${settings.systemAlerts.positionLossThreshold}%
${checkbox(settings.systemAlerts.apiRateLimits)} API rate limits

*📊 Reports*
${checkbox(settings.reports.dailySummary)} Daily summary (${settings.reports.dailySummaryTime} UTC)
${checkbox(settings.reports.weeklySummary)} Weekly summary
${checkbox(settings.reports.monthlySummary)} Monthly summary

*🔕 Quiet Hours*
${checkbox(settings.quietHours.enabled)} ${settings.quietHours.enabled ? `${settings.quietHours.startTime} - ${settings.quietHours.endTime} UTC` : 'Disabled'}
`.trim();
}

/**
 * Position opened notification template
 */
export function notifyPositionOpened(position: PositionSummary): string {
  const sideEmoji = position.side === 'long' ? '📈' : '📉';

  return `
🟢 *POSITION OPENED*

${sideEmoji} ${position.side.toUpperCase()} ${position.symbol}

Entry: ${formatCurrency(position.entryPrice)}
Size: ${formatNumber(position.quantity, 4)}
Value: ${formatCurrency(position.value)}

${position.stopLoss ? `Stop Loss: ${formatCurrency(position.stopLoss)}` : ''}
${position.takeProfit ? `Take Profit: ${formatCurrency(position.takeProfit)}` : ''}
`.trim();
}

/**
 * Position closed notification template
 */
export function notifyPositionClosed(position: PositionSummary): string {
  const sideEmoji = position.side === 'long' ? '📈' : '📉';
  const pnlEmoji = getPnLEmoji(position.unrealizedPnL);

  return `
🔴 *POSITION CLOSED*

${sideEmoji} ${position.side.toUpperCase()} ${position.symbol}

Entry: ${formatCurrency(position.entryPrice)}
Exit: ${formatCurrency(position.currentPrice)}

${pnlEmoji} P&L: ${formatCurrency(position.unrealizedPnL)} (${formatPercent(position.unrealizedPnLPercent)})

Duration: ${position.duration}
`.trim();
}

/**
 * Confirmation message template
 */
export function confirmationMessage(action: string, details: string): string {
  return `
⚠️ *CONFIRMATION REQUIRED*

Action: ${action}
${details}

Enter your PIN to confirm:
`.trim();
}

/**
 * Error message template
 */
export function errorMessage(error: string): string {
  return `❌ *Error*\n\n${error}`;
}

/**
 * Success message template
 */
export function successMessage(message: string): string {
  return `✅ ${message}`;
}
