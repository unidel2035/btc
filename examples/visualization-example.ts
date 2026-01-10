/**
 * Visualization Module Example
 *
 * Demonstrates usage of the TradingView visualization module
 */

import {
  VisualizationModule,
  TradingSetup,
  TradingDirection,
  SMCStructureType,
  VISUALIZATION_PRESETS,
} from '../src/visualization/index.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

console.log('📊 Visualization Module Example\n');

/**
 * Example 1: Basic LONG Setup Visualization
 */
async function example1() {
  console.log('Example 1: Basic LONG Setup Visualization');
  console.log('==========================================\n');

  const setup: TradingSetup = {
    symbol: 'BTCUSDT',
    direction: TradingDirection.LONG,
    currentPrice: 45000,
    entryZones: [
      {
        priceHigh: 44500,
        priceLow: 44000,
        orderType: 'limit',
        positionPercent: 50,
      },
      {
        priceHigh: 43500,
        priceLow: 43000,
        orderType: 'limit',
        positionPercent: 50,
      },
    ],
    stopLoss: 42500,
    takeProfits: [
      { price: 47000, positionPercent: 50, label: 'TP1 - First Target' },
      { price: 50000, positionPercent: 50, label: 'TP2 - Extension' },
    ],
    smcStructures: [
      {
        type: SMCStructureType.ORDER_BLOCK,
        direction: 'bullish',
        priceHigh: 44800,
        priceLow: 44200,
        label: 'Bullish Order Block',
        description: 'Strong demand zone from previous rally',
      },
      {
        type: SMCStructureType.FVG,
        direction: 'bullish',
        priceHigh: 43800,
        priceLow: 43300,
        label: 'Fair Value Gap',
        description: 'Unfilled gap with high probability of retest',
      },
    ],
    riskPercent: 2.0,
    riskRewardRatio: 2.5,
    confidence: 0.75,
    analysis: `Strong bullish setup with multiple confluences:
- Price rejection at bullish Order Block ($44,200 - $44,800)
- Fair Value Gap providing additional support ($43,300 - $43,800)
- Multiple entry zones for dollar-cost averaging
- Conservative stop loss below key structure
- R:R ratio of 1:2.5 provides favorable risk/reward`,
    timestamp: new Date(),
  };

  const visualization = new VisualizationModule();

  // Generate complete visualization
  console.log('Generating complete visualization...');
  const report = await visualization.visualize(setup);
  console.log('✅ Visualization generated\n');

  // Save outputs
  const outputDir = './data/visualizations';
  mkdirSync(outputDir, { recursive: true });

  // Save Pine Script
  if (report.pineScript) {
    const pineScriptPath = join(outputDir, 'btc-long-setup.pine');
    writeFileSync(pineScriptPath, report.pineScript.code);
    console.log(`📜 Pine Script saved to: ${pineScriptPath}`);
    console.log(`🔗 TradingView URL: ${report.pineScript.url}\n`);
  }

  // Save HTML report
  if (report.htmlReport) {
    const htmlPath = join(outputDir, 'btc-long-setup.html');
    writeFileSync(htmlPath, report.htmlReport);
    console.log(`🌐 HTML report saved to: ${htmlPath}\n`);
  }

  // Save markdown report
  const markdown = visualization.generateMarkdownReport(setup);
  const markdownPath = join(outputDir, 'btc-long-setup.md');
  writeFileSync(markdownPath, markdown);
  console.log(`📝 Markdown report saved to: ${markdownPath}\n`);

  // Display summary
  const summary = visualization.generateSummary(setup);
  console.log('Summary Statistics:');
  console.log(`- Average Entry: $${summary.avgEntry.toFixed(2)}`);
  console.log(`- Risk: $${summary.riskAmount.toFixed(2)} (${summary.totalRisk.toFixed(2)}%)`);
  console.log(`- Reward: $${summary.rewardAmount.toFixed(2)} (${summary.totalReward.toFixed(2)}%)`);
  console.log(`- R:R: 1:${(summary.rewardAmount / summary.riskAmount).toFixed(2)}\n`);
}

/**
 * Example 2: SHORT Setup with Bearish Structures
 */
