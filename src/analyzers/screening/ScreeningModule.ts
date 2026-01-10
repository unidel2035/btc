import { CoinGeckoClient } from './CoinGeckoClient.js';
import { MacroFilter } from './MacroFilter.js';
import { QuantitativeScreening } from './QuantitativeScreening.js';
import { FundamentalScoring } from './FundamentalScoring.js';
import { PortfolioConstruction } from './PortfolioConstruction.js';
import { getScreeningConfig } from './config.js';
import type { ScreeningConfig, ScreeningReport, CryptoSector } from './types.js';
import type { IntegramClient } from '../../database/integram/IntegramClient.js';
import type { ScreeningRepository } from '../../database/integram/ScreeningRepository.js';

/**
 * Main Screening Module
 *
 * Orchestrates the complete screening pipeline:
 * Stage 0: Macro Filter → Stage 1: Quantitative Screening →
 * Stage 2: Fundamental Scoring → Stage 3: Portfolio Construction
 */
export class ScreeningModule {
  private client: CoinGeckoClient;
  private config: ScreeningConfig;
  private macroFilter: MacroFilter;
  private quantitativeScreening: QuantitativeScreening;
  private fundamentalScoring: FundamentalScoring;
  private portfolioConstruction: PortfolioConstruction;
  private integramClient?: IntegramClient;
  private screeningRepository?: ScreeningRepository;

  constructor(
    apiKey?: string,
    config?: ScreeningConfig,
    integramClient?: IntegramClient,
  ) {
    this.client = new CoinGeckoClient(apiKey);
    this.config = config || getScreeningConfig();
    this.integramClient = integramClient;

    // Initialize pipeline stages
    this.macroFilter = new MacroFilter(this.client, this.config.macroFilter);
    this.quantitativeScreening = new QuantitativeScreening(
      this.client,
      this.config.quantitativeScreening
    );
    this.fundamentalScoring = new FundamentalScoring(
      this.client,
      this.config.scoring
    );
    this.portfolioConstruction = new PortfolioConstruction(this.config.portfolio);

    // Initialize Integram repository if client is provided
    if (this.integramClient) {
      // Dynamically import to avoid circular dependencies
      import('../../database/integram/ScreeningRepository.js').then((module) => {
        this.screeningRepository = new module.ScreeningRepository(this.integramClient!);
      });
    }
  }

  /**
   * Run the complete screening pipeline
   */
  async runScreening(sectorsToAnalyze?: CryptoSector[]): Promise<ScreeningReport> {
    console.info('🚀 Starting Cryptocurrency Screening Module');
    console.info('='.repeat(60));
    console.info('');

    const startTime = Date.now();

    try {
      // Check API connectivity
      const isOnline = await this.client.ping();
      if (!isOnline) {
        throw new Error('CoinGecko API is not reachable');
      }
      console.info('✅ CoinGecko API connected\n');

      // Stage 0: Macro Filter
      const sectors = sectorsToAnalyze || MacroFilter.getRecommendedSectors();
      const selectedSectors = await this.macroFilter.selectTopSectors(sectors);

      if (selectedSectors.length === 0) {
        throw new Error('No qualifying sectors found');
      }

      // Stage 1: Quantitative Screening
      const sectorNames = selectedSectors.map((s) => s.sector);
      const candidates = await this.quantitativeScreening.screenProjects(sectorNames);

      if (candidates.length === 0) {
        throw new Error('No qualifying projects found after quantitative screening');
      }

      // Stage 2: Fundamental Scoring
      const scoredProjects = await this.fundamentalScoring.scoreProjects(candidates);

      if (scoredProjects.length === 0) {
        throw new Error('No projects scored successfully');
      }

      // Stage 3: Portfolio Construction
      const report = this.portfolioConstruction.constructPortfolio(
        scoredProjects,
        selectedSectors
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.info('='.repeat(60));
      console.info(`✅ Screening completed in ${duration}s`);
      console.info(`📊 ${report.recommendations.length} projects recommended`);
      console.info('');

      // Automatically save to Integram if repository is available
      if (this.screeningRepository) {
        try {
          const reportId = await this.screeningRepository.saveReport(report);
          console.info(`💾 Report saved to Integram: ID ${reportId}`);
        } catch (error) {
          console.error('⚠️  Failed to save report to Integram:', error);
          // Don't throw - screening succeeded even if save failed
        }
      }

      return report;
    } catch (error) {
      console.error('❌ Screening failed:', error);
      throw error;
    }
  }

  /**
   * Run screening and return formatted report
   */
  async generateReport(sectorsToAnalyze?: CryptoSector[]): Promise<string> {
    const report = await this.runScreening(sectorsToAnalyze);
    return this.portfolioConstruction.formatReport(report);
  }

  /**
   * Get current configuration
   */
  getConfig(): ScreeningConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ScreeningConfig>): void {
    this.config = { ...this.config, ...config };

    // Reinitialize stages with new config
    if (config.macroFilter) {
      this.macroFilter = new MacroFilter(this.client, this.config.macroFilter);
    }
    if (config.quantitativeScreening) {
      this.quantitativeScreening = new QuantitativeScreening(
        this.client,
        this.config.quantitativeScreening
      );
    }
    if (config.scoring) {
      this.fundamentalScoring = new FundamentalScoring(
        this.client,
        this.config.scoring
      );
    }
    if (config.portfolio) {
      this.portfolioConstruction = new PortfolioConstruction(this.config.portfolio);
    }
  }

  /**
   * Health check for the module
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.client.ping();
    } catch (error) {
      return false;
    }
  }
}
