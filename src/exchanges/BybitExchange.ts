import crypto from 'crypto';
import { BaseExchange } from './BaseExchange.js';
import {
  MarketType,
  OrderStatus,
  OrderType,
  OrderSide,
  CandleInterval,
  type ExchangeConfig,
  type Candle,
  type OrderBook,
  type Trade,
  type Ticker,
  type Order,
  type OrderRequest,
  type OCOOrderRequest,
  type Balance,
  type Position,
  type WebSocketSubscription,
  type WebSocketCallback,
  type OperationResult,
} from './types.js';

/**
 * Интеграция с Bybit (Spot + Futures)
 */
export class BybitExchange extends BaseExchange {
  private baseUrl: string;
  private wsBaseUrl: string;

  constructor(config: ExchangeConfig, marketType: MarketType = MarketType.SPOT) {
    super(config, marketType);

    // Определяем URL в зависимости от testnet
    if (config.testnet) {
      this.baseUrl = 'https://api-testnet.bybit.com';
      this.wsBaseUrl = 'wss://stream-testnet.bybit.com';
    } else {
      this.baseUrl = 'https://api.bybit.com';
      this.wsBaseUrl = 'wss://stream.bybit.com';
    }
  }

  /**
   * Создание подписи для authenticated запросов
   */
  private createSignature(timestamp: number, params: string): string {
    const message = `${timestamp}${this.config.apiKey}${params}`;
    return crypto.createHmac('sha256', this.config.apiSecret).update(message).digest('hex');
  }

  /**
   * Конвертация интервала в формат Bybit
   */
  private convertInterval(interval: CandleInterval): string {
    const intervalMap: Record<CandleInterval, string> = {
      [CandleInterval.ONE_MINUTE]: '1',
      [CandleInterval.THREE_MINUTES]: '3',
      [CandleInterval.FIVE_MINUTES]: '5',
      [CandleInterval.FIFTEEN_MINUTES]: '15',
      [CandleInterval.THIRTY_MINUTES]: '30',
      [CandleInterval.ONE_HOUR]: '60',
      [CandleInterval.TWO_HOURS]: '120',
      [CandleInterval.FOUR_HOURS]: '240',
      [CandleInterval.SIX_HOURS]: '360',
      [CandleInterval.TWELVE_HOURS]: '720',
      [CandleInterval.ONE_DAY]: 'D',
      [CandleInterval.ONE_WEEK]: 'W',
      [CandleInterval.ONE_MONTH]: 'M',
      [CandleInterval.THREE_DAYS]: 'D', // Bybit не поддерживает 3d
    };
    return intervalMap[interval] || '60';
  }

  /**
   * Конвертация типа ордера в формат Bybit
   */
  private convertOrderType(type: OrderType): string {
    const typeMap: Record<OrderType, string> = {
      [OrderType.MARKET]: 'Market',
      [OrderType.LIMIT]: 'Limit',
      [OrderType.STOP_LOSS]: 'Market', // Используется triggerPrice
      [OrderType.STOP_LOSS_LIMIT]: 'Limit',
      [OrderType.TAKE_PROFIT]: 'Market',
      [OrderType.TAKE_PROFIT_LIMIT]: 'Limit',
      [OrderType.STOP_MARKET]: 'Market',
      [OrderType.TAKE_PROFIT_MARKET]: 'Market',
      [OrderType.TRAILING_STOP]: 'Market',
    };
    return typeMap[type] || 'Limit';
  }

