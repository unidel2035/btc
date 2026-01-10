/**
 * Chart Pattern & SMC Analysis Module Types
 *
 * Types for Smart Money Concepts (SMC) pattern detection and analysis
 */

import { Candle } from '../../exchanges/types.js';

/**
 * Market phase classification
 */
export enum MarketPhase {
  ACCUMULATION = 'accumulation',
  UPTREND = 'uptrend',
  DISTRIBUTION = 'distribution',
  DOWNTREND = 'downtrend',
  CORRECTION = 'correction',
}

/**
 * Pattern effectiveness confidence level
 */
export enum ConfidenceLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * Order Block type
 */
export enum OrderBlockType {
  BULLISH = 'bullish',
  BEARISH = 'bearish',
}

/**
 * Fair Value Gap type
 */
export enum FVGType {
  BULLISH = 'bullish',
  BEARISH = 'bearish',
}

/**
 * Liquidity pool location
 */
export enum LiquidityPoolType {
  ABOVE = 'above', // Above swing high
  BELOW = 'below', // Below swing low
}

/**
 * Order Block pattern
 * Последняя противоположная свеча перед сильным импульсным движением
 */
export interface OrderBlock {
  type: OrderBlockType;
  timestamp: number;
  high: number;
  low: number;
  effectiveness: number; // 0-1, calculated from backtesting
  touchCount: number; // How many times price returned to this zone
  reactionCount: number; // How many times price reacted (bounced)
  confidence: ConfidenceLevel;
}

/**
 * Fair Value Gap (FVG)
 * Разрыв справедливой стоимости - паттерн из трёх свечей
 */
export interface FairValueGap {
  type: FVGType;
  timestamp: number;
  gapHigh: number; // Верхняя граница разрыва
  gapLow: number; // Нижняя граница разрыва
  filled: boolean; // Закрыт ли разрыв
  effectiveness: number; // 0-1
  confidence: ConfidenceLevel;
}

/**
 * Liquidity Pool
 * Зона скопления стоп-лоссов около ключевых уровней
 */
export interface LiquidityPool {
  type: LiquidityPoolType;
  timestamp: number;
  price: number;
  strength: number; // 0-1, based on volume and wick size
  swept: boolean; // Была ли собрана ликвидность
}

/**
 * Swing High/Low point
 */
export interface SwingPoint {
  timestamp: number;
  price: number;
  isHigh: boolean; // true for swing high, false for swing low
}

/**
 * Volume analysis result
 */
export interface VolumeAnalysis {
  avgVolume: number;
  currentVolume: number;
  volumeRatio: number; // current / avg
  accumulationDetected: boolean;
  distributionDetected: boolean;
  divergenceDetected: boolean;
  divergenceType?: 'bullish' | 'bearish';
}

/**
 * Buy zone recommendation
 */
export interface BuyZone {
  zoneNumber: number;
  confidence: ConfidenceLevel;
  priceRangeHigh: number;
  priceRangeLow: number;
  reasoning: string;
  suggestedAllocation: number; // Процент от планируемой позиции
  targetPrices: number[]; // Take profit targets
  stopLoss: number;
  riskRewardRatio: number;
}

/**
 * Critical level
 */
export interface CriticalLevel {
  type: 'invalidation' | 'resistance' | 'support' | 'unlock' | 'liquidity';
  price: number;
  description: string;
  date?: Date; // For scheduled events like token unlocks
}

/**
 * Order configuration for Bybit execution
 */
export interface OrderConfig {
  pair: string;
  orders: Array<{
    type: 'LIMIT' | 'STOP_MARKET';
    side: 'BUY' | 'SELL';
    qty: string;
    price?: string;
    trigger_price?: string;
    reduce_only: boolean;
  }>;
  stop_loss?: {
    type: 'STOP_MARKET';
    side: 'SELL';
    qty: string;
    trigger_price: string;
  };
  take_profit: Array<{
    type: 'LIMIT';
    side: 'SELL';
    qty: string;
    price: string;
  }>;
}

/**
 * Complete tactical map for a trading pair
 */
export interface TacticalMap {
  pair: string;
  timestamp: Date;
  timeframe: string;
  currentPhase: MarketPhase;
  historicalConclusion: string;

  // Pattern Analysis
  orderBlocks: OrderBlock[];
  fairValueGaps: FairValueGap[];
  liquidityPools: LiquidityPool[];
  swingPoints: SwingPoint[];

  // Volume Analysis
  volumeAnalysis: VolumeAnalysis;

  // Trading zones
  buyZones: BuyZone[];
  criticalLevels: CriticalLevel[];

  // Execution config
  orderConfig: OrderConfig;

  // Overall assessment
  overallScore: number; // 0-100
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'avoid';
}

/**
 * Pattern detection config
 */
export interface PatternDetectionConfig {
  // Swing point detection
  swingLookback: number; // How many candles to look back for swing point

  // Order Block detection
  minImpulseSize: number; // Minimum % move to consider as impulse
  obEffectivenessThreshold: number; // Minimum effectiveness to include

  // FVG detection
  minGapSize: number; // Minimum gap size in % of price
  fvgEffectivenessThreshold: number;

  // Liquidity pool detection
  minWickRatio: number; // Minimum wick size relative to body
  liquidityStrengthThreshold: number;

  // Volume analysis
  volumeLookback: number; // Periods for average volume
  volumeAccumulationThreshold: number; // Low volatility + high volume
  volumeDivergenceThreshold: number;

  // Backtest settings
  backtestMinTouches: number; // Minimum touches to calculate effectiveness
}

/**
 * Chart pattern analysis request
 */
export interface ChartPatternAnalysisRequest {
  pairs: string[];
  timeframes?: string[]; // Default: ['1d', '1w', '4h']
  maxHistory?: number; // Max candles to fetch, default: all available
  config?: Partial<PatternDetectionConfig>;
}

/**
 * Aggregated report for multiple pairs
 */
export interface ChartPatternReport {
  generatedAt: Date;
  pairs: string[];
  tacticalMaps: TacticalMap[];
  summary: {
    totalPairsAnalyzed: number;
    recommendedPairs: string[];
    topOpportunities: Array<{
      pair: string;
      score: number;
      reasoning: string;
    }>;
  };
}
