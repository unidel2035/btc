/**
 * Chart Pattern Analyzer Example
 *
 * Demonstrates how to use the Chart Pattern & SMC Analysis module
 */

import { ChartPatternAnalyzer, ReportGenerator } from '../src/analyzers/chart-pattern/index.js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🚀 Chart Pattern & SMC Analysis Module Example\n');

  try {
    // Step 1: Initialize analyzer
    console.log('📊 Step 1: Initializing Chart Pattern Analyzer...');
    const analyzer = new ChartPatternAnalyzer({
      // Custom config (optional)
      minImpulseSize: 3.0,
      obEffectivenessThreshold: 0.65,
      fvgEffectivenessThreshold: 0.7,
      volumeAccumulationThreshold: 1.3,
    });

    await analyzer.initialize();
    console.log('✅ Analyzer initialized\n');

    // Step 2: Define trading pairs to analyze
    console.log('📋 Step 2: Defining trading pairs to analyze...');
    const tradingPairs = [
      'RNDRUSDT', // Render - AI + Crypto
      // 'TAOUSDT',  // Bittensor - AI + Crypto
      // 'HNTUSDT',  // Helium - DePin
    ];

    console.log(`  Pairs: ${tradingPairs.join(', ')}\n`);

    // Step 3: Run analysis
    console.log('🔍 Step 3: Running analysis on trading pairs...');
    console.log('================================================================================\n');

    const report = await analyzer.analyzeMultiplePairs({
      pairs: tradingPairs,
      timeframes: ['1d', '1w'], // Daily and weekly
      maxHistory: 500, // Fetch up to 500 candles
    });

    console.log('\n================================================================================');
    console.log('✅ Analysis complete!\n');

    // Step 4: Generate reports
    console.log('📄 Step 4: Generating reports...');
    const reportGenerator = new ReportGenerator();

    // Generate markdown report
    const markdown = reportGenerator.generateComprehensiveReport(report);

    // Generate JSON report
    const json = reportGenerator.exportAsJSON(report);

    // Save reports
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const markdownPath = path.join(reportsDir, `chart-pattern-report-${timestamp}.md`);
    const jsonPath = path.join(reportsDir, `chart-pattern-report-${timestamp}.json`);

    fs.writeFileSync(markdownPath, markdown, 'utf-8');
    fs.writeFileSync(jsonPath, json, 'utf-8');

    console.log(`✅ Markdown report saved: ${markdownPath}`);
    console.log(`✅ JSON report saved: ${jsonPath}\n`);

    // Step 5: Display summary
    console.log('================================================================================');
    console.log('📊 ANALYSIS SUMMARY');
    console.log('================================================================================\n');

    console.log(`Total pairs analyzed: ${report.summary.totalPairsAnalyzed}`);
    console.log(`Recommended pairs: ${report.summary.recommendedPairs.length > 0 ? report.summary.recommendedPairs.join(', ') : 'None'}\n`);

    if (report.summary.topOpportunities.length > 0) {
      console.log('🏆 TOP OPPORTUNITIES:\n');
      for (let i = 0; i < report.summary.topOpportunities.length; i++) {
        const opp = report.summary.topOpportunities[i];
        console.log(`${i + 1}. ${opp.pair} - Score: ${opp.score}/100`);
        console.log(`   ${opp.reasoning}\n`);
      }
    }

    // Display detailed results for each pair
    console.log('================================================================================');
    console.log('📈 DETAILED RESULTS');
    console.log('================================================================================\n');

    for (const map of report.tacticalMaps) {
      console.log(`\n🔍 ${map.pair}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Overall Score: ${map.overallScore}/100`);
      console.log(`Recommendation: ${map.recommendation.toUpperCase()}`);
      console.log(`Market Phase: ${map.currentPhase}`);
      console.log(`Timeframe: ${map.timeframe}`);
      console.log(`\nPatterns Detected:`);
      console.log(`  - Order Blocks: ${map.orderBlocks.length}`);
      console.log(`  - Fair Value Gaps: ${map.fairValueGaps.length}`);
      console.log(`  - Liquidity Pools: ${map.liquidityPools.length}`);
      console.log(`  - Swing Points: ${map.swingPoints.length}`);

      if (map.buyZones.length > 0) {
        console.log(`\n🎯 Buy Zones (${map.buyZones.length}):`);
        for (const zone of map.buyZones) {
          console.log(
            `  Zone ${zone.zoneNumber}: $${zone.priceRangeLow.toFixed(2)} - $${zone.priceRangeHigh.toFixed(2)} (${zone.confidence} confidence)`,
          );
          console.log(`    Allocation: ${zone.suggestedAllocation}%`);
          console.log(`    Stop Loss: $${zone.stopLoss.toFixed(2)}`);
          console.log(`    Target 1: $${zone.targetPrices[0]?.toFixed(2)}`);
          console.log(`    Risk/Reward: ${zone.riskRewardRatio.toFixed(2)}:1`);
        }
      }

      if (map.volumeAnalysis) {
        console.log(`\n📊 Volume Analysis:`);
        console.log(`  Avg Volume: ${map.volumeAnalysis.avgVolume.toFixed(0)}`);
        console.log(`  Current Volume: ${map.volumeAnalysis.currentVolume.toFixed(0)}`);
        console.log(`  Ratio: ${map.volumeAnalysis.volumeRatio.toFixed(2)}x`);
        if (map.volumeAnalysis.accumulationDetected) {
          console.log(`  ✅ Accumulation detected`);
        }
        if (map.volumeAnalysis.distributionDetected) {
          console.log(`  ⚠️  Distribution detected`);
        }
        if (map.volumeAnalysis.divergenceDetected) {
          console.log(`  📉 ${map.volumeAnalysis.divergenceType} divergence`);
        }
      }

      console.log(`\n${map.historicalConclusion}`);
    }

    console.log('\n================================================================================');
    console.log('🎉 Example completed successfully!');
    console.log('================================================================================\n');

    // Disconnect
    await analyzer.disconnect();
  } catch (error) {
    console.error('\n❌ Error running example:', error);

    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }

    process.exit(1);
  }
}

// Run example
main();
