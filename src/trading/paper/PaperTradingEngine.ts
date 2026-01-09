import { randomUUID } from 'crypto';
import type {
  PaperTradingConfig,
  PaperOrder,
  PaperPosition,
  PaperBalance,
  PaperTradingStats,
  ClosedTrade,
  MarketPrice,
  PaperTradingEvent,
} from './types.js';
import { TradingMode, OrderType, OrderSide, OrderStatus } from './types.js';

/**
 * Paper Trading Engine
 * Simulates real trading with virtual balance, orders, and positions
 */
export class PaperTradingEngine {
  private config: PaperTradingConfig;
  private balance: PaperBalance;
  private orders: Map<string, PaperOrder> = new Map();
  private positions: Map<string, PaperPosition> = new Map();
  private closedTrades: ClosedTrade[] = [];
  private marketPrices: Map<string, MarketPrice> = new Map();
  private eventListeners: Array<(event: PaperTradingEvent) => void> = [];
  private startTime: Date;
  private startBalance: number;
  private peakEquity: number;
  private maxDrawdown: number = 0;

  constructor(config: Partial<PaperTradingConfig> = {}) {
    this.config = {
      mode: TradingMode.PAPER,
      initialBalance: config.initialBalance ?? 10000,
      currency: config.currency ?? 'USDT',
      fees: config.fees ?? {
        maker: 0.1, // 0.1%
        taker: 0.1, // 0.1%
      },
      slippage: config.slippage ?? 0.05, // 0.05%
      allowShorts: config.allowShorts ?? true,
      maxPositions: config.maxPositions ?? 5,
      marketDataSource: config.marketDataSource ?? 'binance',
    };

    this.startBalance = this.config.initialBalance;
    this.balance = {
      currency: this.config.currency ?? 'USDT',
      total: this.config.initialBalance,
      available: this.config.initialBalance,
      locked: 0,
      equity: this.config.initialBalance,
    };

    this.startTime = new Date();
    this.peakEquity = this.config.initialBalance;

    console.log('📄 Paper Trading Engine initialized');
    console.log(`   Mode: ${this.config.mode}`);
    console.log(`   Initial Balance: ${this.config.initialBalance} ${this.config.currency}`);
    console.log(`   Fees: ${this.config.fees.maker}% maker / ${this.config.fees.taker}% taker`);
    console.log(`   Slippage: ${this.config.slippage}%`);
  }

  /**
   * Update market price for a symbol
   */
  updateMarketPrice(symbol: string, price: number, bid?: number, ask?: number): void {
    this.marketPrices.set(symbol, {
      symbol,
      price,
      bid,
      ask,
      timestamp: new Date(),
    });

    // Check if any orders can be filled
    this.checkPendingOrders(symbol, price);

    // Update unrealized P&L for positions
    this.updatePositionPnL(symbol, price);
  }

  /**
   * Place a market order
   */
  placeMarketOrder(symbol: string, side: OrderSide, quantity: number): PaperOrder | null {
    const marketPrice = this.marketPrices.get(symbol);
    if (!marketPrice) {
      console.error(`❌ No market price available for ${symbol}`);
      return null;
    }

    // Apply slippage
    const executionPrice = this.applySlippage(marketPrice.price, side);

    // Calculate order value
    const orderValue = quantity * executionPrice;
    const fees = (orderValue * this.config.fees.taker) / 100;
    const totalCost = orderValue + fees;

    // Check if we have enough balance
    if (side === OrderSide.BUY && totalCost > this.balance.available) {
      console.error(
        `❌ Insufficient balance. Required: ${totalCost}, Available: ${this.balance.available}`,
      );
      return null;
    }

    // Check position limits
    if (this.positions.size >= (this.config.maxPositions ?? 5)) {
      console.error(`❌ Maximum number of positions reached (${this.config.maxPositions})`);
      return null;
    }

    // Create order
    const order: PaperOrder = {
      id: randomUUID(),
      symbol,
      type: 'market' as OrderType,
      side,
      status: 'filled' as OrderStatus,
      quantity,
      filledQuantity: quantity,
      averagePrice: executionPrice,
      fees,
      slippage: this.config.slippage,
      createdAt: new Date(),
      filledAt: new Date(),
    };

    this.orders.set(order.id, order);

    // Update balance
    if (side === OrderSide.BUY) {
      this.balance.available -= totalCost;
      this.balance.locked += orderValue;
    } else {
      // For sell orders, release locked funds
      const position = Array.from(this.positions.values()).find((p) => p.symbol === symbol);
      if (position) {
        this.balance.locked -= position.quantity * position.entryPrice;
        this.balance.available += orderValue - fees;
      }
    }

    this.balance.total = this.balance.available + this.balance.locked;

    console.log(`✅ Market order placed: ${side} ${quantity} ${symbol} @ ${executionPrice}`);
    console.log(`   Fees: ${fees.toFixed(2)} ${this.config.currency}`);

    this.emitEvent({
      type: 'order',
      action: 'filled',
      data: order,
      timestamp: new Date(),
    });

    // Open or close position
    if (side === OrderSide.BUY) {
      this.openPosition(order);
    } else {
      this.closePosition(symbol, order);
    }

    return order;
  }

