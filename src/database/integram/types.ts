/**
 * Integram Database Types
 */

/**
 * Маппинг типов таблиц Integram
 * Эти ID нужно получить после создания таблиц в Integram
 */
export const INTEGRAM_TYPES = {
  // Основные таблицы
  POSITIONS: parseInt(process.env.INTEGRAM_TYPE_POSITIONS || '0'),
  SIGNALS: parseInt(process.env.INTEGRAM_TYPE_SIGNALS || '0'),
  NEWS: parseInt(process.env.INTEGRAM_TYPE_NEWS || '0'),
  TRADE_HISTORY: parseInt(process.env.INTEGRAM_TYPE_TRADE_HISTORY || '0'),
  EQUITY_HISTORY: parseInt(process.env.INTEGRAM_TYPE_EQUITY_HISTORY || '0'),

  // Справочники (lookup tables)
  POSITION_SIDE: parseInt(process.env.INTEGRAM_TYPE_POSITION_SIDE || '0'),
  POSITION_STATUS: parseInt(process.env.INTEGRAM_TYPE_POSITION_STATUS || '0'),
  SIGNAL_ACTION: parseInt(process.env.INTEGRAM_TYPE_SIGNAL_ACTION || '0'),
  SENTIMENT: parseInt(process.env.INTEGRAM_TYPE_SENTIMENT || '0'),
} as const;

/**
 * Схема таблицы Positions в Integram
 */
export interface IntegramPosition {
  id: number; // Integram object ID
  value: string; // Position ID (UUID)
  requisites: {
    symbol: string;
    side: string; // Reference to PositionSide
    size: number;
    entryPrice: number;
    currentPrice: number;
    stopLoss?: number;
    takeProfit?: number;
    pnl: number;
    pnlPercent: number;
    leverage?: number;
    openTime: string;
    closeTime?: string;
    status: string; // Reference to PositionStatus
    exchange?: string;
    updatedAt: string;
  };
}

/**
 * Схема таблицы Signals в Integram
 */
export interface IntegramSignal {
  id: number;
  value: string; // Signal ID
  requisites: {
    type: string;
    source: string;
    symbol: string;
    action: string; // Reference to SignalAction
    strength: number;
    confidence: number;
    price?: number;
    reason: string;
    timestamp: string;
  };
}

/**
 * Схема таблицы News в Integram
 */
export interface IntegramNews {
  id: number;
  value: string; // News ID
  requisites: {
    title: string;
    content: string;
    source: string;
    url: string;
    sentiment: string; // Reference to Sentiment
    sentimentScore: number;
    publishedAt: string;
    fetchedAt: string;
  };
}

/**
 * Схема таблицы TradeHistory в Integram
 */
export interface IntegramTradeHistory {
  id: number;
  value: string; // Trade ID
  requisites: {
    symbol: string;
    side: string; // Reference to PositionSide
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    pnl: number;
    commission?: number;
    netPnl?: number;
    duration?: number;
    openTime: string;
    closeTime: string;
    strategy?: string;
    reason: string;
  };
}

/**
 * Схема таблицы EquityHistory в Integram
 */
export interface IntegramEquityPoint {
  id: number;
  value: string; // Timestamp
  requisites: {
    equity: number;
    balance: number;
    timestamp: string;
  };
}
