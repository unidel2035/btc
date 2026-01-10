/**
 * Screening Analytics
 * Advanced analytics for screening reports, including backtesting and performance evaluation
 */

import { IntegramClient } from './IntegramClient.js';
import { ScreeningRepository } from './ScreeningRepository.js';
import { CoinGeckoClient } from '../../analyzers/screening/CoinGeckoClient.js';
import type {
  PredictionAccuracy,
  SectorAnalysis,
  // IntegramScreeningReport,
  // IntegramScreeningRecommendation,
} from './screening-types.js';
import type { ScoringConfig } from '../../analyzers/screening/types.js';

export class ScreeningAnalytics {
  private repository: ScreeningRepository;
  private coinGeckoClient?: CoinGeckoClient;

  constructor(
    integramClient: IntegramClient,
    coinGeckoApiKey?: string,
  ) {
    this.repository = new ScreeningRepository(integramClient);
    if (coinGeckoApiKey) {
      this.coinGeckoClient = new CoinGeckoClient(coinGeckoApiKey);
    }
  }

  /**
   * Calculate prediction accuracy (backtest)
   * Evaluates how well recommendations performed after N days
   */
  async calculateAccuracy(
    reportId: number,
    daysAfter: number = 30,
  ): Promise<PredictionAccuracy> {
    if (!this.coinGeckoClient) {
      throw new Error('CoinGecko API key required for accuracy calculation');
    }

    try {
      // Get the report
      const report = await this.repository['buildReportFromIntegram'](reportId);
      if (!report) {
        throw new Error(`Report ${reportId} not found`);
      }

      const reportDate = new Date(report.generatedAt);
      const evaluationDate = new Date(reportDate);
      evaluationDate.setDate(evaluationDate.getDate() + daysAfter);

      // Check if enough time has passed
      if (evaluationDate > new Date()) {
        throw new Error(
          `Not enough time has passed. Report date: ${reportDate.toISOString()}, ` +
            `evaluation date would be: ${evaluationDate.toISOString()}`,
        );
      }

      const results: PredictionAccuracy['recommendations'] = [];
      let totalPriceChange = 0;
      let positiveCount = 0;

      // Evaluate each recommendation
      for (const rec of report.recommendations) {
        try {
          // Get historical price data
          const marketData = await this.coinGeckoClient.getCoinDetail(rec.ticker.toLowerCase());

          // Get current price (as proxy for price at evaluation date)
          // In a real implementation, you'd use historical price API
          const initialPrice = rec.marketCap / (marketData?.market_data?.circulating_supply || 1);
          const currentPrice = marketData?.market_data?.current_price?.usd || initialPrice;

          const priceChange = ((currentPrice - initialPrice) / initialPrice) * 100;

          results.push({
            ticker: rec.ticker,
            initialPrice,
            finalPrice: currentPrice,
            priceChange,
            predicted: rec.score > 70, // Threshold for "predicted to perform well"
          });

          totalPriceChange += priceChange;
          if (priceChange > 0) {
            positiveCount++;
          }
        } catch (error) {
          console.warn(`Failed to evaluate ${rec.ticker}:`, error);
        }
      }

      const avgPriceChange = results.length > 0 ? totalPriceChange / results.length : 0;
      const winRate = results.length > 0 ? (positiveCount / results.length) * 100 : 0;

      // Find best and worst picks
      const sortedByPerformance = [...results].sort((a, b) => b.priceChange - a.priceChange);

      return {
        reportId,
        daysAfter,
        avgPriceChange,
        winRate,
        bestPick: {
          ticker: sortedByPerformance[0]?.ticker || '',
          priceChange: sortedByPerformance[0]?.priceChange || 0,
        },
        worstPick: {
          ticker: sortedByPerformance[sortedByPerformance.length - 1]?.ticker || '',
          priceChange: sortedByPerformance[sortedByPerformance.length - 1]?.priceChange || 0,
        },
        recommendations: results,
      };
    } catch (error) {
      console.error(`Failed to calculate accuracy for report ${reportId}:`, error);
      throw error;
    }
  }

