/**
 * WebhookService
 * Core service for processing TradingView webhook signals
 */

import { randomUUID } from 'crypto';
import type {
  TradingViewWebhookPayload,
  WebhookSignal,
  WebhookAction,
  WebhookValidationResult,
  WebhookSignalRecord,
  WebhookConfig,
} from './types.js';
import { WebhookAction as WebhookActionEnum } from './types.js';
import type { Signal, MarketData } from '../trading/strategies/types.js';
import { SignalType as SignalTypeEnum, SignalSentiment } from '../trading/strategies/types.js';

/**
 * WebhookService handles the processing of incoming webhook signals
 */
export class WebhookService {
  private config: WebhookConfig;
  private signalHistory: Map<string, WebhookSignalRecord> = new Map();
  private recentSignals: Array<{ ticker: string; action: string; timestamp: Date }> = [];

  constructor(config: WebhookConfig) {
    this.config = config;
  }

  /**
   * Process incoming webhook payload
   */
  async processWebhook(payload: TradingViewWebhookPayload): Promise<WebhookSignalRecord> {
    // 1. Parse the webhook payload
    const signal = this.parseSignal(payload);

    // 2. Create signal record
    const record: WebhookSignalRecord = {
      id: randomUUID(),
      signal,
      receivedAt: new Date(),
      status: 'received',
    };

    // 3. Store in history
    this.signalHistory.set(record.id, record);

    // 4. Add to recent signals for duplicate detection
    this.recentSignals.push({
      ticker: signal.ticker,
      action: signal.action,
      timestamp: new Date(),
    });

    // Clean old recent signals (keep last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.recentSignals = this.recentSignals.filter((s) => s.timestamp > oneHourAgo);

    return record;
  }

  /**
   * Parse and normalize webhook payload into WebhookSignal
   */
  private parseSignal(payload: TradingViewWebhookPayload): WebhookSignal {
    return {
      source: 'tradingview',
      strategy: payload.strategy || payload.alert_name || 'Unknown Strategy',
      ticker: this.normalizeTicker(payload.ticker),
      action: this.normalizeAction(payload.action),
      price: parseFloat(String(payload.price)),
      confidence: payload.confidence ? parseFloat(String(payload.confidence)) : 0.7,
      stop_loss: payload.stop_loss ? parseFloat(String(payload.stop_loss)) : null,
      take_profit: payload.take_profit ? parseFloat(String(payload.take_profit)) : null,
      position_size: payload.position_size ? parseFloat(String(payload.position_size)) : null,
      metadata: {
        interval: payload.interval,
        volume: payload.volume ? parseFloat(String(payload.volume)) : undefined,
        alert_name: payload.alert_name,
        exchange: payload.exchange,
        timestamp: payload.time || new Date().toISOString(),
        signal_type: payload.signal_type,
      },
    };
  }

  /**
   * Normalize ticker symbol
   * Examples:
   * - BINANCE:BTCUSDT -> BTCUSDT
   * - BTC/USDT -> BTCUSDT
   * - btcusdt -> BTCUSDT
   */
  private normalizeTicker(ticker: string): string {
    return ticker
      .replace(/^[A-Z]+:/, '') // Remove exchange prefix
      .replace('/', '') // Remove slash
      .toUpperCase(); // Uppercase
  }

  /**
   * Normalize action string to WebhookAction enum
   */
  private normalizeAction(action: string): WebhookAction {
    const normalized = action.toLowerCase().trim();

    switch (normalized) {
      case 'buy':
      case 'long':
        return WebhookActionEnum.BUY;

      case 'sell':
      case 'short':
        return WebhookActionEnum.SELL;

      case 'close_long':
      case 'closelong':
        return WebhookActionEnum.CLOSE_LONG;

      case 'close_short':
      case 'closeshort':
        return WebhookActionEnum.CLOSE_SHORT;

      case 'close_all':
      case 'closeall':
      case 'close':
        return WebhookActionEnum.CLOSE_ALL;

      case 'update_sl':
      case 'updatesl':
        return WebhookActionEnum.UPDATE_SL;

      case 'update_tp':
      case 'updatetp':
        return WebhookActionEnum.UPDATE_TP;

      case 'trailing_stop':
      case 'trailingstop':
        return WebhookActionEnum.TRAILING_STOP;

      default:
        // Default to BUY if action is unknown
        return WebhookActionEnum.BUY;
    }
  }

