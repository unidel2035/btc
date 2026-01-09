import type {
  BacktestConfig,
  BacktestResult,
  BacktestState,
  Candle,
  DataLoader,
  EquityPoint,
  Position,
  Trade,
} from './types.js';
import type { Strategy } from '../strategies/types.js';
import type { MarketData, Signal } from '../strategies/types.js';
import { MetricsCalculator } from './MetricsCalculator.js';
import { randomUUID } from 'crypto';

/**
 * Backtesting Engine
 * Simulates trading strategy on historical data
 */
export class BacktestEngine {
  private state: BacktestState;
  private equityCurve: EquityPoint[] = [];
  private allTrades: Trade[] = [];

  constructor(
    private config: BacktestConfig,
    private strategy: Strategy,
    private dataLoader: DataLoader,
  ) {
    this.state = {
      currentTime: config.startDate,
      cash: config.initialCapital,
      positions: [],
      closedTrades: [],
      equity: config.initialCapital,
      peakEquity: config.initialCapital,
      currentDrawdown: 0,
    };
  }

  /**
   * Run the backtest
   */
  async run(): Promise<BacktestResult> {
    const startTime = new Date();
    const symbols = Array.isArray(this.config.symbol) ? this.config.symbol : [this.config.symbol];

    console.log(`📊 Starting backtest for ${symbols.join(', ')}...`);
    console.log(`   Period: ${this.config.startDate.toISOString()} to ${this.config.endDate.toISOString()}`);
    console.log(`   Strategy: ${this.config.strategyName}`);
    console.log(`   Initial Capital: $${this.config.initialCapital.toLocaleString()}\n`);

    // Load historical data for all symbols
    const symbolData = new Map<string, Candle[]>();
    for (const symbol of symbols) {
      console.log(`📥 Loading data for ${symbol}...`);
      const candles = await this.dataLoader.loadCandles(
        symbol,
        this.config.startDate,
        this.config.endDate,
        this.config.timeframe,
      );
      symbolData.set(symbol, candles);
      console.log(`   Loaded ${candles.length} candles`);
    }

    // Find the union of all timestamps
    const allTimestamps = new Set<number>();
    for (const candles of symbolData.values()) {
      for (const candle of candles) {
        allTimestamps.add(candle.timestamp.getTime());
      }
    }

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
    console.log(`\n⏱️  Processing ${sortedTimestamps.length} time points...\n`);

    // Process each timestamp
    let processedCount = 0;
    for (const timestamp of sortedTimestamps) {
      this.state.currentTime = new Date(timestamp);

      // Check and close positions that hit stop-loss, take-profit, or time limit
      await this.checkPositions(symbolData);

      // Generate signals and execute strategy for each symbol
      for (const symbol of symbols) {
        const candles = symbolData.get(symbol);
        if (!candles) continue;

        const candle = candles.find((c) => c.timestamp.getTime() === timestamp);
        if (!candle) continue;

        await this.processCandle(symbol, candle);
      }

      // Record equity curve point
      this.recordEquityPoint();

      // Progress indicator
      processedCount++;
      if (processedCount % 100 === 0 || processedCount === sortedTimestamps.length) {
        const progress = ((processedCount / sortedTimestamps.length) * 100).toFixed(1);
        process.stdout.write(`\r   Progress: ${progress}% (${processedCount}/${sortedTimestamps.length})`);
      }
    }

    console.log('\n\n✅ Backtest completed!\n');

    // Close any remaining open positions
    this.closeAllPositions('end-of-data');

    // Calculate metrics
    const endTime = new Date();
    const executionTime = endTime.getTime() - startTime.getTime();

    const result = MetricsCalculator.calculateMetrics(
      this.allTrades,
      this.equityCurve,
      this.config,
      startTime,
      endTime,
      executionTime,
    );

    return result;
  }