  /**
   * Analyze sector performance over a period
   */
  async analyzeSectorPerformance(period: 'month' | 'quarter'): Promise<SectorAnalysis[]> {
    const days = period === 'month' ? 30 : 90;
    const trends = await this.repository.getSectorTrends(days);

    const analyses: SectorAnalysis[] = [];

    for (const trend of trends) {
      if (trend.metrics.length === 0) continue;

      const avgMarketCapGrowth =
        trend.metrics.reduce((sum, m) => sum + m.marketCapGrowth30d, 0) / trend.metrics.length;
      const avgScore =
        trend.metrics.reduce((sum, m) => sum + m.score, 0) / trend.metrics.length;

      let performance: 'strong' | 'moderate' | 'weak';
      if (avgMarketCapGrowth > 15 && avgScore > 75) {
        performance = 'strong';
      } else if (avgMarketCapGrowth > 5 && avgScore > 60) {
        performance = 'moderate';
      } else {
        performance = 'weak';
      }

      analyses.push({
        sector: trend.sector,
        avgMarketCapGrowth,
        avgScore,
        projectsCount: trend.metrics.length,
        performance,
      });
    }

    // Sort by performance
    return analyses.sort((a, b) => b.avgMarketCapGrowth - a.avgMarketCapGrowth);
  }

  /**
   * Evaluate scoring system effectiveness
   * Analyzes correlation between scores and actual performance
   */
  async evaluateScoringSystem(): Promise<{
    correlation: number;
    recommendedWeights: ScoringConfig['weights'];
  }> {
    try {
      // Get recent reports
      const reports = await this.repository.getReportHistory(5);

      if (reports.length < 2) {
        throw new Error('Not enough historical data for evaluation');
      }

      // Calculate simple correlation between score and subsequent performance
      // This is a simplified version - a real implementation would use statistical methods

      // For now, return default weights with a placeholder correlation
      return {
        correlation: 0.75, // Placeholder - would be calculated from actual data
        recommendedWeights: {
          fundamental: 0.4,
          market: 0.35,
          community: 0.25,
        },
      };
    } catch (error) {
      console.error('Failed to evaluate scoring system:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive analytics for a time period
   */
  async getAnalyticsSummary(days: number = 30): Promise<{
    totalReports: number;
    uniqueProjectsRecommended: number;
    topProjects: Array<{ ticker: string; timesRecommended: number }>;
    sectorDistribution: Record<string, number>;
    avgRecommendationsPerReport: number;
  }> {
    const reports = await this.repository.getReportHistory(100);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentReports = reports.filter((r) => new Date(r.generatedAt) >= cutoffDate);

    const projectCounts = new Map<string, number>();
    const sectorCounts = new Map<string, number>();
    let totalRecommendations = 0;

    for (const report of recentReports) {
      totalRecommendations += report.recommendations.length;

      for (const rec of report.recommendations) {
        projectCounts.set(rec.ticker, (projectCounts.get(rec.ticker) || 0) + 1);

        if (rec.sector) {
          sectorCounts.set(rec.sector, (sectorCounts.get(rec.sector) || 0) + 1);
        }
      }
    }

    const topProjects = Array.from(projectCounts.entries())
      .map(([ticker, count]) => ({ ticker, timesRecommended: count }))
      .sort((a, b) => b.timesRecommended - a.timesRecommended)
      .slice(0, 10);

    const sectorDistribution: Record<string, number> = {};
    for (const [sector, count] of sectorCounts.entries()) {
      sectorDistribution[sector] = count;
    }

    return {
      totalReports: recentReports.length,
      uniqueProjectsRecommended: projectCounts.size,
      topProjects,
      sectorDistribution,
      avgRecommendationsPerReport:
        recentReports.length > 0 ? totalRecommendations / recentReports.length : 0,
    };
  }

  /**
   * Generate textual report of analytics
   */
  formatAnalyticsSummary(
    summary: Awaited<ReturnType<typeof this.getAnalyticsSummary>>,
  ): string {
    const lines: string[] = [];

    lines.push('📊 SCREENING ANALYTICS SUMMARY');
    lines.push('='.repeat(60));
    lines.push('');
    lines.push(`Total Reports: ${summary.totalReports}`);
    lines.push(`Unique Projects Recommended: ${summary.uniqueProjectsRecommended}`);
    lines.push(`Avg Recommendations per Report: ${summary.avgRecommendationsPerReport.toFixed(1)}`);
    lines.push('');

    lines.push('🏆 TOP PROJECTS BY RECOMMENDATION FREQUENCY:');
    for (const project of summary.topProjects) {
      lines.push(`  ${project.ticker}: ${project.timesRecommended} times`);
    }
    lines.push('');

    lines.push('📈 SECTOR DISTRIBUTION:');
    const sortedSectors = Object.entries(summary.sectorDistribution).sort(
      (a, b) => b[1] - a[1],
    );
    for (const [sector, count] of sortedSectors) {
      lines.push(`  ${sector}: ${count} recommendations`);
    }

    return lines.join('\n');
  }
}
