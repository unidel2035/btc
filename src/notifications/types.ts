/**
 * Типы и интерфейсы для системы уведомлений
 */

/**
 * Уровень важности уведомления
 */
export enum NotificationImportance {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Канал уведомлений
 */
export enum NotificationChannel {
  CONSOLE = 'console',
  TELEGRAM = 'telegram',
  EMAIL = 'email',
  DISCORD = 'discord',
  WEBHOOK = 'webhook',
  PUSH = 'push', // Web push notifications
}

/**
 * Категория уведомления
 */
export enum NotificationCategory {
  TRADING = 'trading', // Торговые события
  SIGNALS = 'signals', // Сигналы
  RISK = 'risk', // Риск-менеджмент
  SYSTEM = 'system', // Системные события
}

/**
 * Тип торгового уведомления
 */
export enum TradingNotificationType {
  POSITION_OPENED = 'position_opened',
  POSITION_CLOSED = 'position_closed',
  STOP_LOSS_HIT = 'stop_loss_hit',
  TAKE_PROFIT_HIT = 'take_profit_hit',
  LIQUIDATION = 'liquidation',
}

/**
 * Тип сигнального уведомления
 */
export enum SignalNotificationType {
  IMPORTANT_NEWS = 'important_news',
  SOCIAL_ANOMALY = 'social_anomaly',
  WHALE_ALERT = 'whale_alert',
}

/**
 * Тип риск уведомления
 */
export enum RiskNotificationType {
  DAILY_LIMIT_APPROACHING = 'daily_limit_approaching',
  DRAWDOWN_REACHED = 'drawdown_reached',
  HIGH_VOLATILITY = 'high_volatility',
}

/**
 * Тип системного уведомления
 */
export enum SystemNotificationType {
  EXCHANGE_CONNECTION_ERROR = 'exchange_connection_error',
  SERVICE_FAILURE = 'service_failure',
  BOT_RESTART = 'bot_restart',
}

/**
 * Данные торгового уведомления
 */
export interface TradingNotificationData {
  symbol: string;
  side: 'long' | 'short';
  entryPrice?: number;
  exitPrice?: number;
  quantity?: number;
  pnl?: number;
  pnlPercent?: number;
  reason?: string;
}

/**
 * Данные сигнального уведомления
 */
export interface SignalNotificationData {
  source: string;
  title?: string;
  description?: string;
  sentiment?: number;
  urgency?: number;
  url?: string;
}

/**
 * Данные риск уведомления
 */
export interface RiskNotificationData {
  metric: string;
  currentValue: number;
  limitValue: number;
  percentage: number;
  symbol?: string;
}

/**
 * Данные системного уведомления
 */
export interface SystemNotificationData {
  service: string;
  error?: string;
  status?: string;
  uptime?: number;
}

/**
 * Уведомление
 */
export interface Notification {
  id: string;
  timestamp: Date;
  category: NotificationCategory;
  type: string;
  importance: NotificationImportance;
  title: string;
  message: string;
  data?:
    | TradingNotificationData
    | SignalNotificationData
    | RiskNotificationData
    | SystemNotificationData
    | Record<string, unknown>;
}

/**
 * Конфигурация Telegram бота
 */
export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  minImportance: NotificationImportance;
  commands?: boolean; // Включить интерактивные команды
}

/**
 * Конфигурация Email
 */
export interface EmailConfig {
  enabled: boolean;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  recipients: string[];
  minImportance: NotificationImportance;
}

/**
 * Конфигурация Discord
 */
export interface DiscordConfig {
  enabled: boolean;
  webhookUrl: string;
  minImportance: NotificationImportance;
  username?: string;
  avatarUrl?: string;
}

/**
 * Конфигурация Web Push
 */
export interface WebPushConfig {
  enabled: boolean;
  vapidPublicKey: string;
  vapidPrivateKey: string;
  minImportance: NotificationImportance;
}

/**
 * Конфигурация системы уведомлений
 */
export interface NotificationConfig {
  enabled: boolean;

  // Каналы
  telegram?: TelegramConfig;
  email?: EmailConfig;
  discord?: DiscordConfig;
  webPush?: WebPushConfig;
  webhook?: {
    enabled: boolean;
    url: string;
    minImportance: NotificationImportance;
  };

  // Фильтры
  categories?: NotificationCategory[]; // Какие категории отправлять
  minImportance?: NotificationImportance; // Минимальный уровень важности
}

/**
 * Статус бота для команды /status
 */
export interface BotStatus {
  isRunning: boolean;
  uptime: number;
  openPositions: number;
  todayPnL: number;
  totalPnL: number;
  activeStrategies: string[];
}

/**
 * Баланс для команды /balance
 */
export interface BalanceInfo {
  totalBalance: number;
  availableBalance: number;
  usedMargin: number;
  unrealizedPnL: number;
  currency: string;
}

/**
 * Информация о позиции для команды /positions
 */
export interface PositionInfo {
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

/**
 * PnL информация для команды /pnl
 */
export interface PnLInfo {
  period: 'today' | 'week' | 'month' | 'total';
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  winRate: number;
  totalTrades: number;
  profitableTrades: number;
}

/**
 * Обработчик команд бота
 */
export interface BotCommandHandler {
  getStatus(): Promise<BotStatus>;
  getBalance(): Promise<BalanceInfo>;
  getPositions(): Promise<PositionInfo[]>;
  getPnL(period: 'today' | 'week' | 'month' | 'total'): Promise<PnLInfo>;
  stopTrading(): Promise<boolean>;
  startTrading(): Promise<boolean>;
}
