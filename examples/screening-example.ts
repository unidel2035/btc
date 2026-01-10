import { config } from 'dotenv';
import { ScreeningModule } from '../src/analyzers/screening/index.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

config();

/**
 * Example: Cryptocurrency Screening Module
 *
 * Demonstrates the complete screening pipeline to select
 * 2-4 high-potential cryptocurrency projects for trading
 */
async function runScreeningExample(): Promise<void> {
  console.info('🔍 Cryptocurrency Screening Module Example\n');

  try {
    // Initialize screening module
    const apiKey = process.env.COINGECKO_API_KEY; // Optional
    const screeningModule = new ScreeningModule(apiKey);

    console.info('Configuration:');
    console.info(JSON.stringify(screeningModule.getConfig(), null, 2));
    console.info('');

    // Check health
    const isHealthy = await screeningModule.healthCheck();
    if (!isHealthy) {
      console.error('❌ CoinGecko API is not available');
      process.exit(1);
    }

    console.info('✅ API connection verified\n');

    // Run the screening pipeline
    console.info('Starting screening pipeline...\n');

    const report = await screeningModule.runScreening();

    // Display results
    console.info('\n📊 SCREENING RESULTS\n');
    console.info(`Selected Sectors: ${report.analyzedSectors.join(', ')}`);
    console.info(`Projects Analyzed: ${report.totalProjectsAnalyzed}`);
    console.info(`Recommendations: ${report.recommendations.length}\n`);

    console.info('Recommended Projects:');
    for (const rec of report.recommendations) {
      console.info(`  ${rec.rank}. ${rec.name} (${rec.ticker})`);
      console.info(`     Sector: ${rec.sector}`);
      console.info(`     Score: ${rec.score.toFixed(2)}`);
      console.info(`     Risk: ${rec.riskLevel}`);
      console.info(`     Rationale: ${rec.rationale}`);
      console.info('');
    }

    console.info('Trading Pairs:');
    console.info(`  ${report.tradingPairs.join(', ')}\n`);

    // Generate and save full report
    const formattedReport = screeningModule.portfolioConstruction.formatReport(report);
    const reportPath = join(process.cwd(), 'screening-report.md');
    writeFileSync(reportPath, formattedReport, 'utf-8');

    console.info(`📄 Full report saved to: ${reportPath}\n`);

    // Save JSON report
    const jsonPath = join(process.cwd(), 'screening-report.json');
    writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

    console.info(`📋 JSON report saved to: ${jsonPath}\n`);

    console.info('✅ Screening completed successfully');
  } catch (error) {
    console.error('❌ Screening failed:', error);
    process.exit(1);
  }
}

// Run the example
runScreeningExample().catch((error: Error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