  /**
   * Конвертация статуса ордера из формата Bybit
   */
  private convertOrderStatus(status: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      New: OrderStatus.NEW,
      PartiallyFilled: OrderStatus.PARTIALLY_FILLED,
      Filled: OrderStatus.FILLED,
      Cancelled: OrderStatus.CANCELED,
      Rejected: OrderStatus.REJECTED,
      Expired: OrderStatus.EXPIRED,
      Untriggered: OrderStatus.NEW,
      Triggered: OrderStatus.NEW,
    };
    return statusMap[status] || OrderStatus.NEW;
  }

  /**
   * Получение категории рынка для Bybit API
   */
  private getCategory(): string {
    return this.marketType === MarketType.FUTURES ? 'linear' : 'spot';
  }

  /**
   * Выполнение HTTP запроса
   */
  private async request<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    params: Record<string, any> = {},
    signed: boolean = false,
  ): Promise<T> {
    await this.checkRateLimit();

    const timestamp = Date.now();
    const recvWindow = this.config.recvWindow || 5000;

    let url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    let body = '';
    let queryString = '';

    if (method === 'POST') {
      body = JSON.stringify(params);
    } else {
      queryString = new URLSearchParams(
        Object.entries(params).map(([key, value]) => [key, String(value)]),
      ).toString();
      if (queryString) url += `?${queryString}`;
    }

    if (signed) {
      const paramsStr = method === 'POST' ? body : queryString;
      const signature = this.createSignature(timestamp, `${recvWindow}${paramsStr}`);

      headers['X-BAPI-API-KEY'] = this.config.apiKey;
      headers['X-BAPI-TIMESTAMP'] = String(timestamp);
      headers['X-BAPI-SIGN'] = signature;
      headers['X-BAPI-RECV-WINDOW'] = String(recvWindow);
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (method === 'POST' && body) {
      options.body = body;
    }

    this.logRequest(endpoint, params);

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok || (data.retCode && data.retCode !== 0)) {
        throw new Error(`Bybit API error: ${data.retMsg || JSON.stringify(data)}`);
      }

      return data.result as T;
    } catch (error) {
      this.logError(endpoint, error);
      throw error;
    }
  }

  // =============================================================================
  // MARKET DATA
  // =============================================================================

  async getCandles(
    symbol: string,
    interval: CandleInterval,
    limit: number = 200,
    startTime?: number,
    endTime?: number,
  ): Promise<Candle[]> {
    const endpoint = '/v5/market/kline';

    const params: Record<string, any> = {
      category: this.getCategory(),
      symbol: symbol.toUpperCase(),
      interval: this.convertInterval(interval),
      limit,
    };

    if (startTime) params.start = startTime;
    if (endTime) params.end = endTime;

    const data = await this.request<any>('GET', endpoint, params);

    return data.list.map((item: any[]) => ({
      timestamp: parseInt(item[0]),
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5]),
    }));
  }

  async getOrderBook(symbol: string, depth: number = 50): Promise<OrderBook> {
    const endpoint = '/v5/market/orderbook';

    const params = {
      category: this.getCategory(),
      symbol: symbol.toUpperCase(),
      limit: Math.min(depth, 500),
    };

    const data = await this.request<any>('GET', endpoint, params);

    return {
      symbol,
      timestamp: parseInt(data.ts),
      bids: data.b.map((bid: [string, string]) => ({
        price: parseFloat(bid[0]),
        quantity: parseFloat(bid[1]),
      })),
      asks: data.a.map((ask: [string, string]) => ({
        price: parseFloat(ask[0]),
        quantity: parseFloat(ask[1]),
      })),
    };
  }

  async getRecentTrades(symbol: string, limit: number = 500): Promise<Trade[]> {
    const endpoint = '/v5/market/recent-trade';

    const params = {
      category: this.getCategory(),
      symbol: symbol.toUpperCase(),
      limit: Math.min(limit, 1000),
    };

    const data = await this.request<any>('GET', endpoint, params);

    return data.list.map((trade: any) => ({
      id: trade.execId,
      symbol,
      price: parseFloat(trade.price),
      quantity: parseFloat(trade.size),
      timestamp: parseInt(trade.time),
      side: trade.side.toLowerCase() as 'buy' | 'sell',
    }));
  }

  async getTicker(symbol: string): Promise<Ticker> {
    const endpoint = '/v5/market/tickers';

    const params = {
      category: this.getCategory(),
      symbol: symbol.toUpperCase(),
    };

    const data = await this.request<any>('GET', endpoint, params);
    const ticker = data.list[0];

    return {
      symbol,
      timestamp: Date.now(),
      bid: parseFloat(ticker.bid1Price),
      ask: parseFloat(ticker.ask1Price),
      last: parseFloat(ticker.lastPrice),
      volume24h: parseFloat(ticker.volume24h),
      high24h: parseFloat(ticker.highPrice24h),
      low24h: parseFloat(ticker.lowPrice24h),
      change24h: parseFloat(ticker.price24hPcnt) * parseFloat(ticker.lastPrice),
      changePercent24h: parseFloat(ticker.price24hPcnt) * 100,
    };
  }

  async getAllTickers(): Promise<Ticker[]> {
    const endpoint = '/v5/market/tickers';

    const params = {
      category: this.getCategory(),
    };

    const data = await this.request<any>('GET', endpoint, params);

    return data.list.map((ticker: any) => ({
      symbol: ticker.symbol,
      timestamp: Date.now(),
      bid: parseFloat(ticker.bid1Price),
      ask: parseFloat(ticker.ask1Price),
      last: parseFloat(ticker.lastPrice),
      volume24h: parseFloat(ticker.volume24h),
      high24h: parseFloat(ticker.highPrice24h),
      low24h: parseFloat(ticker.lowPrice24h),
      change24h: parseFloat(ticker.price24hPcnt) * parseFloat(ticker.lastPrice),
      changePercent24h: parseFloat(ticker.price24hPcnt) * 100,
    }));
  }

  // =============================================================================
  // TRADING
  // =============================================================================

  async placeOrder(order: OrderRequest): Promise<Order> {
    const endpoint = '/v5/order/create';

    const params: Record<string, any> = {
      category: this.getCategory(),
      symbol: order.symbol.toUpperCase(),
      side: order.side === OrderSide.BUY ? 'Buy' : 'Sell',
      orderType: this.convertOrderType(order.type),
      qty: String(order.quantity),
    };

    if (order.price) params.price = String(order.price);
    if (order.stopPrice) params.triggerPrice = String(order.stopPrice);
    if (order.timeInForce) params.timeInForce = order.timeInForce;
    if (order.clientOrderId) params.orderLinkId = order.clientOrderId;
    if (order.reduceOnly !== undefined) params.reduceOnly = order.reduceOnly;
    if (order.postOnly !== undefined) params.postOnly = order.postOnly;

    const data = await this.request<any>('POST', endpoint, params, true);

    return {
      id: data.orderId,
      clientOrderId: data.orderLinkId,
      symbol: order.symbol,
      type: order.type,
      side: order.side,
      status: OrderStatus.NEW,
      price: order.price,
      stopPrice: order.stopPrice,
      quantity: order.quantity,
      executedQuantity: 0,
      remainingQuantity: order.quantity,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      timeInForce: order.timeInForce,
    };
  }

  async cancelOrder(symbol: string, orderId: string): Promise<OperationResult> {
    const endpoint = '/v5/order/cancel';

    const params = {
      category: this.getCategory(),
      symbol: symbol.toUpperCase(),
      orderId,
    };

    try {
      await this.request<any>('POST', endpoint, params, true);
      return this.createResult(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.createResult(false, undefined, message);
    }
  }

  async cancelAllOrders(symbol: string): Promise<OperationResult> {
    const endpoint = '/v5/order/cancel-all';

    const params = {
      category: this.getCategory(),
      symbol: symbol.toUpperCase(),
    };

    try {
      await this.request<any>('POST', endpoint, params, true);
      return this.createResult(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.createResult(false, undefined, message);
    }
  }

  async getOrder(symbol: string, orderId: string): Promise<Order> {
    const endpoint = '/v5/order/realtime';

    const params = {
      category: this.getCategory(),
      symbol: symbol.toUpperCase(),
      orderId,
    };

    const data = await this.request<any>('GET', endpoint, params, true);
    const orderData = data.list[0];

    return {
      id: orderData.orderId,
      clientOrderId: orderData.orderLinkId,
      symbol: orderData.symbol,
      type: orderData.orderType.toLowerCase() as OrderType,
      side: orderData.side === 'Buy' ? OrderSide.BUY : OrderSide.SELL,
      status: this.convertOrderStatus(orderData.orderStatus),
      price: orderData.price ? parseFloat(orderData.price) : undefined,
      stopPrice: orderData.triggerPrice ? parseFloat(orderData.triggerPrice) : undefined,
      quantity: parseFloat(orderData.qty),
      executedQuantity: parseFloat(orderData.cumExecQty),
      remainingQuantity: parseFloat(orderData.qty) - parseFloat(orderData.cumExecQty),
      averagePrice: orderData.avgPrice ? parseFloat(orderData.avgPrice) : undefined,
      createdAt: parseInt(orderData.createdTime),
      updatedAt: parseInt(orderData.updatedTime),
    };
  }

  async getOpenOrders(symbol?: string): Promise<Order[]> {
    const endpoint = '/v5/order/realtime';

    const params: Record<string, any> = {
      category: this.getCategory(),
    };

    if (symbol) params.symbol = symbol.toUpperCase();

    const data = await this.request<any>('GET', endpoint, params, true);

    return data.list.map((order: any) => ({
      id: order.orderId,
      clientOrderId: order.orderLinkId,
      symbol: order.symbol,
      type: order.orderType.toLowerCase() as OrderType,
      side: order.side === 'Buy' ? OrderSide.BUY : OrderSide.SELL,
      status: this.convertOrderStatus(order.orderStatus),
      price: order.price ? parseFloat(order.price) : undefined,
      stopPrice: order.triggerPrice ? parseFloat(order.triggerPrice) : undefined,
      quantity: parseFloat(order.qty),
      executedQuantity: parseFloat(order.cumExecQty),
      remainingQuantity: parseFloat(order.qty) - parseFloat(order.cumExecQty),
      averagePrice: order.avgPrice ? parseFloat(order.avgPrice) : undefined,
      createdAt: parseInt(order.createdTime),
      updatedAt: parseInt(order.updatedTime),
    }));
  }

  async placeOCOOrder(order: OCOOrderRequest): Promise<OperationResult<Order[]>> {
    // Bybit не поддерживает native OCO ордера
    // Можно реализовать через условные ордера, но это требует дополнительной логики
    return this.createResult(false, undefined, 'OCO orders are not natively supported by Bybit');
  }

  // =============================================================================
  // ACCOUNT
  // =============================================================================

  async getBalance(): Promise<Balance[]> {
    const endpoint = '/v5/account/wallet-balance';

    const params = {
      accountType: this.marketType === MarketType.FUTURES ? 'CONTRACT' : 'SPOT',
    };

    const data = await this.request<any>('GET', endpoint, params, true);
    const account = data.list[0];

    if (!account) {
      return [];
    }

    return account.coin.map((balance: any) => ({
      asset: balance.coin,
      free: parseFloat(balance.availableToWithdraw || balance.free || 0),
      locked: parseFloat(balance.locked || 0),
      total: parseFloat(balance.walletBalance || balance.total || 0),
    }));
  }

  async getAssetBalance(asset: string): Promise<Balance | null> {
    const balances = await this.getBalance();
    return balances.find((b) => b.asset === asset.toUpperCase()) || null;
  }

  // =============================================================================
  // FUTURES
  // =============================================================================

  async getPositions(symbol?: string): Promise<Position[]> {
    if (this.marketType !== MarketType.FUTURES) {
      return [];
    }

    const endpoint = '/v5/position/list';

    const params: Record<string, any> = {
      category: 'linear',
    };

    if (symbol) params.symbol = symbol.toUpperCase();

    const data = await this.request<any>('GET', endpoint, params, true);

    return data.list
      .filter((pos: any) => parseFloat(pos.size) !== 0)
      .map((pos: any) => ({
        symbol: pos.symbol,
        side: pos.side === 'Buy' ? 'long' : 'short',
        size: parseFloat(pos.size),
        entryPrice: parseFloat(pos.avgPrice),
        markPrice: parseFloat(pos.markPrice),
        liquidationPrice: parseFloat(pos.liqPrice),
        leverage: parseInt(pos.leverage),
        unrealizedPnl: parseFloat(pos.unrealisedPnl),
        marginType: pos.tradeMode === 0 ? 'cross' : 'isolated',
        timestamp: parseInt(pos.updatedTime),
      }));
  }

  async setLeverage(symbol: string, leverage: number): Promise<OperationResult> {
    if (this.marketType !== MarketType.FUTURES) {
      return this.createResult(false, undefined, 'Leverage is only available on Futures market');
    }

    const endpoint = '/v5/position/set-leverage';

    const params = {
      category: 'linear',
      symbol: symbol.toUpperCase(),
      buyLeverage: String(leverage),
      sellLeverage: String(leverage),
    };

    try {
      await this.request<any>('POST', endpoint, params, true);
      return this.createResult(true, { leverage });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.createResult(false, undefined, message);
    }
  }

  // =============================================================================
  // WEBSOCKET
  // =============================================================================

  async subscribeToStream(
    subscription: WebSocketSubscription,
    callback: WebSocketCallback,
  ): Promise<void> {
    // WebSocket реализация будет добавлена в следующей итерации
    console.warn(`[${this.name}] WebSocket subscriptions not yet implemented`);
  }

  async unsubscribeFromStream(subscription: WebSocketSubscription): Promise<void> {
    console.warn(`[${this.name}] WebSocket subscriptions not yet implemented`);
  }

  // =============================================================================
  // CONNECTION
  // =============================================================================

  async testConnection(): Promise<boolean> {
    try {
      const endpoint = '/v5/market/time';
      await this.request<any>('GET', endpoint);
      this.isConnected = true;
      console.info(`[${this.name}:${this.marketType}] Connection test successful`);
      return true;
    } catch (error) {
      this.isConnected = false;
      this.logError('testConnection', error);
      return false;
    }
  }
}
