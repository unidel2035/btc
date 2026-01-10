/**
 * Telegram Bot Types and Interfaces
 */

import type { Context } from 'telegraf';
import type { PaperTradingEngine } from '../trading/paper/PaperTradingEngine.js';
import type { ScreeningModule } from '../analyzers/screening/ScreeningModule.js';
import type { NotificationManager } from '../notifications/NotificationManager.js';
import type { User } from '../services/integram/index.js';

/**
 * Extended context for Telegram bot with custom state
 */
export interface TelegramBotContext extends Context {
  session?: UserSession;
}

/**
 * User session data
 */
export interface UserSession {
  userId: number;
  username?: string;
  isAuthenticated: boolean;
  lastCommand?: string;
  lastCommandTime?: Date;
  awaitingPin?: boolean;
  pendingAction?: PendingAction;
  notificationSettings?: NotificationSettings;
  user?: User; // Full user data from Integram
  awaitingProfileInput?: {
    field: 'name' | 'email' | 'phone';
    action: string;
  };
}

/**
 * Pending action waiting for confirmation
 */
export interface PendingAction {
  type: 'close_position' | 'stop_trading' | 'start_trading' | 'close_all';
  data?: Record<string, unknown>;
  expiresAt: Date;
}

/**
 * Notification settings per user
 */
export interface NotificationSettings {
  tradeAlerts: {
    positionOpened: boolean;
    positionClosed: boolean;
    stopLossHit: boolean;
    takeProfitHit: boolean;
    trailingStopUpdated: boolean;
  };
  systemAlerts: {
    criticalErrors: boolean;
    dailyDrawdownLimit: boolean;
    positionLossThreshold: number; // percentage
    apiRateLimits: boolean;
  };
  reports: {
    dailySummary: boolean;
    dailySummaryTime: string; // HH:MM UTC
    weeklySummary: boolean;
    monthlySummary: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM UTC
    endTime: string; // HH:MM UTC
  };
}

/**
 * Telegram bot configuration
 */
export interface TelegramBotConfig {
  token: string;
  whitelist: number[]; // Array of allowed Telegram user IDs
  pinCode?: string; // PIN for critical operations
  rateLimit: {
    maxCommands: number; // Max commands per window
    windowMs: number; // Time window in milliseconds
  };
  features: {
    trading: boolean; // Enable trading control commands
    positions: boolean; // Enable position management
    screening: boolean; // Enable screening results
    notifications: boolean; // Enable notifications
  };
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
}

/**
 * Command handler function
 */
export type CommandHandler = (ctx: TelegramBotContext, bot: TelegramBotService) => Promise<void>;

/**
 * Telegram bot service dependencies
 */
export interface TelegramBotService {
  tradingEngine?: PaperTradingEngine;
  screeningModule?: ScreeningModule;
  notificationManager?: NotificationManager;
  config: TelegramBotConfig;
}

/**
 * Trading statistics for display
 */
export interface TradingStats {
  running: boolean;
  uptime: number; // milliseconds
  openPositions: number;
  dailyPnL: number;
  weeklyPnL: number;
  monthlyPnL: number;
  totalPnL: number;
  winRate: number;
  totalTrades: number;
}

/**
 * Position summary for display
 */
export interface PositionSummary {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  value: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  stopLoss?: number;
  takeProfit?: number;
  duration: string; // formatted duration
  openedAt: Date;
}

/**
 * Balance summary for display
 */
export interface BalanceSummary {
  total: number;
  available: number;
  inPositions: number;
  currency: string;
  dailyPnL: number;
  dailyPnLPercent: number;
  weeklyPnL: number;
  weeklyPnLPercent: number;
  assets: AssetBalance[];
}

/**
 * Asset balance
 */
export interface AssetBalance {
  asset: string;
  amount: number;
  value: number; // in base currency
  percentage: number;
}

/**
 * Signal summary for display
 */
export interface SignalSummary {
  symbol: string;
  direction: 'long' | 'short';
  confidence: number;
  score: number;
  sources: string[];
  timestamp: Date;
  reasons: string[];
}

/**
 * Screening result summary
 */
export interface ScreeningSummary {
  timestamp: Date;
  totalAnalyzed: number;
  qualified: number;
  topPicks: Array<{
    symbol: string;
    score: number;
    sector: string;
    rank: number;
  }>;
  sectors: Array<{
    sector: string;
    score: number;
    projects: number;
  }>;
}

/**
 * Rate limit entry
 */
export interface RateLimitEntry {
  userId: number;
  commands: number;
  windowStart: Date;
}

/**
 * Command metadata
 */
export interface CommandMetadata {
  command: string;
  description: string;
  category: 'trading' | 'info' | 'settings' | 'system';
  requiresAuth: boolean;
  requiresPin: boolean;
  rateLimit?: number; // Custom rate limit for this command
}