  /**
   * Validate webhook signal
   */
  async validateSignal(
    signal: WebhookSignal,
    currentPrice?: number,
  ): Promise<WebhookValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Check required fields
    if (!signal.ticker) {
      errors.push('Ticker is required');
    }

    if (!signal.action) {
      errors.push('Action is required');
    }

    if (!signal.price || signal.price <= 0) {
      errors.push('Valid price is required');
    }

    // 2. Check if ticker is supported
    if (
      this.config.supportedTickers.length > 0 &&
      !this.config.supportedTickers.includes(signal.ticker)
    ) {
      errors.push(`Ticker ${signal.ticker} is not supported`);
    }

    // 3. Check for duplicate signals (same ticker + action within cooldown period)
    if (this.checkDuplicateSignal(signal)) {
      errors.push(
        `Duplicate signal detected. Cooldown period: ${this.config.cooldownBetweenSignalsSeconds}s`,
      );
    }

    // 4. Validate price deviation (if current price provided)
    if (currentPrice && currentPrice > 0) {
      const priceDiff = Math.abs(signal.price - currentPrice) / currentPrice;
      const maxDeviation = this.config.manualApprovalThresholds.unusualPriceDeviationPercent / 100;

      if (priceDiff > maxDeviation) {
        warnings.push(
          `Price deviation ${(priceDiff * 100).toFixed(2)}% exceeds threshold ${(maxDeviation * 100).toFixed(2)}%`,
        );
      }

      // If deviation is extremely high (>5%), mark as error
      if (priceDiff > 0.05) {
        errors.push(
          `Price deviation too high: ${(priceDiff * 100).toFixed(2)}% (signal: ${signal.price}, current: ${currentPrice})`,
        );
      }
    }

    // 5. Validate stop loss and take profit
    if (signal.stop_loss !== null) {
      if (
        signal.action === WebhookActionEnum.BUY ||
        signal.action === WebhookActionEnum.LONG
      ) {
        if (signal.stop_loss >= signal.price) {
          errors.push('Stop loss must be below entry price for long positions');
        }
      } else if (
        signal.action === WebhookActionEnum.SELL ||
        signal.action === WebhookActionEnum.SHORT
      ) {
        if (signal.stop_loss <= signal.price) {
          errors.push('Stop loss must be above entry price for short positions');
        }
      }
    }

    if (signal.take_profit !== null) {
      if (
        signal.action === WebhookActionEnum.BUY ||
        signal.action === WebhookActionEnum.LONG
      ) {
        if (signal.take_profit <= signal.price) {
          errors.push('Take profit must be above entry price for long positions');
        }
      } else if (
        signal.action === WebhookActionEnum.SELL ||
        signal.action === WebhookActionEnum.SHORT
      ) {
        if (signal.take_profit >= signal.price) {
          errors.push('Take profit must be below entry price for short positions');
        }
      }
    }

    // 6. Validate position size
    if (signal.position_size !== null) {
      if (signal.position_size <= 0) {
        errors.push('Position size must be greater than 0');
      }

      if (signal.position_size > this.config.maxPositionSizePercent) {
        errors.push(
          `Position size ${signal.position_size}% exceeds maximum ${this.config.maxPositionSizePercent}%`,
        );
      }
    }

