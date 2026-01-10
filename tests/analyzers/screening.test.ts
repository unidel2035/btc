import { ScreeningModule, CoinGeckoClient } from '../../src/analyzers/screening/index.js';
import type { CryptoSector } from '../../src/analyzers/screening/types.js';

/**
 * Unit tests for Screening Module
 */

async function testCoinGeckoClient(): Promise<void> {
  console.info('\n🧪 Test: CoinGecko Client');

  const client = new CoinGeckoClient();

  // Test ping
  console.info('  Testing API connectivity...');
  const isOnline = await client.ping();
  if (!isOnline) {
    throw new Error('CoinGecko API is not reachable');
  }
  console.info('  ✅ API is reachable');

  // Test market data fetch
  console.info('  Testing market data fetch...');
  const marketData = await client.getMarketData(1, 10);
  if (marketData.length === 0) {
    throw new Error('No market data returned');
  }
  console.info(`  ✅ Fetched ${marketData.length} coins`);

  // Test category fetch
  console.info('  Testing categories fetch...');
  const categories = await client.getCategories();
  if (categories.length === 0) {
    throw new Error('No categories returned');
  }
  console.info(`  ✅ Fetched ${categories.length} categories`);

  console.info('✅ CoinGecko Client tests passed\n');
}

async function testScreeningModule(): Promise<void> {
  console.info('\n🧪 Test: Screening Module');

  const module = new ScreeningModule();

  // Test health check
  console.info('  Testing health check...');
  const isHealthy = await module.healthCheck();
  if (!isHealthy) {
    throw new Error('Health check failed');
  }
  console.info('  ✅ Health check passed');

  // Test configuration
  console.info('  Testing configuration...');
  const config = module.getConfig();
  if (!config || !config.macroFilter || !config.quantitativeScreening) {
    throw new Error('Invalid configuration');
  }
  console.info('  ✅ Configuration is valid');

  console.info('✅ Screening Module tests passed\n');
}

async function testScreeningPipeline(): Promise<void> {
  console.info('\n🧪 Test: Screening Pipeline (Limited)');

  const module = new ScreeningModule();

  // Use a limited set of sectors for testing
  const testSectors: CryptoSector[] = ['ai-crypto', 'defi'];

  console.info('  Running screening pipeline with limited sectors...');
  console.info(`  Sectors: ${testSectors.join(', ')}\n`);

  try {
    const report = await module.runScreening(testSectors);

    // Validate report
    if (!report) {
      throw new Error('No report generated');
    }

    if (report.recommendations.length === 0) {
      console.warn('  ⚠️ No recommendations generated (this may be due to strict filters)');
    } else {
      console.info(`  ✅ Generated ${report.recommendations.length} recommendations`);
    }

    if (report.totalProjectsAnalyzed === 0) {
      throw new Error('No projects were analyzed');
    }
    console.info(`  ✅ Analyzed ${report.totalProjectsAnalyzed} projects`);

    if (report.tradingPairs.length > 0) {
      console.info(`  ✅ Generated trading pairs: ${report.tradingPairs.join(', ')}`);
    }

    console.info('✅ Screening Pipeline test passed\n');
  } catch (error) {
    console.error('  ❌ Pipeline test failed:', error);
    throw error;
  }
}

async function runTests(): Promise<void> {
  console.info('='.repeat(60));
  console.info('🧪 Screening Module Test Suite');
  console.info('='.repeat(60));

  const tests = [
    { name: 'CoinGecko Client', fn: testCoinGeckoClient },
    { name: 'Screening Module', fn: testScreeningModule },
    { name: 'Screening Pipeline', fn: testScreeningPipeline },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      passed++;
    } catch (error) {
      console.error(`\n❌ Test failed: ${test.name}`);
      console.error(error);
      failed++;
    }
  }

  console.info('='.repeat(60));
  console.info(`✅ Tests passed: ${passed}`);
  console.info(`❌ Tests failed: ${failed}`);
  console.info('='.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch((error: Error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
