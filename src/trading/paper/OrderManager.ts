/**
 * Paper Trading Order Manager
 * Manages virtual order lifecycle and execution
 */

import { randomUUID } from 'crypto';
import {
  VirtualOrder,
  PaperTrade,
  PlaceOrderParams,
  CancelOrderResult,
  OrderType,
  OrderStatus,
  OrderSide,
  MarketTick,
} from './types.js';
import { PaperAccount } from './PaperAccount.js';

export class OrderManager {
  private orders: Map<string, VirtualOrder>;
  private trades: PaperTrade[];
  private account: PaperAccount;

  constructor(account: PaperAccount) {
    this.orders = new Map();
    this.trades = [];
    this.account = account;
  }

  /**
   * Place a new order
   */
  public placeOrder(params: PlaceOrderParams): VirtualOrder | { error: string } {
    // Validate order parameters
    const validation = this.validateOrder(params);
    if (!validation.valid) {
      return { error: validation.reason || 'Invalid order parameters' };
    }

    // Estimate execution price with slippage
    const estimatedPrice = params.price || 0; // Will be filled from market data
    const executionPrice = this.account.applySlippage(estimatedPrice, params.side);

    // Check if order can be placed
    const canPlace = this.account.canPlaceOrder(
      params.side,
      params.quantity,
      executionPrice,
    );

    if (!canPlace.allowed) {
      return { error: canPlace.reason || 'Order rejected' };
    }

    // Create order
    const order: VirtualOrder = {
      id: randomUUID(),
      symbol: params.symbol,
      type: params.type,
      side: params.side,
      status: OrderStatus.PENDING,
      price: params.price,
      stopPrice: params.stopPrice,
      executedPrice: undefined,
      quantity: params.quantity,
      filledQuantity: 0,
      remainingQuantity: params.quantity,
      fees: 0,
      slippage: 0,
      totalCost: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      strategyName: params.strategyName,
      reason: params.reason,
    };

    // Lock cash for buy orders
    if (params.side === OrderSide.BUY) {
      const orderValue = params.quantity * executionPrice;
      const fees = this.account.calculateFees(orderValue, 'taker');
      this.account.lockCash(orderValue + fees);
    }

    this.orders.set(order.id, order);
    return order;
  }

  /**
   * Execute a market order immediately
   */
  public executeMarketOrder(orderId: string, marketTick: MarketTick): PaperTrade | null {
    const order = this.orders.get(orderId);
    if (!order || order.type !== OrderType.MARKET) {
      return null;
    }

    // Apply slippage to market price
    const executionPrice = this.account.applySlippage(marketTick.price, order.side);
    const orderValue = order.quantity * executionPrice;
    const fees = this.account.calculateFees(orderValue, 'taker');
    const slippage = this.account.calculateSlippage(orderValue);

    // Create trade
    const trade: PaperTrade = {
      id: randomUUID(),
      orderId: order.id,
      symbol: order.symbol,
      side: order.side,
      executedPrice: executionPrice,
      quantity: order.quantity,
      executedAt: new Date(),
      fees,
      slippage,
      totalValue: order.side === OrderSide.BUY ? orderValue + fees : orderValue - fees,
      isClosing: false,
      strategyName: order.strategyName,
    };

    // Update order status
    order.status = OrderStatus.FILLED;
    order.executedPrice = executionPrice;
    order.filledQuantity = order.quantity;
    order.remainingQuantity = 0;
    order.fees = fees;
    order.slippage = slippage;
    order.totalCost = trade.totalValue;
    order.filledAt = new Date();
    order.updatedAt = new Date();

    // Unlock cash for buy orders
    if (order.side === OrderSide.BUY) {
      this.account.unlockCash(orderValue + fees);
    }

    // Execute trade in account
    this.account.executeTrade(trade);

    // Open position for buy orders
    if (order.side === OrderSide.BUY) {
      const positionId = randomUUID();
      trade.positionId = positionId;
      this.account.openPosition(
        positionId,
        order.id,
        order.symbol,
        executionPrice,
        order.quantity,
        fees,
        order.strategyName,
      );
    }

    this.trades.push(trade);
    this.orders.set(orderId, order);

    return trade;
  }

