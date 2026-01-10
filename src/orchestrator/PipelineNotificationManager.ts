/**
 * Pipeline Notification Manager
 *
 * Manages notifications for pipeline events
 */

import type { PipelineNotification } from './types.js';

/**
 * Notification configuration
 */
export interface NotificationConfig {
  enabled: boolean;
  channels: ('dashboard' | 'telegram' | 'email' | 'sms')[];
  priorities: {
    screening: 'low' | 'medium' | 'high';
    signal: 'low' | 'medium' | 'high';
    position: 'low' | 'medium' | 'high';
    error: 'low' | 'medium' | 'high';
  };
}

/**
 * Pipeline Notification Manager
 */
export class PipelineNotificationManager {
  private config: NotificationConfig;
  private notificationHistory: PipelineNotification[] = [];

  constructor(config: NotificationConfig) {
    this.config = config;
  }

  /**
   * Send notification through configured channels
   */
  sendNotification(notification: PipelineNotification): void {
    if (!this.config.enabled) {
      return;
    }

    // Store in history
    this.notificationHistory.push(notification);

    // Send to each channel
    for (const channel of this.config.channels) {
      try {
        this.sendToChannel(channel, notification);
      } catch (error) {
        console.error(`Failed to send notification to ${channel}:`, error);
      }
    }
  }

  /**
   * Send to specific channel
   */
  private sendToChannel(
    channel: 'dashboard' | 'telegram' | 'email' | 'sms',
    notification: PipelineNotification,
  ): void {
    switch (channel) {
      case 'dashboard':
        this.sendToDashboard(notification);
        break;
      case 'telegram':
        this.sendToTelegram(notification);
        break;
      case 'email':
        this.sendToEmail(notification);
        break;
      case 'sms':
        this.sendToSMS(notification);
        break;
    }
  }

  /**
   * Send to dashboard (console for now)
   */
  private sendToDashboard(notification: PipelineNotification): void {
    const icon = this.getIcon(notification.type);
    const timestamp = notification.timestamp.toISOString();
    console.info(`${icon} [${timestamp}] ${notification.title}`);
    console.info(`   ${notification.message}`);
  }

  /**
   * Send to Telegram
   */
  private sendToTelegram(notification: PipelineNotification): void {
    // TODO: Implement Telegram integration
    console.debug('[Telegram] Would send:', notification.title);
  }

  /**
   * Send to Email
   */
  private sendToEmail(notification: PipelineNotification): void {
    // TODO: Implement Email integration
    console.debug('[Email] Would send:', notification.title);
  }

  /**
   * Send to SMS
   */
  private sendToSMS(notification: PipelineNotification): void {
    // TODO: Implement SMS integration
    console.debug('[SMS] Would send:', notification.title);
  }

  /**
   * Get icon for notification type
   */
  private getIcon(type: PipelineNotification['type']): string {
    const icons: Record<PipelineNotification['type'], string> = {
      screening_complete: '🔍',
      signal_detected: '📈',
      position_opened: '✅',
      position_closed: '🔒',
      error: '❌',
      warning: '⚠️',
    };
    return icons[type] || '📢';
  }

  /**
   * Get notification history
   */
  getHistory(limit?: number): PipelineNotification[] {
    if (limit) {
      return this.notificationHistory.slice(-limit);
    }
    return [...this.notificationHistory];
  }

  /**
   * Clear notification history
   */
  clearHistory(): void {
    this.notificationHistory = [];
  }
}
