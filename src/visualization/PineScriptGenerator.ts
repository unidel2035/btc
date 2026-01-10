/**
 * Pine Script Generator
 *
 * Generates TradingView Pine Script code for visualizing trading setups
 */

import type {
  TradingSetup,
  PineScriptOptions,
  PineScriptResult,
  SMCStructure,
  EntryZone,
  TakeProfitLevel,
  SMCStructureType,
} from './types.js';

/**
 * Pine Script Generator class
 */
export class PineScriptGenerator {
  private readonly defaultOptions: Required<PineScriptOptions> = {
    version: 5,
    indicatorName: 'SMC Agent Setup',
    overlay: true,
    precision: 2,
  };

  /**
   * Generate Pine Script code from trading setup
   */
  public generate(setup: TradingSetup, options?: PineScriptOptions): PineScriptResult {
    const opts = { ...this.defaultOptions, ...options };
    const indicatorName = `${opts.indicatorName}: ${setup.symbol}`;

    const code = this.buildPineScript(setup, opts, indicatorName);

    return {
      code,
      url: this.generateTradingViewUrl(setup.symbol, code),
      timestamp: new Date(),
    };
  }

  /**
   * Build complete Pine Script code
   */
  private buildPineScript(
    setup: TradingSetup,
    options: Required<PineScriptOptions>,
    indicatorName: string,
  ): string {
    const parts: string[] = [];

    // Header
    parts.push(this.generateHeader(options.version, indicatorName, options.overlay));

    // Input parameters
    parts.push(this.generateInputs(setup));

    // Entry zones
    parts.push(this.generateEntryZones(setup.entryZones, setup.direction));

    // Stop loss and take profit levels
    parts.push(this.generateStopLoss(setup.stopLoss));
    parts.push(this.generateTakeProfits(setup.takeProfits));

    // SMC structures
    if (setup.smcStructures.length > 0) {
      parts.push(this.generateSMCStructures(setup.smcStructures));
    }

    // Plot current price line
    parts.push(this.generateCurrentPrice(setup.currentPrice));

    // Risk/Reward table
    parts.push(this.generateRiskRewardTable(setup));

    // Entry/exit markers
    parts.push(this.generateMarkers(setup));

    return parts.join('\n\n');
  }

  /**
   * Generate Pine Script header
   */
  private generateHeader(version: number, name: string, overlay: boolean): string {
    return `//@version=${version}
indicator("${name}", overlay=${overlay})`;
  }

  /**
   * Generate input parameters
   */
  private generateInputs(setup: TradingSetup): string {
    const inputs: string[] = ['// === TRADING SETUP PARAMETERS ==='];

    // Entry zones
    setup.entryZones.forEach((zone, index) => {
      inputs.push(`entry_high_${index + 1} = input(${zone.priceHigh}, "Entry Zone ${index + 1} High")`);
      inputs.push(`entry_low_${index + 1} = input(${zone.priceLow}, "Entry Zone ${index + 1} Low")`);
    });

    // Stop loss
    inputs.push(`stop_loss = input(${setup.stopLoss}, "Stop Loss")`);

    // Take profits
    setup.takeProfits.forEach((tp, index) => {
      inputs.push(`take_profit_${index + 1} = input(${tp.price}, "Take Profit ${index + 1}")`);
    });

    // SMC structures
    setup.smcStructures.forEach((structure, index) => {
      const label = this.getSMCLabel(structure.type);
      inputs.push(`${structure.type}_high_${index} = input(${structure.priceHigh}, "${label} ${index + 1} High")`);
      inputs.push(`${structure.type}_low_${index} = input(${structure.priceLow}, "${label} ${index + 1} Low")`);
    });

    return inputs.join('\n');
  }

  /**
   * Generate entry zones visualization
   */
  private generateEntryZones(zones: EntryZone[], direction: string): string {
    const color = direction === 'long' ? 'color.green' : 'color.red';
    const lines: string[] = ['// === ENTRY ZONES ==='];

    zones.forEach((zone, index) => {
      lines.push(`
// Entry Zone ${index + 1}
var box entry_zone_${index + 1} = na
if bar_index == last_bar_index - 100
    entry_zone_${index + 1} := box.new(
        left=bar_index,
        top=entry_high_${index + 1},
        right=bar_index + 100,
        bottom=entry_low_${index + 1},
        bgcolor=color.new(${color}, 90),
        border_color=color.new(${color}, 70),
        border_width=1,
        text="Entry ${index + 1} (${zone.positionPercent}%)",
        text_color=${color}
    )
    box.set_right(entry_zone_${index + 1}, bar_index + 100)

if not na(entry_zone_${index + 1})
    box.set_right(entry_zone_${index + 1}, bar_index + 1)`);
    });

    return lines.join('\n');
  }

