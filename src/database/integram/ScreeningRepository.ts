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
  SCREENING_TYPES,
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
      // Get table type IDs from environment
      const SCREENING_TYPES = this.getTypeIds();

      // 1. Create main report object
      const reportValue = new Date(report.generatedAt).toISOString();
      const duration = 0; // Will be calculated if needed
      const moduleVersion = process.env.npm_package_version || '0.1.0';

      const reportId = await this.client.createObject(
        SCREENING_TYPES.SCREENING_REPORTS,
        reportValue,
        {
          generatedAt: report.generatedAt.toISOString(),
          analyzedSectors: JSON.stringify(report.analyzedSectors),
          projectsCount: report.totalProjectsAnalyzed,
          status: 'completed',
          duration,
          moduleVersion,
          configParams: JSON.stringify({}), // Can be extended later
        },
      );

      // 2. Save sector performance (subordinate to report)
      for (const sector of report.selectedSectors) {
        await this.saveSectorPerformance(reportId, sector, SCREENING_TYPES);
      }

      // 3. Save recommendations (subordinate to report)
      for (const recommendation of report.recommendations) {
        await this.saveRecommendation(reportId, recommendation, SCREENING_TYPES);
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

      await this.client.createObject(
        SCREENING_TYPES.PROJECT_METRICS_HISTORY,
        new Date().toISOString(),
        {
          project: ticker,
          date: new Date().toISOString(),
          marketCap: metrics.marketCap || 0,
          tradingVolume24h: metrics.volume24h || 0,
          price: metrics.currentPrice || 0,
          priceChange30d: metrics.priceChange30d || 0,
          tvl: metrics.tvl || null,
          socialScore: metrics.communityScore || 0,
          compositeScore: metrics.totalScore || 0,
        },
      );
    } catch (error) {
      console.error(`Failed to save project metrics for ${ticker}:`, error);
    }
  }

  /**
   * Helper: Save sector performance
   */
  private async saveSectorPerformance(
    reportId: number,
    sector: any,
    SCREENING_TYPES: any,
  ): Promise<void> {
    await this.client.createObject(SCREENING_TYPES.SECTOR_PERFORMANCE, sector.sector, {
      up: reportId,
      sector: sector.sector,
      marketCapGrowth30d: sector.marketCapChange30d || 0,
      marketCapGrowth90d: sector.marketCapChange90d || 0,
      sectorScore: sector.score || 0,
      selected: true,
      rationale: sector.narrative || '',
    });
  }

  /**
   * Helper: Save recommendation
   */
  private async saveRecommendation(
    reportId: number,
    recommendation: ProjectRecommendation,
    SCREENING_TYPES: any,
  ): Promise<void> {
    await this.client.createObject(
      SCREENING_TYPES.SCREENING_RECOMMENDATIONS,
      recommendation.ticker,
      {
        up: reportId,
        rank: recommendation.rank,
        ticker: recommendation.ticker,
        name: recommendation.name,
        sector: recommendation.sector || '',
        compositeScore: recommendation.score,
        fundamentalScore: 0, // Can be extracted from detailed scoring
        marketScore: 0,
        communityScore: 0,
        rationale: recommendation.rationale,
        keyRisk: recommendation.keyRisk,
        riskLevel: recommendation.riskLevel,
        marketCap: recommendation.marketCap,
        priceToAth: recommendation.priceToAth,
        volume24h: recommendation.volume24h,
        tradingPairs: JSON.stringify(recommendation.tradingPairs),
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
    };
  }
}
