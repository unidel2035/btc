/**
 * Screening Repository
 * Handles storage and retrieval of screening data in Integram database
 */

import { IntegramClient } from './IntegramClient.js';
import type { ScreeningReport, ProjectRecommendation } from '../../analyzers/screening/types.js';
import type {
  IntegramScreeningReport,
  IntegramScreeningRecommendation,
  IntegramProjectMetrics,
  IntegramSectorPerformance,
  ReportComparison,
  ProjectMetricsHistory,
  ProjectRanking,
  SectorTrend,
} from './screening-types.js';

export class ScreeningRepository {
  constructor(private client: IntegramClient) {}

  /**
   * Save complete screening report to Integram
   * Returns the report ID in Integram
   */
  async saveReport(report: ScreeningReport): Promise<number> {
    await this.client.authenticate();

    try {
      // Get table type IDs and requisite IDs from environment
      const SCREENING_TYPES = this.getTypeIds();
      const REQ_IDS = this.getRequisiteIds();

      // 1. Create main report object
      const reportValue = new Date(report.generatedAt).toISOString();
      const duration = 0; // Will be calculated if needed
      const moduleVersion = process.env.npm_package_version || '0.1.0';

      // Get status ID reference
      const statusId = await this.getStatusId('completed');

      const reportId = await this.client.createObject(
        SCREENING_TYPES.SCREENING_REPORTS,
        reportValue,
        {
          [REQ_IDS.report.generatedAt]: report.generatedAt.toISOString(),
          [REQ_IDS.report.analyzedSectors]: JSON.stringify(report.analyzedSectors),
          [REQ_IDS.report.projectsCount]: report.totalProjectsAnalyzed,
          [REQ_IDS.report.status]: statusId,
          [REQ_IDS.report.duration]: duration,
          [REQ_IDS.report.moduleVersion]: moduleVersion,
          [REQ_IDS.report.configParams]: JSON.stringify({}), // Can be extended later
        },
      );

      // 2. Save sector performance (subordinate to report)
      for (const sector of report.selectedSectors) {
        await this.saveSectorPerformance(reportId, sector);
      }

      // 3. Save recommendations (subordinate to report)
      for (const recommendation of report.recommendations) {
        await this.saveRecommendation(reportId, recommendation);
      }

      console.log(`✅ Screening report saved to Integram: ID ${reportId}`);
      return reportId;
    } catch (error) {
      console.error('Failed to save screening report:', error);
      throw error;
    }
  }

  /**
   * Get the latest screening report
   */
  async getLatestReport(): Promise<ScreeningReport | null> {
    try {
      const SCREENING_TYPES = this.getTypeIds();
      const reports = await this.client.getObjects<IntegramScreeningReport>(
        SCREENING_TYPES.SCREENING_REPORTS,
        1,
      );

      if (reports.length === 0) {
        return null;
      }

      const latestReport = reports[0];
      if (!latestReport) {
        return null;
      }
      return await this.buildReportFromIntegram(latestReport.id);
    } catch (error) {
      console.error('Failed to get latest report:', error);
      return null;
    }
  }

  /**
   * Get report history with pagination
   */
  async getReportHistory(limit: number = 10): Promise<ScreeningReport[]> {
    try {
      const SCREENING_TYPES = this.getTypeIds();
      const reports = await this.client.getObjects<IntegramScreeningReport>(
        SCREENING_TYPES.SCREENING_REPORTS,
        limit,
      );

      const fullReports: ScreeningReport[] = [];
      for (const report of reports) {
        const fullReport = await this.buildReportFromIntegram(report.id);
        if (fullReport) {
          fullReports.push(fullReport);
        }
      }

      return fullReports;
    } catch (error) {
      console.error('Failed to get report history:', error);
      return [];
    }
  }

