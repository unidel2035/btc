/**
 * Модуль риск-менеджмента (Risk Management)
 *
 * Система управления рисками для защиты капитала в торговом роботе.
 *
 * @module risk
 */

// Главный класс
export { RiskManager } from './RiskManager.js';

// Компоненты
export { PositionSizing } from './PositionSizing.js';
export { StopLossManager, TakeProfitManager } from './StopLoss.js';
export { RiskLimits } from './RiskLimits.js';
export { CorrelationAnalysis } from './CorrelationAnalysis.js';
export { RiskEventLogger } from './RiskEventLogger.js';
export { NotificationManager } from './NotificationManager.js';

// Smart Exit Management
export { SmartStopLoss } from './SmartStopLoss.js';
export { SmartTakeProfit } from './SmartTakeProfit.js';
export { SmartExitManager } from './SmartExitManager.js';
export type { SmartExitUpdateResult } from './SmartExitManager.js';
export { TechnicalIndicators } from './TechnicalIndicators.js';

// Типы
export type {
  RiskConfig,
  PositionSizingParams,
  PositionSizeResult,
  StopLossParams,
  TakeProfitParams,
  TakeProfitLevel,
  Position,
  LimitCheckResult,
  RiskStats,
  RiskEvent,
  CorrelationAnalysisOptions,
  CorrelationResult,
  OHLCVData,
  NotificationConfig,
  PositionUpdateParams,
  SmartExitConfig,
  SteppedTrailingStep,
} from './types.js';

export {
  PositionSizingMethod,
  StopLossType,
  TakeProfitType,
  PositionSide,
  PositionStatus,
  RiskEventType,
  NotificationChannel,
} from './types.js';
