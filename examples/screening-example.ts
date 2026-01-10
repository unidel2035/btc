/**
 * AI Screening Module - Example Usage
 * Demonstrates how to use the screening module to find promising crypto projects
 */

import { ScreeningOrchestrator } from '../src/analyzers/screening/index.js';
import { mkdir } from 'fs/promises';
import { config } from 'dotenv';

// Load environment variables
config();

async function main() {
  console.log('🚀 AI Screening Module - Example\n');

  try {
    // Ensure reports directory exists
    await mkdir('./reports', { recursive: true });

    // Option 1: Use default configuration
    console.log('Creating orchestrator with default config...');
    const defaultConfig = ScreeningOrchestrator.getDefaultConfig();
    const orchestrator = new ScreeningOrchestrator(
      defaultConfig,
      process.env.COINGECKO_API_KEY
    );

    // Option 2: Use custom configuration
    // const customConfig = {
    //   ...ScreeningOrchestrator.getDefaultConfig(),
    //   maxSectors: 2,
    //   finalProjectCount: 3,
    //   bluechipRatio: 0.33,
    //   gazzelleRatio: 0.67,
    // };
    // const orchestrator = new ScreeningOrchestrator(
    //   customConfig,
    //   process.env.COINGECKO_API_KEY
    // );

    // Option 3: Create from environment variables
    // const orchestrator = ScreeningOrchestrator.fromEnv();

    // Run screening and save reports
    console.log('Running screening process...\n');
    const report = await orchestrator.runAndSaveReport(
      './reports',
      ['markdown', 'json', 'csv']
    );

    console.log('\n✅ Screening complete!');
    console.log(`\nRecommended trading pairs:`);
    report.recommendedProjects.forEach(project => {
      console.log(`  - ${project.tradingPair}`);
    });

    console.log('\n📁 Reports saved to ./reports directory');
    console.log('   - Markdown report for human reading');
    console.log('   - JSON report for programmatic use');
    console.log('   - CSV report for spreadsheet import');

  } catch (error) {
    console.error('\n❌ Error running screening:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;
