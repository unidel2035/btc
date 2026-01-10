/**
 * Visualization Types
 *
 * Type definitions for TradingView visualization module
 */

/**
 * Trading direction
 */
export enum TradingDirection {
  LONG = 'long',
  SHORT = 'short',
}

/**
 * SMC Structure type
 */
export enum SMCStructureType {
  ORDER_BLOCK = 'order_block',
  FVG = 'fvg', // Fair Value Gap
  LIQUIDITY_POOL = 'liquidity_pool',
  PREMIUM_DISCOUNT = 'premium_discount',
  BREAKER_BLOCK = 'breaker_block',
}

/**
 * SMC Structure definition
 */
export interface SMCStructure {
  type: SMCStructureType;
  direction: 'bullish' | 'bearish';
  priceHigh: number;
  priceLow: number;
  timestamp?: Date;
  label?: string;
  description?: string;
}

/**
 * Entry zone definition
 */
export interface EntryZone {
  priceHigh: number;
  priceLow: number;
  orderType: 'limit' | 'market';
  positionPercent: number; // % of position to allocate to this entry
}

/**
 * Take profit level definition
 */
export interface TakeProfitLevel {
  price: number;
  positionPercent: number; // % of position to close at this level
  label?: string;
}

/**
 * Trading setup definition (input for visualization)
 */
export interface TradingSetup {
  symbol: string;
  direction: TradingDirection;
  currentPrice: number;
  entryZones: EntryZone[];
  stopLoss: number;
  takeProfits: TakeProfitLevel[];
  smcStructures: SMCStructure[];
  riskPercent: number;
  riskRewardRatio: number;
  confidence: number; // 0-1
  analysis: string; // Brief analysis text
  timestamp: Date;
}

/**
 * Pine Script generation options
 */
export interface PineScriptOptions {
  version?: 5 | 4;
  indicatorName?: string;
  overlay?: boolean;
  precision?: number;
}

/**
 * Pine Script result
 */
export interface PineScriptResult {
  code: string;
  url?: string; // TradingView URL with pre-filled indicator
  timestamp: Date;
}

/**
 * TradingView Charting Library configuration
 */
export interface ChartingLibraryConfig {
  containerId: string;
  symbol: string;
  interval: string; // 1, 5, 15, 60, 240, D, W, M
  timezone?: string;
  theme?: 'light' | 'dark';
  autosize?: boolean;
  drawings?: ChartDrawing[];
  studies?: ChartStudy[];
}

/**
 * Chart drawing definition
 */
export interface ChartDrawing {
  type: 'horizontal_line' | 'trend_line' | 'rectangle' | 'arrow' | 'text';
  points: ChartPoint[];
  color?: string;
  lineStyle?: 'solid' | 'dotted' | 'dashed';
  lineWidth?: number;
  text?: string;
  backgroundColor?: string;
}

/**
 * Chart point definition
 */
export interface ChartPoint {
  time: number | string;
  price: number;
}

/**
 * Chart study (indicator) definition
 */
export interface ChartStudy {
  id: string;
  inputs: Record<string, unknown>;
}

/**
 * Visualization method
 */
export enum VisualizationMethod {
  TRADINGVIEW_EMBEDDED = 'tradingview_embedded',
  PINE_SCRIPT = 'pine_script',
  LOCAL = 'local',
}

/**
 * Visualization configuration
 */
export interface VisualizationConfig {
  method: VisualizationMethod;
  colors: {
    longEntry: string;
    shortEntry: string;
    stopLoss: string;
    takeProfit: string;
    orderBlock: string;
    fvg: string;
    liquidityPool: string;
  };
  defaultTimeframe: string;
  showVolumeProfile: boolean;
  generateImages: boolean;
  imagePath?: string;
}

/**
 * Visual report result
 */
export interface VisualReport {
  setup: TradingSetup;
  pineScript?: PineScriptResult;
  chartConfig?: ChartingLibraryConfig;
  imagePath?: string;
  htmlReport?: string;
  tradingViewUrl?: string;
  timestamp: Date;
}

/**
 * Color scheme for visualization
 */
export interface ColorScheme {
  long: string;
  short: string;
  stopLoss: string;
  takeProfit: string;
  bullishStructure: string;
  bearishStructure: string;
  neutral: string;
}

/**
 * Default color scheme
 */
export const DEFAULT_COLOR_SCHEME: ColorScheme = {
  long: '#00FF00',
  short: '#FF0000',
  stopLoss: '#FF6B6B',
  takeProfit: '#4ECDC4',
  bullishStructure: '#1E90FF',
  bearishStructure: '#FF4500',
  neutral: '#808080',
};

/**
 * Timeframe options
 */
export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | 'D' | 'W' | 'M';
