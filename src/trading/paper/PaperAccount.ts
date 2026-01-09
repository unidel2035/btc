/**
 * Paper Trading Account
 * Manages balance simulation and position tracking
 */

import {
  PaperBalance,
  PaperPosition,
  PaperTrade,
  PaperTradingConfig,
  OrderSide,
  MarketTick,
} from './types.js';

export class PaperAccount {
  private config: PaperTradingConfig;
  private cash: number;
  private positions: Map<string, PaperPosition>;
  private lockedCash: number;
  private realizedPnL: number;
  private startTime: Date;
  private peakEquity: number;

  constructor(config: PaperTradingConfig) {
    this.config = config;
    this.cash = config.initialBalance;
    this.positions = new Map();
    this.lockedCash = 0;
    this.realizedPnL = 0;
    this.startTime = new Date();
    this.peakEquity = config.initialBalance;
  }

  /**
   * Get current balance state
   */
  public getBalance(): PaperBalance {
    const positionsArray = Array.from(this.positions.values());
    const unrealizedPnL = positionsArray.reduce(
      (sum, pos) => sum + pos.unrealizedPnL,
      0,
    );
    const positionsValue = positionsArray.reduce(
      (sum, pos) => sum + pos.marketValue,
      0,
    );
    const equity = this.cash + positionsValue;

    // Update peak equity for drawdown calculation
    if (equity > this.peakEquity) {
      this.peakEquity = equity;
    }

    return {
      cash: this.cash,
      equity,
      positions: positionsArray,
      lockedCash: this.lockedCash,
      unrealizedPnL,
      realizedPnL: this.realizedPnL,
    };
  }

  /**
   * Check if order can be placed
   */
  public canPlaceOrder(
    side: OrderSide,
    quantity: number,
    price: number,
  ): { allowed: boolean; reason?: string } {
    const orderValue = quantity * price;
    const fees = this.calculateFees(orderValue, 'taker');
    const totalCost = orderValue + fees;

    if (side === OrderSide.BUY) {
      const availableCash = this.cash - this.lockedCash;
      if (totalCost > availableCash) {
        return {
          allowed: false,
          reason: `Insufficient funds. Required: ${totalCost.toFixed(2)}, Available: ${availableCash.toFixed(2)}`,
        };
      }

      // Check position size limit
      if (this.config.maxPositionSize) {
        const balance = this.getBalance();
        const positionSizePercent = (orderValue / balance.equity) * 100;
        if (positionSizePercent > this.config.maxPositionSize) {
          return {
            allowed: false,
            reason: `Position size ${positionSizePercent.toFixed(2)}% exceeds max ${this.config.maxPositionSize}%`,
          };
        }
      }

      // Check max positions limit
      if (this.config.maxPositions && this.positions.size >= this.config.maxPositions) {
        return {
          allowed: false,
          reason: `Maximum positions limit (${this.config.maxPositions}) reached`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Lock cash for pending order
   */
  public lockCash(amount: number): void {
    this.lockedCash += amount;
  }

  /**
   * Unlock cash from cancelled/rejected order
   */
  public unlockCash(amount: number): void {
    this.lockedCash = Math.max(0, this.lockedCash - amount);
  }

  /**
   * Execute a trade and update balance
   */
  public executeTrade(trade: PaperTrade): void {
    if (trade.side === OrderSide.BUY) {
      this.cash -= trade.totalValue;
    } else {
      this.cash += trade.totalValue;
    }

    this.realizedPnL += trade.isClosing ? this.calculateTradePnL(trade) : 0;
  }

  /**
   * Open a new position
   */
  public openPosition(
    positionId: string,
    orderId: string,
    symbol: string,
    entryPrice: number,
    quantity: number,
    entryFees: number,
    strategyName?: string,
  ): PaperPosition {
    const position: PaperPosition = {
      id: positionId,
      symbol,
      side: 'long',
      entryPrice,
      entryTime: new Date(),
      quantity,
      entryFees,
      currentPrice: entryPrice,
      marketValue: quantity * entryPrice,
      unrealizedPnL: -entryFees,
      unrealizedPnLPercent: (-entryFees / (quantity * entryPrice)) * 100,
      orderId,
      strategyName,
    };

    this.positions.set(positionId, position);
    return position;
  }

  /**
   * Close a position
   */
  public closePosition(positionId: string, exitPrice: number, exitFees: number): number {
    const position = this.positions.get(positionId);
    if (!position) {
      throw new Error(`Position ${positionId} not found`);
    }

    // Calculate realized P&L
    const revenue = position.quantity * exitPrice;
    const cost = position.quantity * position.entryPrice;
    const totalFees = position.entryFees + exitFees;
    const pnl = revenue - cost - totalFees;

    this.realizedPnL += pnl;
    this.positions.delete(positionId);

    return pnl;
  }

  /**
   * Update position with current market price
   */
  public updatePosition(positionId: string, marketTick: MarketTick): void {
    const position = this.positions.get(positionId);
    if (!position) {
      return;
    }

    position.currentPrice = marketTick.price;
    position.marketValue = position.quantity * marketTick.price;

    const cost = position.quantity * position.entryPrice + position.entryFees;
    position.unrealizedPnL = position.marketValue - cost;
    position.unrealizedPnLPercent = (position.unrealizedPnL / cost) * 100;

    this.positions.set(positionId, position);
  }

  /**
   * Get position by ID
   */
  public getPosition(positionId: string): PaperPosition | undefined {
    return this.positions.get(positionId);
  }

  /**
   * Get all open positions
   */
  public getOpenPositions(): PaperPosition[] {
    return Array.from(this.positions.values());
  }

  /**
   * Calculate fees for a trade
   */
  public calculateFees(orderValue: number, feeType: 'maker' | 'taker'): number {
    const feeRate = feeType === 'maker' ? this.config.fees.maker : this.config.fees.taker;
    return orderValue * feeRate;
  }

  /**
   * Calculate slippage for a trade
   */
  public calculateSlippage(orderValue: number): number {
    return orderValue * this.config.slippage;
  }

  /**
   * Apply slippage to execution price
   */
  public applySlippage(price: number, side: OrderSide): number {
    const slippagePercent = this.config.slippage;
    if (side === OrderSide.BUY) {
      return price * (1 + slippagePercent);
    } else {
      return price * (1 - slippagePercent);
    }
  }

  /**
   * Calculate P&L for a closing trade
   */
  private calculateTradePnL(trade: PaperTrade): number {
    if (!trade.positionId) {
      return 0;
    }

    const position = this.positions.get(trade.positionId);
    if (!position) {
      return 0;
    }

    const revenue = trade.quantity * trade.executedPrice;
    const cost = trade.quantity * position.entryPrice;
    const totalFees = position.entryFees + trade.fees;

    return revenue - cost - totalFees;
  }

  /**
   * Get peak equity (for drawdown calculation)
   */
  public getPeakEquity(): number {
    return this.peakEquity;
  }

  /**
   * Get initial balance
   */
  public getInitialBalance(): number {
    return this.config.initialBalance;
  }

  /**
   * Get start time
   */
  public getStartTime(): Date {
    return this.startTime;
  }

  /**
   * Reset account to initial state
   */
  public reset(): void {
    this.cash = this.config.initialBalance;
    this.positions.clear();
    this.lockedCash = 0;
    this.realizedPnL = 0;
    this.startTime = new Date();
    this.peakEquity = this.config.initialBalance;
  }
}
