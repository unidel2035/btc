/**
 * Screening Data Synchronization
 * Background jobs for updating project metrics and calculating accuracy
 */

import cron from 'node-cron';
import { IntegramClient } from './IntegramClient.js';
import { ScreeningRepository } from './ScreeningRepository.js';
import { ScreeningAnalytics } from './ScreeningAnalytics.js';
import { CoinGeckoClient } from '../../analyzers/screening/CoinGeckoClient.js';

export class ScreeningSync {
  private repository: ScreeningRepository;
  private analytics: ScreeningAnalytics;
  private coinGeckoClient: CoinGeckoClient;
  private jobs: cron.ScheduledTask[] = [];

  constructor(
    integramClient: IntegramClient,
    coinGeckoApiKey?: string,
  ) {
    this.repository = new ScreeningRepository(integramClient);
    this.analytics = new ScreeningAnalytics(integramClient, coinGeckoApiKey);
    this.coinGeckoClient = new CoinGeckoClient(coinGeckoApiKey);
  }

  /**
   * Start all background sync jobs
   */
  start(): void {
    // Update project metrics daily at midnight
    const dailyMetricsJob = cron.schedule('0 0 * * *', async () => {
      console.log('🔄 Starting daily project metrics update...');
      await this.updateProjectMetrics();
    });
    this.jobs.push(dailyMetricsJob);

    // Calculate prediction accuracy weekly on Sundays at 1 AM
    const weeklyAccuracyJob = cron.schedule('0 1 * * 0', async () => {
      console.log('📊 Starting weekly accuracy calculation...');
      await this.calculateWeeklyAccuracy();
    });
    this.jobs.push(weeklyAccuracyJob);

    console.log('✅ Screening sync jobs started');
    console.log('  - Daily metrics update: 00:00 every day');
    console.log('  - Weekly accuracy calculation: 01:00 every Sunday');
  }

  /**
   * Stop all background jobs
   */
  stop(): void {
    for (const job of this.jobs) {
      job.stop();
    }
    this.jobs = [];
    console.log('⏹️  Screening sync jobs stopped');
  }

  /**
   * Update metrics for all active projects
   */
  async updateProjectMetrics(): Promise<void> {
    try {
      // Get recent reports to find active projects
      const reports = await this.repository.getReportHistory(5);
      const activeProjects = new Set<string>();

      for (const report of reports) {
        for (const rec of report.recommendations) {
          activeProjects.add(rec.ticker);
        }
      }

      console.log(`Updating metrics for ${activeProjects.size} active projects...`);

      let updated = 0;
      let failed = 0;

      for (const ticker of activeProjects) {
        try {
          // Fetch latest data from CoinGecko
          const coinData = await this.coinGeckoClient.getCoinDetails(ticker.toLowerCase());

          if (coinData) {
            const metrics = {
              marketCap: coinData.market_data?.market_cap?.usd || 0,
              volume24h: coinData.market_data?.total_volume?.usd || 0,
              currentPrice: coinData.market_data?.current_price?.usd || 0,
              priceChange30d:
                coinData.market_data?.price_change_percentage_30d_in_currency?.usd || 0,
              tvl: null, // Would need DeFi Llama integration
              communityScore: coinData.community_data?.twitter_followers || 0,
              totalScore: 0, // Would recalculate if needed
            };

            await this.repository.saveProjectMetrics(ticker, metrics);
            updated++;
          }
        } catch (error) {
          console.warn(`Failed to update metrics for ${ticker}:`, error);
          failed++;
        }

        // Rate limiting - sleep between requests
        await this.sleep(1000);
      }

      console.log(`✅ Metrics update complete: ${updated} updated, ${failed} failed`);
    } catch (error) {
      console.error('❌ Failed to update project metrics:', error);
    }
  }

  /**
   * Calculate prediction accuracy for recent reports
   */
  async calculateWeeklyAccuracy(): Promise<void> {
    try {
      // Get reports from the last 4 weeks
      const reports = await this.repository.getReportHistory(4);

      console.log(`Calculating accuracy for ${reports.length} recent reports...`);

      const results: Array<{
        reportId: number;
        date: Date;
        avgReturn: number;
        winRate: number;
      }> = [];

      for (const report of reports) {
        try {
          // Calculate accuracy after 7 days
          const reportDate = new Date(report.generatedAt);
          const daysAgo = Math.floor(
            (Date.now() - reportDate.getTime()) / (1000 * 60 * 60 * 24),
          );

          if (daysAgo >= 7) {
            const accuracy = await this.analytics.calculateAccuracy(
              parseInt(report.generatedAt.getTime().toString()),
              7,
            );

            results.push({
              reportId: parseInt(report.generatedAt.getTime().toString()),
              date: report.generatedAt,
              avgReturn: accuracy.avgPriceChange,
              winRate: accuracy.winRate,
            });

            console.log(
              `  Report ${report.generatedAt.toISOString()}: ` +
                `${accuracy.avgPriceChange.toFixed(2)}% avg return, ` +
                `${accuracy.winRate.toFixed(0)}% win rate`,
            );
          }
        } catch (error) {
          console.warn(`Failed to calculate accuracy for report:`, error);
        }
      }

      console.log(`✅ Accuracy calculation complete for ${results.length} reports`);
    } catch (error) {
      console.error('❌ Failed to calculate weekly accuracy:', error);
    }
  }

  /**
   * Run a one-time sync of all data
   */
  async syncAll(): Promise<void> {
    console.log('🔄 Starting full data sync...');
    await this.updateProjectMetrics();
    await this.calculateWeeklyAccuracy();
    console.log('✅ Full sync complete');
  }

  /**
   * Helper: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
