/**
 * Направление торговли
 */
export enum TradeDirection {
  LONG = 'long',
  SHORT = 'short',
}

/**
 * Тип сигнала
 */
export enum SignalType {
  NEWS = 'news',
  SENTIMENT = 'sentiment',
  TECHNICAL = 'technical',
  SOCIAL = 'social',
  EVENT = 'event',
}

/**
 * Тональность сигнала
 */
export enum SignalSentiment {
  BULLISH = 'bullish',
  BEARISH = 'bearish',
  NEUTRAL = 'neutral',
}

/**
 * Сигнал для торговли
 */
export interface Signal {
  id: string;
  type: SignalType;
  sentiment: SignalSentiment;
  impact: number; // 0-1, значимость сигнала
  source: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

/**
 * Рыночные данные
 */
export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: Date;
  ohlc?: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
  volatility?: number;
}

/**
 * Торговое решение
 */
export interface TradeDecision {
  direction: TradeDirection;
  confidence: number; // 0-1
  entryPrice: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  positionSize: number; // % от капитала
  timeframe?: number; // время удержания в секундах
  reason: string;
  signals: Signal[];
}

/**
 * Параметры стратегии
 */
export interface StrategyParams {
  enabled: boolean;
  minImpact?: number; // минимальная значимость сигнала
  minConfidence?: number; // минимальная уверенность для входа
  maxPositionSize?: number; // максимальный размер позиции (%)
  stopLossPercent?: number; // стоп-лосс в %
  takeProfitPercent?: number; // тейк-профит в %
  timeframe?: string; // временной горизонт (1h, 4h, 24h)
  [key: string]: unknown;
}

/**
 * Статистика стратегии
 */
export interface StrategyStats {
  totalSignals: number;
  totalTrades: number;
  successRate: number;
  avgProfit: number;
  maxDrawdown: number;
  lastExecuted?: Date;
}

/**
 * Схема параметра стратегии
 */
export interface ParamSchema {
  name: string;
  type: 'number' | 'boolean' | 'string' | 'select';
  default: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: unknown; label: string }>;
  description: string;
  tooltip: string;
  group?: string;
}

/**
 * Интерфейс торговой стратегии
 */
export interface Strategy {
  name: string;
  description: string;

  /**
   * Анализ данных и генерация торгового решения
   */
  analyze(data: MarketData, signals: Signal[]): TradeDecision | null;

  /**
   * Получить текущие параметры стратегии
   */
  getParameters(): StrategyParams;

  /**
   * Обновить параметры стратегии
   */
  updateParameters(params: Partial<StrategyParams>): void;

  /**
   * Получить схему параметров стратегии
   */
  getParameterSchema(): ParamSchema[];

  /**
   * Валидация параметров стратегии
   */
  validateParameters(params: Partial<StrategyParams>): { valid: boolean; errors: string[] };

  /**
   * Получить статистику стратегии
   */
  getStats(): StrategyStats;

  /**
   * Сбросить статистику
   */
  resetStats(): void;

  /**
   * Event emitter methods for real-time signal broadcasting
   */
  on(event: string, listener: (...args: unknown[]) => void): this;
  emit(event: string, ...args: unknown[]): boolean;
}

/**
 * Результат агрегации настроений
 */
export interface SentimentAggregate {
  timeframe: string;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  avgImpact: number;
  trend: 'rising' | 'falling' | 'stable';
  timestamp: Date;
}

/**
 * События для Event-Driven стратегии
 */
export interface ScheduledEvent {
  id: string;
  type: 'fork' | 'upgrade' | 'listing' | 'halving' | 'conference' | 'announcement';
  name: string;
  description: string;
  scheduledAt: Date;
  impact: number; // ожидаемый impact 0-1
  symbol: string;
}
