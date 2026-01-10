/**
 * Trading Pipeline Example
 *
 * Demonstrates how to use the automated trading pipeline
 */

import { ScreeningModule } from '../src/analyzers/screening/ScreeningModule.js';
import { TechnicalAnalyzer } from '../src/analyzers/technical/TechnicalAnalyzer.js';
import { StrategyManager, CombinationMode } from '../src/trading/strategies/StrategyManager.js';
import { PriceChannelStrategy } from '../src/trading/strategies/PriceChannelStrategy.js';
import { RiskManager } from '../src/trading/risk/RiskManager.js';
import { TradingPipeline } from '../src/orchestrator/TradingPipeline.js';
import { PipelineScheduler } from '../src/orchestrator/PipelineScheduler.js';
import type { PipelineConfig } from '../src/orchestrator/types.js';
import { NotificationChannel, RiskEventType } from '../src/trading/risk/types.js';

async function main() {
  console.info('🤖 Trading Pipeline Example');
  console.info('='.repeat(60));
  console.info('');

  try {
    // Initialize components
    console.info('📦 Initializing components...');

    // 1. Screening Module
    const screeningModule = new ScreeningModule(process.env.COINGECKO_API_KEY);

    // 2. Technical Analyzer
    const technicalAnalyzer = new TechnicalAnalyzer();

    // 3. Strategy Manager
    const strategyManager = new StrategyManager({
      mode: CombinationMode.BEST_CONFIDENCE,
    });

    // Add strategies
    const priceChannelStrategy = new PriceChannelStrategy({
      enabled: true,
      channelPeriod: 18,
      minConfidence: 0.6,
    });
    strategyManager.addStrategy(priceChannelStrategy);

    // 4. Risk Manager
    const riskManager = new RiskManager(
      {
        maxPositions: 4,
        maxPositionSize: 0.1, // 10% per position
        maxDrawdown: 0.15, // 15% max drawdown
        maxCorrelatedPositions: 2,
        correlationThreshold: 0.7,
        stopLossRequired: true,
        maxLeverage: 1,
        dailyLossLimit: 0.05, // 5% daily loss limit
      },
      10000, // $10,000 initial balance
      {
        enabled: true,
        channels: [NotificationChannel.CONSOLE],
        warningThreshold: 80,
      },
    );

    // 5. Pipeline Configuration
    const pipelineConfig: PipelineConfig = {
      screening: {
        enabled: true,
        frequency: 'weekly',
        maxPairs: 3,
      },
      technicalAnalysis: {
        enabled: true,
        frequency: '4hours',
        indicators: ['RSI', 'MACD', 'EMA', 'PriceChannel'],
        timeframe: '4h',
        lookback: 100,
      },
      signalGeneration: {
        enabled: true,
        frequency: 'hourly',
        minConfidence: 0.65,
      },
      riskManagement: {
        enabled: true,
        maxPositions: 4,
        maxExposure: 0.4, // 40% max portfolio exposure
        requireApproval: false,
      },
      execution: {
        mode: 'notify_only' as const,
        dailyTradeLimit: 10,
        circuitBreaker: {
          enabled: true,
          maxDailyLoss: 5, // 5%
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

    // 6. Create Pipeline
    const pipeline = new TradingPipeline(
      pipelineConfig,
      screeningModule,
      technicalAnalyzer,
      strategyManager,
      riskManager,
    );

    console.info('✅ All components initialized');
    console.info('');

    // Example 1: Run full cycle manually
    console.info('📊 Example 1: Running full pipeline cycle (dry run)...');
    console.info('─'.repeat(60));

    const report1 = await pipeline.runFullCycle({
      runScreening: true,
      dryRun: true,
      notifyOnly: false,
    });

    console.info('');
    console.info('📋 Pipeline Report:');
    console.info(`   Status: ${report1.status}`);
    console.info(`   Duration: ${(report1.duration / 1000).toFixed(1)}s`);
    console.info(`   Pairs analyzed: ${report1.pairAnalyses.length}`);
    console.info(`   Total signals: ${report1.totalSignals}`);
    console.info(`   Tradable signals: ${report1.tradableSignals}`);
    console.info(`   Positions opened: ${report1.positionsOpened}`);
    console.info(`   Notifications sent: ${report1.notificationsSent}`);
    console.info(`   Errors: ${report1.errors.length}`);
    console.info('');

    // Example 2: Analyze market without trading
    console.info('📊 Example 2: Market analysis (no trading)...');
    console.info('─'.repeat(60));

    if (report1.screeningReport && report1.screeningReport.tradingPairs.length > 0) {
      const analysisReport = await pipeline.analyzeMarket();

      console.info('');
      console.info('📋 Analysis Report:');
      console.info(`   Overall trend: ${analysisReport.marketConditions.overallTrend}`);
      console.info(`   Volatility: ${analysisReport.marketConditions.volatility}`);
      console.info(`   Trading opportunities: ${analysisReport.marketConditions.tradingOpportunities}`);
      console.info('');
      console.info('   Recommendations:');

      for (const rec of analysisReport.recommendations.slice(0, 3)) {
        console.info(
          `   • ${rec.pair}: ${rec.action.toUpperCase()} (${(rec.confidence * 100).toFixed(0)}%) - ${rec.reason}`,
        );
      }
      console.info('');
    }

    // Example 3: Apply strategies to specific pairs
    console.info('📊 Example 3: Applying strategies to specific pairs...');
    console.info('─'.repeat(60));

    const specificPairs = ['BTC/USDT', 'ETH/USDT'];
    const signals = await pipeline.applyStrategies(specificPairs);

    console.info('');
    console.info(`📋 Generated ${signals.length} signals:`);

    for (const signal of signals.slice(0, 5)) {
      console.info(
        `   • ${signal.source}: ${signal.sentiment.toUpperCase()} (impact: ${(signal.impact * 100).toFixed(0)}%)`,
      );
    }
    console.info('');

    // Example 4: Scheduled execution (commented out to avoid running indefinitely)
    console.info('📊 Example 4: Setting up scheduled execution...');
    console.info('─'.repeat(60));
    console.info('');

    const scheduler = new PipelineScheduler(pipeline, pipelineConfig);
    scheduler.initialize();

    console.info('');
    console.info('⚠️  Note: Scheduler is initialized but not started in this example.');
    console.info('   To start automated execution, call: scheduler.start()');
    console.info('   To stop automated execution, call: scheduler.stop()');
    console.info('');

    // Uncomment to actually start the scheduler:
    // scheduler.start();
    // console.info('✅ Scheduler started. Pipeline will run automatically.');
    // console.info('   Press Ctrl+C to stop...');
    // await new Promise(() => {}); // Keep running

    // Example 5: Emergency stop
    console.info('📊 Example 5: Emergency stop functionality...');
    console.info('─'.repeat(60));
    console.info('');

    console.info('   Current state:', pipeline.getState());
    console.info('');

    // Simulate emergency stop
    // pipeline.emergencyStop();
    // console.info('   🚨 Emergency stop activated!');
    // console.info('   State after emergency stop:', pipeline.getState());
    // console.info('');

    // Resume
    // pipeline.resume();
    // console.info('   ✅ Pipeline resumed');
    // console.info('   State after resume:', pipeline.getState());
    // console.info('');

    console.info('='.repeat(60));
    console.info('✅ Pipeline example completed successfully!');
    console.info('');
  } catch (error) {
    console.error('❌ Pipeline example failed:', error);
    process.exit(1);
  }
}

// Run the example
main();
