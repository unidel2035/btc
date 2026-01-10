/**
 * Visualization Configuration
 *
 * Configuration settings for visualization module
 */

import type { VisualizationConfig } from './types.js';
import { VisualizationMethod, DEFAULT_COLOR_SCHEME } from './types.js';

/**
 * Load configuration from environment variables
 */
export function loadConfigFromEnv(): Partial<VisualizationConfig> {
  return {
    method:
      (process.env.VISUALIZATION_METHOD as VisualizationMethod) ||
      VisualizationMethod.TRADINGVIEW_EMBEDDED,
    defaultTimeframe: process.env.VISUALIZATION_TIMEFRAME || '4h',
    showVolumeProfile: process.env.VISUALIZATION_SHOW_VOLUME !== 'false',
    generateImages: process.env.VISUALIZATION_GENERATE_IMAGES === 'true',
    imagePath: process.env.VISUALIZATION_IMAGE_PATH || './data/visualizations',
    colors: {
      longEntry: process.env.VISUALIZATION_COLOR_LONG || DEFAULT_COLOR_SCHEME.long,
      shortEntry: process.env.VISUALIZATION_COLOR_SHORT || DEFAULT_COLOR_SCHEME.short,
      stopLoss: process.env.VISUALIZATION_COLOR_SL || DEFAULT_COLOR_SCHEME.stopLoss,
      takeProfit: process.env.VISUALIZATION_COLOR_TP || DEFAULT_COLOR_SCHEME.takeProfit,
      orderBlock: process.env.VISUALIZATION_COLOR_OB || DEFAULT_COLOR_SCHEME.bullishStructure,
      fvg: process.env.VISUALIZATION_COLOR_FVG || DEFAULT_COLOR_SCHEME.neutral,
      liquidityPool:
        process.env.VISUALIZATION_COLOR_LIQUIDITY || DEFAULT_COLOR_SCHEME.bearishStructure,
    },
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: Partial<VisualizationConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.method && !Object.values(VisualizationMethod).includes(config.method)) {
    errors.push(`Invalid visualization method: ${config.method}`);
  }

  if (config.defaultTimeframe) {
    const validTimeframes = ['1m', '5m', '15m', '1h', '4h', 'D', 'W', 'M'];
    if (!validTimeframes.includes(config.defaultTimeframe)) {
      errors.push(`Invalid timeframe: ${config.defaultTimeframe}`);
    }
  }

  if (config.colors) {
    const colorPattern = /^#[0-9A-Fa-f]{6}$/;
    Object.entries(config.colors).forEach(([key, value]) => {
      if (value && !colorPattern.test(value)) {
        errors.push(`Invalid color format for ${key}: ${value}`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Default configuration presets
 */
export const VISUALIZATION_PRESETS = {
  /**
   * Minimal preset - Pine Script only
   */
  minimal: {
    method: VisualizationMethod.PINE_SCRIPT,
    defaultTimeframe: '4h',
    showVolumeProfile: false,
    generateImages: false,
  } as Partial<VisualizationConfig>,

  /**
   * Standard preset - Embedded TradingView
   */
  standard: {
    method: VisualizationMethod.TRADINGVIEW_EMBEDDED,
    defaultTimeframe: '4h',
    showVolumeProfile: true,
    generateImages: false,
  } as Partial<VisualizationConfig>,

  /**
   * Complete preset - All features enabled
   */
  complete: {
    method: VisualizationMethod.TRADINGVIEW_EMBEDDED,
    defaultTimeframe: '4h',
    showVolumeProfile: true,
    generateImages: true,
  } as Partial<VisualizationConfig>,

  /**
   * Local preset - For offline/local visualization
   */
  local: {
    method: VisualizationMethod.LOCAL,
    defaultTimeframe: '4h',
    showVolumeProfile: true,
    generateImages: true,
  } as Partial<VisualizationConfig>,
};
