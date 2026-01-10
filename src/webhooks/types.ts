/**
 * TradingView Webhook Types
 * Type definitions for webhook signals and configuration
 */

/**
 * Webhook signal action types
 */
export enum WebhookAction {
  // Entry signals
  BUY = 'buy',
  LONG = 'long',
  SELL = 'sell',
  SHORT = 'short',

  // Exit signals
  CLOSE_LONG = 'close_long',
  CLOSE_SHORT = 'close_short',
  CLOSE_ALL = 'close_all',

  // Modify signals
  UPDATE_SL = 'update_sl',
  UPDATE_TP = 'update_tp',
  TRAILING_STOP = 'trailing_stop',
}

/**
 * Raw webhook payload from TradingView
 */
export interface TradingViewWebhookPayload {
  // Authentication
  secret?: string;

  // Core fields
  ticker: string;
  action: string;
  price: number;

  // Strategy info
  strategy?: string;
  alert_name?: string;

  // Position management
  stop_loss?: number;
  take_profit?: number;
  position_size?: number;

  // Additional context
  signal_type?: string;
  confidence?: number;
  interval?: string;
  time?: string;
  exchange?: string;
  volume?: number;

  // Custom fields
  [key: string]: unknown;
}

/**
 * Parsed and validated webhook signal
 */
export interface WebhookSignal {
  // Source info
  source: 'tradingview';
  strategy: string;

  // Trading info
  ticker: string;
  action: WebhookAction;
  price: number;
  confidence: number;

  // Position management (optional)
  stop_loss: number | null;
  take_profit: number | null;
  position_size: number | null;

  // Metadata
  metadata: {
    interval?: string;
    volume?: number;
    alert_name?: string;
    exchange?: string;
    timestamp: string;
    signal_type?: string;
  };
}

/**
 * Webhook signal validation result
 */
export interface WebhookValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  // Authentication
  secretKey: string;
  enableIpWhitelist: boolean;
  allowedIps: string[];
  enableSignatureValidation: boolean;

  // Execution
  autoExecute: boolean;
  requireManualApproval: boolean;
  manualApprovalThresholds: {
    highRiskPositionUsd: number;
    unusualPriceDeviationPercent: number;
  };

  // Rate limiting
  maxSignalsPerMinute: number;
  cooldownBetweenSignalsSeconds: number;
  maxConcurrentWebhookPositions: number;

  // Risk management
  applyStandardRiskChecks: boolean;
  checkPortfolioLimits: boolean;
  validateAgainstExistingPositions: boolean;
  maxPositionSizePercent: number;

  // Notifications
  notifyOnSignalReceived: boolean;
  notifyOnSignalExecuted: boolean;
  notifyOnSignalRejected: boolean;

  // Supported tickers
  supportedTickers: string[];
}

/**
 * Webhook signal record (for database storage)
 */
export interface WebhookSignalRecord {
  id: string;
  signal: WebhookSignal;
  receivedAt: Date;
  status: 'received' | 'validated' | 'queued' | 'executed' | 'rejected';
  executedAt?: Date;
  rejectionReason?: string;
  tradeId?: string;
}

/**
 * Webhook statistics
 */
export interface WebhookStats {
  period: string;
  totalReceived: number;
  totalExecuted: number;
  totalRejected: number;
  executionRate: number;
  rejectionRate: number;
  byStrategy: Record<string, number>;
  byAction: Record<string, number>;
}

/**
 * Rate limit state
 */
export interface RateLimitState {
  key: string; // Identifier (e.g., IP or strategy name)
  count: number;
  resetAt: Date;
}

/**
 * Webhook request context
 */
export interface WebhookRequestContext {
  ip: string;
  timestamp: Date;
  payload: TradingViewWebhookPayload;
  headers: Record<string, string>;
}