  /**
   * Generate stop loss line
   */
  private generateStopLoss(stopLoss: number): string {
    return `// === STOP LOSS ===
hline(stop_loss, "Stop Loss", color=color.new(color.red, 0), linestyle=hline.style_dashed, linewidth=2)`;
  }

  /**
   * Generate take profit levels
   */
  private generateTakeProfits(takeProfits: TakeProfitLevel[]): string {
    const lines: string[] = ['// === TAKE PROFIT LEVELS ==='];

    takeProfits.forEach((tp, index) => {
      lines.push(`hline(take_profit_${index + 1}, "TP ${index + 1} (${tp.positionPercent}%)", color=color.new(color.green, 30), linestyle=hline.style_dotted, linewidth=1)`);
    });

    return lines.join('\n');
  }

  /**
   * Generate SMC structures visualization
   */
  private generateSMCStructures(structures: SMCStructure[]): string {
    const lines: string[] = ['// === SMC STRUCTURES ==='];

    structures.forEach((structure, index) => {
      const color = structure.direction === 'bullish' ? 'color.blue' : 'color.orange';
      const alpha = structure.type === SMCStructureType.ORDER_BLOCK ? 85 : 90;
      const label = this.getSMCLabel(structure.type);

      lines.push(`
// ${label} ${index + 1} (${structure.direction})
var box ${structure.type}_${index} = na
if bar_index == last_bar_index - 100
    ${structure.type}_${index} := box.new(
        left=bar_index,
        top=${structure.type}_high_${index},
        right=bar_index + 100,
        bottom=${structure.type}_low_${index},
        bgcolor=color.new(${color}, ${alpha}),
        border_color=${color},
        border_width=2,
        text="${label}",
        text_color=${color}
    )

if not na(${structure.type}_${index})
    box.set_right(${structure.type}_${index}, bar_index + 1)`);
    });

    return lines.join('\n');
  }

  /**
   * Generate current price line
   */
  private generateCurrentPrice(currentPrice: number): string {
    return `// === CURRENT PRICE ===
current_price = ${currentPrice}
hline(current_price, "Current Price", color=color.new(color.yellow, 50), linestyle=hline.style_solid, linewidth=1)`;
  }

  /**
   * Generate risk/reward information table
   */
  private generateRiskRewardTable(setup: TradingSetup): string {
    return `// === RISK/REWARD TABLE ===
var table riskTable = table.new(position.top_right, 2, 5, bgcolor=color.new(color.navy, 20), border_width=1)

if barstate.islast
    table.cell(riskTable, 0, 0, "Direction", text_color=color.white, bgcolor=color.new(color.gray, 50))
    table.cell(riskTable, 1, 0, "${setup.direction.toUpperCase()}", text_color=${setup.direction === 'long' ? 'color.lime' : 'color.red'}, bgcolor=color.new(color.gray, 70))

    table.cell(riskTable, 0, 1, "Risk/Reward", text_color=color.white, bgcolor=color.new(color.gray, 50))
    table.cell(riskTable, 1, 1, "1:${setup.riskRewardRatio.toFixed(1)}", text_color=color.lime, bgcolor=color.new(color.gray, 70))

    table.cell(riskTable, 0, 2, "Risk %", text_color=color.white, bgcolor=color.new(color.gray, 50))
    table.cell(riskTable, 1, 2, "${setup.riskPercent.toFixed(1)}%", text_color=color.white, bgcolor=color.new(color.gray, 70))

    table.cell(riskTable, 0, 3, "Confidence", text_color=color.white, bgcolor=color.new(color.gray, 50))
    table.cell(riskTable, 1, 3, "${(setup.confidence * 100).toFixed(0)}%", text_color=color.aqua, bgcolor=color.new(color.gray, 70))

    table.cell(riskTable, 0, 4, "Entries", text_color=color.white, bgcolor=color.new(color.gray, 50))
    table.cell(riskTable, 1, 4, "${setup.entryZones.length}", text_color=color.white, bgcolor=color.new(color.gray, 70))`;
  }

