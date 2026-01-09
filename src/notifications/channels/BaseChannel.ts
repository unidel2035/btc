import { NotificationImportance } from '../types.js';
import type { Notification } from '../types.js';

/**
 * Базовый интерфейс для каналов уведомлений
 */
export interface INotificationChannel {
  /**
   * Название канала
   */
  readonly name: string;

  /**
   * Проверка, включен ли канал
   */
  isEnabled(): boolean;

  /**
   * Отправка уведомления
   */
  send(notification: Notification): Promise<void>;

  /**
   * Проверка, должно ли уведомление быть отправлено в этот канал
   */
  shouldSend(notification: Notification): boolean;
}

/**
 * Абстрактный базовый класс для каналов уведомлений
 */
export abstract class BaseNotificationChannel implements INotificationChannel {
  protected enabled: boolean;
  protected minImportance: NotificationImportance;

  constructor(
    enabled: boolean = true,
    minImportance: NotificationImportance = NotificationImportance.LOW,
  ) {
    this.enabled = enabled;
    this.minImportance = minImportance;
  }

  abstract get name(): string;

  isEnabled(): boolean {
    return this.enabled;
  }

  abstract send(notification: Notification): Promise<void>;

  shouldSend(notification: Notification): boolean {
    if (!this.isEnabled()) {
      return false;
    }

    return this.meetsImportanceLevel(notification.importance);
  }

  /**
   * Проверка уровня важности
   */
  protected meetsImportanceLevel(importance: NotificationImportance): boolean {
    const levels = [
      NotificationImportance.LOW,
      NotificationImportance.MEDIUM,
      NotificationImportance.HIGH,
      NotificationImportance.CRITICAL,
    ];

    const minIndex = levels.indexOf(this.minImportance);
    const currentIndex = levels.indexOf(importance);

    return currentIndex >= minIndex;
  }

  /**
   * Форматирование даты
   */
  protected formatDate(date: Date): string {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  }

  /**
   * Форматирование числа с разделителями
   */
  protected formatNumber(num: number, decimals: number = 2): string {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  /**
   * Получение emoji для типа уведомления
   */
  protected getEmoji(importance: NotificationImportance): string {
    switch (importance) {
      case NotificationImportance.LOW:
        return 'ℹ️';
      case NotificationImportance.MEDIUM:
        return '📢';
      case NotificationImportance.HIGH:
        return '⚠️';
      case NotificationImportance.CRITICAL:
        return '🚨';
      default:
        return '🔔';
    }
  }
}
