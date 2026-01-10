/**
 * Visual Report Generator
 *
 * Generates comprehensive visual reports for trading setups
 */

import type { TradingSetup, VisualReport, VisualizationMethod, VisualizationConfig } from './types.js';
import { PineScriptGenerator } from './PineScriptGenerator.js';
import { ChartingLibraryGenerator } from './ChartingLibraryGenerator.js';

/**
 * Visual Report Generator
 */
export class VisualReportGenerator {
  private pineScriptGenerator: PineScriptGenerator;
  private chartingLibraryGenerator: ChartingLibraryGenerator;

  constructor() {
    this.pineScriptGenerator = new PineScriptGenerator();
    this.chartingLibraryGenerator = new ChartingLibraryGenerator();
  }

  /**
   * Generate comprehensive visual report
   */
  public async generate(setup: TradingSetup, config: VisualizationConfig): Promise<VisualReport> {
    const report: VisualReport = {
      setup,
      timestamp: new Date(),
    };

    // Generate Pine Script
    if (
      config.method === VisualizationMethod.PINE_SCRIPT ||
      config.method === VisualizationMethod.TRADINGVIEW_EMBEDDED
    ) {
      report.pineScript = this.pineScriptGenerator.generate(setup);
    }

    // Generate Charting Library config
    if (config.method === VisualizationMethod.TRADINGVIEW_EMBEDDED) {
      report.chartConfig = this.chartingLibraryGenerator.generate(setup, {
        timeframe: config.defaultTimeframe as any,
        theme: 'dark',
      });
    }

    // Generate HTML report
    report.htmlReport = this.generateHTMLReport(setup, config);

    // Generate TradingView URL
    report.tradingViewUrl = this.generateTradingViewUrl(setup);

    return report;
  }