  /**
   * Generate entry/exit markers
   */
  private generateMarkers(setup: TradingSetup): string {
    const entryColor = setup.direction === 'long' ? 'color.green' : 'color.red';
    const entryShape = setup.direction === 'long' ? 'shape.labelup' : 'shape.labeldown';

    return `// === MARKERS ===
// Entry markers
${setup.entryZones
  .map(
    (zone, index) => `
// Entry zone ${index + 1} marker
entry_hit_${index + 1} = ta.crossover(close, entry_low_${index + 1}) or ta.crossunder(close, entry_high_${index + 1})
plotshape(entry_hit_${index + 1}, style=${entryShape}, location=location.belowbar, color=${entryColor}, text="E${index + 1}", textcolor=color.white, size=size.small)`,
  )
  .join('\n')}

// Stop loss marker
stop_hit = ta.crossunder(close, stop_loss)
plotshape(stop_hit, style=shape.xcross, location=location.belowbar, color=color.red, text="SL", textcolor=color.white, size=size.normal)

// Take profit markers
${setup.takeProfits
  .map(
    (_, index) => `
tp_hit_${index + 1} = ta.crossover(close, take_profit_${index + 1})
plotshape(tp_hit_${index + 1}, style=shape.diamond, location=location.abovebar, color=color.green, text="TP${index + 1}", textcolor=color.white, size=size.tiny)`,
  )
  .join('\n')}`;
  }

  /**
   * Get SMC structure label
   */
  private getSMCLabel(type: SMCStructureType): string {
    const labels: Record<SMCStructureType, string> = {
      [SMCStructureType.ORDER_BLOCK]: 'Order Block',
      [SMCStructureType.FVG]: 'Fair Value Gap',
      [SMCStructureType.LIQUIDITY_POOL]: 'Liquidity Pool',
      [SMCStructureType.PREMIUM_DISCOUNT]: 'Premium/Discount',
      [SMCStructureType.BREAKER_BLOCK]: 'Breaker Block',
    };
    return labels[type] || type;
  }

  /**
   * Generate TradingView URL with chart (basic implementation)
   */
  private generateTradingViewUrl(symbol: string, code: string): string {
    // Note: TradingView doesn't support direct URL encoding of Pine Script
    // This is a placeholder - in production, you'd need to save the script
    // to TradingView and get a sharing link
    const baseUrl = 'https://www.tradingview.com/chart/';
    const encodedSymbol = encodeURIComponent(symbol);

    // In practice, you would need to:
    // 1. Use TradingView API to save the script (requires authentication)
    // 2. Get the script ID
    // 3. Generate a URL with the script ID
    // For now, return a basic chart URL
    return `${baseUrl}?symbol=${encodedSymbol}`;
  }

  /**
   * Validate trading setup before generating Pine Script
   */
  public validate(setup: TradingSetup): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!setup.symbol || setup.symbol.trim() === '') {
      errors.push('Symbol is required');
    }

    if (setup.entryZones.length === 0) {
      errors.push('At least one entry zone is required');
    }

    if (setup.takeProfits.length === 0) {
      errors.push('At least one take profit level is required');
    }

    if (setup.stopLoss <= 0) {
      errors.push('Stop loss must be greater than 0');
    }

    // Validate entry zones
    setup.entryZones.forEach((zone, index) => {
      if (zone.priceHigh <= zone.priceLow) {
        errors.push(`Entry zone ${index + 1}: high price must be greater than low price`);
      }
      if (zone.positionPercent <= 0 || zone.positionPercent > 100) {
        errors.push(`Entry zone ${index + 1}: position percent must be between 0 and 100`);
      }
    });

    // Validate take profits
    setup.takeProfits.forEach((tp, index) => {
      if (tp.price <= 0) {
        errors.push(`Take profit ${index + 1}: price must be greater than 0`);
      }
      if (tp.positionPercent <= 0 || tp.positionPercent > 100) {
        errors.push(`Take profit ${index + 1}: position percent must be between 0 and 100`);
      }
    });

    // Validate SMC structures
    setup.smcStructures.forEach((structure, index) => {
      if (structure.priceHigh <= structure.priceLow) {
        errors.push(`SMC structure ${index + 1}: high price must be greater than low price`);
      }
    });

    // Validate logic: for LONG, entries should be below current price, TP above, SL below
    if (setup.direction === 'long') {
      setup.takeProfits.forEach((tp, index) => {
        if (tp.price <= setup.currentPrice) {
          errors.push(`Take profit ${index + 1}: for LONG position, TP should be above current price`);
        }
      });
      if (setup.stopLoss >= setup.currentPrice) {
        errors.push('For LONG position, stop loss should be below current price');
      }
    } else {
      // SHORT
      setup.takeProfits.forEach((tp, index) => {
        if (tp.price >= setup.currentPrice) {
          errors.push(`Take profit ${index + 1}: for SHORT position, TP should be below current price`);
        }
      });
      if (setup.stopLoss <= setup.currentPrice) {
        errors.push('For SHORT position, stop loss should be above current price');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
