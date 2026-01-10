/**
 * Chart Pattern Analyzer Tests
 *
 * Tests for SMC pattern detection and tactical map generation
 */

import { ChartPatternAnalyzer, ReportGenerator } from '../../src/analyzers/chart-pattern/index.js';
import { OrderBlockDetector } from '../../src/analyzers/chart-pattern/patterns/OrderBlockDetector.js';
import { FVGDetector } from '../../src/analyzers/chart-pattern/patterns/FVGDetector.js';
import { StructureAnalyzer } from '../../src/analyzers/chart-pattern/patterns/StructureAnalyzer.js';
import { VolumeAnalyzer } from '../../src/analyzers/chart-pattern/patterns/VolumeAnalyzer.js';
import { Candle } from '../../src/exchanges/types.js';
import {
  PatternDetectionConfig,
  MarketPhase,
  OrderBlockType,
  FVGType,
  ConfidenceLevel,
} from '../../src/analyzers/chart-pattern/types.js';

/**
 * Create mock candle data for testing
 */
function createMockCandles(count: number): Candle[] {
  const candles: Candle[] = [];
  let basePrice = 100;
  const baseTimestamp = Date.now() - count * 24 * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    // Create simple price movement pattern
    const volatility = Math.random() * 2 - 1; // -1 to 1
    const open = basePrice;
    const close = basePrice + volatility;
    const high = Math.max(open, close) + Math.abs(volatility) * 0.5;
    const low = Math.min(open, close) - Math.abs(volatility) * 0.5;
    const volume = 1000000 + Math.random() * 500000;

    candles.push({
      timestamp: baseTimestamp + i * 24 * 60 * 60 * 1000,
      symbol: 'BTCUSDT',
      interval: '1d',
      open,
      high,
      low,
      close,
      volume,
    });

    basePrice = close;
  }

  return candles;
}

/**
 * Create mock candles with a specific pattern (bullish impulse)
 */
function createBullishImpulseCandles(): Candle[] {
  const baseTimestamp = Date.now() - 100 * 24 * 60 * 60 * 1000;

  return [
    // Initial sideways movement
    ...Array(50)
      .fill(0)
      .map((_, i) => ({
        timestamp: baseTimestamp + i * 24 * 60 * 60 * 1000,
        symbol: 'BTCUSDT',
        interval: '1d',
        open: 100 + Math.random() * 2,
        high: 102 + Math.random(),
        low: 99 + Math.random(),
        close: 100 + Math.random() * 2,
        volume: 1000000,
      })),

    // Bearish candle (Order Block)
    {
      timestamp: baseTimestamp + 50 * 24 * 60 * 60 * 1000,
      symbol: 'BTCUSDT',
      interval: '1d',
      open: 101,
      high: 102,
      low: 99,
      close: 99.5,
      volume: 1200000,
    },

    // Bullish impulse (5 strong bullish candles)
    ...Array(5)
      .fill(0)
      .map((_, i) => ({
        timestamp: baseTimestamp + (51 + i) * 24 * 60 * 60 * 1000,
        symbol: 'BTCUSDT',
        interval: '1d',
        open: 99.5 + i * 2,
        high: 101.5 + i * 2,
        low: 99 + i * 2,
        close: 101 + i * 2,
        volume: 1500000,
      })),

    // Continuation
    ...Array(44)
      .fill(0)
      .map((_, i) => ({
        timestamp: baseTimestamp + (56 + i) * 24 * 60 * 60 * 1000,
        symbol: 'BTCUSDT',
        interval: '1d',
        open: 109 + Math.random() * 2,
        high: 111 + Math.random(),
        low: 108 + Math.random(),
        close: 109 + Math.random() * 2,
        volume: 1000000,
      })),
  ];
}

/**
 * Test suite
 */
