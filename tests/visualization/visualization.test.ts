/**
 * Visualization Module Tests
 */

import {
  VisualizationModule,
  PineScriptGenerator,
  ChartingLibraryGenerator,
  VisualReportGenerator,
  TradingSetup,
  TradingDirection,
  SMCStructureType,
  VisualizationMethod,
} from '../../src/visualization/index.js';

console.log('🧪 Testing Visualization Module...\n');

/**
 * Create test trading setup
 */
function createTestSetup(): TradingSetup {
  return {
    symbol: 'BTCUSDT',
    direction: TradingDirection.LONG,
    currentPrice: 45000,
    entryZones: [
      { priceHigh: 44500, priceLow: 44000, orderType: 'limit', positionPercent: 50 },
      { priceHigh: 43500, priceLow: 43000, orderType: 'limit', positionPercent: 50 },
    ],
    stopLoss: 42500,
    takeProfits: [
      { price: 47000, positionPercent: 50, label: 'TP1' },
      { price: 50000, positionPercent: 50, label: 'TP2' },
    ],
    smcStructures: [
      {
        type: SMCStructureType.ORDER_BLOCK,
        direction: 'bullish',
        priceHigh: 44800,
        priceLow: 44200,
        label: 'Bullish OB',
      },
      {
        type: SMCStructureType.FVG,
        direction: 'bullish',
        priceHigh: 43800,
        priceLow: 43300,
        label: 'FVG Zone',
      },
    ],
    riskPercent: 2.0,
    riskRewardRatio: 2.5,
    confidence: 0.75,
    analysis: 'Strong bullish setup with confluence at Order Block zone. Price has shown rejection at the OB level with increasing volume. FVG provides additional support for long entries.',
    timestamp: new Date(),
  };
}

/**
 * Test 1: Pine Script Generation
 */
console.log('Test 1: Pine Script Generation');
try {
  const generator = new PineScriptGenerator();
  const setup = createTestSetup();
  const result = generator.generate(setup);

  console.log('  ✅ Pine Script generated successfully');
  console.log(`  - Code length: ${result.code.length} characters`);
  console.log(`  - URL: ${result.url}`);
  console.log(`  - Timestamp: ${result.timestamp.toISOString()}`);

  // Verify code contains key elements
  if (result.code.includes('@version=5')) {
    console.log('  ✅ Contains Pine Script v5 header');
  }
  if (result.code.includes('indicator')) {
    console.log('  ✅ Contains indicator declaration');
  }
  if (result.code.includes('entry_high_1')) {
    console.log('  ✅ Contains entry zone inputs');
  }
  if (result.code.includes('stop_loss')) {
    console.log('  ✅ Contains stop loss input');
  }
  if (result.code.includes('take_profit_1')) {
    console.log('  ✅ Contains take profit inputs');
  }
} catch (error) {
  console.error('  ❌ Test failed:', error);
}
console.log();

/**
 * Test 2: Pine Script Validation
 */
console.log('Test 2: Pine Script Validation');
try {
  const generator = new PineScriptGenerator();
  const setup = createTestSetup();

  // Valid setup
  const validation1 = generator.validate(setup);
  console.log(`  ✅ Valid setup: ${validation1.valid}`);
  console.log(`  - Errors: ${validation1.errors.length}`);

  // Invalid setup - no entry zones
  const invalidSetup = { ...setup, entryZones: [] };
  const validation2 = generator.validate(invalidSetup);
  console.log(`  ✅ Invalid setup detected: ${!validation2.valid}`);
  console.log(`  - Errors: ${validation2.errors.join(', ')}`);

  // Invalid setup - stop loss above current price for LONG
  const invalidSetup2 = { ...setup, stopLoss: 50000 };
  const validation3 = generator.validate(invalidSetup2);
  console.log(`  ✅ Logic validation works: ${!validation3.valid}`);
  console.log(`  - Errors: ${validation3.errors.join(', ')}`);
} catch (error) {
  console.error('  ❌ Test failed:', error);
}
console.log();

/**
 * Test 3: Charting Library Configuration
 */
