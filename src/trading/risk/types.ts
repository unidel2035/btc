/**
 * Типы и интерфейсы для модуля риск-менеджмента
 */

/**
 * Конфигурация риск-менеджмента
 */
export interface RiskConfig {
  // Размер позиции
  maxPositionSize: number; // % от баланса (например, 10)
  maxPositions: number; // Максимальное количество одновременных позиций

  // Лимиты убытков
  maxDailyLoss: number; // % дневного лимита убытков (например, 5)
  maxTotalDrawdown: number; // % общего лимита просадки (например, 20)

  // Stop-loss / Take-profit по умолчанию
  defaultStopLoss: number; // % (например, 2)
  defaultTakeProfit: number; // % (например, 5)

  // Trailing stop
  trailingStop: boolean; // Включен ли трейлинг-стоп
  trailingStopActivation: number; // % профита для активации (например, 3)
  trailingStopDistance: number; // % дистанция от пика (например, 1.5)

  // Лимит на актив
  maxAssetExposure: number; // % от баланса на один актив (например, 15)

  // Корреляция
  maxCorrelatedPositions: number; // Максимум коррелированных позиций
  correlationThreshold: number; // Порог корреляции (0-1, например 0.7)
}

/**
 * Тип определения размера позиции
 */
export enum PositionSizingMethod {
  FIXED = 'fixed', // Фиксированный размер
  PERCENTAGE = 'percentage', // Процент от баланса
  KELLY = 'kelly', // Kelly Criterion
  VOLATILITY_ADJUSTED = 'volatility_adjusted', // С учетом волатильности
}

/**
 * Параметры расчета размера позиции
 */
export interface PositionSizingParams {
  method: PositionSizingMethod;
  balance: number; // Текущий баланс
  riskPerTrade: number; // Риск на сделку (%)
  stopLossPercent: number; // Процент стоп-лосса
  entryPrice: number; // Цена входа

  // Для Kelly Criterion
  winRate?: number; // Вероятность выигрыша (0-1)
  avgWinLoss?: number; // Среднее отношение прибыли к убытку

  // Для volatility-adjusted
  volatility?: number; // Текущая волатильность (например, ATR)
  baseVolatility?: number; // Базовая волатильность для нормализации
}

/**
 * Результат расчета размера позиции
 */
export interface PositionSizeResult {
  size: number; // Размер позиции в базовой валюте
  quantity: number; // Количество единиц актива
  riskAmount: number; // Сумма риска
  method: PositionSizingMethod;
}

/**
 * Тип стоп-лосса
 */
export enum StopLossType {
  FIXED = 'fixed', // Фиксированный
  ATR_BASED = 'atr_based', // На основе ATR
  TRAILING = 'trailing', // Трейлинг
}

/**
 * Параметры стоп-лосса
 */
export interface StopLossParams {
  type: StopLossType;
  entryPrice: number;

  // Для фиксированного стоп-лосса
  percent?: number; // Процент от цены входа

  // Для ATR-based
  atr?: number; // Average True Range
  atrMultiplier?: number; // Множитель ATR (например, 2)

  // Для trailing stop
  activationPercent?: number; // % профита для активации
  trailingDistance?: number; // % дистанция от пика
}

/**
 * Параметры тейк-профита
 */
export interface TakeProfitParams {
  entryPrice: number;
  levels: TakeProfitLevel[]; // Множественные уровни TP
}

/**
 * Уровень тейк-профита
 */
export interface TakeProfitLevel {
  percent: number; // % от цены входа
  closePercent: number; // % позиции для закрытия на этом уровне
}

/**
 * Направление позиции
 */
export enum PositionSide {
  LONG = 'long',
  SHORT = 'short',
}

/**
 * Статус позиции
 */
export enum PositionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  PARTIALLY_CLOSED = 'partially_closed',
}

/**
 * Позиция
 */