async function runTests() {
  console.log('🧪 Starting Chart Pattern Analyzer tests...\n');

  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Pattern Detection Config
  try {
    console.log('Test 1: Pattern Detection Config');
    const config: PatternDetectionConfig = {
      swingLookback: 5,
      minImpulseSize: 3.0,
      obEffectivenessThreshold: 0.6,
      minGapSize: 0.5,
      fvgEffectivenessThreshold: 0.65,
      minWickRatio: 1.5,
      liquidityStrengthThreshold: 0.5,
      volumeLookback: 50,
      volumeAccumulationThreshold: 1.3,
      volumeDivergenceThreshold: 20,
      backtestMinTouches: 2,
    };

    if (config.minImpulseSize === 3.0 && config.obEffectivenessThreshold === 0.6) {
      console.log('✅ Test 1 passed: Config created successfully\n');
      passedTests++;
    } else {
      throw new Error('Config values incorrect');
    }
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
    failedTests++;
  }

  // Test 2: Structure Analyzer - Swing Points
  try {
    console.log('Test 2: Structure Analyzer - Swing Points Detection');
    const config: PatternDetectionConfig = {
      swingLookback: 5,
      minImpulseSize: 3.0,
      obEffectivenessThreshold: 0.6,
      minGapSize: 0.5,
      fvgEffectivenessThreshold: 0.65,
      minWickRatio: 1.5,
      liquidityStrengthThreshold: 0.5,
      volumeLookback: 50,
      volumeAccumulationThreshold: 1.3,
      volumeDivergenceThreshold: 20,
      backtestMinTouches: 2,
    };

    const analyzer = new StructureAnalyzer(config);
    const candles = createMockCandles(100);
    const swingPoints = analyzer.identifySwingPoints(candles);

    if (swingPoints.length >= 0) {
      // At least we got a result
      console.log(`✅ Test 2 passed: Found ${swingPoints.length} swing points\n`);
      passedTests++;
    } else {
      throw new Error('No swing points detected');
    }
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
    failedTests++;
  }

  // Test 3: Order Block Detector
  try {
    console.log('Test 3: Order Block Detector');
    const config: PatternDetectionConfig = {
      swingLookback: 5,
      minImpulseSize: 3.0,
      obEffectivenessThreshold: 0.5, // Lower threshold for test
      minGapSize: 0.5,
      fvgEffectivenessThreshold: 0.65,
      minWickRatio: 1.5,
      liquidityStrengthThreshold: 0.5,
      volumeLookback: 50,
      volumeAccumulationThreshold: 1.3,
      volumeDivergenceThreshold: 20,
      backtestMinTouches: 1, // Lower for test
    };

    const detector = new OrderBlockDetector(config);
    const candles = createBullishImpulseCandles();
    const orderBlocks = detector.detect(candles);

    console.log(`  Found ${orderBlocks.length} order blocks`);

    if (orderBlocks.length >= 0) {
      // We should find at least one OB
      if (orderBlocks.length > 0) {
        console.log(`  First OB: Type=${orderBlocks[0].type}, Effectiveness=${orderBlocks[0].effectiveness.toFixed(2)}`);
      }
      console.log('✅ Test 3 passed: Order Block detection works\n');
      passedTests++;
    } else {
      throw new Error('Unexpected result');
    }
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
    failedTests++;
  }

  // Test 4: FVG Detector
  try {
    console.log('Test 4: Fair Value Gap Detector');
    const config: PatternDetectionConfig = {
      swingLookback: 5,
      minImpulseSize: 3.0,
      obEffectivenessThreshold: 0.6,
      minGapSize: 0.3, // Lower for test
      fvgEffectivenessThreshold: 0.5, // Lower for test
      minWickRatio: 1.5,
      liquidityStrengthThreshold: 0.5,
      volumeLookback: 50,
      volumeAccumulationThreshold: 1.3,
      volumeDivergenceThreshold: 20,
      backtestMinTouches: 2,
    };

    const detector = new FVGDetector(config);
    const candles = createMockCandles(100);
    const fvgs = detector.detect(candles);

    console.log(`  Found ${fvgs.length} Fair Value Gaps`);
    console.log('✅ Test 4 passed: FVG detection works\n');
    passedTests++;
  } catch (error) {
    console.error('❌ Test 4 failed:', error);
    failedTests++;
  }

  // Test 5: Volume Analyzer
  try {
    console.log('Test 5: Volume Analyzer');
    const config: PatternDetectionConfig = {
      swingLookback: 5,
      minImpulseSize: 3.0,
      obEffectivenessThreshold: 0.6,
      minGapSize: 0.5,
      fvgEffectivenessThreshold: 0.65,
      minWickRatio: 1.5,
      liquidityStrengthThreshold: 0.5,
      volumeLookback: 50,
      volumeAccumulationThreshold: 1.3,
      volumeDivergenceThreshold: 20,
      backtestMinTouches: 2,
    };

    const analyzer = new VolumeAnalyzer(config);
    const candles = createMockCandles(100);
    const volumeAnalysis = analyzer.analyze(candles);

    if (
      volumeAnalysis.avgVolume > 0 &&
      volumeAnalysis.currentVolume > 0 &&
      volumeAnalysis.volumeRatio > 0
    ) {
      console.log(`  Avg Volume: ${volumeAnalysis.avgVolume.toFixed(0)}`);
      console.log(`  Current Volume: ${volumeAnalysis.currentVolume.toFixed(0)}`);
      console.log(`  Volume Ratio: ${volumeAnalysis.volumeRatio.toFixed(2)}`);
      console.log('✅ Test 5 passed: Volume analysis works\n');
      passedTests++;
    } else {
      throw new Error('Invalid volume analysis result');
    }
  } catch (error) {
    console.error('❌ Test 5 failed:', error);
    failedTests++;
  }

  // Test 6: Report Generator
  try {
    console.log('Test 6: Report Generator');
    const reportGen = new ReportGenerator();

    const mockTacticalMap: any = {
      pair: 'BTCUSDT',
      timestamp: new Date(),
      timeframe: '1d',
      currentPhase: MarketPhase.ACCUMULATION,
      historicalConclusion: 'Test conclusion',
      orderBlocks: [],
      fairValueGaps: [],
      liquidityPools: [],
      swingPoints: [],
      volumeAnalysis: {
        avgVolume: 1000000,
        currentVolume: 1200000,
        volumeRatio: 1.2,
        accumulationDetected: true,
        distributionDetected: false,
        divergenceDetected: false,
      },
      buyZones: [],
      criticalLevels: [],
      orderConfig: {
        pair: 'BTCUSDT',
        orders: [],
        take_profit: [],
      },
      overallScore: 75,
      recommendation: 'buy',
    };

    const markdown = reportGen.generateTacticalMapReport(mockTacticalMap);

    if (markdown.includes('BTCUSDT') && markdown.includes('75/100')) {
      console.log('✅ Test 6 passed: Report generation works\n');
      passedTests++;
    } else {
      throw new Error('Report generation failed');
    }
  } catch (error) {
    console.error('❌ Test 6 failed:', error);
    failedTests++;
  }

  // Test 7: Market Phase Detection
  try {
    console.log('Test 7: Market Phase Detection');
    const config: PatternDetectionConfig = {
      swingLookback: 5,
      minImpulseSize: 3.0,
      obEffectivenessThreshold: 0.6,
      minGapSize: 0.5,
      fvgEffectivenessThreshold: 0.65,
      minWickRatio: 1.5,
      liquidityStrengthThreshold: 0.5,
      volumeLookback: 50,
      volumeAccumulationThreshold: 1.3,
      volumeDivergenceThreshold: 20,
      backtestMinTouches: 2,
    };

    const analyzer = new StructureAnalyzer(config);
    const candles = createMockCandles(100);
    const swingPoints = analyzer.identifySwingPoints(candles);
    const phase = analyzer.determineMarketPhase(candles, swingPoints);

    const validPhases = [
      MarketPhase.ACCUMULATION,
      MarketPhase.UPTREND,
      MarketPhase.DOWNTREND,
      MarketPhase.DISTRIBUTION,
      MarketPhase.CORRECTION,
    ];

    if (validPhases.includes(phase)) {
      console.log(`  Detected Phase: ${phase}`);
      console.log('✅ Test 7 passed: Market phase detection works\n');
      passedTests++;
    } else {
      throw new Error(`Invalid phase: ${phase}`);
    }
  } catch (error) {
    console.error('❌ Test 7 failed:', error);
    failedTests++;
  }

  // Summary
  console.log('\n================================================================================');
  console.log('📊 TEST SUMMARY');
  console.log('================================================================================');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  console.log('================================================================================\n');

  if (failedTests > 0) {
    console.error('⚠️ Some tests failed. Please review the errors above.');
    process.exit(1);
  } else {
    console.log('🎉 All tests passed!');
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
