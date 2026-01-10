/**
 * Screening Orchestrator
 * Coordinates all stages of the AI screening module
 */

import type { ScreeningConfig, ScreeningReport } from './types/index.js';
import CoinGeckoClient from './utils/CoinGeckoClient.js';
import SectorAnalyzer from './stage0/SectorAnalyzer.js';
import QuantitativeScreener from './stage1/QuantitativeScreener.js';
import FundamentalScorer from './stage2/FundamentalScorer.js';
import PortfolioBuilder from './stage3/PortfolioBuilder.js';
import ReportGenerator from './utils/ReportGenerator.js';

export class ScreeningOrchestrator {
  private config: ScreeningConfig;
  private client: CoinGeckoClient;
  private sectorAnalyzer: SectorAnalyzer;
  private quantitativeScreener: QuantitativeScreener;
  private fundamentalScorer: FundamentalScorer;
  private portfolioBuilder: PortfolioBuilder;
  private reportGenerator: ReportGenerator;

  constructor(config: ScreeningConfig, coinGeckoApiKey?: string) {
    this.config = config;
    this.client = new CoinGeckoClient(coinGeckoApiKey);

    // Initialize stage modules
    this.sectorAnalyzer = new SectorAnalyzer(this.client, this.config);
    this.quantitativeScreener = new QuantitativeScreener(this.client, this.config);
    this.fundamentalScorer = new FundamentalScorer(this.client, this.config);
    this.portfolioBuilder = new PortfolioBuilder(this.config);
    this.reportGenerator = new ReportGenerator();
  }

  /**
   * Run the complete screening process
   */
  async runScreening(): Promise<ScreeningReport> {
    console.log('🚀 Starting AI Screening Module...\n');
    console.log('=' .repeat(80));

    const startTime = Date.now();

    try {
      // Stage 0: Sector Analysis
      const sectors = await this.sectorAnalyzer.selectTopSectors();

      // Stage 1: Quantitative Screening
      const candidates = await this.quantitativeScreener.screenProjects(sectors);

      // Stage 2: Fundamental Scoring
      const scoredProjects = await this.fundamentalScorer.scoreProjects(candidates);

      // Stage 3: Portfolio Construction
      const portfolio = this.portfolioBuilder.buildPortfolio(scoredProjects);

      // Validate portfolio
      const validation = this.portfolioBuilder.validateDiversification(portfolio);
      if (!validation.valid) {
        console.warn('\n⚠️  Portfolio validation warnings:');
        validation.issues.forEach(issue => console.warn(`   - ${issue}`));
      }

      // Generate report
      const report: ScreeningReport = {
        generatedAt: new Date().toISOString(),
        analyzedSectors: sectors.map(s => s.name),
        recommendedProjects: portfolio,
        nextActions: [
          'Выполнить технический анализ для определения точек входа',
          'Настроить алерты на ключевые уровни поддержки/сопротивления',
        ],
        macroRisks: [
          'Общая коррекция на рынке криптовалют',
          'Изменения в регуляторной среде',
          'Макроэкономические риски (инфляция, процентные ставки)',
        ],
        summary: {
          totalProjectsAnalyzed: candidates.length,
          sectorsAnalyzed: sectors.length,
          finalSelectionCount: portfolio.length,
        },
      };

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n✅ Screening completed in ${elapsed}s\n`);

      // Print summary to console
      this.reportGenerator.printSummary(report);

      return report;
    } catch (error) {
      console.error('\n❌ Screening failed:', error);
      throw error;
    }
  }

  /**
   * Run screening and save report to file
   */
  async runAndSaveReport(
    outputDir: string = './reports',
    formats: Array<'markdown' | 'json' | 'csv'> = ['markdown', 'json']
  ): Promise<ScreeningReport> {
    const report = await this.runScreening();

    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = `screening-report-${timestamp}`;

    // Generate reports in requested formats
    if (formats.includes('markdown')) {
      const mdPath = `${outputDir}/${baseFilename}.md`;
      this.reportGenerator.generateReport(report, mdPath);
    }

    if (formats.includes('json')) {
      const jsonPath = `${outputDir}/${baseFilename}.json`;
      this.reportGenerator.generateJSON(report, jsonPath);
    }

    if (formats.includes('csv')) {
      const csvPath = `${outputDir}/${baseFilename}.csv`;
      this.reportGenerator.generateCSV(report.recommendedProjects, csvPath);
    }

    return report;
  }

  /**
   * Get default configuration
   */
  static getDefaultConfig(): ScreeningConfig {
    return {
      // Stage 0: Sector Selection
      maxSectors: 3,
      minSectorGrowth30d: 10, // 10% minimum growth
      minNarrativeStrength: 0.3,

      // Stage 1: Quantitative Screening
      minMarketCapRank: 1,
      maxMarketCapRank: 200,
      minVolume24h: 10_000_000, // $10M minimum
      minPriceChange30d: 0, // At least neutral
      requiredExchanges: ['binance', 'bybit', 'okx', 'kucoin'],
      minExchangeListings: 2,
      projectsPerSector: 7,

      // Stage 2: Scoring Weights
      weights: {
        fundamental: 0.3,
        market: 0.4,
        community: 0.3,
      },

      // Stage 2: Scoring Thresholds
      maxUnlockPercent30d: 2, // Max 2% unlock in next 30 days
      penaltyPerUnlockPercent: -5, // Penalty per % unlock

      // Stage 3: Portfolio Construction
      finalProjectCount: 4,
      minProjectsPerSector: 1,
      bluechipRatio: 0.5, // 50% bluechips (top 50 market cap)
      gazzelleRatio: 0.5, // 50% mid-caps (51-200 rank)
    };
  }

  /**
   * Create from environment variables
   */
  static fromEnv(): ScreeningOrchestrator {
    const config = ScreeningOrchestrator.getDefaultConfig();

    // Override with environment variables if present
    if (process.env.SCREENING_MAX_SECTORS) {
      config.maxSectors = parseInt(process.env.SCREENING_MAX_SECTORS);
    }
    if (process.env.SCREENING_FINAL_COUNT) {
      config.finalProjectCount = parseInt(process.env.SCREENING_FINAL_COUNT);
    }
    if (process.env.SCREENING_MIN_VOLUME) {
      config.minVolume24h = parseFloat(process.env.SCREENING_MIN_VOLUME);
    }

    const apiKey = process.env.COINGECKO_API_KEY;

    return new ScreeningOrchestrator(config, apiKey);
  }
}

export default ScreeningOrchestrator;