async function example2() {
  console.log('\nExample 2: SHORT Setup with Bearish Structures');
  console.log('================================================\n');

  const setup: TradingSetup = {
    symbol: 'ETHUSDT',
    direction: TradingDirection.SHORT,
    currentPrice: 3000,
    entryZones: [
      {
        priceHigh: 3100,
        priceLow: 3050,
        orderType: 'limit',
        positionPercent: 60,
      },
      {
        priceHigh: 3200,
        priceLow: 3150,
        orderType: 'limit',
        positionPercent: 40,
      },
    ],
    stopLoss: 3300,
    takeProfits: [
      { price: 2800, positionPercent: 40, label: 'TP1' },
      { price: 2600, positionPercent: 30, label: 'TP2' },
      { price: 2400, positionPercent: 30, label: 'TP3 - Final Target' },
    ],
    smcStructures: [
      {
        type: SMCStructureType.ORDER_BLOCK,
        direction: 'bearish',
        priceHigh: 3150,
        priceLow: 3050,
        label: 'Bearish Order Block',
      },
      {
        type: SMCStructureType.LIQUIDITY_POOL,
        direction: 'bearish',
        priceHigh: 3250,
        priceLow: 3200,
        label: 'Liquidity Pool',
      },
      {
        type: SMCStructureType.BREAKER_BLOCK,
        direction: 'bearish',
        priceHigh: 3100,
        priceLow: 3000,
        label: 'Breaker Block',
      },
    ],
    riskPercent: 1.5,
    riskRewardRatio: 3.0,
    confidence: 0.80,
    analysis: `Bearish setup with strong supply zones:
- Bearish Order Block confirmed at resistance
- Liquidity pool above current price for potential sweep
- Breaker Block invalidating previous support
- Multiple take profit targets for scaling out
- High confidence setup with 1:3 R:R`,
    timestamp: new Date(),
  };

  const visualization = new VisualizationModule(VISUALIZATION_PRESETS.complete);

  console.log('Generating SHORT setup visualization...');
  const report = await visualization.visualize(setup);
  console.log('✅ Visualization generated\n');

  // Save HTML page
  const outputDir = './data/visualizations';
  const htmlPage = visualization.generateHTMLPage(setup);
  const htmlPath = join(outputDir, 'eth-short-setup-page.html');
  writeFileSync(htmlPath, htmlPage);
  console.log(`🌐 Interactive HTML page saved to: ${htmlPath}\n`);

  // Generate alert message
  const alertMessage = visualization.generateAlertMessage(setup);
  console.log('TradingView Alert Message:');
  console.log('-------------------------');
  console.log(alertMessage);
  console.log();
}

/**
 * Example 3: Batch Processing Multiple Setups
 */