  /**
   * Process a single candle
   */
  private async processCandle(symbol: string, candle: Candle): Promise<void> {
    const marketData: MarketData = {
      symbol,
      price: candle.close,
      volume: candle.volume,
      timestamp: candle.timestamp,
      ohlc: {
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      },
      volatility: this.calculateVolatility(candle),
    };

    // For now, we'll use empty signals array
    // In a real implementation, signals would be loaded from news/sentiment data
    const signals: Signal[] = [];

    // Get trading decision from strategy
    const decision = this.strategy.analyze(marketData, signals);

    if (decision && this.canOpenPosition()) {
      await this.openPosition(symbol, candle, decision);
    }
  }

  /**
   * Calculate volatility from candle
   */
  private calculateVolatility(candle: Candle): number {
    const range = candle.high - candle.low;
    return range / candle.close;
  }

  /**
   * Check if we can open a new position
   */
  private canOpenPosition(): boolean {
    // Limit to one position per symbol for now
    return this.state.positions.length === 0;
  }

  /**
   * Open a new position
   */
  private async openPosition(
    symbol: string,
    candle: Candle,
    decision: { direction: 'long' | 'short'; confidence: number; positionSize: number; stopLoss?: number; takeProfit?: number },
  ): Promise<void> {
    const { direction, positionSize, stopLoss, takeProfit } = decision;

    // Check if shorts are allowed
    if (direction === 'short' && !this.config.allowShorts) {
      return;
    }

    // Limit position size
    const maxSize = this.config.maxPositionSize ?? 100;
    const effectiveSize = Math.min(positionSize, maxSize);

    // Calculate position value and quantity
    const positionValue = (this.state.cash * effectiveSize) / 100;
    const entryPrice = this.applySlippage(candle.close, direction, 'entry');
    const quantity = positionValue / entryPrice;

    // Apply entry fees
    const entryFees = (positionValue * this.config.fees.taker) / 100;

    // Check if we have enough cash
    if (positionValue + entryFees > this.state.cash) {
      return;
    }

    // Create trade record
    const trade: Trade = {
      id: randomUUID(),
      symbol,
      direction,
      entryTime: candle.timestamp,
      entryPrice,
      quantity,
      positionSize: effectiveSize,
      stopLoss,
      takeProfit,
      fees: entryFees,
      slippage: this.config.slippage,
      strategyName: this.config.strategyName,
    };

    // Create position
    const position: Position = {
      tradeId: trade.id,
      symbol,
      direction,
      entryTime: candle.timestamp,
      entryPrice,
      quantity,
      stopLoss,
      takeProfit,
      strategyName: this.config.strategyName,
    };

    // Update state
    this.state.cash -= positionValue + entryFees;
    this.state.positions.push(position);
    this.allTrades.push(trade);
  }

  /**
   * Check positions for exit conditions
   */
  private async checkPositions(symbolData: Map<string, Candle[]>): Promise<void> {
    const positionsToClose: Array<{ position: Position; candle: Candle; reason: Trade['exitReason'] }> = [];

    for (const position of this.state.positions) {
      const candles = symbolData.get(position.symbol);
      if (!candles) continue;

      const currentCandle = candles.find(
        (c) => c.timestamp.getTime() === this.state.currentTime.getTime(),
      );
      if (!currentCandle) continue;

      // Check stop-loss
      if (position.stopLoss) {
        const hitStopLoss =
          position.direction === 'long'
            ? currentCandle.low <= position.stopLoss
            : currentCandle.high >= position.stopLoss;

        if (hitStopLoss) {
          positionsToClose.push({ position, candle: currentCandle, reason: 'stop-loss' });
          continue;
        }
      }

      // Check take-profit
      if (position.takeProfit) {
        const hitTakeProfit =
          position.direction === 'long'
            ? currentCandle.high >= position.takeProfit
            : currentCandle.low <= position.takeProfit;

        if (hitTakeProfit) {
          positionsToClose.push({ position, candle: currentCandle, reason: 'take-profit' });
          continue;
        }
      }
    }

    // Close positions
    for (const { position, candle, reason } of positionsToClose) {
      await this.closePosition(position, candle, reason);
    }
  }

