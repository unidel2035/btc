/**
 * Trading Pipeline Tests
 */

import { TradingPipeline } from '../../src/orchestrator/TradingPipeline.js';
import { PipelineScheduler } from '../../src/orchestrator/PipelineScheduler.js';
import { PortfolioRotationManager } from '../../src/orchestrator/PortfolioRotationManager.js';
import { TechnicalAnalyzer } from '../../src/analyzers/technical/TechnicalAnalyzer.js';
import { ScreeningModule } from '../../src/analyzers/screening/ScreeningModule.js';
import { StrategyManager, CombinationMode } from '../../src/trading/strategies/StrategyManager.js';
import { RiskManager } from '../../src/trading/risk/RiskManager.js';
import type { PipelineConfig } from '../../src/orchestrator/types.js';
import { NotificationChannel } from '../../src/trading/risk/types.js';

async function runTests() {
  console.info('🧪 Running Pipeline Tests');
  console.info('='.repeat(60));
  console.info('');

  let passedTests = 0;
  let failedTests = 0;

  // Test helper
  function test(name: string, fn: () => void | Promise<void>) {
    return async () => {
      try {
        console.info(`\n📝 Test: ${name}`);
        await fn();
        console.info(`✅ PASSED: ${name}`);
        passedTests++;
      } catch (error) {
        console.error(`❌ FAILED: ${name}`);
        console.error(`   Error: ${(error as Error).message}`);
        failedTests++;
      }
    };
  }

  // Initialize test components
  const screeningModule = new ScreeningModule();
  const technicalAnalyzer = new TechnicalAnalyzer();
  const strategyManager = new StrategyManager({ mode: CombinationMode.BEST_CONFIDENCE });
  const riskManager = new RiskManager(
    {
      maxPositions: 4,
      maxPositionSize: 0.1,
      maxDrawdown: 0.15,
      maxCorrelatedPositions: 2,
      correlationThreshold: 0.7,
      stopLossRequired: true,
      maxLeverage: 1,
      dailyLossLimit: 0.05,
    },
    10000,
    {
      enabled: true,
      channels: [NotificationChannel.CONSOLE],
      warningThreshold: 80,
    },
  );

  const testConfig: PipelineConfig = {
    screening: {
      enabled: true,
      frequency: 'weekly',
      maxPairs: 3,
    },
    technicalAnalysis: {
      enabled: true,
      frequency: '4hours',
      indicators: ['RSI', 'MACD'],
      timeframe: '4h',
      lookback: 50,
    },
    signalGeneration: {
      enabled: true,
      frequency: 'hourly',
      minConfidence: 0.65,
    },
    riskManagement: {
      enabled: true,
      maxPositions: 4,
      maxExposure: 0.4,
      requireApproval: false,
    },
    execution: {
      mode: 'dry_run' as const,
      dailyTradeLimit: 10,
      circuitBreaker: {
        enabled: true,
        maxDailyLoss: 5,
      },
    },
    notifications: {
      enabled: true,
      channels: ['dashboard'],
      priorities: {
        screening: 'low',
        signal: 'high',
        position: 'high',
        error: 'high',
      },
    },
  };

  const pipeline = new TradingPipeline(
    testConfig,
    screeningModule,
    technicalAnalyzer,
    strategyManager,
    riskManager,
  );

  // Tests
  await test('Portfolio Rotation Manager - Plan rotation', () => {
    const rotationManager = new PortfolioRotationManager();
    const currentPairs = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];
    const newPairs = ['BTC/USDT', 'RNDR/USDT', 'TAO/USDT'];

    const plan = rotationManager.planRotation(currentPairs, newPairs);

    if (plan.toKeep.length !== 1) throw new Error('Expected 1 pair to keep');
    if (plan.toClose.length !== 2) throw new Error('Expected 2 pairs to close');
    if (plan.toOpen.length !== 2) throw new Error('Expected 2 pairs to open');
    if (!plan.toKeep.includes('BTC/USDT')) throw new Error('BTC/USDT should be kept');
  })();

  await test('Technical Analyzer - Calculate indicators', async () => {
    const analysis = await technicalAnalyzer.analyze('BTC/USDT', {
      indicators: ['RSI', 'MACD', 'EMA'],
      timeframe: '4h',
      lookback: 50,
    });

    if (!analysis.indicators.rsi) throw new Error('RSI should be calculated');
    if (!analysis.indicators.macd) throw new Error('MACD should be calculated');
    if (!analysis.indicators.ema) throw new Error('EMA should be calculated');
    if (analysis.indicators.rsi < 0 || analysis.indicators.rsi > 100)
      throw new Error('RSI out of range');
  })();

  await test('Technical Analyzer - Generate signals', async () => {
    const analysis = await technicalAnalyzer.analyze('BTC/USDT', {
      indicators: ['RSI', 'MACD'],
      timeframe: '4h',
      lookback: 50,
    });

    const signals = technicalAnalyzer.generateSignals(analysis);

    if (!Array.isArray(signals)) throw new Error('Signals should be an array');
    // Signals may be empty, but should be an array
  })();

  await test('Pipeline - Initialize with config', () => {
    const state = pipeline.getState();
    const config = pipeline.getConfig();

    if (state.status !== 'idle') throw new Error('Initial status should be idle');
    if (state.emergencyStop !== false) throw new Error('Emergency stop should be false');
    if (config.screening.maxPairs !== 3) throw new Error('Config should be set');
  })();

  await test('Pipeline - Get active pairs', () => {
    const pairs = pipeline.getActivePairs();

    if (!Array.isArray(pairs)) throw new Error('Active pairs should be an array');
    // Initially empty
    if (pairs.length !== 0) throw new Error('Initially no active pairs');
  })();

  await test('Pipeline - Emergency stop and resume', () => {
    pipeline.emergencyStop();
    let state = pipeline.getState();

    if (state.emergencyStop !== true) throw new Error('Emergency stop should be true');
    if (state.status !== 'stopped') throw new Error('Status should be stopped');

    pipeline.resume();
    state = pipeline.getState();

    if (state.emergencyStop !== false) throw new Error('Emergency stop should be false');
    if (state.status !== 'idle') throw new Error('Status should be idle');
  })();

  await test('Pipeline Scheduler - Initialize jobs', () => {
    const scheduler = new PipelineScheduler(pipeline, testConfig);
    scheduler.initialize();

    const jobs = scheduler.getJobs();

    if (jobs.length === 0) throw new Error('Should have scheduled jobs');

    const screeningJob = jobs.find((j) => j.name === 'screening');
    if (!screeningJob) throw new Error('Should have screening job');

    const dailyResetJob = jobs.find((j) => j.name === 'daily_reset');
    if (!dailyResetJob) throw new Error('Should have daily reset job');
  })();

  await test('Pipeline Scheduler - Enable/disable jobs', () => {
    const scheduler = new PipelineScheduler(pipeline, testConfig);
    scheduler.initialize();

    scheduler.disableJob('screening');
    let jobs = scheduler.getJobs();
    let screeningJob = jobs.find((j) => j.name === 'screening');
    if (screeningJob?.enabled !== false) throw new Error('Job should be disabled');

    scheduler.enableJob('screening');
    jobs = scheduler.getJobs();
    screeningJob = jobs.find((j) => j.name === 'screening');
    if (screeningJob?.enabled !== true) throw new Error('Job should be enabled');
  })();

  // Summary
  console.info('');
  console.info('='.repeat(60));
  console.info('📊 Test Summary:');
  console.info(`   ✅ Passed: ${passedTests}`);
  console.info(`   ❌ Failed: ${failedTests}`);
  console.info(`   📝 Total: ${passedTests + failedTests}`);
  console.info('='.repeat(60));
  console.info('');

  if (failedTests > 0) {
    process.exit(1);
  }
}

// Run tests
runTests();