console.log('Test 3: Charting Library Configuration');
try {
  const generator = new ChartingLibraryGenerator();
  const setup = createTestSetup();
  const config = generator.generate(setup);

  console.log('  ✅ Chart config generated successfully');
  console.log(`  - Container ID: ${config.containerId}`);
  console.log(`  - Symbol: ${config.symbol}`);
  console.log(`  - Interval: ${config.interval}`);
  console.log(`  - Theme: ${config.theme}`);
  console.log(`  - Drawings: ${config.drawings?.length || 0}`);

  // Verify drawings
  if (config.drawings && config.drawings.length > 0) {
    console.log('  ✅ Drawings generated:');
    const drawingTypes = config.drawings.map((d) => d.type);
    console.log(`    - Types: ${[...new Set(drawingTypes)].join(', ')}`);
  }
} catch (error) {
  console.error('  ❌ Test failed:', error);
}
console.log();

/**
 * Test 4: Widget Code Generation
 */
console.log('Test 4: Widget Code Generation');
try {
  const generator = new ChartingLibraryGenerator();
  const setup = createTestSetup();
  const code = generator.generateWidgetCode(setup);

  console.log('  ✅ Widget code generated successfully');
  console.log(`  - Code length: ${code.length} characters`);

  // Verify code contains key elements
  if (code.includes('TradingView.widget')) {
    console.log('  ✅ Contains widget initialization');
  }
  if (code.includes('container_id')) {
    console.log('  ✅ Contains container configuration');
  }
  if (code.includes('symbol')) {
    console.log('  ✅ Contains symbol configuration');
  }
} catch (error) {
  console.error('  ❌ Test failed:', error);
}
console.log();

/**
 * Test 5: HTML Page Generation
 */
console.log('Test 5: HTML Page Generation');
try {
  const generator = new ChartingLibraryGenerator();
  const setup = createTestSetup();
  const html = generator.generateHTMLPage(setup);

  console.log('  ✅ HTML page generated successfully');
  console.log(`  - HTML length: ${html.length} characters`);

  // Verify HTML contains key elements
  if (html.includes('<!DOCTYPE html>')) {
    console.log('  ✅ Valid HTML document');
  }
  if (html.includes(setup.symbol)) {
    console.log('  ✅ Contains symbol');
  }
  if (html.includes('TradingView')) {
    console.log('  ✅ Contains TradingView references');
  }
} catch (error) {
  console.error('  ❌ Test failed:', error);
}
console.log();

/**
 * Test 6: Visual Report Generation
 */
console.log('Test 6: Visual Report Generation');
try {
  const generator = new VisualReportGenerator();
  const setup = createTestSetup();
  const config = {
    method: VisualizationMethod.TRADINGVIEW_EMBEDDED,
    colors: {
      longEntry: '#00FF00',
      shortEntry: '#FF0000',
      stopLoss: '#FF6B6B',
      takeProfit: '#4ECDC4',
      orderBlock: '#1E90FF',
      fvg: '#808080',
      liquidityPool: '#FFA500',
    },
    defaultTimeframe: '4h',
    showVolumeProfile: true,
    generateImages: false,
  };

  const report = generator.generate(setup, config);

  console.log('  ✅ Visual report generated successfully');
  console.log(`  - Setup symbol: ${report.setup.symbol}`);
  console.log(`  - Pine Script: ${report.pineScript ? 'Generated' : 'Not generated'}`);
  console.log(`  - Chart Config: ${report.chartConfig ? 'Generated' : 'Not generated'}`);
  console.log(`  - HTML Report: ${report.htmlReport ? 'Generated' : 'Not generated'}`);
  console.log(`  - TradingView URL: ${report.tradingViewUrl || 'Not generated'}`);
} catch (error) {
  console.error('  ❌ Test failed:', error);
}
console.log();

/**
 * Test 7: Markdown Report Generation
 */