async function example3() {
  console.log('\nExample 3: Batch Processing Multiple Setups');
  console.log('============================================\n');

  const setups: TradingSetup[] = [
    {
      symbol: 'SOLUSDT',
      direction: TradingDirection.LONG,
      currentPrice: 100,
      entryZones: [{ priceHigh: 98, priceLow: 95, orderType: 'limit', positionPercent: 100 }],
      stopLoss: 92,
      takeProfits: [
        { price: 105, positionPercent: 50 },
        { price: 110, positionPercent: 50 },
      ],
      smcStructures: [
        {
          type: SMCStructureType.ORDER_BLOCK,
          direction: 'bullish',
          priceHigh: 99,
          priceLow: 95,
        },
      ],
      riskPercent: 1.5,
      riskRewardRatio: 2.0,
      confidence: 0.70,
      analysis: 'Bullish OB retest opportunity',
      timestamp: new Date(),
    },
    {
      symbol: 'BNBUSDT',
      direction: TradingDirection.LONG,
      currentPrice: 320,
      entryZones: [{ priceHigh: 315, priceLow: 310, orderType: 'limit', positionPercent: 100 }],
      stopLoss: 305,
      takeProfits: [{ price: 340, positionPercent: 100 }],
      smcStructures: [
        {
          type: SMCStructureType.FVG,
          direction: 'bullish',
          priceHigh: 318,
          priceLow: 312,
        },
      ],
      riskPercent: 2.0,
      riskRewardRatio: 2.5,
      confidence: 0.65,
      analysis: 'FVG fill opportunity with bullish momentum',
      timestamp: new Date(),
    },
    {
      symbol: 'ADAUSDT',
      direction: TradingDirection.SHORT,
      currentPrice: 0.5,
      entryZones: [{ priceHigh: 0.52, priceLow: 0.51, orderType: 'limit', positionPercent: 100 }],
      stopLoss: 0.54,
      takeProfits: [{ price: 0.46, positionPercent: 100 }],
      smcStructures: [
        {
          type: SMCStructureType.ORDER_BLOCK,
          direction: 'bearish',
          priceHigh: 0.53,
          priceLow: 0.51,
        },
      ],
      riskPercent: 1.5,
      riskRewardRatio: 2.0,
      confidence: 0.72,
      analysis: 'Bearish rejection at resistance OB',
      timestamp: new Date(),
    },
  ];

  const visualization = new VisualizationModule(VISUALIZATION_PRESETS.minimal);

  console.log(`Processing ${setups.length} trading setups...\n`);
  const reports = await visualization.visualizeBatch(setups);

  console.log(`✅ Generated ${reports.length} visualizations\n`);

  reports.forEach((report, index) => {
    console.log(
      `${index + 1}. ${report.setup.symbol} ${report.setup.direction.toUpperCase()} - R:R ${report.setup.riskRewardRatio}:1`,
    );

    // Save Pine Script for each
    if (report.pineScript) {
      const filename = `${report.setup.symbol.toLowerCase()}-${report.setup.direction}-setup.pine`;
      const path = join('./data/visualizations', filename);
      writeFileSync(path, report.pineScript.code);
      console.log(`   📜 Pine Script: ${path}`);
    }
  });

  console.log();
}

/**
 * Example 4: Configuration Customization
 */
async function example4() {
  console.log('\nExample 4: Configuration Customization');
  console.log('========================================\n');

  const setup: TradingSetup = {
    symbol: 'RNDRUSDT',
    direction: TradingDirection.LONG,
    currentPrice: 9.2,
    entryZones: [
      { priceHigh: 8.5, priceLow: 8.2, orderType: 'limit', positionPercent: 40 },
      { priceHigh: 7.3, priceLow: 7.0, orderType: 'limit', positionPercent: 60 },
    ],
    stopLoss: 6.85,
    takeProfits: [
      { price: 10.5, positionPercent: 50 },
      { price: 13.0, positionPercent: 50 },
    ],
    smcStructures: [
      {
        type: SMCStructureType.ORDER_BLOCK,
        direction: 'bullish',
        priceHigh: 8.5,
        priceLow: 8.0,
      },
    ],
    riskPercent: 1.5,
    riskRewardRatio: 2.5,
    confidence: 0.85,
    analysis: 'High confidence setup from issue example',
    timestamp: new Date(),
  };

  // Custom color scheme
  const visualization = new VisualizationModule({
    colors: {
      longEntry: '#4CAF50',
      shortEntry: '#F44336',
      stopLoss: '#FF5252',
      takeProfit: '#00BCD4',
      orderBlock: '#2196F3',
      fvg: '#9E9E9E',
      liquidityPool: '#FF9800',
    },
    defaultTimeframe: '1h',
    showVolumeProfile: true,
    generateImages: false,
  });

  console.log('Custom Configuration:');
  console.log(JSON.stringify(visualization.getConfig(), null, 2));
  console.log();

  const report = await visualization.visualize(setup);
  console.log('✅ Visualization with custom colors generated\n');

  // Save HTML with custom theme
  const htmlPath = join('./data/visualizations', 'rndr-custom-theme.html');
  writeFileSync(htmlPath, report.htmlReport || '');
  console.log(`🌐 Custom themed HTML: ${htmlPath}\n`);
}

/**
 * Main execution
 */
async function main() {
  try {
    await example1();
    await example2();
    await example3();
    await example4();

    console.log('✅ All examples completed successfully!');
    console.log('\n📂 Check ./data/visualizations/ for generated files');
  } catch (error) {
    console.error('❌ Error running examples:', error);
    process.exit(1);
  }
}

main();