  /**
   * Place a limit order
   */
  placeLimitOrder(
    symbol: string,
    side: OrderSide,
    quantity: number,
    price: number,
  ): PaperOrder | null {
    const orderValue = quantity * price;
    const fees = (orderValue * this.config.fees.maker) / 100;
    const totalCost = orderValue + fees;

    // Check if we have enough balance for buy orders
    if (side === OrderSide.BUY && totalCost > this.balance.available) {
      console.error(
        `❌ Insufficient balance. Required: ${totalCost}, Available: ${this.balance.available}`,
      );
      return null;
    }

    // Create order
    const order: PaperOrder = {
      id: randomUUID(),
      symbol,
      type: 'limit' as OrderType,
      side,
      status: 'pending' as OrderStatus,
      price,
      quantity,
      filledQuantity: 0,
      averagePrice: 0,
      fees: 0,
      slippage: 0,
      createdAt: new Date(),
    };

    this.orders.set(order.id, order);

    // Lock funds for buy orders
    if (side === OrderSide.BUY) {
      this.balance.available -= totalCost;
      this.balance.locked += totalCost;
    }

    console.log(`📝 Limit order placed: ${side} ${quantity} ${symbol} @ ${price}`);

    this.emitEvent({
      type: 'order',
      action: 'created',
      data: order,
      timestamp: new Date(),
    });

    return order;
  }

