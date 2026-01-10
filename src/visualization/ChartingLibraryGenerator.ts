/**
 * TradingView Charting Library Configuration Generator
 *
 * Generates configuration for TradingView Charting Library widgets
 */

import type {
  TradingSetup,
  ChartingLibraryConfig,
  ChartDrawing,
  SMCStructure,
  EntryZone,
  TakeProfitLevel,
  Timeframe,
} from './types.js';
import { SMCStructureType, TradingDirection } from './types.js';

/**
 * Charting Library Generator options
 */
export interface ChartingLibraryOptions {
  containerId?: string;
  timeframe?: Timeframe;
  timezone?: string;
  theme?: 'light' | 'dark';
  autosize?: boolean;
  width?: number;
  height?: number;
}

/**
 * TradingView Charting Library Generator
 */
export class ChartingLibraryGenerator {
  private readonly defaultOptions: Required<ChartingLibraryOptions> = {
    containerId: 'tradingview_chart',
    timeframe: '4h',
    timezone: 'Etc/UTC',
    theme: 'dark',
    autosize: true,
    width: 800,
    height: 600,
  };

  /**
   * Generate Charting Library configuration
   */
  public generate(setup: TradingSetup, options?: ChartingLibraryOptions): ChartingLibraryConfig {
    const opts = { ...this.defaultOptions, ...options };

    const drawings = this.generateDrawings(setup);

    return {
      containerId: opts.containerId,
      symbol: this.formatSymbol(setup.symbol),
      interval: opts.timeframe,
      timezone: opts.timezone,
      theme: opts.theme,
      autosize: opts.autosize,
      drawings,
      studies: [],
    };
  }

  /**
   * Generate widget initialization code (JavaScript)
   */
  public generateWidgetCode(setup: TradingSetup, options?: ChartingLibraryOptions): string {
    const opts = { ...this.defaultOptions, ...options };
    const drawings = this.generateDrawings(setup);

    return `// TradingView Charting Library Widget Configuration
// Generated for ${setup.symbol} - ${setup.direction.toUpperCase()} setup

new TradingView.widget({
    container_id: "${opts.containerId}",
    library_path: "/charting_library/",
    locale: "en",

    // Symbol and interval
    symbol: "${this.formatSymbol(setup.symbol)}",
    interval: "${opts.timeframe}",
    timezone: "${opts.timezone}",

    // Appearance
    theme: "${opts.theme}",
    style: "1", // Candles
    toolbar_bg: "#f1f3f6",
    enable_publishing: false,
    hide_side_toolbar: false,
    allow_symbol_change: true,

    // Size
    ${opts.autosize ? 'autosize: true,' : `width: ${opts.width},\n    height: ${opts.height},`}

    // Features
    disabled_features: [
        "use_localstorage_for_settings",
        "volume_force_overlay"
    ],
    enabled_features: [
        "study_templates"
    ],

    // Overrides for chart appearance
    overrides: {
        "mainSeriesProperties.style": 1,
        "paneProperties.background": "${opts.theme === 'dark' ? '#131722' : '#ffffff'}",
        "paneProperties.vertGridProperties.color": "${opts.theme === 'dark' ? '#363c4e' : '#e1e3eb'}",
        "paneProperties.horzGridProperties.color": "${opts.theme === 'dark' ? '#363c4e' : '#e1e3eb'}",
    },

    // Studies (indicators)
    studies_overrides: {},

    // Save/load chart
    auto_save_delay: 5,
});

// Add drawings after chart is loaded
setTimeout(() => {
    const widget = window.tvWidget;
    if (!widget) return;

    widget.onChartReady(() => {
        const chart = widget.activeChart();

        ${this.generateDrawingCommands(drawings)}

        // Add text annotation with setup info
        chart.createMultipointShape([
            { time: chart.getVisibleRange().to, price: ${setup.currentPrice} }
        ], {
            shape: "text",
            text: "${setup.analysis.replace(/"/g, '\\"').replace(/\n/g, '\\n')}",
            overrides: {
                color: "${opts.theme === 'dark' ? '#ffffff' : '#000000'}",
                backgroundColor: "${opts.theme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'}",
                fontSize: 12,
                bold: false
            }
        });
    });
}, 1000);`;
  }

  /**
   * Generate drawings from trading setup
   */
  private generateDrawings(setup: TradingSetup): ChartDrawing[] {
    const drawings: ChartDrawing[] = [];
    const currentTime = Math.floor(Date.now() / 1000);
    const futureTime = currentTime + 86400 * 7; // 7 days ahead

    // Entry zones as rectangles
    setup.entryZones.forEach((zone, index) => {
      drawings.push(
        this.createEntryZoneDrawing(zone, index, setup.direction, currentTime, futureTime),
      );
    });

    // Stop loss line
    drawings.push(this.createStopLossDrawing(setup.stopLoss, currentTime, futureTime));

    // Take profit lines
    setup.takeProfits.forEach((tp, index) => {
      drawings.push(this.createTakeProfitDrawing(tp, index, currentTime, futureTime));
    });

    // SMC structures
    setup.smcStructures.forEach((structure, index) => {
      drawings.push(this.createSMCStructureDrawing(structure, index, currentTime, futureTime));
    });

    // Current price line
    drawings.push(this.createCurrentPriceDrawing(setup.currentPrice, currentTime, futureTime));

    return drawings;
  }