  /**
   * Compare two screening reports
   */
  async compareReports(reportId1: number, reportId2: number): Promise<ReportComparison> {
    const report1 = await this.buildReportFromIntegram(reportId1);
    const report2 = await this.buildReportFromIntegram(reportId2);

    if (!report1 || !report2) {
      throw new Error('One or both reports not found');
    }

    const tickers1 = new Set(report1.recommendations.map((r) => r.ticker));
    const tickers2 = new Set(report2.recommendations.map((r) => r.ticker));

    // Find new additions
    const newAdditions = report2.recommendations.filter((r) => !tickers1.has(r.ticker));

    // Find removed
    const removed = report1.recommendations.filter((r) => !tickers2.has(r.ticker));

    // Find still active with score changes
    const stillActive = report2.recommendations
      .filter((r) => tickers1.has(r.ticker))
      .map((r2) => {
        const r1 = report1.recommendations.find((r) => r.ticker === r2.ticker);
        return {
          ticker: r2.ticker,
          oldScore: r1?.score || 0,
          newScore: r2.score,
          scoreDelta: r2.score - (r1?.score || 0),
        };
      });

    return {
      report1: {
        id: reportId1,
        date: report1.generatedAt,
        recommendations: report1.recommendations,
      },
      report2: {
        id: reportId2,
        date: report2.generatedAt,
        recommendations: report2.recommendations,
      },
      newAdditions,
      removed,
      stillActive,
    };
  }