  /**
   * Cancel an order
   */
  cancelOrder(orderId: string): boolean {
    const order = this.orders.get(orderId);
    if (!order) {
      console.error(`❌ Order not found: ${orderId}`);
      return false;
    }

    if (order.status !== 'pending') {
      console.error(`❌ Cannot cancel order with status: ${order.status}`);
      return false;
    }

    // Release locked funds
    if (order.side === OrderSide.BUY && order.price) {
      const lockedAmount = order.quantity * order.price * (1 + this.config.fees.maker / 100);
      this.balance.locked -= lockedAmount;
      this.balance.available += lockedAmount;
    }

    order.status = 'cancelled' as OrderStatus;
    order.cancelledAt = new Date();

    console.log(`🚫 Order cancelled: ${orderId}`);

    this.emitEvent({
      type: 'order',
      action: 'cancelled',
      data: order,
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Open a position from a filled buy order
   */
  private openPosition(order: PaperOrder): void {
    const position: PaperPosition = {
      id: randomUUID(),
      symbol: order.symbol,
      side: 'long',
      entryPrice: order.averagePrice,
      quantity: order.quantity,
      openedAt: new Date(),
      openOrderId: order.id,
    };

    this.positions.set(position.id, position);

    console.log(
      `📈 Position opened: LONG ${order.quantity} ${order.symbol} @ ${order.averagePrice}`,
    );

    this.emitEvent({
      type: 'position',
      action: 'opened',
      data: position,
      timestamp: new Date(),
    });
  }

  /**
   * Close a position with a sell order
   */
  private closePosition(symbol: string, exitOrder: PaperOrder): void {
    const position = Array.from(this.positions.values()).find((p) => p.symbol === symbol);
    if (!position) {
      console.error(`❌ No position found for ${symbol}`);
      return;
    }

    // Calculate P&L
    const entryValue = position.quantity * position.entryPrice;
    const exitValue = exitOrder.quantity * exitOrder.averagePrice;
    const entryOrder = this.orders.get(position.openOrderId);
    const totalFees = (entryOrder?.fees ?? 0) + exitOrder.fees;

    const pnl = exitValue - entryValue - totalFees;
    const pnlPercent = (pnl / entryValue) * 100;

    // Create closed trade record
    const closedTrade: ClosedTrade = {
      id: randomUUID(),
      symbol,
      side: position.side,
      entryPrice: position.entryPrice,
      exitPrice: exitOrder.averagePrice,
      quantity: position.quantity,
      entryTime: position.openedAt,
      exitTime: exitOrder.filledAt!,
      pnl,
      pnlPercent,
      fees: totalFees,
      slippage: this.config.slippage * 2, // entry + exit
      entryOrderId: position.openOrderId,
      exitOrderId: exitOrder.id,
      exitReason: 'manual',
    };

    this.closedTrades.push(closedTrade);
    this.positions.delete(position.id);

    console.log(`📉 Position closed: ${symbol}`);
    console.log(`   P&L: ${pnl.toFixed(2)} ${this.config.currency} (${pnlPercent.toFixed(2)}%)`);

    this.emitEvent({
      type: 'position',
      action: 'closed',
      data: { position, trade: closedTrade },
      timestamp: new Date(),
    });

    // Update drawdown
    this.updateDrawdown();
  }

  /**
   * Check pending limit orders
   */
  private checkPendingOrders(symbol: string, currentPrice: number): void {
    for (const order of this.orders.values()) {
      if (order.symbol !== symbol || order.status !== 'pending' || !order.price) {
        continue;
      }

      let shouldFill = false;

      if (order.side === OrderSide.BUY && currentPrice <= order.price) {
        shouldFill = true;
      } else if (order.side === OrderSide.SELL && currentPrice >= order.price) {
        shouldFill = true;
      }

      if (shouldFill) {
        this.fillLimitOrder(order, currentPrice);
      }
    }
  }

  /**
   * Fill a limit order
   */
  private fillLimitOrder(order: PaperOrder, _currentPrice: number): void {
    const executionPrice = order.price!;
    const orderValue = order.quantity * executionPrice;
    const fees = (orderValue * this.config.fees.maker) / 100;

    order.status = 'filled' as OrderStatus;
    order.filledQuantity = order.quantity;
    order.averagePrice = executionPrice;
    order.fees = fees;
    order.filledAt = new Date();

    console.log(
      `✅ Limit order filled: ${order.side} ${order.quantity} ${order.symbol} @ ${executionPrice}`,
    );

    this.emitEvent({
      type: 'order',
      action: 'filled',
      data: order,
      timestamp: new Date(),
    });

    // Open or close position
    if (order.side === OrderSide.BUY) {
      this.openPosition(order);
    } else {
      this.closePosition(order.symbol, order);
    }
  }

  /**
   * Update unrealized P&L for positions
   */
  private updatePositionPnL(symbol: string, currentPrice: number): void {
    for (const position of this.positions.values()) {
      if (position.symbol !== symbol) continue;

      position.currentPrice = currentPrice;

      const currentValue = position.quantity * currentPrice;
      const entryValue = position.quantity * position.entryPrice;
      const unrealizedPnL = currentValue - entryValue;
      const unrealizedPnLPercent = (unrealizedPnL / entryValue) * 100;

      position.unrealizedPnL = unrealizedPnL;
      position.unrealizedPnLPercent = unrealizedPnLPercent;

      // Update equity
      this.balance.equity = this.balance.total + unrealizedPnL;
    }

    this.updateDrawdown();
  }

  /**
   * Apply slippage to price
   */
  private applySlippage(price: number, side: OrderSide): number {
    const slippagePercent = this.config.slippage / 100;
    if (side === OrderSide.BUY) {
      return price * (1 + slippagePercent);
    } else {
      return price * (1 - slippagePercent);
    }
  }

  /**
   * Update maximum drawdown
   */
  private updateDrawdown(): void {
    if (this.balance.equity > this.peakEquity) {
      this.peakEquity = this.balance.equity;
    }

    const currentDrawdown = this.peakEquity - this.balance.equity;

    if (currentDrawdown > this.maxDrawdown) {
      this.maxDrawdown = currentDrawdown;
    }
  }

  /**
   * Get current balance
   */
  getBalance(): PaperBalance {
    return { ...this.balance };
  }

  /**
   * Get all orders
   */
  getOrders(): PaperOrder[] {
    return Array.from(this.orders.values());
  }

  /**
   * Get open positions
   */
  getPositions(): PaperPosition[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get closed trades
   */
  getClosedTrades(): ClosedTrade[] {
    return [...this.closedTrades];
  }

  /**
   * Get trading statistics
   */
  getStats(): PaperTradingStats {
    const trades = this.closedTrades;
    const winningTrades = trades.filter((t) => t.pnl > 0);
    const losingTrades = trades.filter((t) => t.pnl < 0);

    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const totalFees = trades.reduce((sum, t) => sum + t.fees, 0);
    const totalSlippage = trades.reduce((sum, t) => sum + t.slippage, 0);

    const grossProfit = winningTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0));

    const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;

    const largestWin =
      winningTrades.length > 0 ? Math.max(...winningTrades.map((t) => t.pnl ?? 0)) : 0;
    const largestLoss =
      losingTrades.length > 0 ? Math.min(...losingTrades.map((t) => t.pnl ?? 0)) : 0;

    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

    const totalPnLPercent = ((this.balance.equity - this.startBalance) / this.startBalance) * 100;
    const maxDrawdownPercent = (this.maxDrawdown / this.peakEquity) * 100;

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      totalPnL,
      totalPnLPercent,
      totalFees,
      totalSlippage,
      averageWin: avgWin,
      averageLoss: avgLoss,
      largestWin,
      largestLoss,
      profitFactor,
      maxDrawdown: this.maxDrawdown,
      maxDrawdownPercent,
      startBalance: this.startBalance,
      currentBalance: this.balance.total,
      equity: this.balance.equity,
      startTime: this.startTime,
      lastTradeTime: trades.length > 0 ? trades[trades.length - 1]?.exitTime : undefined,
    };
  }

  /**
   * Register event listener
   */
  on(listener: (event: PaperTradingEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(event: PaperTradingEvent): void {
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }

  /**
   * Get configuration
   */
  getConfig(): PaperTradingConfig {
    return { ...this.config };
  }

  /**
   * Set stop-loss for a position
   */
  setStopLoss(positionId: string, stopLoss: number): boolean {
    const position = this.positions.get(positionId);
    if (!position) {
      console.error(`❌ Position not found: ${positionId}`);
      return false;
    }

    position.stopLoss = stopLoss;
    console.log(`🛡️ Stop-loss set for ${position.symbol}: ${stopLoss}`);

    return true;
  }

  /**
   * Set take-profit for a position
   */
  setTakeProfit(positionId: string, takeProfit: number): boolean {
    const position = this.positions.get(positionId);
    if (!position) {
      console.error(`❌ Position not found: ${positionId}`);
      return false;
    }

    position.takeProfit = takeProfit;
    console.log(`🎯 Take-profit set for ${position.symbol}: ${takeProfit}`);

    return true;
  }

  /**
   * Check stop-loss and take-profit levels
   */
  checkStopLossTakeProfit(): void {
    const positionsToClose: Array<{
      position: PaperPosition;
      reason: 'stop-loss' | 'take-profit';
    }> = [];

    for (const position of this.positions.values()) {
      if (!position.currentPrice) continue;

      // Check stop-loss
      if (position.stopLoss && position.currentPrice <= position.stopLoss) {
        positionsToClose.push({
          position,
          reason: 'stop-loss',
        });
        continue;
      }

      // Check take-profit
      if (position.takeProfit && position.currentPrice >= position.takeProfit) {
        positionsToClose.push({
          position,
          reason: 'take-profit',
        });
      }
    }

    // Close positions
    for (const { position, reason } of positionsToClose) {
      console.log(
        `⚠️ ${reason === 'stop-loss' ? 'Stop-loss' : 'Take-profit'} triggered for ${position.symbol}`,
      );

      // Create exit order
      const exitOrder = this.placeMarketOrder(position.symbol, OrderSide.SELL, position.quantity);
      if (exitOrder) {
        const trade = this.closedTrades[this.closedTrades.length - 1];
        if (trade) {
          trade.exitReason = reason;
        }
      }
    }
  }

  /**
   * Reset paper trading (clear all data)
   */
  reset(): void {
    this.orders.clear();
    this.positions.clear();
    this.closedTrades = [];
    this.marketPrices.clear();
    this.balance = {
      currency: this.config.currency ?? 'USDT',
      total: this.config.initialBalance,
      available: this.config.initialBalance,
      locked: 0,
      equity: this.config.initialBalance,
    };
    this.startTime = new Date();
    this.startBalance = this.config.initialBalance;
    this.peakEquity = this.config.initialBalance;
    this.maxDrawdown = 0;

    console.log('🔄 Paper trading reset');
  }
}