  /**
   * Close a position
   */
  private async closePosition(
    position: Position,
    candle: Candle,
    reason: Trade['exitReason'],
  ): Promise<void> {
    // Find the trade
    const trade = this.allTrades.find((t) => t.id === position.tradeId);
    if (!trade) return;

    // Calculate exit price based on reason
    let exitPrice: number;
    if (reason === 'stop-loss' && position.stopLoss) {
      exitPrice = position.stopLoss;
    } else if (reason === 'take-profit' && position.takeProfit) {
      exitPrice = position.takeProfit;
    } else {
      exitPrice = this.applySlippage(candle.close, position.direction, 'exit');
    }

    // Calculate exit value
    const exitValue = position.quantity * exitPrice;
    const exitFees = (exitValue * this.config.fees.taker) / 100;

    // Calculate P&L
    const entryValue = position.quantity * position.entryPrice;
    let pnl: number;

    if (position.direction === 'long') {
      pnl = exitValue - entryValue - trade.fees - exitFees;
    } else {
      // Short position
      pnl = entryValue - exitValue - trade.fees - exitFees;
    }

    const pnlPercent = (pnl / entryValue) * 100;

    // Update trade
    trade.exitTime = candle.timestamp;
    trade.exitPrice = exitPrice;
    trade.exitReason = reason;
    trade.pnl = pnl;
    trade.pnlPercent = pnlPercent;
    trade.fees += exitFees;

    // Update state
    this.state.cash += exitValue - exitFees;
    this.state.positions = this.state.positions.filter((p) => p.tradeId !== position.tradeId);
    this.state.closedTrades.push(trade);
  }

  /**
   * Close all open positions
   */
  private closeAllPositions(reason: Trade['exitReason']): void {
    for (const position of [...this.state.positions]) {
      // Use last known price
      const mockCandle: Candle = {
        timestamp: this.state.currentTime,
        open: position.entryPrice,
        high: position.entryPrice,
        low: position.entryPrice,
        close: position.entryPrice,
        volume: 0,
      };

      this.closePosition(position, mockCandle, reason);
    }
  }

  /**
   * Apply slippage to price
   */
  private applySlippage(price: number, direction: 'long' | 'short', action: 'entry' | 'exit'): number {
    const slippagePercent = this.config.slippage / 100;

    if (action === 'entry') {
      // Entry: we pay more for longs, receive less for shorts
      return direction === 'long' ? price * (1 + slippagePercent) : price * (1 - slippagePercent);
    } else {
      // Exit: we receive less for longs, pay more for shorts
      return direction === 'long' ? price * (1 - slippagePercent) : price * (1 + slippagePercent);
    }
  }

  /**
   * Record current equity point
   */
  private recordEquityPoint(): void {
    // Calculate position values
    let positionValue = 0;
    // For simplicity, we'll estimate position value at entry price
    // In reality, you'd use current market price
    for (const position of this.state.positions) {
      positionValue += position.quantity * position.entryPrice;
    }

    const totalEquity = this.state.cash + positionValue;

    // Update peak and drawdown
    if (totalEquity > this.state.peakEquity) {
      this.state.peakEquity = totalEquity;
      this.state.currentDrawdown = 0;
    } else {
      this.state.currentDrawdown = ((totalEquity - this.state.peakEquity) / this.state.peakEquity) * 100;
    }

    this.state.equity = totalEquity;

    this.equityCurve.push({
      timestamp: new Date(this.state.currentTime),
      equity: totalEquity,
      cash: this.state.cash,
      positions: positionValue,
      drawdown: this.state.currentDrawdown,
    });
  }

  /**
   * Get current state
   */
  getState(): BacktestState {
    return { ...this.state };
  }

  /**
   * Get equity curve
   */
  getEquityCurve(): EquityPoint[] {
    return [...this.equityCurve];
  }

  /**
   * Get all trades
   */
  getTrades(): Trade[] {
    return [...this.allTrades];
  }
}
