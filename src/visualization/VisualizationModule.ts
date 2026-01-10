/**
 * Visualization Module
 *
 * Main module for trading setup visualization
 */

import type {
  TradingSetup,
  VisualReport,
  VisualizationConfig,
  VisualizationMethod,
  PineScriptResult,
  ChartingLibraryConfig,
} from './types.js';
import { DEFAULT_COLOR_SCHEME } from './types.js';
import { PineScriptGenerator } from './PineScriptGenerator.js';
import { ChartingLibraryGenerator } from './ChartingLibraryGenerator.js';
import { VisualReportGenerator } from './VisualReportGenerator.js';

/**
 * Default visualization configuration
 */
export const DEFAULT_VISUALIZATION_CONFIG: VisualizationConfig = {
  method: VisualizationMethod.TRADINGVIEW_EMBEDDED,
  colors: {
    longEntry: DEFAULT_COLOR_SCHEME.long,
    shortEntry: DEFAULT_COLOR_SCHEME.short,
    stopLoss: DEFAULT_COLOR_SCHEME.stopLoss,
    takeProfit: DEFAULT_COLOR_SCHEME.takeProfit,
    orderBlock: DEFAULT_COLOR_SCHEME.bullishStructure,
    fvg: DEFAULT_COLOR_SCHEME.neutral,
    liquidityPool: DEFAULT_COLOR_SCHEME.bearishStructure,
  },
  defaultTimeframe: '4h',
  showVolumeProfile: true,
  generateImages: false,
};

/**
 * Main Visualization Module
 */
export class VisualizationModule {
  private config: VisualizationConfig;
  private pineScriptGenerator: PineScriptGenerator;
  private chartingLibraryGenerator: ChartingLibraryGenerator;
  private reportGenerator: VisualReportGenerator;

  constructor(config?: Partial<VisualizationConfig>) {
    this.config = { ...DEFAULT_VISUALIZATION_CONFIG, ...config };
    this.pineScriptGenerator = new PineScriptGenerator();
    this.chartingLibraryGenerator = new ChartingLibraryGenerator();
    this.reportGenerator = new VisualReportGenerator();
  }

  /**
   * Generate complete visualization for a trading setup
   */
  public async visualize(setup: TradingSetup): Promise<VisualReport> {
    // Validate setup
    const validation = this.pineScriptGenerator.validate(setup);
    if (!validation.valid) {
      throw new Error(`Invalid trading setup: ${validation.errors.join(', ')}`);
    }

    console.log(`📊 Generating visualization for ${setup.symbol} (${setup.direction})`);

    return await this.reportGenerator.generate(setup, this.config);
  }

  /**
   * Generate Pine Script only
   */
  public generatePineScript(setup: TradingSetup): PineScriptResult {
    const validation = this.pineScriptGenerator.validate(setup);
    if (!validation.valid) {
      throw new Error(`Invalid trading setup: ${validation.errors.join(', ')}`);
    }

    console.log(`📜 Generating Pine Script for ${setup.symbol}`);
    return this.pineScriptGenerator.generate(setup);
  }

  /**
   * Generate Charting Library configuration
   */
  public generateChartConfig(setup: TradingSetup): ChartingLibraryConfig {
    console.log(`📈 Generating chart configuration for ${setup.symbol}`);
    return this.chartingLibraryGenerator.generate(setup, {
      timeframe: this.config.defaultTimeframe as any,
      theme: 'dark',
    });
  }

  /**
   * Generate HTML page with embedded chart
   */
  public generateHTMLPage(setup: TradingSetup): string {
    console.log(`🌐 Generating HTML page for ${setup.symbol}`);
    return this.chartingLibraryGenerator.generateHTMLPage(setup, {
      timeframe: this.config.defaultTimeframe as any,
      theme: 'dark',
    });
  }

  /**
   * Generate widget initialization code
   */
  public generateWidgetCode(setup: TradingSetup): string {
    console.log(`⚙️  Generating widget code for ${setup.symbol}`);
    return this.chartingLibraryGenerator.generateWidgetCode(setup, {
      timeframe: this.config.defaultTimeframe as any,
      theme: 'dark',
    });
  }

  /**
   * Generate markdown report
   */
  public generateMarkdownReport(setup: TradingSetup): string {
    console.log(`📝 Generating markdown report for ${setup.symbol}`);
    return this.reportGenerator.generateMarkdownReport(setup, this.config);
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<VisualizationConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('⚙️  Visualization configuration updated');
  }

  /**
   * Get current configuration
   */
  public getConfig(): VisualizationConfig {
    return { ...this.config };
  }

  /**
   * Validate trading setup
   */
  public validate(setup: TradingSetup): { valid: boolean; errors: string[] } {
    return this.pineScriptGenerator.validate(setup);
  }

  /**
   * Generate visualization for multiple setups
   */
  public async visualizeBatch(setups: TradingSetup[]): Promise<VisualReport[]> {
    console.log(`📊 Generating visualizations for ${setups.length} setups`);

    const reports: VisualReport[] = [];

    for (const setup of setups) {
      try {
        const report = await this.visualize(setup);
        reports.push(report);
        console.log(`✅ Visualization generated for ${setup.symbol}`);
      } catch (error) {
        console.error(`❌ Failed to generate visualization for ${setup.symbol}:`, error);
      }
    }

    return reports;
  }

  /**
   * Export visualization as JSON
   */
  public exportAsJSON(report: VisualReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Create TradingView-compatible alert message
   */
  public generateAlertMessage(setup: TradingSetup): string {
    const entryPrices = setup.entryZones.map(
      (zone) => `$${zone.priceLow.toFixed(2)}-$${zone.priceHigh.toFixed(2)}`,
    );
    const tpPrices = setup.takeProfits.map((tp) => `$${tp.price.toFixed(2)}`);

    return `${setup.symbol} ${setup.direction.toUpperCase()} Setup
Entry: ${entryPrices.join(', ')}
Stop Loss: $${setup.stopLoss.toFixed(2)}
Take Profit: ${tpPrices.join(', ')}
R:R = 1:${setup.riskRewardRatio.toFixed(1)}
Confidence: ${(setup.confidence * 100).toFixed(0)}%`;
  }

  /**
   * Generate summary statistics
   */
  public generateSummary(setup: TradingSetup): {
    totalRisk: number;
    totalReward: number;
    avgEntry: number;
    riskAmount: number;
    rewardAmount: number;
  } {
    const avgEntry =
      setup.entryZones.reduce((sum, zone) => sum + (zone.priceHigh + zone.priceLow) / 2, 0) /
      setup.entryZones.length;

    const riskAmount = Math.abs(avgEntry - setup.stopLoss);
    const avgTP =
      setup.takeProfits.reduce((sum, tp) => sum + tp.price, 0) / setup.takeProfits.length;
    const rewardAmount = Math.abs(avgTP - avgEntry);

    return {
      totalRisk: (riskAmount / avgEntry) * 100,
      totalReward: (rewardAmount / avgEntry) * 100,
      avgEntry,
      riskAmount,
      rewardAmount,
    };
  }
}