  /**
   * Get project metrics history
   */
  async getProjectHistory(ticker: string, days: number = 90): Promise<ProjectMetricsHistory> {
    try {
      const SCREENING_TYPES = this.getTypeIds();
      const allMetrics = await this.client.getObjects<IntegramProjectMetrics>(
        SCREENING_TYPES.PROJECT_METRICS_HISTORY,
      );

      // Filter by ticker and time range
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const projectMetrics = allMetrics
        .filter((m) => m.requisites.project === ticker && new Date(m.requisites.date) >= cutoffDate)
        .map((m) => ({
          date: new Date(m.requisites.date),
          marketCap: m.requisites.marketCap,
          price: m.requisites.price,
          compositeScore: m.requisites.compositeScore,
          tradingVolume24h: m.requisites.tradingVolume24h,
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      return {
        ticker,
        metrics: projectMetrics,
      };
    } catch (error) {
      console.error(`Failed to get project history for ${ticker}:`, error);
      return { ticker, metrics: [] };
    }
  }

  /**
   * Get top projects by recommendation frequency
   */
  async getTopProjects(period: 'week' | 'month' | 'quarter'): Promise<ProjectRanking[]> {
    try {
      const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const SCREENING_TYPES = this.getTypeIds();
      const reports = await this.client.getObjects<IntegramScreeningReport>(
        SCREENING_TYPES.SCREENING_REPORTS,
      );

      // Filter reports by date
      const recentReports = reports.filter((r) => new Date(r.requisites.generatedAt) >= cutoffDate);

      // Aggregate recommendations
      const projectStats = new Map<string, { name: string; scores: number[]; dates: Date[] }>();

      for (const report of recentReports) {
        const recommendations = await this.getRecommendationsForReport(report.id);

        for (const rec of recommendations) {
          const existing = projectStats.get(rec.requisites.ticker);
          if (existing) {
            existing.scores.push(rec.requisites.compositeScore);
            existing.dates.push(new Date(report.requisites.generatedAt));
          } else {
            projectStats.set(rec.requisites.ticker, {
              name: rec.requisites.name,
              scores: [rec.requisites.compositeScore],
              dates: [new Date(report.requisites.generatedAt)],
            });
          }
        }
      }

      // Build rankings
      const rankings: ProjectRanking[] = [];
      for (const [ticker, stats] of projectStats.entries()) {
        rankings.push({
          ticker,
          name: stats.name,
          averageScore: stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length,
          timesRecommended: stats.scores.length,
          lastRecommendedAt: new Date(Math.max(...stats.dates.map((d) => d.getTime()))),
        });
      }

      // Sort by times recommended, then by average score
      return rankings.sort(
        (a, b) => b.timesRecommended - a.timesRecommended || b.averageScore - a.averageScore,
      );
    } catch (error) {
      console.error('Failed to get top projects:', error);
      return [];
    }
  }

  /**
   * Get sector performance trends
   */
  async getSectorTrends(days: number = 90): Promise<SectorTrend[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const SCREENING_TYPES = this.getTypeIds();
      const reports = await this.client.getObjects<IntegramScreeningReport>(
        SCREENING_TYPES.SCREENING_REPORTS,
      );

      const recentReports = reports.filter((r) => new Date(r.requisites.generatedAt) >= cutoffDate);

      // Aggregate sector performance by report
      const sectorData = new Map<
        string,
        Array<{ date: Date; performance: IntegramSectorPerformance }>
      >();

      for (const report of recentReports) {
        const sectors = await this.getSectorPerformanceForReport(report.id);

        for (const sector of sectors) {
          const sectorName = sector.requisites.sector;
          const existing = sectorData.get(sectorName);
          if (existing) {
            existing.push({
              date: new Date(report.requisites.generatedAt),
              performance: sector,
            });
          } else {
            sectorData.set(sectorName, [
              {
                date: new Date(report.requisites.generatedAt),
                performance: sector,
              },
            ]);
          }
        }
      }

      // Build trends
      const trends: SectorTrend[] = [];
      for (const [sectorName, dataPoints] of sectorData.entries()) {
        trends.push({
          sector: sectorName as any,
          metrics: dataPoints.map((dp) => ({
            date: dp.date,
            marketCapGrowth30d: dp.performance.requisites.marketCapGrowth30d,
            marketCapGrowth90d: dp.performance.requisites.marketCapGrowth90d,
            score: dp.performance.requisites.sectorScore,
          })),
        });
      }

      return trends;
    } catch (error) {
      console.error('Failed to get sector trends:', error);
      return [];
    }
  }

  /**
   * Save project metrics history entry
   */
  async saveProjectMetrics(ticker: string, metrics: any): Promise<void> {
    try {
      const SCREENING_TYPES = this.getTypeIds();
      const REQ_IDS = this.getRequisiteIds();

      // Get project ID reference
      const projectId = await this.getOrCreateCrypto(ticker);

      await this.client.createObject(
        SCREENING_TYPES.PROJECT_METRICS_HISTORY,
        new Date().toISOString(),
        {
          [REQ_IDS.metrics.project]: projectId,
          [REQ_IDS.metrics.date]: new Date().toISOString(),
          [REQ_IDS.metrics.marketCap]: metrics.marketCap || 0,
          [REQ_IDS.metrics.volume24h]: metrics.volume24h || 0,
          [REQ_IDS.metrics.price]: metrics.currentPrice || 0,
          [REQ_IDS.metrics.priceChange30d]: metrics.priceChange30d || 0,
          [REQ_IDS.metrics.tvl]: metrics.tvl || null,
          [REQ_IDS.metrics.socialScore]: metrics.communityScore || 0,
          [REQ_IDS.metrics.compositeScore]: metrics.totalScore || 0,
        },
      );
    } catch (error) {
      console.error(`Failed to save project metrics for ${ticker}:`, error);
    }
  }

  /**
   * Helper: Save sector performance
   */
  private async saveSectorPerformance(reportId: number, sector: any): Promise<void> {
    const SCREENING_TYPES = this.getTypeIds();
    const REQ_IDS = this.getRequisiteIds();

    // Get sector ID reference
    const sectorId = await this.getSectorId(sector.sector);

    await this.client.createObject(SCREENING_TYPES.SECTOR_PERFORMANCE, sector.sector, {
      [REQ_IDS.sectorPerf.up]: reportId,
      [REQ_IDS.sectorPerf.sector]: sectorId,
      [REQ_IDS.sectorPerf.mcapGrowth30d]: sector.marketCapChange30d || 0,
      [REQ_IDS.sectorPerf.mcapGrowth90d]: sector.marketCapChange90d || 0,
      [REQ_IDS.sectorPerf.score]: sector.score || 0,
      [REQ_IDS.sectorPerf.selected]: true,
      [REQ_IDS.sectorPerf.rationale]: sector.narrative || '',
    });
  }

  /**
   * Helper: Save recommendation
   */
  private async saveRecommendation(
    reportId: number,
    recommendation: ProjectRecommendation,
  ): Promise<void> {
    const SCREENING_TYPES = this.getTypeIds();
    const REQ_IDS = this.getRequisiteIds();

    // Get reference IDs
    const tickerId = await this.getOrCreateCrypto(recommendation.ticker);
    const sectorId = await this.getSectorId(recommendation.sector || '');
    const riskLevelId = await this.getRiskLevelId(recommendation.riskLevel);

    await this.client.createObject(
      SCREENING_TYPES.SCREENING_RECOMMENDATIONS,
      recommendation.ticker,
      {
        [REQ_IDS.recommendation.up]: reportId,
        [REQ_IDS.recommendation.rank]: recommendation.rank,
        [REQ_IDS.recommendation.ticker]: tickerId,
        [REQ_IDS.recommendation.name]: recommendation.name,
        [REQ_IDS.recommendation.sector]: sectorId,
        [REQ_IDS.recommendation.compositeScore]: recommendation.score,
        [REQ_IDS.recommendation.fundamentalScore]: 0, // Can be extracted from detailed scoring
        [REQ_IDS.recommendation.marketScore]: 0,
        [REQ_IDS.recommendation.communityScore]: 0,
        [REQ_IDS.recommendation.rationale]: recommendation.rationale,
        [REQ_IDS.recommendation.keyRisk]: recommendation.keyRisk,
        [REQ_IDS.recommendation.riskLevel]: riskLevelId,
        [REQ_IDS.recommendation.marketCap]: recommendation.marketCap,
        [REQ_IDS.recommendation.priceToAth]: recommendation.priceToAth,
        [REQ_IDS.recommendation.volume24h]: recommendation.volume24h,
        [REQ_IDS.recommendation.tradingPairs]: JSON.stringify(recommendation.tradingPairs),
      },
    );
  }

  /**
   * Helper: Build full report from Integram data
   */
  private async buildReportFromIntegram(reportId: number): Promise<ScreeningReport | null> {
    try {
      const SCREENING_TYPES = this.getTypeIds();
      const reports = await this.client.getObjects<IntegramScreeningReport>(
        SCREENING_TYPES.SCREENING_REPORTS,
      );

      const reportData = reports.find((r) => r.id === reportId);
      if (!reportData) {
        return null;
      }

      // Get recommendations
      const recommendations = await this.getRecommendationsForReport(reportId);

      // Get sector performance
      const sectorPerformance = await this.getSectorPerformanceForReport(reportId);

      return {
        generatedAt: new Date(reportData.requisites.generatedAt),
        analyzedSectors: JSON.parse(reportData.requisites.analyzedSectors),
        selectedSectors: sectorPerformance.map((sp) => ({
          sector: sp.requisites.sector as any,
          totalMarketCap: 0,
          marketCapChange30d: sp.requisites.marketCapGrowth30d,
          marketCapChange90d: sp.requisites.marketCapGrowth90d,
          averageVolume24h: 0,
          projectCount: 0,
          topProjects: [],
          narrative: sp.requisites.rationale,
          score: sp.requisites.sectorScore,
        })),
        totalProjectsAnalyzed: reportData.requisites.projectsCount,
        recommendations: recommendations.map((rec) => ({
          rank: rec.requisites.rank,
          ticker: rec.requisites.ticker,
          name: rec.requisites.name,
          sector: rec.requisites.sector as any,
          score: rec.requisites.compositeScore,
          rationale: rec.requisites.rationale,
          keyRisk: rec.requisites.keyRisk,
          riskLevel: rec.requisites.riskLevel as any,
          marketCap: rec.requisites.marketCap,
          priceToAth: rec.requisites.priceToAth,
          volume24h: rec.requisites.volume24h,
          tradingPairs: JSON.parse(rec.requisites.tradingPairs),
        })),
        tradingPairs: [],
        macroRisks: [],
        nextActions: [],
      };
    } catch (error) {
      console.error(`Failed to build report ${reportId}:`, error);
      return null;
    }
  }

  /**
   * Helper: Get recommendations for a report
   */
  private async getRecommendationsForReport(
    reportId: number,
  ): Promise<IntegramScreeningRecommendation[]> {
    const SCREENING_TYPES = this.getTypeIds();
    const allRecommendations = await this.client.getObjects<IntegramScreeningRecommendation>(
      SCREENING_TYPES.SCREENING_RECOMMENDATIONS,
    );

    return allRecommendations.filter((rec) => rec.up === reportId);
  }

  /**
   * Helper: Get sector performance for a report
   */
  private async getSectorPerformanceForReport(
    reportId: number,
  ): Promise<IntegramSectorPerformance[]> {
    const SCREENING_TYPES = this.getTypeIds();
    const allSectors = await this.client.getObjects<IntegramSectorPerformance>(
      SCREENING_TYPES.SECTOR_PERFORMANCE,
    );

    return allSectors.filter((sec) => sec.up === reportId);
  }

  /**
   * Helper: Get type IDs from environment
   */
  private getTypeIds() {
    return {
      SCREENING_REPORTS: parseInt(process.env.INTEGRAM_TYPE_SCREENING_REPORTS || '0'),
      SCREENING_RECOMMENDATIONS: parseInt(
        process.env.INTEGRAM_TYPE_SCREENING_RECOMMENDATIONS || '0',
      ),
      CRYPTOCURRENCIES: parseInt(process.env.INTEGRAM_TYPE_CRYPTOCURRENCIES || '0'),
      SECTORS: parseInt(process.env.INTEGRAM_TYPE_SECTORS || '0'),
      SECTOR_PERFORMANCE: parseInt(process.env.INTEGRAM_TYPE_SECTOR_PERFORMANCE || '0'),
      PROJECT_METRICS_HISTORY: parseInt(process.env.INTEGRAM_TYPE_PROJECT_METRICS_HISTORY || '0'),
      REPORT_STATUS: parseInt(process.env.INTEGRAM_TYPE_REPORT_STATUS || '0'),
      RISK_LEVELS: parseInt(process.env.INTEGRAM_TYPE_RISK_LEVELS || '0'),
    };
  }

  /**
   * Helper: Get requisite IDs from environment
   */
  private getRequisiteIds() {
    return {
      report: {
        generatedAt: parseInt(process.env.INTEGRAM_REQ_REPORT_GENERATED_AT || '0'),
        analyzedSectors: parseInt(process.env.INTEGRAM_REQ_REPORT_ANALYZED_SECTORS || '0'),
        projectsCount: parseInt(process.env.INTEGRAM_REQ_REPORT_PROJECTS_COUNT || '0'),
        status: parseInt(process.env.INTEGRAM_REQ_REPORT_STATUS || '0'),
        duration: parseInt(process.env.INTEGRAM_REQ_REPORT_DURATION || '0'),
        moduleVersion: parseInt(process.env.INTEGRAM_REQ_REPORT_MODULE_VERSION || '0'),
        configParams: parseInt(process.env.INTEGRAM_REQ_REPORT_CONFIG_PARAMS || '0'),
      },
      recommendation: {
        up: parseInt(process.env.INTEGRAM_REQ_REC_UP || '0'),
        rank: parseInt(process.env.INTEGRAM_REQ_REC_RANK || '0'),
        ticker: parseInt(process.env.INTEGRAM_REQ_REC_TICKER || '0'),
        name: parseInt(process.env.INTEGRAM_REQ_REC_NAME || '0'),
        sector: parseInt(process.env.INTEGRAM_REQ_REC_SECTOR || '0'),
        compositeScore: parseInt(process.env.INTEGRAM_REQ_REC_COMPOSITE_SCORE || '0'),
        fundamentalScore: parseInt(process.env.INTEGRAM_REQ_REC_FUNDAMENTAL_SCORE || '0'),
        marketScore: parseInt(process.env.INTEGRAM_REQ_REC_MARKET_SCORE || '0'),
        communityScore: parseInt(process.env.INTEGRAM_REQ_REC_COMMUNITY_SCORE || '0'),
        rationale: parseInt(process.env.INTEGRAM_REQ_REC_RATIONALE || '0'),
        keyRisk: parseInt(process.env.INTEGRAM_REQ_REC_KEY_RISK || '0'),
        riskLevel: parseInt(process.env.INTEGRAM_REQ_REC_RISK_LEVEL || '0'),
        marketCap: parseInt(process.env.INTEGRAM_REQ_REC_MARKET_CAP || '0'),
        priceToAth: parseInt(process.env.INTEGRAM_REQ_REC_PRICE_TO_ATH || '0'),
        volume24h: parseInt(process.env.INTEGRAM_REQ_REC_VOLUME_24H || '0'),
        tradingPairs: parseInt(process.env.INTEGRAM_REQ_REC_TRADING_PAIRS || '0'),
      },
      sectorPerf: {
        up: parseInt(process.env.INTEGRAM_REQ_SECTOR_PERF_UP || '0'),
        sector: parseInt(process.env.INTEGRAM_REQ_SECTOR_PERF_SECTOR || '0'),
        mcapGrowth30d: parseInt(process.env.INTEGRAM_REQ_SECTOR_PERF_MCAP_GROWTH_30D || '0'),
        mcapGrowth90d: parseInt(process.env.INTEGRAM_REQ_SECTOR_PERF_MCAP_GROWTH_90D || '0'),
        score: parseInt(process.env.INTEGRAM_REQ_SECTOR_PERF_SCORE || '0'),
        selected: parseInt(process.env.INTEGRAM_REQ_SECTOR_PERF_SELECTED || '0'),
        rationale: parseInt(process.env.INTEGRAM_REQ_SECTOR_PERF_RATIONALE || '0'),
      },
      metrics: {
        project: parseInt(process.env.INTEGRAM_REQ_METRICS_PROJECT || '0'),
        date: parseInt(process.env.INTEGRAM_REQ_METRICS_DATE || '0'),
        marketCap: parseInt(process.env.INTEGRAM_REQ_METRICS_MARKET_CAP || '0'),
        volume24h: parseInt(process.env.INTEGRAM_REQ_METRICS_VOLUME_24H || '0'),
        price: parseInt(process.env.INTEGRAM_REQ_METRICS_PRICE || '0'),
        priceChange30d: parseInt(process.env.INTEGRAM_REQ_METRICS_PRICE_CHANGE_30D || '0'),
        tvl: parseInt(process.env.INTEGRAM_REQ_METRICS_TVL || '0'),
        socialScore: parseInt(process.env.INTEGRAM_REQ_METRICS_SOCIAL_SCORE || '0'),
        compositeScore: parseInt(process.env.INTEGRAM_REQ_METRICS_COMPOSITE_SCORE || '0'),
      },
      crypto: {
        name: parseInt(process.env.INTEGRAM_REQ_CRYPTO_NAME || '0'),
        coinGeckoId: parseInt(process.env.INTEGRAM_REQ_CRYPTO_COINGECKO_ID || '0'),
        logoUrl: parseInt(process.env.INTEGRAM_REQ_CRYPTO_LOGO_URL || '0'),
        website: parseInt(process.env.INTEGRAM_REQ_CRYPTO_WEBSITE || '0'),
        description: parseInt(process.env.INTEGRAM_REQ_CRYPTO_DESCRIPTION || '0'),
        lastUpdated: parseInt(process.env.INTEGRAM_REQ_CRYPTO_LAST_UPDATED || '0'),
      },
      sector: {
        description: parseInt(process.env.INTEGRAM_REQ_SECTOR_DESCRIPTION || '0'),
        narrative: parseInt(process.env.INTEGRAM_REQ_SECTOR_NARRATIVE || '0'),
        color: parseInt(process.env.INTEGRAM_REQ_SECTOR_COLOR || '0'),
      },
    };
  }

  /**
   * Helper: Get status ID from lookup table
   */
  private async getStatusId(status: string): Promise<string> {
    const SCREENING_TYPES = this.getTypeIds();
    const statuses = await this.client.getObjects(SCREENING_TYPES.REPORT_STATUS);
    const found = statuses.find((s) => s.value === status);
    return found?.id.toString() || '';
  }

  /**
   * Helper: Get sector ID from lookup table
   */
  private async getSectorId(sectorName: string): Promise<string> {
    const SCREENING_TYPES = this.getTypeIds();
    const sectors = await this.client.getObjects(SCREENING_TYPES.SECTORS);
    const found = sectors.find((s) => s.value === sectorName);
    return found?.id.toString() || '';
  }

  /**
   * Helper: Get risk level ID from lookup table
   */
  private async getRiskLevelId(riskLevel: string): Promise<string> {
    const SCREENING_TYPES = this.getTypeIds();
    const levels = await this.client.getObjects(SCREENING_TYPES.RISK_LEVELS);
    const found = levels.find((l) => l.value === riskLevel);
    return found?.id.toString() || '';
  }

  /**
   * Helper: Get or create cryptocurrency entry
   */
  private async getOrCreateCrypto(ticker: string): Promise<string> {
    const SCREENING_TYPES = this.getTypeIds();
    const REQ_IDS = this.getRequisiteIds();

    const cryptos = await this.client.getObjects(SCREENING_TYPES.CRYPTOCURRENCIES);
    const found = cryptos.find((c) => c.value === ticker);

    if (found) {
      return found.id.toString();
    }

    // Create new crypto entry
    const newCryptoId = await this.client.createObject(SCREENING_TYPES.CRYPTOCURRENCIES, ticker, {
      [REQ_IDS.crypto.name]: ticker,
      [REQ_IDS.crypto.lastUpdated]: new Date().toISOString(),
    });

    return newCryptoId.toString();
  }
}