  /**
   * Check and execute limit orders
   */
  public checkLimitOrders(marketTick: MarketTick): PaperTrade[] {
    const executedTrades: PaperTrade[] = [];

    for (const order of this.orders.values()) {
      if (
        order.type === OrderType.LIMIT &&
        order.status === OrderStatus.PENDING &&
        order.symbol === marketTick.symbol
      ) {
        const shouldExecute = this.shouldExecuteLimitOrder(order, marketTick);
        if (shouldExecute) {
          const trade = this.executeLimitOrder(order, marketTick);
          if (trade) {
            executedTrades.push(trade);
          }
        }
      }
    }

    return executedTrades;
  }

  /**
   * Check and execute stop orders
   */
  public checkStopOrders(marketTick: MarketTick): PaperTrade[] {
    const executedTrades: PaperTrade[] = [];

    for (const order of this.orders.values()) {
      if (
        (order.type === OrderType.STOP_LOSS || order.type === OrderType.TAKE_PROFIT) &&
        order.status === OrderStatus.PENDING &&
        order.symbol === marketTick.symbol
      ) {
        const shouldExecute = this.shouldExecuteStopOrder(order, marketTick);
        if (shouldExecute) {
          const trade = this.executeStopOrder(order, marketTick);
          if (trade) {
            executedTrades.push(trade);
          }
        }
      }
    }

    return executedTrades;
  }

  /**
   * Cancel an order
   */
  public cancelOrder(orderId: string, reason?: string): CancelOrderResult {
    const order = this.orders.get(orderId);
    if (!order) {
      return {
        success: false,
        orderId,
        reason: 'Order not found',
      };
    }

    if (order.status !== OrderStatus.PENDING) {
      return {
        success: false,
        orderId,
        reason: `Cannot cancel order with status ${order.status}`,
      };
    }

    // Unlock cash for buy orders
    if (order.side === OrderSide.BUY) {
      const orderValue = order.quantity * (order.price || 0);
      const fees = this.account.calculateFees(orderValue, 'taker');
      this.account.unlockCash(orderValue + fees);
    }

    order.status = OrderStatus.CANCELLED;
    order.updatedAt = new Date();
    this.orders.set(orderId, order);

    return {
      success: true,
      orderId,
      reason,
    };
  }

  /**
   * Get order by ID
   */
  public getOrder(orderId: string): VirtualOrder | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Get all orders
   */
  public getAllOrders(): VirtualOrder[] {
    return Array.from(this.orders.values());
  }

  /**
   * Get pending orders
   */
  public getPendingOrders(): VirtualOrder[] {
    return Array.from(this.orders.values()).filter(
      (order) => order.status === OrderStatus.PENDING,
    );
  }

  /**
   * Get filled orders
   */
  public getFilledOrders(): VirtualOrder[] {
    return Array.from(this.orders.values()).filter(
      (order) => order.status === OrderStatus.FILLED,
    );
  }

  /**
   * Get all trades
   */
  public getAllTrades(): PaperTrade[] {
    return this.trades;
  }

  /**
   * Get trades for a specific symbol
   */
  public getTradesBySymbol(symbol: string): PaperTrade[] {
    return this.trades.filter((trade) => trade.symbol === symbol);
  }

  /**
   * Validate order parameters
   */
  private validateOrder(params: PlaceOrderParams): { valid: boolean; reason?: string } {
    if (!params.symbol || params.symbol.trim() === '') {
      return { valid: false, reason: 'Symbol is required' };
    }

    if (params.quantity <= 0) {
      return { valid: false, reason: 'Quantity must be positive' };
    }

    if (params.type === OrderType.LIMIT && (!params.price || params.price <= 0)) {
      return { valid: false, reason: 'Limit orders require a valid price' };
    }

    if (
      (params.type === OrderType.STOP_LOSS || params.type === OrderType.TAKE_PROFIT) &&
      (!params.stopPrice || params.stopPrice <= 0)
    ) {
      return { valid: false, reason: 'Stop orders require a valid stop price' };
    }

    return { valid: true };
  }

