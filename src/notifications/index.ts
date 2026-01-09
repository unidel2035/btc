/**
 * Система уведомлений
 *
 * Модуль для отправки уведомлений о торговых событиях, сигналах,
 * рисках и системных событиях через различные каналы:
 * - Telegram (с поддержкой команд)
 * - Email (SMTP или API)
 * - Discord (webhook)
 * - Push уведомления (Web Push API)
 * - Console (логирование)
 */

// Основной менеджер
export { NotificationManager } from './NotificationManager.js';

// Каналы
export { ConsoleChannel } from './channels/ConsoleChannel.js';
export { TelegramChannel } from './channels/TelegramChannel.js';
export { EmailChannel } from './channels/EmailChannel.js';
export { DiscordChannel } from './channels/DiscordChannel.js';
export { PushChannel } from './channels/PushChannel.js';
export { BaseNotificationChannel } from './channels/BaseChannel.js';
export type { INotificationChannel } from './channels/BaseChannel.js';

// Типы
export type {
  Notification,
  NotificationConfig,
  NotificationFilter,
  NotificationResult,
  NotificationStats,
  TelegramConfig,
  EmailConfig,
  SmtpConfig,
  PushConfig,
  DiscordConfig,
  PositionData,
  BalanceData,
  BotStatus,
} from './types.js';

export {
  NotificationImportance,
  NotificationCategory,
  NotificationType,
  NotificationChannel,
} from './types.js';
