/**
 * Trading Pipeline Types
 *
 * Types for automated trading pipeline orchestration
 */

import type { ScreeningReport, ProjectRecommendation, RiskLevel } from '../analyzers/screening/types.js';
import type { Signal, TradeDecision, MarketData } from '../trading/strategies/types.js';

/**
 * Pipeline execution mode
 */
export enum PipelineMode {
  /** Only notify about signals, no actual trading */
  NOTIFY_ONLY = 'notify_only',
  /** Manual approval required before trading */
  MANUAL_APPROVAL = 'manual_approval',
  /** Fully automated trading */
  AUTO_TRADE = 'auto_trade',
  /** Dry run mode - simulate without actual trading */
  DRY_RUN = 'dry_run',
}

/**
 * Pipeline stage
 */
export enum PipelineStage {
  SCREENING = 'screening',
  TECHNICAL_ANALYSIS = 'technical_analysis',
  SIGNAL_GENERATION = 'signal_generation',
  RISK_EVALUATION = 'risk_evaluation',
  EXECUTION = 'execution',
}

/**
 * Pipeline status
 */
export enum PipelineStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  STOPPED = 'stopped',
}

/**
 * Options for pipeline execution
 */
export interface PipelineExecutionOptions {
  /** Whether to run screening stage */
  runScreening?: boolean;
  /** Whether to enable auto-trading */
  autoTrade?: boolean;
  /** Notify only mode */
  notifyOnly?: boolean;
  /** Dry run mode */
  dryRun?: boolean;
  /** Specific pairs to analyze (skip screening) */
  specificPairs?: string[];
}

/**
 * Technical analysis result for a single pair
 */
export interface TechnicalAnalysisResult {
  pair: string;
  timestamp: Date;
  indicators: {
    rsi?: number;
    macd?: {
      value: number;
      signal: number;
      histogram: number;
    };
    bollingerBands?: {
      upper: number;
      middle: number;
      lower: number;
    };
    ema?: {
      ema20?: number;
      ema50?: number;
      ema200?: number;
    };
    priceChannel?: {
      high: number;
      low: number;
      width: number;
    };
  };
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-1
  support: number[];
  resistance: number[];
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
}

/**
 * Combined analysis for a trading pair
 */
export interface PairAnalysis {
  pair: string;
  fundamentalScore: number;
  fundamentalRisk: RiskLevel;
  technicalAnalysis: TechnicalAnalysisResult;
  signals: Signal[];
  tradeDecision: TradeDecision | null;
  timestamp: Date;
}

/**
 * Pipeline execution report
 */
export interface PipelineReport {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
  status: PipelineStatus;
  stage: PipelineStage;
  mode: PipelineMode;

  // Screening results
  screeningReport?: ScreeningReport;

  // Analysis results
  pairAnalyses: PairAnalysis[];

  // Generated signals
  totalSignals: number;
  tradableSignals: number;

  // Execution results
  positionsOpened: number;
  positionsRejected: number;
  rejectionReasons: string[];

  // Notifications sent
  notificationsSent: number;

  // Errors
  errors: PipelineError[];
}

/**
 * Pipeline error
 */
export interface PipelineError {
  stage: PipelineStage;
  timestamp: Date;
  message: string;
  error?: Error;
  context?: Record<string, unknown>;
}

/**
 * Analysis report (without trading)
 */
export interface AnalysisReport {
  timestamp: Date;
  pairs: string[];
  analyses: PairAnalysis[];
  marketConditions: {
    overallTrend: 'bullish' | 'bearish' | 'neutral';
    volatility: 'low' | 'medium' | 'high';
    tradingOpportunities: number;
  };
  recommendations: {
    pair: string;
    action: 'buy' | 'sell' | 'hold';
    confidence: number;
    reason: string;
  }[];
}

/**
 * Portfolio rotation plan
 */
export interface RotationPlan {
  timestamp: Date;
  currentPairs: string[];
  newPairs: string[];

  toKeep: string[]; // Pairs in both current and new
  toClose: string[]; // Pairs in current but not in new
  toOpen: string[]; // Pairs in new but not in current

  closeActions: {
    pair: string;
    reason: string;
    urgency: 'immediate' | 'gradual';
    currentPnL?: number;
  }[];

  openActions: {
    pair: string;
    priority: number;
    delayHours: number; // Gradual opening
  }[];
}

/**
 * Risk evaluation result
 */
export interface RiskEvaluationResult {
  approved: boolean;
  reason?: string;
  adjustments?: {
    positionSize?: number;
    stopLoss?: number;
    takeProfit?: number;
  };
  warnings: string[];
}

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  // Screening configuration
  screening: {
    enabled: boolean;
    frequency: 'weekly' | 'biweekly' | 'monthly';
    maxPairs: number; // 2-4 recommended
  };

  // Technical analysis configuration
  technicalAnalysis: {
    enabled: boolean;
    frequency: 'hourly' | '4hours' | 'daily';
    indicators: string[];
    timeframe: '1h' | '4h' | '1d';
    lookback: number; // Number of periods
  };

  // Signal generation configuration
  signalGeneration: {
    enabled: boolean;
    frequency: 'hourly' | '30min' | '15min';
    minConfidence: number; // 0-1
  };

  // Risk management configuration
  riskManagement: {
    enabled: boolean;
    maxPositions: number;
    maxExposure: number; // % of portfolio
    requireApproval: boolean;
  };

  // Execution configuration
  execution: {
    mode: PipelineMode;
    dailyTradeLimit: number;
    circuitBreaker: {
      enabled: boolean;
      maxDailyLoss: number; // %
    };
  };

  // Notification configuration
  notifications: {
    enabled: boolean;
    channels: ('dashboard' | 'telegram' | 'email' | 'sms')[];
    priorities: {
      screening: 'low' | 'medium' | 'high';
      signal: 'low' | 'medium' | 'high';
      position: 'low' | 'medium' | 'high';
      error: 'low' | 'medium' | 'high';
    };
  };
}

/**
 * Pipeline state (for persistence)
 */
export interface PipelineState {
  status: PipelineStatus;
  currentStage?: PipelineStage;
  lastScreening?: Date;
  activePairs: string[];
  lastExecutionId?: string;
  emergencyStop: boolean;
  tradesExecutedToday: number;
  dailyPnL: number;
}

/**
 * Notification event
 */
export interface PipelineNotification {
  type: 'screening_complete' | 'signal_detected' | 'position_opened' | 'position_closed' | 'error' | 'warning';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  data?: Record<string, unknown>;
}
