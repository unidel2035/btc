import {
  NotificationCategory,
  NotificationImportance,
  TradingNotificationType,
  SignalNotificationType,
  RiskNotificationType,
  SystemNotificationType,
  type Notification,
  type TradingNotificationData,
  type SignalNotificationData,
  type RiskNotificationData,
  type SystemNotificationData,
} from './types.js';

/**
 * Фабрика для создания уведомлений с правильными типами и форматированием
 */
export class NotificationFactory {
  /**
   * Генерация уникального ID
   */
  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Создание торгового уведомления
   */
  static createTradingNotification(
    type: TradingNotificationType,
    data: TradingNotificationData,
    importance: NotificationImportance = NotificationImportance.MEDIUM,
  ): Notification {
    const { title, message } = this.formatTradingNotification(type, data);

    return {
      id: this.generateId(),
      timestamp: new Date(),
      category: NotificationCategory.TRADING,
      type,
      importance,
      title,
      message,
      data,
    };
  }

  /**
   * Форматирование торгового уведомления
   */
  private static formatTradingNotification(
    type: TradingNotificationType,
    data: TradingNotificationData,
  ): { title: string; message: string } {
    switch (type) {
      case TradingNotificationType.POSITION_OPENED:
        return {
          title: `Position Opened - ${data.symbol}`,
          message: `${data.side.toUpperCase()} position opened at ${data.entryPrice} (${data.quantity} units)`,
        };
      case TradingNotificationType.POSITION_CLOSED:
        return {
          title: `Position Closed - ${data.symbol}`,
          message: `${data.side.toUpperCase()} position closed at ${data.exitPrice}\nPnL: ${data.pnl} (${data.pnlPercent}%)`,
        };
      case TradingNotificationType.STOP_LOSS_HIT:
        return {
          title: `Stop Loss - ${data.symbol}`,
          message: `Stop loss triggered at ${data.exitPrice}\nPnL: ${data.pnl} (${data.pnlPercent}%)`,
        };
      case TradingNotificationType.TAKE_PROFIT_HIT:
        return {
          title: `Take Profit - ${data.symbol}`,
          message: `Take profit hit at ${data.exitPrice}\nPnL: ${data.pnl} (${data.pnlPercent}%)`,
        };
      case TradingNotificationType.LIQUIDATION:
        return {
          title: `LIQUIDATION - ${data.symbol}`,
          message: `Position liquidated at ${data.exitPrice}\nLoss: ${data.pnl}`,
        };
      default:
        return {
          title: `Trading Event - ${data.symbol}`,
          message: String(type),
        };
    }
  }

  /**
   * Создание сигнального уведомления
   */
  static createSignalNotification(
    type: SignalNotificationType,
    data: SignalNotificationData,
    importance: NotificationImportance = NotificationImportance.HIGH,
  ): Notification {
    const { title, message } = this.formatSignalNotification(type, data);

    return {
      id: this.generateId(),
      timestamp: new Date(),
      category: NotificationCategory.SIGNALS,
      type,
      importance,
      title,
      message,
      data,
    };
  }

  /**
   * Форматирование сигнального уведомления
   */
  private static formatSignalNotification(
    type: SignalNotificationType,
    data: SignalNotificationData,
  ): { title: string; message: string } {
    switch (type) {
      case SignalNotificationType.IMPORTANT_NEWS:
        return {
          title: `Important News - ${data.source}`,
          message: `${data.title || 'News alert'}\n${data.description || ''}`,
        };
      case SignalNotificationType.SOCIAL_ANOMALY:
        return {
          title: `Social Anomaly Detected - ${data.source}`,
          message: `Unusual social activity detected\nSentiment: ${data.sentiment || 'N/A'}`,
        };
      case SignalNotificationType.WHALE_ALERT:
        return {
          title: `Whale Alert - ${data.source}`,
          message: `Large transaction detected\n${data.description || ''}`,
        };
      default:
        return {
          title: `Signal - ${data.source}`,
          message: data.description || type,
        };
    }
  }

  /**
   * Создание риск уведомления
   */
  static createRiskNotification(
    type: RiskNotificationType,
    data: RiskNotificationData,
    importance: NotificationImportance = NotificationImportance.HIGH,
  ): Notification {
    const { title, message } = this.formatRiskNotification(type, data);

    return {
      id: this.generateId(),
      timestamp: new Date(),
      category: NotificationCategory.RISK,
      type,
      importance,
      title,
      message,
      data,
    };
  }

  /**
   * Форматирование риск уведомления
   */
  private static formatRiskNotification(
    type: RiskNotificationType,
    data: RiskNotificationData,
  ): { title: string; message: string } {
    switch (type) {
      case RiskNotificationType.DAILY_LIMIT_APPROACHING:
        return {
          title: 'Daily Limit Approaching',
          message: `${data.metric} at ${data.percentage.toFixed(1)}% of daily limit\nCurrent: ${data.currentValue} / Limit: ${data.limitValue}`,
        };
      case RiskNotificationType.DRAWDOWN_REACHED:
        return {
          title: 'Drawdown Limit Reached',
          message: `Maximum drawdown reached: ${data.currentValue}%\nLimit: ${data.limitValue}%`,
        };
      case RiskNotificationType.HIGH_VOLATILITY:
        return {
          title: 'High Volatility Alert',
          message: `${data.symbol ? data.symbol + ': ' : ''}Volatility at ${data.currentValue}\nThreshold: ${data.limitValue}`,
        };
      default:
        return {
          title: 'Risk Alert',
          message: `${data.metric}: ${data.currentValue} / ${data.limitValue}`,
        };
    }
  }

  /**
   * Создание системного уведомления
   */
  static createSystemNotification(
    type: SystemNotificationType,
    data: SystemNotificationData,
    importance: NotificationImportance = NotificationImportance.MEDIUM,
  ): Notification {
    const { title, message } = this.formatSystemNotification(type, data);

    return {
      id: this.generateId(),
      timestamp: new Date(),
      category: NotificationCategory.SYSTEM,
      type,
      importance,
      title,
      message,
      data,
    };
  }

  /**
   * Форматирование системного уведомления
   */
  private static formatSystemNotification(
    type: SystemNotificationType,
    data: SystemNotificationData,
  ): { title: string; message: string } {
    switch (type) {
      case SystemNotificationType.EXCHANGE_CONNECTION_ERROR:
        return {
          title: `Exchange Connection Error - ${data.service}`,
          message: `Failed to connect to exchange\n${data.error || 'Unknown error'}`,
        };
      case SystemNotificationType.SERVICE_FAILURE:
        return {
          title: `Service Failure - ${data.service}`,
          message: `Service failed: ${data.error || 'Unknown error'}\nStatus: ${data.status || 'Down'}`,
        };
      case SystemNotificationType.BOT_RESTART:
        return {
          title: 'Bot Restarted',
          message: `Bot has been restarted\nUptime before restart: ${data.uptime ? Math.floor(data.uptime / 60) : 0} minutes`,
        };
      default:
        return {
          title: `System Event - ${data.service}`,
          message: data.error || type,
        };
    }
  }
}