  /**
   * Generate HTML report
   */
  private generateHTMLReport(setup: TradingSetup, config: VisualizationConfig): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${setup.symbol} - ${setup.direction.toUpperCase()} Trading Setup</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #131722;
            color: #d1d4dc;
        }

        .header {
            text-align: center;
            padding: 30px 0;
            border-bottom: 2px solid #2a2e39;
        }

        h1 {
            font-size: 32px;
            margin: 0 0 10px 0;
        }

        .symbol {
            font-size: 24px;
            color: #2962ff;
            font-weight: 600;
        }

        .direction {
            display: inline-block;
            padding: 8px 20px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 18px;
            margin-top: 10px;
        }

        .long {
            background-color: rgba(38, 166, 154, 0.2);
            color: #26a69a;
        }

        .short {
            background-color: rgba(239, 83, 80, 0.2);
            color: #ef5350;
        }

        .section {
            background-color: #1e222d;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }

        .section-title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 15px;
            color: #2962ff;
        }

        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }

        .metric {
            background-color: #2a2e39;
            border-radius: 6px;
            padding: 15px;
        }

        .metric-label {
            font-size: 12px;
            color: #787b86;
            margin-bottom: 8px;
        }

        .metric-value {
            font-size: 24px;
            font-weight: 600;
        }

        .positive {
            color: #26a69a;
        }

        .negative {
            color: #ef5350;
        }

        .neutral {
            color: #2962ff;
        }

        .entry-zones, .take-profits, .smc-structures {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .zone-item, .tp-item, .structure-item {
            background-color: #2a2e39;
            border-radius: 4px;
            padding: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .zone-label {
            font-weight: 600;
        }

        .zone-price {
            color: #2962ff;
            font-family: monospace;
        }

        .zone-percent {
            color: #787b86;
            font-size: 14px;
        }

        .legend {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .legend-color {
            width: 40px;
            height: 20px;
            border-radius: 4px;
        }

        .legend-text {
            font-size: 14px;
        }

        .analysis-box {
            background-color: #2a2e39;
            border-left: 4px solid #2962ff;
            padding: 15px;
            border-radius: 4px;
            line-height: 1.6;
        }

        .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 600;
        }

        .status-waiting {
            background-color: rgba(255, 193, 7, 0.2);
            color: #ffc107;
        }

        .status-active {
            background-color: rgba(38, 166, 154, 0.2);
            color: #26a69a;
        }

        .links {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
        }

        .link-button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #2962ff;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            transition: background-color 0.2s;
        }

        .link-button:hover {
            background-color: #1e53e5;
        }

        code {
            background-color: #2a2e39;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
            font-size: 14px;
        }

        pre {
            background-color: #2a2e39;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
        }

        .footer {
            text-align: center;
            padding: 30px 0;
            color: #787b86;
            font-size: 14px;
            border-top: 1px solid #2a2e39;
            margin-top: 40px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 VISUALIZATION SETUP</h1>
        <div class="symbol">${setup.symbol}</div>
        <div class="direction ${setup.direction}">${setup.direction.toUpperCase()}</div>
    </div>

    <div class="section">
        <div class="section-title">📈 Key Metrics</div>
        <div class="metrics">
            <div class="metric">
                <div class="metric-label">Current Price</div>
                <div class="metric-value neutral">$${setup.currentPrice.toFixed(2)}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Stop Loss</div>
                <div class="metric-value negative">$${setup.stopLoss.toFixed(2)}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Risk/Reward Ratio</div>
                <div class="metric-value positive">1:${setup.riskRewardRatio.toFixed(1)}</div>
            </div>
            <div class="metric">
                <div class="metric-label">Risk %</div>
                <div class="metric-value">${setup.riskPercent.toFixed(1)}%</div>
            </div>
            <div class="metric">
                <div class="metric-label">Confidence</div>
                <div class="metric-value">${(setup.confidence * 100).toFixed(0)}%</div>
            </div>
            <div class="metric">
                <div class="metric-label">Status</div>
                <div class="metric-value">
                    ${this.determineStatus(setup)}
                </div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">🎯 Entry Zones</div>
        <div class="entry-zones">
            ${setup.entryZones
              .map(
                (zone, index) => `
            <div class="zone-item">
                <div>
                    <span class="zone-label">Entry Zone ${index + 1}</span>
                    <span class="zone-percent">(${zone.positionPercent}% of position)</span>
                </div>
                <div class="zone-price">$${zone.priceLow.toFixed(2)} - $${zone.priceHigh.toFixed(2)}</div>
            </div>`,
              )
              .join('')}
        </div>
    </div>

    <div class="section">
        <div class="section-title">💰 Take Profit Levels</div>
        <div class="take-profits">
            ${setup.takeProfits
              .map(
                (tp, index) => `
            <div class="tp-item">
                <div>
                    <span class="zone-label">TP ${index + 1}</span>
                    <span class="zone-percent">(${tp.positionPercent}% of position)</span>
                </div>
                <div class="zone-price positive">$${tp.price.toFixed(2)}</div>
            </div>`,
              )
              .join('')}
        </div>
    </div>

    ${
      setup.smcStructures.length > 0
        ? `
    <div class="section">
        <div class="section-title">🔷 SMC Structures</div>
        <div class="smc-structures">
            ${setup.smcStructures
              .map(
                (structure, index) => `
            <div class="structure-item">
                <div>
                    <span class="zone-label">${this.getSMCLabel(structure.type)}</span>
                    <span class="zone-percent">(${structure.direction})</span>
                </div>
                <div class="zone-price">$${structure.priceLow.toFixed(2)} - $${structure.priceHigh.toFixed(2)}</div>
            </div>`,
              )
              .join('')}
        </div>
    </div>`
        : ''
    }

    <div class="section">
        <div class="section-title">📝 Analysis</div>
        <div class="analysis-box">
            ${setup.analysis.replace(/\n/g, '<br>')}
        </div>
    </div>

    <div class="section">
        <div class="section-title">🎨 Legend</div>
        <div class="legend">
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.longEntry}; opacity: 0.2;"></div>
                <div class="legend-text">Entry Zones (${setup.direction === 'long' ? 'Long' : 'Short'})</div>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.stopLoss};"></div>
                <div class="legend-text">Stop Loss Level</div>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.takeProfit};"></div>
                <div class="legend-text">Take Profit Levels</div>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.orderBlock}; opacity: 0.3;"></div>
                <div class="legend-text">Order Blocks</div>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.fvg}; opacity: 0.3;"></div>
                <div class="legend-text">Fair Value Gaps</div>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.liquidityPool}; opacity: 0.3;"></div>
                <div class="legend-text">Liquidity Pools</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">🔗 Links</div>
        <div class="links">
            <a href="${this.generateTradingViewUrl(setup)}" target="_blank" class="link-button">
                📈 Open in TradingView
            </a>
            <a href="#" class="link-button" onclick="alert('Pine Script copied to clipboard!'); return false;">
                📋 Copy Pine Script
            </a>
        </div>
    </div>

    <div class="footer">
        🤖 Generated with SMC Agent - Visual Backtest & Setup Presentation Module<br>
        Generated at: ${setup.timestamp.toLocaleString()}
    </div>
