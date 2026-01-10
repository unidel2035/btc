/**
 * Screening + Integram Integration Example
 * Demonstrates how to use the screening module with Integram database integration
 */

import * as dotenv from 'dotenv';
import { ScreeningModule } from '../src/analyzers/screening/ScreeningModule.js';
import {
  IntegramClient,
  ScreeningRepository,
  ScreeningAnalytics,
  ScreeningSync,
} from '../src/database/integram/index.js';
import { INTEGRAM_CONFIG } from '../src/database/integram/config.js';

dotenv.config();

async function main() {
  console.log('🚀 Screening + Integram Integration Example');
  console.log('='.repeat(60));
  console.log('');

  // Initialize Integram client using config
  const integramClient = new IntegramClient({
    serverURL: INTEGRAM_CONFIG.serverUrl,
    database: INTEGRAM_CONFIG.database,
    login: INTEGRAM_CONFIG.login,
    password: INTEGRAM_CONFIG.password,
  });

  // Authenticate with Integram
  try {
    await integramClient.authenticate();
    console.log('✅ Connected to Integram');
    console.log(`   Database: ${INTEGRAM_CONFIG.database}`);
    console.log(`   Server: ${INTEGRAM_CONFIG.serverUrl}`);
  } catch (error) {
    console.error('❌ Failed to connect to Integram:', error);
    process.exit(1);
  }

  console.log('');

  // Example 1: Run screening with automatic Integram saving
  console.log('📊 Example 1: Running Screening with Auto-Save');
  console.log('-'.repeat(60));

  const screeningModule = new ScreeningModule(
    process.env.COINGECKO_API_KEY,
    undefined,
    integramClient, // Pass Integram client for auto-save
  );

  try {
    const report = await screeningModule.runScreening();
    console.log('Report generated and automatically saved to Integram!');
    console.log(`  - ${report.recommendations.length} recommendations`);
    console.log(`  - Analyzed sectors: ${report.analyzedSectors.join(', ')}`);
  } catch (error) {
    console.error('Failed to run screening:', error);
  }

  console.log('');

  // Example 2: Access screening repository directly
  console.log('📚 Example 2: Accessing Screening History');
  console.log('-'.repeat(60));

  const repository = new ScreeningRepository(integramClient);

  try {
    // Get latest report
    const latestReport = await repository.getLatestReport();
    if (latestReport) {
      console.log('Latest report:');
      console.log(`  - Generated: ${latestReport.generatedAt.toISOString()}`);
      console.log(`  - Projects analyzed: ${latestReport.totalProjectsAnalyzed}`);
      console.log(`  - Top recommendation: ${latestReport.recommendations[0]?.ticker || 'N/A'}`);
    }

    console.log('');

    // Get report history
    const history = await repository.getReportHistory(5);
    console.log(`Found ${history.length} reports in history`);
    for (const report of history) {
      console.log(`  - ${report.generatedAt.toISOString()}: ${report.recommendations.length} recs`);
    }
  } catch (error) {
    console.error('Failed to access history:', error);
  }

  console.log('');

  // Example 3: Compare reports
  console.log('🔍 Example 3: Comparing Reports');
  console.log('-'.repeat(60));

  try {
    const history = await repository.getReportHistory(2);
    if (history.length >= 2) {
      // Note: We need report IDs from Integram, this is a simplified example
      console.log('Would compare reports, but need actual Integram IDs');
      console.log('Example usage:');
      console.log('  const comparison = await repository.compareReports(reportId1, reportId2);');
      console.log('  console.log(`New additions: ${comparison.newAdditions.length}`);');
      console.log('  console.log(`Removed: ${comparison.removed.length}`);');
    }
  } catch (error) {
    console.error('Failed to compare reports:', error);
  }

  console.log('');

  // Example 4: Project history and trends
  console.log('📈 Example 4: Project History and Trends');
  console.log('-'.repeat(60));

  try {
    // Get top projects by recommendation frequency
    const topProjects = await repository.getTopProjects('month');
    console.log('Top projects (last 30 days):');
    for (const project of topProjects.slice(0, 5)) {
      console.log(
        `  ${project.ticker}: recommended ${project.timesRecommended} times ` +
          `(avg score: ${project.averageScore.toFixed(1)})`,
      );
    }

    console.log('');

    // Get sector trends
    const sectorTrends = await repository.getSectorTrends(90);
    console.log('Sector trends (last 90 days):');
    for (const trend of sectorTrends.slice(0, 3)) {
      if (trend.metrics.length > 0) {
        const avgGrowth =
          trend.metrics.reduce((sum, m) => sum + m.marketCapGrowth30d, 0) /
          trend.metrics.length;
        console.log(`  ${trend.sector}: ${avgGrowth.toFixed(1)}% avg 30d growth`);
      }
    }
  } catch (error) {
    console.error('Failed to get trends:', error);
  }

  console.log('');

  // Example 5: Analytics and backtesting
  console.log('🎯 Example 5: Analytics and Backtesting');
  console.log('-'.repeat(60));

  const analytics = new ScreeningAnalytics(integramClient, process.env.COINGECKO_API_KEY);

  try {
    // Get analytics summary
    const summary = await analytics.getAnalyticsSummary(30);
    console.log(analytics.formatAnalyticsSummary(summary));

    console.log('');

    // Analyze sector performance
    const sectorAnalysis = await analytics.analyzeSectorPerformance('month');
    console.log('Sector Performance Analysis:');
    for (const analysis of sectorAnalysis.slice(0, 5)) {
      console.log(
        `  ${analysis.sector}: ${analysis.performance} ` +
          `(${analysis.avgMarketCapGrowth.toFixed(1)}% growth, ` +
          `score: ${analysis.avgScore.toFixed(1)})`,
      );
    }

    console.log('');

    // Note: Accuracy calculation requires historical data and CoinGecko API
    console.log('Prediction Accuracy (requires historical data):');
    console.log('  Example usage:');
    console.log('  const accuracy = await analytics.calculateAccuracy(reportId, 30);');
    console.log('  console.log(`Win rate: ${accuracy.winRate}%`);');
    console.log('  console.log(`Avg return: ${accuracy.avgPriceChange}%`);');
  } catch (error) {
    console.error('Failed to calculate analytics:', error);
  }

  console.log('');

  // Example 6: Background synchronization
  console.log('⏰ Example 6: Background Synchronization');
  console.log('-'.repeat(60));

  const sync = new ScreeningSync(integramClient, process.env.COINGECKO_API_KEY);

  console.log('Background sync features:');
  console.log('  - Daily project metrics updates (00:00)');
  console.log('  - Weekly accuracy calculations (01:00 Sunday)');
  console.log('');
  console.log('To start background jobs:');
  console.log('  sync.start();');
  console.log('');
  console.log('To run one-time sync:');
  console.log('  await sync.syncAll();');

  // Uncomment to actually run sync
  // await sync.syncAll();

  console.log('');

  // Example 7: Manual data saving
  console.log('💾 Example 7: Manual Data Operations');
  console.log('-'.repeat(60));

  try {
    // Example of saving project metrics manually
    console.log('Saving project metrics manually:');
    await repository.saveProjectMetrics('BTC', {
      marketCap: 1000000000,
      volume24h: 50000000,
      currentPrice: 50000,
      priceChange30d: 10.5,
      tvl: null,
      communityScore: 95,
      totalScore: 88,
    });
    console.log('  ✅ BTC metrics saved');

    console.log('');

    // Get project history
    const btcHistory = await repository.getProjectHistory('BTC', 30);
    console.log(`BTC history (last 30 days): ${btcHistory.metrics.length} data points`);
  } catch (error) {
    console.error('Failed to save/retrieve metrics:', error);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('✅ Example completed successfully!');
  console.log('');
  console.log('📚 Key takeaways:');
  console.log('  1. Pass IntegramClient to ScreeningModule for auto-save');
  console.log('  2. Use ScreeningRepository for data access and queries');
  console.log('  3. Use ScreeningAnalytics for backtesting and insights');
  console.log('  4. Use ScreeningSync for background data updates');
  console.log('');
  console.log('🔗 Database setup:');
  console.log('  - Create tables in Integram web interface');
  console.log('  - Set INTEGRAM_TYPE_* environment variables');
  console.log('  - See src/database/integram/screening-types.ts for schema');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