  /**
   * Check if limit order should be executed
   */
  private shouldExecuteLimitOrder(order: VirtualOrder, marketTick: MarketTick): boolean {
    if (!order.price) return false;

    if (order.side === OrderSide.BUY) {
      // Buy limit: execute when market price drops to or below limit price
      return marketTick.ask <= order.price;
    } else {
      // Sell limit: execute when market price rises to or above limit price
      return marketTick.bid >= order.price;
    }
  }

  /**
   * Check if stop order should be executed
   */
  private shouldExecuteStopOrder(order: VirtualOrder, marketTick: MarketTick): boolean {
    if (!order.stopPrice) return false;

    if (order.type === OrderType.STOP_LOSS) {
      // Stop loss: execute when price drops to or below stop price
      return marketTick.price <= order.stopPrice;
    } else {
      // Take profit: execute when price rises to or above stop price
      return marketTick.price >= order.stopPrice;
    }
  }

  /**
   * Execute a limit order
   */
  private executeLimitOrder(order: VirtualOrder, marketTick: MarketTick): PaperTrade | null {
    const executionPrice = order.price || marketTick.price;
    return this.executeOrder(order, executionPrice, 'maker');
  }

  /**
   * Execute a stop order
   */
  private executeStopOrder(order: VirtualOrder, marketTick: MarketTick): PaperTrade | null {
    const executionPrice = this.account.applySlippage(marketTick.price, order.side);
    return this.executeOrder(order, executionPrice, 'taker');
  }

  /**
   * Execute an order
   */
  private executeOrder(
    order: VirtualOrder,
    executionPrice: number,
    feeType: 'maker' | 'taker',
  ): PaperTrade | null {
    const orderValue = order.quantity * executionPrice;
    const fees = this.account.calculateFees(orderValue, feeType);
    const slippage =
      feeType === 'taker' ? this.account.calculateSlippage(orderValue) : 0;

    // Create trade
    const trade: PaperTrade = {
      id: randomUUID(),
      orderId: order.id,
      symbol: order.symbol,
      side: order.side,
      executedPrice: executionPrice,
      quantity: order.quantity,
      executedAt: new Date(),
      fees,
      slippage,
      totalValue: order.side === OrderSide.BUY ? orderValue + fees : orderValue - fees,
      isClosing: order.side === OrderSide.SELL,
      strategyName: order.strategyName,
    };

    // Update order status
    order.status = OrderStatus.FILLED;
    order.executedPrice = executionPrice;
    order.filledQuantity = order.quantity;
    order.remainingQuantity = 0;
    order.fees = fees;
    order.slippage = slippage;
    order.totalCost = trade.totalValue;
    order.filledAt = new Date();
    order.updatedAt = new Date();

    // Unlock cash for buy orders
    if (order.side === OrderSide.BUY) {
      const estimatedCost = order.quantity * (order.price || executionPrice);
      const estimatedFees = this.account.calculateFees(estimatedCost, 'taker');
      this.account.unlockCash(estimatedCost + estimatedFees);
    }

    // Execute trade in account
    this.account.executeTrade(trade);

    // Handle position for buy/sell orders
    if (order.side === OrderSide.BUY) {
      const positionId = randomUUID();
      trade.positionId = positionId;
      this.account.openPosition(
        positionId,
        order.id,
        order.symbol,
        executionPrice,
        order.quantity,
        fees,
        order.strategyName,
      );
    } else if (order.side === OrderSide.SELL) {
      // Find and close corresponding position
      const positions = this.account.getOpenPositions();
      const position = positions.find((p) => p.symbol === order.symbol);
      if (position) {
        trade.positionId = position.id;
        trade.isClosing = true;
        this.account.closePosition(position.id, executionPrice, fees);
      }
    }

    this.trades.push(trade);
    this.orders.set(order.id, order);

    return trade;
  }
}