</body>
</html>`;
  }

  /**
   * Determine setup status
   */
  private determineStatus(setup: TradingSetup): string {
    const avgEntryPrice =
      setup.entryZones.reduce((sum, zone) => sum + (zone.priceHigh + zone.priceLow) / 2, 0) /
      setup.entryZones.length;

    if (setup.direction === 'long') {
      if (setup.currentPrice > avgEntryPrice) {
        return '<span class="status status-waiting">Waiting for Entry</span>';
      } else {
        return '<span class="status status-active">In Entry Zone</span>';
      }
    } else {
      if (setup.currentPrice < avgEntryPrice) {
        return '<span class="status status-waiting">Waiting for Entry</span>';
      } else {
        return '<span class="status status-active">In Entry Zone</span>';
      }
    }
  }

  /**
   * Get SMC structure label
   */
  private getSMCLabel(type: string): string {
    const labels: Record<string, string> = {
      order_block: 'Order Block',
      fvg: 'Fair Value Gap',
      liquidity_pool: 'Liquidity Pool',
      premium_discount: 'Premium/Discount Zone',
      breaker_block: 'Breaker Block',
    };
    return labels[type] || type;
  }

  /**
   * Generate TradingView URL
   */
  private generateTradingViewUrl(setup: TradingSetup): string {
    const symbol = setup.symbol.toUpperCase();
    const exchange = symbol.endsWith('USDT') ? 'BINANCE' : 'BYBIT';
    return `https://www.tradingview.com/chart/?symbol=${exchange}:${symbol}`;
  }

  /**
   * Generate markdown report
   */
  public generateMarkdownReport(setup: TradingSetup, config: VisualizationConfig): string {
    return `# 📊 VISUALIZATION SETUP: ${setup.symbol}

## Trade Details
- **Direction:** ${setup.direction.toUpperCase()}
- **Current Price:** $${setup.currentPrice.toFixed(2)}
- **Risk/Reward:** 1:${setup.riskRewardRatio.toFixed(1)}
- **Risk %:** ${setup.riskPercent.toFixed(1)}%
- **Confidence:** ${(setup.confidence * 100).toFixed(0)}%

## Entry Zones
${setup.entryZones
  .map(
    (zone, index) =>
      `${index + 1}. **Entry Zone ${index + 1}** ($${zone.priceLow.toFixed(2)} - $${zone.priceHigh.toFixed(2)}) - ${zone.positionPercent}% of position`,
  )
  .join('\n')}

## Stop Loss
- **Stop Loss:** $${setup.stopLoss.toFixed(2)}

## Take Profit Levels
${setup.takeProfits
  .map((tp, index) => `${index + 1}. **TP ${index + 1}:** $${tp.price.toFixed(2)} (${tp.positionPercent}% of position)`)
  .join('\n')}

${
  setup.smcStructures.length > 0
    ? `
## SMC Structures
${setup.smcStructures
  .map(
    (structure, index) =>
      `${index + 1}. **${this.getSMCLabel(structure.type)}** (${structure.direction}): $${structure.priceLow.toFixed(2)} - $${structure.priceHigh.toFixed(2)}`,
  )
  .join('\n')}
`
    : ''
}

## Analysis
${setup.analysis}

## Legend
- 🟩 **Green zones** — Entry zones for ${setup.direction === 'long' ? 'long' : 'short'} positions
- 🟥 **Red dashed line** — Stop loss
- 🟦 **Blue rectangles** — ${setup.direction === 'long' ? 'Bullish' : 'Bearish'} Order Blocks
- ⚪ **Gray zones** — Fair Value Gaps (FVG)
- 🔶 **Orange clouds** — Liquidity Pools
- 📊 **Table** — Risk and reward parameters

## Links
- [📈 View on TradingView](${this.generateTradingViewUrl(setup)})

---
*Generated at: ${setup.timestamp.toLocaleString()}*
*🤖 SMC Agent - Visual Backtest & Setup Presentation Module*
`;
  }
}