export interface Position {
  id: string;
  symbol: string; // Торговая пара (например, 'BTC/USDT')
  side: PositionSide;
  status: PositionStatus;

  // Размер и цены
  entryPrice: number;
  currentPrice: number;
  size: number; // Размер в базовой валюте
  quantity: number; // Количество единиц актива
  remainingQuantity: number; // Оставшееся количество (для частичного закрытия)

  // Риск-параметры
  stopLoss: number;
  takeProfit: number[];
  takeProfitLevels?: TakeProfitLevel[];

  // Трейлинг стоп
  trailingStopActive: boolean;
  highestPrice?: number; // Наивысшая цена с момента открытия (для long)
  lowestPrice?: number; // Наименьшая цена с момента открытия (для short)

  // Метрики
  unrealizedPnL: number; // Нереализованная прибыль/убыток
  realizedPnL: number; // Реализованная прибыль/убыток (от частичных закрытий)

  // Timestamps
  openedAt: Date;
  closedAt?: Date;
  lastUpdatedAt: Date;
}

/**
 * Результат проверки лимитов
 */
export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  currentValue?: number;
  limitValue?: number;
}

/**
 * Статистика риск-менеджмента
 */
export interface RiskStats {
  // Позиции
  openPositions: number;
  totalPositions: number;

  // Убытки
  dailyPnL: number;
  dailyPnLPercent: number;
  totalDrawdown: number;
  totalDrawdownPercent: number;

  // Экспозиция
  totalExposure: number; // Сумма всех открытых позиций
  totalExposurePercent: number; // % от баланса
  assetExposure: Record<string, number>; // Экспозиция по активам

  // Корреляция
  correlatedPairs: Array<{ pair1: string; pair2: string; correlation: number }>;

  // Обновлено
  updatedAt: Date;
}

/**
 * Событие риск-менеджмента
 */
export enum RiskEventType {
  POSITION_OPENED = 'position_opened',
  POSITION_CLOSED = 'position_closed',
  POSITION_PARTIALLY_CLOSED = 'position_partially_closed',
  STOP_LOSS_TRIGGERED = 'stop_loss_triggered',
  TAKE_PROFIT_TRIGGERED = 'take_profit_triggered',
  TRAILING_STOP_ACTIVATED = 'trailing_stop_activated',
  TRAILING_STOP_UPDATED = 'trailing_stop_updated',
  LIMIT_WARNING = 'limit_warning',
  LIMIT_REACHED = 'limit_reached',
  DAILY_LOSS_LIMIT = 'daily_loss_limit',
  MAX_DRAWDOWN_LIMIT = 'max_drawdown_limit',
  MAX_POSITIONS_LIMIT = 'max_positions_limit',
  CORRELATION_WARNING = 'correlation_warning',
}

/**
 * Событие риска
 */
export interface RiskEvent {
  type: RiskEventType;
  timestamp: Date;
  positionId?: string;
  symbol?: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Опции корреляционного анализа
 */
export interface CorrelationAnalysisOptions {
  period: number; // Период для расчета (количество свечей)
  threshold: number; // Порог корреляции (0-1)
}

/**
 * Результат корреляционного анализа
 */
export interface CorrelationResult {
  symbol1: string;
  symbol2: string;
  correlation: number; // Коэффициент корреляции (-1 to 1)
  isHighlyCorrelated: boolean; // correlation >= threshold
}

/**
 * Данные OHLCV для расчета корреляции
 */
export interface OHLCVData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Настройки уведомлений
 */
export interface NotificationConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  warningThreshold: number; // % от лимита для предупреждения (например, 80)
}

/**
 * Канал уведомлений
 */
export enum NotificationChannel {
  CONSOLE = 'console',
  TELEGRAM = 'telegram',
  EMAIL = 'email',
  WEBHOOK = 'webhook',
}

/**
 * Параметры обновления позиции
 */
export interface PositionUpdateParams {
  currentPrice: number;
  timestamp?: Date;
}