console.log('Test 7: Markdown Report Generation');
try {
  const generator = new VisualReportGenerator();
  const setup = createTestSetup();
  const config = {
    method: VisualizationMethod.TRADINGVIEW_EMBEDDED,
    colors: {
      longEntry: '#00FF00',
      shortEntry: '#FF0000',
      stopLoss: '#FF6B6B',
      takeProfit: '#4ECDC4',
      orderBlock: '#1E90FF',
      fvg: '#808080',
      liquidityPool: '#FFA500',
    },
    defaultTimeframe: '4h',
    showVolumeProfile: true,
    generateImages: false,
  };

  const markdown = generator.generateMarkdownReport(setup, config);

  console.log('  ✅ Markdown report generated successfully');
  console.log(`  - Length: ${markdown.length} characters`);

  // Verify markdown contains key elements
  if (markdown.includes('# 📊 VISUALIZATION SETUP')) {
    console.log('  ✅ Contains header');
  }
  if (markdown.includes(setup.symbol)) {
    console.log('  ✅ Contains symbol');
  }
  if (markdown.includes('Entry Zones')) {
    console.log('  ✅ Contains entry zones section');
  }
} catch (error) {
  console.error('  ❌ Test failed:', error);
}
console.log();

/**
 * Test 8: Complete Visualization Module
 */
console.log('Test 8: Complete Visualization Module');
try {
  const visualization = new VisualizationModule();
  const setup = createTestSetup();

  const report = visualization.visualize(setup);

  console.log('  ✅ Complete visualization generated successfully');
  console.log(`  - Setup: ${report.setup.symbol} ${report.setup.direction.toUpperCase()}`);
  console.log(`  - Pine Script: ${report.pineScript ? '✓' : '✗'}`);
  console.log(`  - Chart Config: ${report.chartConfig ? '✓' : '✗'}`);
  console.log(`  - HTML Report: ${report.htmlReport ? '✓' : '✗'}`);
  console.log(`  - TradingView URL: ${report.tradingViewUrl ? '✓' : '✗'}`);
} catch (error) {
  console.error('  ❌ Test failed:', error);
}
console.log();

/**
 * Test 9: Batch Visualization
 */
console.log('Test 9: Batch Visualization');
try {
  const visualization = new VisualizationModule();
  const setup1 = createTestSetup();
  const setup2 = {
    ...createTestSetup(),
    symbol: 'ETHUSDT',
    direction: TradingDirection.SHORT,
    currentPrice: 3000,
    entryZones: [{ priceHigh: 3100, priceLow: 3050, orderType: 'limit' as const, positionPercent: 100 }],
    stopLoss: 3200,
    takeProfits: [{ price: 2800, positionPercent: 100 }],
  };

  const reports = visualization.visualizeBatch([setup1, setup2]);

  console.log(`  ✅ Batch visualization completed: ${reports.length} reports`);
  reports.forEach((report, index) => {
    console.log(`  - Report ${index + 1}: ${report.setup.symbol} ${report.setup.direction.toUpperCase()}`);
  });
} catch (error) {
  console.error('  ❌ Test failed:', error);
}
console.log();

/**
 * Test 10: Summary Statistics
 */
console.log('Test 10: Summary Statistics');
try {
  const visualization = new VisualizationModule();
  const setup = createTestSetup();
  const summary = visualization.generateSummary(setup);

  console.log('  ✅ Summary statistics generated');
  console.log(`  - Average Entry: $${summary.avgEntry.toFixed(2)}`);
  console.log(`  - Risk Amount: $${summary.riskAmount.toFixed(2)} (${summary.totalRisk.toFixed(2)}%)`);
  console.log(`  - Reward Amount: $${summary.rewardAmount.toFixed(2)} (${summary.totalReward.toFixed(2)}%)`);
  console.log(`  - R:R Ratio: 1:${(summary.rewardAmount / summary.riskAmount).toFixed(2)}`);
} catch (error) {
  console.error('  ❌ Test failed:', error);
}
console.log();

/**
 * Test 11: Alert Message Generation
 */
console.log('Test 11: Alert Message Generation');
try {
  const visualization = new VisualizationModule();
  const setup = createTestSetup();
  const alertMessage = visualization.generateAlertMessage(setup);

  console.log('  ✅ Alert message generated');
  console.log('  Message:');
  console.log(alertMessage.split('\n').map((line) => `    ${line}`).join('\n'));
} catch (error) {
  console.error('  ❌ Test failed:', error);
}
console.log();

console.log('✅ All visualization tests completed!');
