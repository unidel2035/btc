/**
 * Типы и интерфейсы для системы уведомлений
 */

/**
 * Важность уведомления
 */
export enum NotificationImportance {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Категория уведомления
 */
export enum NotificationCategory {
  TRADING = 'trading',
  SIGNAL = 'signal',
  RISK = 'risk',
  SYSTEM = 'system',
}

/**
 * Тип уведомления
 */
export enum NotificationType {
  // Торговые
  POSITION_OPENED = 'position_opened',
  POSITION_CLOSED = 'position_closed',
  STOP_LOSS_TRIGGERED = 'stop_loss_triggered',
  TAKE_PROFIT_TRIGGERED = 'take_profit_triggered',
  LIQUIDATION = 'liquidation',

  // Сигналы
  NEWS_SIGNAL = 'news_signal',
  SOCIAL_ANOMALY = 'social_anomaly',
  WHALE_ALERT = 'whale_alert',

  // Риск
  DAILY_LIMIT_WARNING = 'daily_limit_warning',
  DRAWDOWN_WARNING = 'drawdown_warning',
  HIGH_VOLATILITY = 'high_volatility',

  // Система
  EXCHANGE_ERROR = 'exchange_error',
  SERVICE_FAILURE = 'service_failure',
  BOT_RESTART = 'bot_restart',
  SYSTEM_ERROR = 'system_error',
  SYSTEM_WARNING = 'system_warning',
  SYSTEM_INFO = 'system_info',
}

/**
 * Канал уведомлений
 */
export enum NotificationChannel {
  CONSOLE = 'console',
  TELEGRAM = 'telegram',
  EMAIL = 'email',
  PUSH = 'push',
  DISCORD = 'discord',
}

/**
 * Структура уведомления
 */
export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  importance: NotificationImportance;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: Date;
  symbol?: string;
}

/**
 * Конфигурация Telegram
 */
export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  minImportance: NotificationImportance;
  commands?: TelegramCommand[];
}

/**
 * Команда Telegram бота
 */
export interface TelegramCommand {
  command: string;
  description: string;
  handler: () => Promise<string>;
}

/**
 * Конфигурация Email
 */
export interface EmailConfig {
  enabled: boolean;
  smtp: SmtpConfig;
  recipients: string[];
  minImportance: NotificationImportance;
}

/**
 * Конфигурация SMTP
 */
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

/**
 * Конфигурация Push уведомлений
 */
export interface PushConfig {
  enabled: boolean;
  endpoint: string;
  publicKey: string;
  privateKey: string;
  minImportance: NotificationImportance;
}

/**
 * Конфигурация Discord
 */
export interface DiscordConfig {
  enabled: boolean;
  webhookUrl: string;
  username?: string;
  avatarUrl?: string;
  minImportance: NotificationImportance;
}

/**
 * Общая конфигурация уведомлений
 */
export interface NotificationConfig {
  enabled: boolean;
  console?: {
    enabled: boolean;
    minImportance: NotificationImportance;
  };
  telegram?: TelegramConfig;
  email?: EmailConfig;
  push?: PushConfig;
  discord?: DiscordConfig;
  filters?: NotificationFilter[];
}

/**
 * Фильтр уведомлений
 */
export interface NotificationFilter {
  type?: NotificationType | NotificationType[];
  category?: NotificationCategory | NotificationCategory[];
  importance?: NotificationImportance | NotificationImportance[];
  symbol?: string | string[];
  channels?: NotificationChannel[];
}

/**
 * Результат отправки уведомления
 */
export interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  error?: string;
  sentAt: Date;
}

/**
 * Статистика уведомлений
 */
export interface NotificationStats {
  total: number;
  byChannel: Record<NotificationChannel, number>;
  byImportance: Record<NotificationImportance, number>;
  byCategory: Record<NotificationCategory, number>;
  failed: number;
  lastSent?: Date;
}

/**
 * Данные позиции для уведомления
 */
export interface PositionData {
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice?: number;
  size: number;
  pnl?: number;
  pnlPercent?: number;
  stopLoss?: number;
  takeProfit?: number;
  duration?: number; // в миллисекундах
}

/**
 * Данные баланса для уведомления
 */
export interface BalanceData {
  total: number;
  available: number;
  locked: number;
  currency: string;
}

/**
 * Статус бота
 */
export interface BotStatus {
  running: boolean;
  uptime: number; // в миллисекундах
  openPositions: number;
  dailyPnL: number;
  totalPnL: number;
}
