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
  return num.toLocaleString('ru-RU', {
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
🤖 *ТОРГОВЫЙ БОТ BTC*

Добро пожаловать в центр управления торговым ботом!

Используйте меню ниже или введите команды:
• /status - Статус бота
• /balance - Баланс счета
• /positions - Открытые позиции
• /pnl - Прибыль и убытки
• /help - Все команды

Начнем торговать! 🚀
`.trim();
}

/**
 * Help message template
 */
export function helpMessage(): string {
  return `
📚 *ДОСТУПНЫЕ КОМАНДЫ*

*📊 Информация*
/status - Текущий статус бота
/balance - Обзор баланса
/positions - Список открытых позиций
/pnl - Отчет о прибыли и убытках
/signals - Последние торговые сигналы
/screening - Результаты скрининга

*🎮 Управление торговлей*
/start\\_trading - Запустить авто-торговлю
/stop\\_trading - Остановить авто-торговлю
/close\\_position <symbol> - Закрыть позицию

*⚙️ Настройки*
/settings - Настройки уведомлений
/help - Показать эту справку

*Безопасность:* Критические операции требуют подтверждения PIN-кодом.
`.trim();
}

/**
 * Status message template
 */
export function statusMessage(stats: TradingStats): string {
  const statusEmoji = stats.running ? '🟢' : '🔴';
  const statusText = stats.running ? 'АКТИВЕН' : 'ОСТАНОВЛЕН';

  return `
🤖 *СТАТУС БОТА*

Статус: ${statusEmoji} ${statusText}
Время работы: ${formatDuration(stats.uptime)}
Открытые позиции: ${stats.openPositions}

*Производительность*
P&L за день: ${getPnLEmoji(stats.dailyPnL)} ${formatCurrency(stats.dailyPnL)}
P&L за неделю: ${getPnLEmoji(stats.weeklyPnL)} ${formatCurrency(stats.weeklyPnL)}
Общий P&L: ${getPnLEmoji(stats.totalPnL)} ${formatCurrency(stats.totalPnL)}

Процент побед: ${formatPercent(stats.winRate * 100)}
Всего сделок: ${stats.totalTrades}
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
💰 *БАЛАНС*

Всего: ${formatCurrency(balance.total, balance.currency)}
Доступно: ${formatCurrency(balance.available, balance.currency)}
В позициях: ${formatCurrency(balance.inPositions, balance.currency)}

*Производительность*
P&L за день: ${getPnLEmoji(balance.dailyPnL)} ${formatCurrency(balance.dailyPnL)} (${formatPercent(balance.dailyPnLPercent)})
P&L за неделю: ${getPnLEmoji(balance.weeklyPnL)} ${formatCurrency(balance.weeklyPnL)} (${formatPercent(balance.weeklyPnLPercent)})

*Активы*
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

Вход: ${formatCurrency(position.entryPrice)}
Текущая: ${formatCurrency(position.currentPrice)} (${formatPercent(position.unrealizedPnLPercent)})
Объем: ${formatNumber(position.quantity, 4)} (${formatCurrency(position.value)})

${pnlEmoji} P&L: ${formatCurrency(position.unrealizedPnL)} (${formatPercent(position.unrealizedPnLPercent)})

Стоп-лосс: ${position.stopLoss ? formatCurrency(position.stopLoss) : 'Не установлен'}
Тейк-профит: ${position.takeProfit ? formatCurrency(position.takeProfit) : 'Не установлен'}

Длительность: ${position.duration}
Открыта: ${formatTimestamp(position.openedAt)}
`.trim();
}

/**
 * Positions list message template
 */
export function positionsListMessage(positions: PositionSummary[]): string {
  if (positions.length === 0) {
    return '📊 *ПОЗИЦИИ*\n\nНет открытых позиций.';
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
📊 *ПОЗИЦИИ* (${positions.length})

${positionsList}

*Итого*
Общая стоимость: ${formatCurrency(totalValue)}
Общий P&L: ${getPnLEmoji(totalPnL)} ${formatCurrency(totalPnL)}
Средний P&L: ${formatPercent(avgPnLPercent)}
`.trim();
}

/**
 * P&L report message template
 */
export function pnlMessage(stats: TradingStats): string {
  return `
📈 *ПРИБЫЛЬ И УБЫТКИ*

*Сегодня*
${getPnLEmoji(stats.dailyPnL)} ${formatCurrency(stats.dailyPnL)}

*За неделю*
${getPnLEmoji(stats.weeklyPnL)} ${formatCurrency(stats.weeklyPnL)}

*За месяц*
${getPnLEmoji(stats.monthlyPnL)} ${formatCurrency(stats.monthlyPnL)}

*Всего*
${getPnLEmoji(stats.totalPnL)} ${formatCurrency(stats.totalPnL)}

*Статистика*
Процент побед: ${formatPercent(stats.winRate * 100)}
Всего сделок: ${stats.totalTrades}
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
${directionEmoji} *СИГНАЛ: ${signal.symbol}*

Направление: ${signal.direction.toUpperCase()}
Уверенность: ${confidenceStars} (${formatPercent(signal.confidence * 100)})
Оценка: ${formatNumber(signal.score, 1)}

*Причины*
${reasonsList}

Источники: ${sourcesList}
Время: ${formatTimestamp(signal.timestamp)}
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
        `${pick.rank}. *${pick.symbol}* - Оценка: ${formatNumber(pick.score, 1)} (${pick.sector})`,
    )
    .join('\n');

  const sectorsList = screening.sectors
    .slice(0, 3)
    .map(
      (sector) =>
        `• ${sector.sector}: ${formatNumber(sector.score, 1)} (${sector.projects} проектов)`,
    )
    .join('\n');

  return `
🔍 *РЕЗУЛЬТАТЫ СКРИНИНГА*

Проанализировано: ${screening.totalAnalyzed} проектов
Подходит: ${screening.qualified} проектов
Время: ${formatTimestamp(screening.timestamp)}

*Лучшие выборы*
${topPicksList}

*Лучшие секторы*
${sectorsList}
`.trim();
}

/**
 * Settings message template
 */
export function settingsMessage(settings: NotificationSettings): string {
  const checkbox = (enabled: boolean) => (enabled ? '✅' : '❌');

  return `
⚙️ *НАСТРОЙКИ УВЕДОМЛЕНИЙ*

*🔔 Торговые оповещения*
${checkbox(settings.tradeAlerts.positionOpened)} Позиция открыта
${checkbox(settings.tradeAlerts.positionClosed)} Позиция закрыта
${checkbox(settings.tradeAlerts.stopLossHit)} Сработал стоп-лосс
${checkbox(settings.tradeAlerts.takeProfitHit)} Сработал тейк-профит
${checkbox(settings.tradeAlerts.trailingStopUpdated)} Обновлен трейлинг-стоп

*⚠️ Системные оповещения*
${checkbox(settings.systemAlerts.criticalErrors)} Критические ошибки
${checkbox(settings.systemAlerts.dailyDrawdownLimit)} Лимит дневной просадки
${checkbox(settings.systemAlerts.positionLossThreshold > 0)} Убыток позиции > ${settings.systemAlerts.positionLossThreshold}%
${checkbox(settings.systemAlerts.apiRateLimits)} Лимиты API

*📊 Отчеты*
${checkbox(settings.reports.dailySummary)} Ежедневный (${settings.reports.dailySummaryTime} UTC)
${checkbox(settings.reports.weeklySummary)} Еженедельный
${checkbox(settings.reports.monthlySummary)} Ежемесячный

*🔕 Тихий режим*
${checkbox(settings.quietHours.enabled)} ${settings.quietHours.enabled ? `${settings.quietHours.startTime} - ${settings.quietHours.endTime} UTC` : 'Выключен'}
`.trim();
}

/**
 * Position opened notification template
 */
export function notifyPositionOpened(position: PositionSummary): string {
  const sideEmoji = position.side === 'long' ? '📈' : '📉';

  return `
🟢 *ПОЗИЦИЯ ОТКРЫТА*

${sideEmoji} ${position.side.toUpperCase()} ${position.symbol}

Вход: ${formatCurrency(position.entryPrice)}
Объем: ${formatNumber(position.quantity, 4)}
Стоимость: ${formatCurrency(position.value)}

${position.stopLoss ? `Стоп-лосс: ${formatCurrency(position.stopLoss)}` : ''}
${position.takeProfit ? `Тейк-профит: ${formatCurrency(position.takeProfit)}` : ''}
`.trim();
}

/**
 * Position closed notification template
 */
export function notifyPositionClosed(position: PositionSummary): string {
  const sideEmoji = position.side === 'long' ? '📈' : '📉';
  const pnlEmoji = getPnLEmoji(position.unrealizedPnL);

  return `
🔴 *ПОЗИЦИЯ ЗАКРЫТА*

${sideEmoji} ${position.side.toUpperCase()} ${position.symbol}

Вход: ${formatCurrency(position.entryPrice)}
Выход: ${formatCurrency(position.currentPrice)}

${pnlEmoji} P&L: ${formatCurrency(position.unrealizedPnL)} (${formatPercent(position.unrealizedPnLPercent)})

Длительность: ${position.duration}
`.trim();
}

/**
 * Confirmation message template
 */
export function confirmationMessage(action: string, details: string): string {
  return `
⚠️ *ТРЕБУЕТСЯ ПОДТВЕРЖДЕНИЕ*

Действие: ${action}
${details}

Введите PIN-код для подтверждения:
`.trim();
}

/**
 * Error message template
 */
export function errorMessage(error: string): string {
  return `❌ *Ошибка*\n\n${error}`;
}

/**
 * Success message template
 */
export function successMessage(message: string): string {
  return `✅ ${message}`;
}
