/**
 * AI Screening Module Tests
 */

import { ScreeningOrchestrator } from '../../src/analyzers/screening/index.js';

async function runTests() {
  console.log('🧪 AI Screening Module - Tests\n');

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Configuration validation
  console.log('Test 1: Default configuration validation...');
  try {
    const config = ScreeningOrchestrator.getDefaultConfig();

    // Validate weights sum to 1.0
    const weightsSum = config.weights.fundamental + config.weights.market + config.weights.community;
    if (Math.abs(weightsSum - 1.0) > 0.001) {
      throw new Error(`Weights sum to ${weightsSum}, expected 1.0`);
    }

    // Validate ratios
    const ratiosSum = config.bluechipRatio + config.gazzelleRatio;
    if (Math.abs(ratiosSum - 1.0) > 0.001) {
      throw new Error(`Ratios sum to ${ratiosSum}, expected 1.0`);
    }

    // Validate positive values
    if (config.minVolume24h <= 0 || config.maxSectors <= 0 || config.finalProjectCount <= 0) {
      throw new Error('Invalid configuration values');
    }

    console.log('✅ Configuration validation passed\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ Configuration validation failed:', error);
    testsFailed++;
  }

  // Test 2: Orchestrator initialization
  console.log('Test 2: Orchestrator initialization...');
  try {
    const config = ScreeningOrchestrator.getDefaultConfig();
    const orchestrator = new ScreeningOrchestrator(config);

    if (!orchestrator) {
      throw new Error('Failed to create orchestrator');
    }

    console.log('✅ Orchestrator initialization passed\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ Orchestrator initialization failed:', error);
    testsFailed++;
  }

  // Test 3: Environment configuration
  console.log('Test 3: Environment configuration loading...');
  try {
    // Set test environment variables
    process.env.SCREENING_MAX_SECTORS = '2';
    process.env.SCREENING_FINAL_COUNT = '3';
    process.env.SCREENING_MIN_VOLUME = '5000000';

    const orchestrator = ScreeningOrchestrator.fromEnv();

    if (!orchestrator) {
      throw new Error('Failed to create orchestrator from env');
    }

    console.log('✅ Environment configuration passed\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ Environment configuration failed:', error);
    testsFailed++;
  }

  // Test 4: Custom configuration
  console.log('Test 4: Custom configuration...');
  try {
    const customConfig = {
      ...ScreeningOrchestrator.getDefaultConfig(),
      maxSectors: 2,
      finalProjectCount: 3,
      minVolume24h: 5_000_000,
      bluechipRatio: 0.33,
      gazzelleRatio: 0.67,
    };

    const orchestrator = new ScreeningOrchestrator(customConfig);

    if (!orchestrator) {
      throw new Error('Failed to create orchestrator with custom config');
    }

    console.log('✅ Custom configuration passed\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ Custom configuration failed:', error);
    testsFailed++;
  }

  // Test 5: Configuration validation - invalid weights
  console.log('Test 5: Invalid weights validation...');
  try {
    const invalidConfig = {
      ...ScreeningOrchestrator.getDefaultConfig(),
      weights: {
        fundamental: 0.5,
        market: 0.3,
        community: 0.3, // Sum = 1.1, invalid
      },
    };

    const weightsSum =
      invalidConfig.weights.fundamental +
      invalidConfig.weights.market +
      invalidConfig.weights.community;

    if (Math.abs(weightsSum - 1.0) > 0.001) {
      console.log(`✅ Correctly detected invalid weights (sum=${weightsSum})\n`);
      testsPassed++;
    } else {
      throw new Error('Failed to detect invalid weights');
    }
  } catch (error) {
    console.error('❌ Invalid weights validation failed:', error);
    testsFailed++;
  }

  // Summary
  console.log('='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total tests: ${testsPassed + testsFailed}`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log('='.repeat(80));

  if (testsFailed > 0) {
    console.error('\n❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