  /**
   * Create entry zone drawing
   */
  private createEntryZoneDrawing(
    zone: EntryZone,
    index: number,
    direction: TradingDirection,
    startTime: number,
    endTime: number,
  ): ChartDrawing {
    const color = direction === TradingDirection.LONG ? '#00ff00' : '#ff0000';

    return {
      type: 'rectangle',
      points: [
        { time: startTime, price: zone.priceHigh },
        { time: endTime, price: zone.priceLow },
      ],
      color,
      backgroundColor: `${color}15`, // 15 is hex for low opacity
      lineWidth: 1,
      lineStyle: 'solid',
      text: `Entry ${index + 1} (${zone.positionPercent}%)`,
    };
  }

  /**
   * Create stop loss drawing
   */
  private createStopLossDrawing(
    stopLoss: number,
    startTime: number,
    endTime: number,
  ): ChartDrawing {
    return {
      type: 'horizontal_line',
      points: [
        { time: startTime, price: stopLoss },
        { time: endTime, price: stopLoss },
      ],
      color: '#ff0000',
      lineWidth: 2,
      lineStyle: 'dashed',
      text: 'Stop Loss',
    };
  }

  /**
   * Create take profit drawing
   */
  private createTakeProfitDrawing(
    tp: TakeProfitLevel,
    index: number,
    startTime: number,
    endTime: number,
  ): ChartDrawing {
    return {
      type: 'horizontal_line',
      points: [
        { time: startTime, price: tp.price },
        { time: endTime, price: tp.price },
      ],
      color: '#00ff00',
      lineWidth: 1,
      lineStyle: 'dotted',
      text: `TP ${index + 1} (${tp.positionPercent}%)`,
    };
  }

  /**
   * Create SMC structure drawing
   */
  private createSMCStructureDrawing(
    structure: SMCStructure,
    _index: number,
    startTime: number,
    endTime: number,
  ): ChartDrawing {
    const color = structure.direction === 'bullish' ? '#1e90ff' : '#ff4500';
    const label = this.getSMCLabel(structure.type);

    return {
      type: 'rectangle',
      points: [
        { time: startTime, price: structure.priceHigh },
        { time: endTime, price: structure.priceLow },
      ],
      color,
      backgroundColor: `${color}20`, // 20 is hex for low opacity
      lineWidth: 2,
      lineStyle: 'solid',
      text: `${label} (${structure.direction})`,
    };
  }

  /**
   * Create current price drawing
   */
  private createCurrentPriceDrawing(
    currentPrice: number,
    startTime: number,
    endTime: number,
  ): ChartDrawing {
    return {
      type: 'horizontal_line',
      points: [
        { time: startTime, price: currentPrice },
        { time: endTime, price: currentPrice },
      ],
      color: '#ffff00',
      lineWidth: 1,
      lineStyle: 'solid',
      text: 'Current Price',
    };
  }

  /**
   * Generate drawing commands for JavaScript code
   */
  private generateDrawingCommands(drawings: ChartDrawing[]): string {
    const commands: string[] = [];

    drawings.forEach((drawing) => {
      if (drawing.type === 'horizontal_line' && drawing.points && drawing.points[0]) {
        commands.push(`
        // ${drawing.text}
        chart.createShape(
            { time: ${drawing.points[0].time}, price: ${drawing.points[0].price} },
            {
                shape: "horizontal_line",
                overrides: {
                    linecolor: "${drawing.color}",
                    linewidth: ${drawing.lineWidth || 1},
                    linestyle: ${this.getLineStyleValue(drawing.lineStyle || 'solid')},
                    showLabel: true,
                    text: "${drawing.text}"
                }
            }
        );`);
      } else if (
        drawing.type === 'rectangle' &&
        drawing.points &&
        drawing.points[0] &&
        drawing.points[1]
      ) {
        commands.push(`
        // ${drawing.text}
        chart.createMultipointShape([
            { time: ${drawing.points[0].time}, price: ${drawing.points[0].price} },
            { time: ${drawing.points[1].time}, price: ${drawing.points[1].price} }
        ], {
            shape: "rectangle",
            overrides: {
                color: "${drawing.color}",
                backgroundColor: "${drawing.backgroundColor}",
                linewidth: ${drawing.lineWidth || 1},
                transparency: 85,
                text: "${drawing.text}"
            }
        });`);
      }
    });

    return commands.join('\n');
  }

  /**
   * Get line style value for TradingView
   */
  private getLineStyleValue(style: string): number {
    const styles: Record<string, number> = {
      solid: 0,
      dotted: 1,
      dashed: 2,
    };
    return styles[style] || 0;
  }

