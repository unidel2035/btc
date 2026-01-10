/**
 * Alert Manager
 * Manages health monitoring alerts and notifications
 */

import { Alert, AlertLevel, AlertRule, ComponentType } from './types.js';
import { NotificationManager } from '../notifications/NotificationManager.js';
import { NotificationType, NotificationImportance } from '../notifications/types.js';

export interface AlertManagerConfig {
  enabled: boolean;
  notificationManager?: NotificationManager;
  rules: AlertRule[];
  maxAlertHistory: number;
}

export class AlertManager {
  private readonly config: AlertManagerConfig;
  private readonly notificationManager?: NotificationManager;
  private readonly rules: Map<string, AlertRule>;
  private readonly alertHistory: Alert[] = [];
  private readonly alertCooldowns: Map<string, Date> = new Map();

  constructor(config: AlertManagerConfig) {
    this.config = config;
    this.notificationManager = config.notificationManager;
    this.rules = new Map(config.rules.map((rule) => [rule.id, rule]));
  }

  /**
   * Trigger an alert
   */
  async triggerAlert(
    level: AlertLevel,
    component: string,
    componentType: ComponentType,
    message: string,
    metadata?: Record<string, unknown>,
    actions?: string[],
  ): Promise<Alert> {
    const alert: Alert = {
      id: this.generateAlertId(),
      level,
      component,
      componentType,
      message,
      timestamp: new Date(),
      metadata,
      actions,
      resolved: false,
    };

    // Add to history
    this.addToHistory(alert);

    // Check if we should send notification (cooldown check)
    if (this.shouldNotify(alert)) {
      await this.sendNotification(alert);
      this.recordNotificationSent(alert);
    }

    console.log(`${this.getAlertEmoji(level)} [${componentType}/${component}] ${message}`);

    return alert;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alertHistory.find((a) => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      console.log(`✅ Alert resolved: ${alert.message}`);
    }
  }

  /**
   * Check if alert matches a rule
   */
  private matchesRule(alert: Alert, rule: AlertRule): boolean {
    if (!rule.enabled) {
      return false;
    }

    // Simple condition matching
    // In a real implementation, this would be more sophisticated
    return rule.level === alert.level;
  }

  /**
   * Check if should send notification (considering cooldown)
   */
  private shouldNotify(alert: Alert): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // Check for matching rule
    const matchingRule = Array.from(this.rules.values()).find((rule) =>
      this.matchesRule(alert, rule),
    );

    if (!matchingRule) {
      // No cooldown for alerts without rules
      return true;
    }

    // Check cooldown
    const cooldownKey = this.getCooldownKey(alert);
    const lastNotified = this.alertCooldowns.get(cooldownKey);

    if (!lastNotified) {
      return true;
    }

    const timeSinceLastNotification = Date.now() - lastNotified.getTime();
    const cooldownMs = matchingRule.cooldown * 1000;

    return timeSinceLastNotification >= cooldownMs;
  }

  /**
   * Send notification for alert
   */
  private async sendNotification(alert: Alert): Promise<void> {
    if (!this.notificationManager) {
      return;
    }

    const notificationType = this.mapAlertToNotificationType(alert);
    const notificationImportance = this.mapAlertLevelToImportance(alert.level);

    await this.notificationManager.notifySystem(
      notificationType,
      `Health Alert: ${alert.component}`,
      alert.message,
      notificationImportance,
      {
        componentType: alert.componentType,
        alertLevel: alert.level,
        ...alert.metadata,
      },
    );
  }

  /**
   * Map alert to notification type
   */
  private mapAlertToNotificationType(alert: Alert): NotificationType {
    switch (alert.level) {
      case AlertLevel.CRITICAL:
        return NotificationType.SYSTEM_ERROR;
      case AlertLevel.WARNING:
        return NotificationType.SYSTEM_WARNING;
      case AlertLevel.INFO:
      default:
        return NotificationType.SYSTEM_INFO;
    }
  }

  /**
   * Map alert level to notification importance
   */
  private mapAlertLevelToImportance(level: AlertLevel): NotificationImportance {
    switch (level) {
      case AlertLevel.CRITICAL:
        return NotificationImportance.CRITICAL;
      case AlertLevel.WARNING:
        return NotificationImportance.HIGH;
      case AlertLevel.INFO:
      default:
        return NotificationImportance.MEDIUM;
    }
  }

  /**
   * Record that notification was sent
   */
  private recordNotificationSent(alert: Alert): void {
    const cooldownKey = this.getCooldownKey(alert);
    this.alertCooldowns.set(cooldownKey, new Date());
  }

  /**
   * Get cooldown key for alert
   */
  private getCooldownKey(alert: Alert): string {
    return `${alert.componentType}-${alert.component}-${alert.level}`;
  }

  /**
   * Add alert to history
   */
  private addToHistory(alert: Alert): void {
    this.alertHistory.unshift(alert);

    // Limit history size
    if (this.alertHistory.length > this.config.maxAlertHistory) {
      this.alertHistory.splice(this.config.maxAlertHistory);
    }
  }

  /**
   * Get alert emoji based on level
   */
  private getAlertEmoji(level: AlertLevel): string {
    switch (level) {
      case AlertLevel.CRITICAL:
        return '🚨';
      case AlertLevel.WARNING:
        return '⚠️';
      case AlertLevel.INFO:
        return 'ℹ️';
    }
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit?: number): Alert[] {
    if (limit) {
      return this.alertHistory.slice(0, limit);
    }
    return [...this.alertHistory];
  }

  /**
   * Get unresolved alerts
   */
  getUnresolvedAlerts(): Alert[] {
    return this.alertHistory.filter((alert) => !alert.resolved);
  }

  /**
   * Get alerts by component
   */
  getAlertsByComponent(componentType: ComponentType, component?: string): Alert[] {
    return this.alertHistory.filter(
      (alert) =>
        alert.componentType === componentType && (!component || alert.component === component),
    );
  }

  /**
   * Get alerts by level
   */
  getAlertsByLevel(level: AlertLevel): Alert[] {
    return this.alertHistory.filter((alert) => alert.level === level);
  }

  /**
   * Clear alert history
   */
  clearHistory(): void {
    this.alertHistory.length = 0;
    this.alertCooldowns.clear();
    console.log('🗑️  Alert history cleared');
  }

  /**
   * Add alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    console.log(`✅ Alert rule added: ${rule.id}`);
  }

  /**
   * Remove alert rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    console.log(`🗑️  Alert rule removed: ${ruleId}`);
  }

  /**
   * Update alert rule
   */
  updateRule(ruleId: string, updates: Partial<AlertRule>): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
      console.log(`✅ Alert rule updated: ${ruleId}`);
    }
  }

  /**
   * Get all rules
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalAlerts: number;
    unresolvedAlerts: number;
    criticalAlerts: number;
    warningAlerts: number;
    infoAlerts: number;
    alertsByComponent: Record<string, number>;
  } {
    const stats = {
      totalAlerts: this.alertHistory.length,
      unresolvedAlerts: this.getUnresolvedAlerts().length,
      criticalAlerts: this.getAlertsByLevel(AlertLevel.CRITICAL).length,
      warningAlerts: this.getAlertsByLevel(AlertLevel.WARNING).length,
      infoAlerts: this.getAlertsByLevel(AlertLevel.INFO).length,
      alertsByComponent: {} as Record<string, number>,
    };

    // Count alerts by component
    for (const alert of this.alertHistory) {
      const key = `${alert.componentType}/${alert.component}`;
      stats.alertsByComponent[key] = (stats.alertsByComponent[key] || 0) + 1;
    }

    return stats;
  }
}
