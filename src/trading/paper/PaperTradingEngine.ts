/**
 * Paper Trading Engine
 * Main engine for paper trading mode with realistic order execution
 */

import {
  PaperTradingConfig,
  PlaceOrderParams,
  OrderType,
  OrderSide,
  PaperBalance,
  PaperStats,
  VirtualOrder,
  PaperTrade,
  ClosePositionParams,
  CancelOrderResult,
  TradingMode,
} from './types.js';
import { PaperAccount } from './PaperAccount.js';
import { OrderManager } from './OrderManager.js';
import { StatsTracker } from './StatsTracker.js';
import { IMarketDataFeed, MarketDataFeedFactory } from './MarketDataFeed.js';

/**
 * Paper Trading Engine
 */
export class PaperTradingEngine {
  private config: PaperTradingConfig;
  private account: PaperAccount;
  private orderManager: OrderManager;
  private statsTracker: StatsTracker;
  private marketDataFeed: IMarketDataFeed;
  private isRunning: boolean;
  private updateIntervalId?: NodeJS.Timeout;

  constructor(config: PaperTradingConfig) {
    this.config = config;
    this.account = new PaperAccount(config);
    this.orderManager = new OrderManager(this.account);
    this.statsTracker = new StatsTracker(config.mode);
    this.marketDataFeed = MarketDataFeedFactory.create(
      config.dataSource || 'mock',
    );
    this.isRunning = false;
  }

  /**
   * Start the paper trading engine
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[PaperTradingEngine] Already running');
      return;
    }

    console.info('[PaperTradingEngine] Starting paper trading engine...');
    console.info(`[PaperTradingEngine] Mode: ${this.config.mode}`);
    console.info(`[PaperTradingEngine] Initial Balance: $${this.config.initialBalance}`);
    console.info(`[PaperTradingEngine] Fees: Maker ${this.config.fees.maker * 100}% / Taker ${this.config.fees.taker * 100}%`);
    console.info(`[PaperTradingEngine] Slippage: ${this.config.slippage * 100}%`);

    // Start market data feed
    await this.marketDataFeed.start();

    this.isRunning = true;

    // Start position update loop (every second)
    this.updateIntervalId = setInterval(() => {
      this.updatePositions();
    }, 1000);

    console.info('[PaperTradingEngine] ✅ Paper trading engine started');
  }

  /**
   * Stop the paper trading engine
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.info('[PaperTradingEngine] Stopping paper trading engine...');

    this.isRunning = false;

    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId);
      this.updateIntervalId = undefined;
    }

    await this.marketDataFeed.stop();

    console.info('[PaperTradingEngine] ✅ Paper trading engine stopped');
  }

  /**
   * Subscribe to market data for a symbol
   */
  public subscribeToMarketData(symbol: string): void {
    this.marketDataFeed.subscribe(symbol);
    console.info(`[PaperTradingEngine] Subscribed to market data for ${symbol}`);
  }

  /**
   * Place an order
   */
  public placeOrder(params: PlaceOrderParams): VirtualOrder | { error: string } {
    // Get current market price for the symbol
    const marketTick = this.marketDataFeed.getLatestTick(params.symbol);
    if (!marketTick) {
      return { error: `No market data available for ${params.symbol}` };
    }

    // For market orders, use current market price
    if (params.type === OrderType.MARKET) {
      params.price = marketTick.price;
    }

    // Place the order
    const order = this.orderManager.placeOrder(params);

    if ('error' in order) {
      console.error(`[PaperTradingEngine] Order rejected: ${order.error}`);
      return order;
    }

    console.info(`[PaperTradingEngine] Order placed: ${order.id} | ${order.side} ${order.quantity} ${order.symbol} @ ${order.price || 'MARKET'}`);

    // Execute market orders immediately
    if (order.type === OrderType.MARKET) {
      const trade = this.orderManager.executeMarketOrder(order.id, marketTick);
      if (trade) {
        this.statsTracker.recordTrade(trade, 0); // P&L will be calculated on close
        console.info(`[PaperTradingEngine] Market order executed: ${trade.id} | ${trade.side} ${trade.quantity} ${trade.symbol} @ ${trade.executedPrice.toFixed(2)}`);
      }
    }

    return order;
  }