  /**
   * Format symbol for TradingView (e.g., BTCUSDT -> BINANCE:BTCUSDT)
   */
  private formatSymbol(symbol: string): string {
    // If symbol already has exchange prefix, return as is
    if (symbol.includes(':')) {
      return symbol;
    }

    // Default to Binance for common crypto pairs
    if (symbol.toUpperCase().endsWith('USDT') || symbol.toUpperCase().endsWith('BUSD')) {
      return `BINANCE:${symbol.toUpperCase()}`;
    }

    // Default to Bybit for other pairs
    return `BYBIT:${symbol.toUpperCase()}`;
  }

  /**
   * Get SMC structure label
   */
  private getSMCLabel(type: SMCStructureType): string {
    const labels: Record<SMCStructureType, string> = {
      [SMCStructureType.ORDER_BLOCK]: 'OB',
      [SMCStructureType.FVG]: 'FVG',
      [SMCStructureType.LIQUIDITY_POOL]: 'Liq',
      [SMCStructureType.PREMIUM_DISCOUNT]: 'P/D',
      [SMCStructureType.BREAKER_BLOCK]: 'BB',
    };
    return labels[type] || type;
  }

  /**
   * Generate HTML page with embedded chart
   */
  public generateHTMLPage(setup: TradingSetup, options?: ChartingLibraryOptions): string {
    const opts = { ...this.defaultOptions, ...options };
    const widgetCode = this.generateWidgetCode(setup, options);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${setup.symbol} - ${setup.direction.toUpperCase()} Setup</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background-color: ${opts.theme === 'dark' ? '#131722' : '#ffffff'};
            color: ${opts.theme === 'dark' ? '#d1d4dc' : '#131722'};
        }

        #header {
            padding: 20px;
            background-color: ${opts.theme === 'dark' ? '#1e222d' : '#f1f3f6'};
            border-bottom: 1px solid ${opts.theme === 'dark' ? '#2a2e39' : '#e0e3eb'};
        }

        h1 {
            margin: 0 0 10px 0;
            font-size: 24px;
        }

        .setup-info {
            display: flex;
            gap: 30px;
            flex-wrap: wrap;
            margin-top: 15px;
        }

        .info-item {
            display: flex;
            flex-direction: column;
        }

        .info-label {
            font-size: 12px;
            color: ${opts.theme === 'dark' ? '#787b86' : '#6a6d78'};
            margin-bottom: 4px;
        }

        .info-value {
            font-size: 16px;
            font-weight: 600;
        }

        .long { color: #26a69a; }
        .short { color: #ef5350; }

        #${opts.containerId} {
            width: 100%;
            height: calc(100vh - 200px);
        }

        .legend {
            padding: 20px;
            background-color: ${opts.theme === 'dark' ? '#1e222d' : '#f1f3f6'};
            border-top: 1px solid ${opts.theme === 'dark' ? '#2a2e39' : '#e0e3eb'};
        }

        .legend-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 10px;
        }

        .legend-items {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
        }

        .legend-color {
            width: 20px;
            height: 12px;
            border-radius: 2px;
        }
    </style>
</head>
<body>
    <div id="header">
        <h1>${setup.symbol} Trading Setup</h1>
        <div class="setup-info">
            <div class="info-item">
                <span class="info-label">Direction</span>
                <span class="info-value ${setup.direction}">${setup.direction.toUpperCase()}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Current Price</span>
                <span class="info-value">$${setup.currentPrice.toFixed(2)}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Risk/Reward</span>
                <span class="info-value">1:${setup.riskRewardRatio.toFixed(1)}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Risk %</span>
                <span class="info-value">${setup.riskPercent.toFixed(1)}%</span>
            </div>
            <div class="info-item">
                <span class="info-label">Confidence</span>
                <span class="info-value">${(setup.confidence * 100).toFixed(0)}%</span>
            </div>
            <div class="info-item">
                <span class="info-label">Entry Zones</span>
                <span class="info-value">${setup.entryZones.length}</span>
            </div>
        </div>
    </div>

    <div id="${opts.containerId}"></div>

    <div class="legend">
        <div class="legend-title">Legend</div>
        <div class="legend-items">
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${setup.direction === TradingDirection.LONG ? '#00ff00' : '#ff0000'}; opacity: 0.2;"></div>
                <span>Entry Zones</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #ff0000;"></div>
                <span>Stop Loss</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #00ff00;"></div>
                <span>Take Profit Levels</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #1e90ff; opacity: 0.3;"></div>
                <span>Bullish Order Blocks</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #ff4500; opacity: 0.3;"></div>
                <span>Bearish Structures</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #808080; opacity: 0.3;"></div>
                <span>Fair Value Gaps</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #ffff00;"></div>
                <span>Current Price</span>
            </div>
        </div>
    </div>

    <!-- TradingView Charting Library -->
    <script src="/charting_library/charting_library.min.js"></script>
    <script>
        ${widgetCode}
    </script>
</body>
</html>`;
  }
}