    // 7. Validate confidence
    if (signal.confidence < 0 || signal.confidence > 1) {
      warnings.push('Confidence should be between 0 and 1');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check for duplicate signals within cooldown period
   */
  private checkDuplicateSignal(signal: WebhookSignal): boolean {
    const cooldownMs = this.config.cooldownBetweenSignalsSeconds * 1000;
    const cutoffTime = new Date(Date.now() - cooldownMs);

    return this.recentSignals.some(
      (recent) =>
        recent.ticker === signal.ticker &&
        recent.action === signal.action &&
        recent.timestamp > cutoffTime,
    );
  }

  /**
   * Convert WebhookSignal to trading Signal format
   */
  convertToTradingSignal(webhookSignal: WebhookSignal): Signal {
    // Determine sentiment based on action
    let sentiment = SignalSentiment.NEUTRAL;
    if (
      webhookSignal.action === WebhookActionEnum.BUY ||
      webhookSignal.action === WebhookActionEnum.LONG
    ) {
      sentiment = SignalSentiment.BULLISH;
    } else if (
      webhookSignal.action === WebhookActionEnum.SELL ||
      webhookSignal.action === WebhookActionEnum.SHORT
    ) {
      sentiment = SignalSentiment.BEARISH;
    }

    return {
      id: randomUUID(),
      type: SignalTypeEnum.TECHNICAL, // Webhooks are considered technical signals
      sentiment,
      impact: webhookSignal.confidence,
      source: `${webhookSignal.source}:${webhookSignal.strategy}`,
      timestamp: new Date(webhookSignal.metadata.timestamp),
      data: {
        ticker: webhookSignal.ticker,
        action: webhookSignal.action,
        price: webhookSignal.price,
        stop_loss: webhookSignal.stop_loss,
        take_profit: webhookSignal.take_profit,
        position_size: webhookSignal.position_size,
        ...webhookSignal.metadata,
      },
    };
  }

  /**
   * Convert WebhookSignal to MarketData format
   */
  convertToMarketData(webhookSignal: WebhookSignal): MarketData {
    return {
      symbol: webhookSignal.ticker,
      price: webhookSignal.price,
      volume: webhookSignal.metadata.volume || 0,
      timestamp: new Date(webhookSignal.metadata.timestamp),
    };
  }

  /**
   * Calculate position size if not provided
   */
  calculatePositionSize(signal: WebhookSignal, _accountBalance: number): number {
    if (signal.position_size !== null) {
      return signal.position_size;
    }

    // Default position sizing based on confidence and risk
    // Higher confidence = larger position (but capped)
    const baseSize = 2; // 2% base position
    const confidenceMultiplier = signal.confidence;
    const calculatedSize = baseSize * confidenceMultiplier;

    // Cap at configured maximum
    return Math.min(calculatedSize, this.config.maxPositionSizePercent);
  }

  /**
   * Calculate stop loss if not provided
   */
  calculateStopLoss(signal: WebhookSignal): number | undefined {
    if (signal.stop_loss !== null) {
      return signal.stop_loss;
    }

    // Default stop loss: 2% from entry
    const stopLossPercent = 0.02;

    if (
      signal.action === WebhookActionEnum.BUY ||
      signal.action === WebhookActionEnum.LONG
    ) {
      return signal.price * (1 - stopLossPercent);
    } else if (
      signal.action === WebhookActionEnum.SELL ||
      signal.action === WebhookActionEnum.SHORT
    ) {
      return signal.price * (1 + stopLossPercent);
    }

    return undefined;
  }

  /**
   * Calculate take profit if not provided
   */
  calculateTakeProfit(signal: WebhookSignal): number | undefined {
    if (signal.take_profit !== null) {
      return signal.take_profit;
    }

    // Default take profit: 3x risk (6% from entry)
    const takeProfitPercent = 0.06;

    if (
      signal.action === WebhookActionEnum.BUY ||
      signal.action === WebhookActionEnum.LONG
    ) {
      return signal.price * (1 + takeProfitPercent);
    } else if (
      signal.action === WebhookActionEnum.SELL ||
      signal.action === WebhookActionEnum.SHORT
    ) {
      return signal.price * (1 - takeProfitPercent);
    }

    return undefined;
  }

  /**
   * Get signal by ID
   */
  getSignal(id: string): WebhookSignalRecord | undefined {
    return this.signalHistory.get(id);
  }

  /**
   * Get recent signals
   */
  getRecentSignals(limit: number = 50): WebhookSignalRecord[] {
    const signals = Array.from(this.signalHistory.values());
    return signals.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime()).slice(0, limit);
  }

  /**
   * Update signal status
   */
  updateSignalStatus(
    id: string,
    status: WebhookSignalRecord['status'],
    additionalData?: Partial<WebhookSignalRecord>,
  ): boolean {
    const record = this.signalHistory.get(id);
    if (!record) {
      return false;
    }

    record.status = status;
    if (additionalData) {
      Object.assign(record, additionalData);
    }

    this.signalHistory.set(id, record);
    return true;
  }

  /**
   * Get webhook configuration
   */
  getConfig(): WebhookConfig {
    return { ...this.config };
  }

  /**
   * Update webhook configuration
   */
  updateConfig(updates: Partial<WebhookConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Generate new secret key
   */
  generateSecretKey(): string {
    return randomUUID() + '-' + randomUUID();
  }

  /**
   * Clear signal history (for cleanup)
   */
  clearHistory(olderThan?: Date): void {
    if (olderThan) {
      for (const [id, record] of this.signalHistory.entries()) {
        if (record.receivedAt < olderThan) {
          this.signalHistory.delete(id);
        }
      }
    } else {
      this.signalHistory.clear();
    }
  }
}