  /**
   * Cancel an order
   */
  public cancelOrder(orderId: string, reason?: string): CancelOrderResult {
    const result = this.orderManager.cancelOrder(orderId, reason);

    if (result.success) {
      console.info(`[PaperTradingEngine] Order cancelled: ${orderId}`);
    } else {
      console.error(`[PaperTradingEngine] Failed to cancel order: ${result.reason}`);
    }

    return result;
  }

  /**
   * Close a position
   */
  public closePosition(params: ClosePositionParams): VirtualOrder | { error: string } {
    const position = this.account.getPosition(params.positionId);
    if (!position) {
      return { error: `Position ${params.positionId} not found` };
    }

    const quantity = params.quantity || position.quantity;

    // Place a market sell order to close the position
    return this.placeOrder({
      symbol: position.symbol,
      type: OrderType.MARKET,
      side: OrderSide.SELL,
      quantity,
      reason: params.reason || 'Close position',
      strategyName: position.strategyName,
    });
  }

  /**
   * Get current balance
   */
  public getBalance(): PaperBalance {
    return this.account.getBalance();
  }

  /**
   * Get current statistics
   */
  public getStats(): PaperStats {
    return this.statsTracker.getStats(
      this.account,
      this.orderManager.getAllOrders(),
    );
  }

  /**
   * Get all orders
   */
  public getOrders(): VirtualOrder[] {
    return this.orderManager.getAllOrders();
  }

  /**
   * Get pending orders
   */
  public getPendingOrders(): VirtualOrder[] {
    return this.orderManager.getPendingOrders();
  }

  /**
   * Get filled orders
   */
  public getFilledOrders(): VirtualOrder[] {
    return this.orderManager.getFilledOrders();
  }

  /**
   * Get all trades
   */
  public getTrades(): PaperTrade[] {
    return this.orderManager.getAllTrades();
  }

  /**
   * Print statistics summary
   */
  public printStats(): void {
    const stats = this.getStats();
    console.info('\n' + StatsTracker.formatStats(stats));
  }

  /**
   * Reset the engine to initial state
   */
  public reset(): void {
    console.info('[PaperTradingEngine] Resetting paper trading engine...');
    this.account.reset();
    this.statsTracker.reset();
    console.info('[PaperTradingEngine] ✅ Reset complete');
  }

  /**
   * Update positions with current market prices
   */
  private updatePositions(): void {
    const positions = this.account.getOpenPositions();

    for (const position of positions) {
      const marketTick = this.marketDataFeed.getLatestTick(position.symbol);
      if (marketTick) {
        this.account.updatePosition(position.id, marketTick);

        // Check stop loss
        if (position.stopLoss && marketTick.price <= position.stopLoss) {
          console.warn(`[PaperTradingEngine] Stop loss triggered for position ${position.id}`);
          void this.closePosition({
            positionId: position.id,
            reason: 'Stop loss triggered',
          });
        }

        // Check take profit
        if (position.takeProfit && marketTick.price >= position.takeProfit) {
          console.info(`[PaperTradingEngine] Take profit triggered for position ${position.id}`);
          void this.closePosition({
            positionId: position.id,
            reason: 'Take profit triggered',
          });
        }

        // Check pending orders
        this.orderManager.checkLimitOrders(marketTick);
        this.orderManager.checkStopOrders(marketTick);
      }
    }
  }

  /**
   * Get current trading mode
   */
  public getMode(): TradingMode {
    return this.config.mode;
  }

  /**
   * Check if engine is running
   */
  public isActive(): boolean {
    return this.isRunning;
  }
}
