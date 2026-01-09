import type { RiskEvent, RiskEventType } from './types.js';

/**
 * Логгер событий риск-менеджмента
 */
export class RiskEventLogger {
  private events: RiskEvent[];
  private maxEvents: number;

  constructor(maxEvents: number = 10000) {
    this.events = [];
    this.maxEvents = maxEvents;
  }

  /**
   * Логирование события
   */
  log(event: RiskEvent): void {
    this.events.push(event);

    // Выводим в консоль для отладки
    this.logToConsole(event);

    // Ограничиваем размер массива
    if (this.events.length > this.maxEvents) {
      this.events.shift(); // Удаляем самое старое событие
    }
  }

  /**
   * Вывод события в консоль с форматированием
   */
  private logToConsole(event: RiskEvent): void {
    const timestamp = event.timestamp.toISOString();
    const symbol = event.symbol ? `[${event.symbol}]` : '';
    const positionId = event.positionId ? `(${event.positionId.substring(0, 8)})` : '';

    let emoji = '📊';
    let level: 'info' | 'warn' | 'error' = 'info';

    // Определяем уровень и эмодзи по типу события
    switch (event.type) {
      case 'position_opened':
        emoji = '✅';
        level = 'info';
        break;
      case 'position_closed':
        emoji = '🔒';
        level = 'info';
        break;
      case 'position_partially_closed':
        emoji = '📉';
        level = 'info';
        break;
      case 'stop_loss_triggered':
        emoji = '🛑';
        level = 'warn';
        break;
      case 'take_profit_triggered':
        emoji = '🎯';
        level = 'info';
        break;
      case 'trailing_stop_activated':
        emoji = '🔄';
        level = 'info';
        break;
      case 'trailing_stop_updated':
        emoji = '⬆️';
        level = 'info';
        break;
      case 'limit_warning':
        emoji = '⚠️';
        level = 'warn';
        break;
      case 'limit_reached':
        emoji = '🚫';
        level = 'error';
        break;
      case 'daily_loss_limit':
        emoji = '📛';
        level = 'error';
        break;
      case 'max_drawdown_limit':
        emoji = '💥';
        level = 'error';
        break;
      case 'max_positions_limit':
        emoji = '🔢';
        level = 'warn';
        break;
      case 'correlation_warning':
        emoji = '🔗';
        level = 'warn';
        break;
    }

    const message = `${emoji} [${timestamp}] ${symbol} ${positionId} ${event.message}`;

    if (level === 'error') {
      console.error(message);
    } else if (level === 'warn') {
      console.warn(message);
    } else {
      console.info(message);
    }
  }

  /**
   * Получение всех событий
   */
  getEvents(limit?: number): RiskEvent[] {
    if (limit) {
      return this.events.slice(-limit);
    }
    return [...this.events];
  }

  /**
   * Получение событий по типу
   */
  getEventsByType(type: RiskEventType, limit?: number): RiskEvent[] {
    const filtered = this.events.filter((event) => event.type === type);

    if (limit) {
      return filtered.slice(-limit);
    }
    return filtered;
  }

  /**
   * Получение событий по символу
   */
  getEventsBySymbol(symbol: string, limit?: number): RiskEvent[] {
    const filtered = this.events.filter((event) => event.symbol === symbol);

    if (limit) {
      return filtered.slice(-limit);
    }
    return filtered;
  }

  /**
   * Получение событий по позиции
   */
  getEventsByPosition(positionId: string, limit?: number): RiskEvent[] {
    const filtered = this.events.filter((event) => event.positionId === positionId);

    if (limit) {
      return filtered.slice(-limit);
    }
    return filtered;
  }

  /**
   * Получение событий за период
   */
  getEventsByTimeRange(startDate: Date, endDate: Date): RiskEvent[] {
    return this.events.filter(
      (event) => event.timestamp >= startDate && event.timestamp <= endDate,
    );
  }

  /**
   * Очистка старых событий
   */
  clearOldEvents(olderThan: Date): number {
    const initialLength = this.events.length;
    this.events = this.events.filter((event) => event.timestamp >= olderThan);
    const removed = initialLength - this.events.length;

    if (removed > 0) {
      console.info(`🧹 Cleared ${removed} old risk events`);
    }

    return removed;
  }

  /**
   * Очистка всех событий
   */
  clearAll(): void {
    const count = this.events.length;
    this.events = [];
    console.info(`🧹 Cleared all ${count} risk events`);
  }

  /**
   * Экспорт событий в JSON
   */
  exportToJSON(): string {
    return JSON.stringify(this.events, null, 2);
  }

  /**
   * Получение статистики событий
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    bySymbol: Record<string, number>;
    oldestEvent?: Date;
    newestEvent?: Date;
  } {
    const byType: Record<string, number> = {};
    const bySymbol: Record<string, number> = {};

    for (const event of this.events) {
      byType[event.type] = (byType[event.type] || 0) + 1;

      if (event.symbol) {
        bySymbol[event.symbol] = (bySymbol[event.symbol] || 0) + 1;
      }
    }

    return {
      total: this.events.length,
      byType,
      bySymbol,
      oldestEvent: this.events.length > 0 ? this.events[0].timestamp : undefined,
      newestEvent: this.events.length > 0 ? this.events[this.events.length - 1].timestamp : undefined,
    };
  }
}
