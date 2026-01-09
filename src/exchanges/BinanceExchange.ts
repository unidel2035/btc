import crypto from 'crypto';
import { BaseExchange } from './BaseExchange.js';
import {
  MarketType,
  OrderStatus,
  OrderType,
  OrderSide,
  type ExchangeConfig,
  type Candle,
  type CandleInterval,
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
 * Интеграция с Binance (Spot + Futures)
 */
export class BinanceExchange extends BaseExchange {
  private baseUrl: string;
  private wsBaseUrl: string;

  constructor(config: ExchangeConfig, marketType: MarketType = MarketType.SPOT) {
    super(config, marketType);

    // Определяем URL в зависимости от testnet и типа рынка
    if (config.testnet) {
      this.baseUrl =
        marketType === MarketType.FUTURES
          ? 'https://testnet.binancefuture.com'
          : 'https://testnet.binance.vision';
      this.wsBaseUrl =
        marketType === MarketType.FUTURES
          ? 'wss://stream.binancefuture.com'
          : 'wss://testnet.binance.vision';
    } else {
      this.baseUrl =
        marketType === MarketType.FUTURES ? 'https://fapi.binance.com' : 'https://api.binance.com';
      this.wsBaseUrl =
        marketType === MarketType.FUTURES
          ? 'wss://fstream.binance.com'
          : 'wss://stream.binance.com:9443';
    }
  }

  /**
   * Создание подписи для authenticated запросов
   */
  private createSignature(queryString: string): string {
    return crypto.createHmac('sha256', this.config.apiSecret).update(queryString).digest('hex');
  }

  /**
   * Создание query string с timestamp и signature
   */
  private createSignedQueryString(params: Record<string, any> = {}): string {
    const timestamp = Date.now();
    const paramsWithTimestamp = {
      ...params,
      timestamp,
      recvWindow: this.config.recvWindow || 5000,
    };

    const queryString = new URLSearchParams(
      Object.entries(paramsWithTimestamp).map(([key, value]) => [key, String(value)]),
    ).toString();

    const signature = this.createSignature(queryString);

    return `${queryString}&signature=${signature}`;
  }

  /**
   * Выполнение HTTP запроса
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    endpoint: string,
    params: Record<string, any> = {},
    signed: boolean = false,
  ): Promise<T> {
    await this.checkRateLimit();

    let url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'X-MBX-APIKEY': this.config.apiKey,
      'Content-Type': 'application/json',
    };

    let queryString = '';
    if (signed) {
      queryString = this.createSignedQueryString(params);
    } else {
      queryString = new URLSearchParams(
        Object.entries(params).map(([key, value]) => [key, String(value)]),
      ).toString();
    }

    if (method === 'GET' || method === 'DELETE') {
      url += queryString ? `?${queryString}` : '';
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (method === 'POST' && queryString) {
      url += `?${queryString}`;
    }

    this.logRequest(endpoint, params);

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Binance API error: ${data.msg || data.message || JSON.stringify(data)}`);
      }

      return data as T;
    } catch (error) {
      this.logError(endpoint, error);
      throw error;
    }
  }

  /**
   * Конвертация интервала в формат Binance
   */
  private convertInterval(interval: CandleInterval): string {
    return interval; // Binance использует тот же формат
  }

  /**
   * Конвертация типа ордера в формат Binance
   */
  private convertOrderType(type: OrderType): string {
    const typeMap: Record<OrderType, string> = {
      [OrderType.MARKET]: 'MARKET',
      [OrderType.LIMIT]: 'LIMIT',
      [OrderType.STOP_LOSS]: 'STOP_LOSS',
      [OrderType.STOP_LOSS_LIMIT]: 'STOP_LOSS_LIMIT',
      [OrderType.TAKE_PROFIT]: 'TAKE_PROFIT',
      [OrderType.TAKE_PROFIT_LIMIT]: 'TAKE_PROFIT_LIMIT',
      [OrderType.STOP_MARKET]: 'STOP_MARKET',
      [OrderType.TAKE_PROFIT_MARKET]: 'TAKE_PROFIT_MARKET',
      [OrderType.TRAILING_STOP]: 'TRAILING_STOP_MARKET',
    };
    return typeMap[type] || 'LIMIT';
  }

  /**
   * Конвертация статуса ордера из формата Binance
   */
  private convertOrderStatus(status: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      NEW: OrderStatus.NEW,
      PARTIALLY_FILLED: OrderStatus.PARTIALLY_FILLED,
      FILLED: OrderStatus.FILLED,
      CANCELED: OrderStatus.CANCELED,
      REJECTED: OrderStatus.REJECTED,
      EXPIRED: OrderStatus.EXPIRED,
    };
    return statusMap[status] || OrderStatus.NEW;
  }

  // =============================================================================
  // MARKET DATA
  // =============================================================================

  async getCandles(
    symbol: string,
    interval: CandleInterval,
    limit: number = 500,
    startTime?: number,
    endTime?: number,
  ): Promise<Candle[]> {
    const endpoint = this.marketType === MarketType.FUTURES ? '/fapi/v1/klines' : '/api/v3/klines';

    const params: Record<string, any> = {
      symbol: symbol.toUpperCase(),
      interval: this.convertInterval(interval),
      limit,
    };

    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;

    const data = await this.request<any[]>('GET', endpoint, params);

    return data.map((item) => ({
      timestamp: item[0],
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5]),
    }));
  }

  async getOrderBook(symbol: string, depth: number = 100): Promise<OrderBook> {
    const endpoint = this.marketType === MarketType.FUTURES ? '/fapi/v1/depth' : '/api/v3/depth';

    const params = {
      symbol: symbol.toUpperCase(),
      limit: depth,
    };

    const data = await this.request<any>('GET', endpoint, params);

    return {
      symbol,
      timestamp: Date.now(),
      bids: data.bids.map((bid: [string, string]) => ({
        price: parseFloat(bid[0]),
        quantity: parseFloat(bid[1]),
      })),
      asks: data.asks.map((ask: [string, string]) => ({
        price: parseFloat(ask[0]),
        quantity: parseFloat(ask[1]),
      })),
    };
  }

  async getRecentTrades(symbol: string, limit: number = 500): Promise<Trade[]> {
    const endpoint = this.marketType === MarketType.FUTURES ? '/fapi/v1/trades' : '/api/v3/trades';

    const params = {
      symbol: symbol.toUpperCase(),
      limit,
    };

    const data = await this.request<any[]>('GET', endpoint, params);

    return data.map((trade) => ({
      id: String(trade.id),
      symbol,
      price: parseFloat(trade.price),
      quantity: parseFloat(trade.qty),
      timestamp: trade.time,
      side: trade.isBuyerMaker ? 'sell' : 'buy',
    }));
  }

  async getTicker(symbol: string): Promise<Ticker> {
    const endpoint =
      this.marketType === MarketType.FUTURES ? '/fapi/v1/ticker/24hr' : '/api/v3/ticker/24hr';

    const params = {
      symbol: symbol.toUpperCase(),
    };

    const data = await this.request<any>('GET', endpoint, params);

    return {
      symbol,
      timestamp: data.closeTime,
      bid: parseFloat(data.bidPrice || data.lastPrice),
      ask: parseFloat(data.askPrice || data.lastPrice),
      last: parseFloat(data.lastPrice),
      volume24h: parseFloat(data.volume),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      change24h: parseFloat(data.priceChange),
      changePercent24h: parseFloat(data.priceChangePercent),
    };
  }

  async getAllTickers(): Promise<Ticker[]> {
    const endpoint =
      this.marketType === MarketType.FUTURES ? '/fapi/v1/ticker/24hr' : '/api/v3/ticker/24hr';

    const data = await this.request<any[]>('GET', endpoint);

    return data.map((ticker) => ({
      symbol: ticker.symbol,
      timestamp: ticker.closeTime,
      bid: parseFloat(ticker.bidPrice || ticker.lastPrice),
      ask: parseFloat(ticker.askPrice || ticker.lastPrice),
      last: parseFloat(ticker.lastPrice),
      volume24h: parseFloat(ticker.volume),
      high24h: parseFloat(ticker.highPrice),
      low24h: parseFloat(ticker.lowPrice),
      change24h: parseFloat(ticker.priceChange),
      changePercent24h: parseFloat(ticker.priceChangePercent),
    }));
  }

  // =============================================================================
  // TRADING
  // =============================================================================

  async placeOrder(order: OrderRequest): Promise<Order> {
    const endpoint = this.marketType === MarketType.FUTURES ? '/fapi/v1/order' : '/api/v3/order';

    const params: Record<string, any> = {
      symbol: order.symbol.toUpperCase(),
      side: order.side.toUpperCase(),
      type: this.convertOrderType(order.type),
      quantity: order.quantity,
    };

    if (order.price) params.price = order.price;
    if (order.stopPrice) params.stopPrice = order.stopPrice;
    if (order.timeInForce) params.timeInForce = order.timeInForce;
    if (order.clientOrderId) params.newClientOrderId = order.clientOrderId;
    if (order.reduceOnly !== undefined) params.reduceOnly = order.reduceOnly;
    if (order.postOnly !== undefined) params.postOnly = order.postOnly;

    const data = await this.request<any>('POST', endpoint, params, true);

    return {
      id: String(data.orderId),
      clientOrderId: data.clientOrderId,
      symbol: data.symbol,
      type: order.type,
      side: order.side,
      status: this.convertOrderStatus(data.status),
      price: data.price ? parseFloat(data.price) : undefined,
      stopPrice: data.stopPrice ? parseFloat(data.stopPrice) : undefined,
      quantity: parseFloat(data.origQty),
      executedQuantity: parseFloat(data.executedQty),
      remainingQuantity: parseFloat(data.origQty) - parseFloat(data.executedQty),
      averagePrice: data.avgPrice ? parseFloat(data.avgPrice) : undefined,
      createdAt: data.transactTime || data.updateTime,
      updatedAt: data.updateTime,
      timeInForce: order.timeInForce,
    };
  }

  async cancelOrder(symbol: string, orderId: string): Promise<OperationResult> {
    const endpoint = this.marketType === MarketType.FUTURES ? '/fapi/v1/order' : '/api/v3/order';

    const params = {
      symbol: symbol.toUpperCase(),
      orderId,
    };

    try {
      await this.request<any>('DELETE', endpoint, params, true);
      return this.createResult(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.createResult(false, undefined, message);
    }
  }

  async cancelAllOrders(symbol: string): Promise<OperationResult> {
    const endpoint =
      this.marketType === MarketType.FUTURES ? '/fapi/v1/allOpenOrders' : '/api/v3/openOrders';

    const params = {
      symbol: symbol.toUpperCase(),
    };

    try {
      await this.request<any>('DELETE', endpoint, params, true);
      return this.createResult(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.createResult(false, undefined, message);
    }
  }

  async getOrder(symbol: string, orderId: string): Promise<Order> {
    const endpoint = this.marketType === MarketType.FUTURES ? '/fapi/v1/order' : '/api/v3/order';

    const params = {
      symbol: symbol.toUpperCase(),
      orderId,
    };

    const data = await this.request<any>('GET', endpoint, params, true);

    return {
      id: String(data.orderId),
      clientOrderId: data.clientOrderId,
      symbol: data.symbol,
      type: data.type.toLowerCase() as OrderType,
      side: data.side.toLowerCase() as OrderSide,
      status: this.convertOrderStatus(data.status),
      price: data.price ? parseFloat(data.price) : undefined,
      stopPrice: data.stopPrice ? parseFloat(data.stopPrice) : undefined,
      quantity: parseFloat(data.origQty),
      executedQuantity: parseFloat(data.executedQty),
      remainingQuantity: parseFloat(data.origQty) - parseFloat(data.executedQty),
      averagePrice: data.avgPrice ? parseFloat(data.avgPrice) : undefined,
      createdAt: data.time,
      updatedAt: data.updateTime,
    };
  }

  async getOpenOrders(symbol?: string): Promise<Order[]> {
    const endpoint =
      this.marketType === MarketType.FUTURES ? '/fapi/v1/openOrders' : '/api/v3/openOrders';

    const params: Record<string, any> = {};
    if (symbol) params.symbol = symbol.toUpperCase();

    const data = await this.request<any[]>('GET', endpoint, params, true);

    return data.map((order) => ({
      id: String(order.orderId),
      clientOrderId: order.clientOrderId,
      symbol: order.symbol,
      type: order.type.toLowerCase() as OrderType,
      side: order.side.toLowerCase() as OrderSide,
      status: this.convertOrderStatus(order.status),
      price: order.price ? parseFloat(order.price) : undefined,
      stopPrice: order.stopPrice ? parseFloat(order.stopPrice) : undefined,
      quantity: parseFloat(order.origQty),
      executedQuantity: parseFloat(order.executedQty),
      remainingQuantity: parseFloat(order.origQty) - parseFloat(order.executedQty),
      averagePrice: order.avgPrice ? parseFloat(order.avgPrice) : undefined,
      createdAt: order.time,
      updatedAt: order.updateTime,
    }));
  }

  async placeOCOOrder(order: OCOOrderRequest): Promise<OperationResult<Order[]>> {
    // OCO ордера доступны только на Spot
    if (this.marketType !== MarketType.SPOT) {
      return this.createResult(false, undefined, 'OCO orders are only available on Spot market');
    }

    const endpoint = '/api/v3/order/oco';

    const params: Record<string, any> = {
      symbol: order.symbol.toUpperCase(),
      side: order.side.toUpperCase(),
      quantity: order.quantity,
      price: order.price,
      stopPrice: order.stopPrice,
    };

    if (order.stopLimitPrice) params.stopLimitPrice = order.stopLimitPrice;
    if (order.stopLimitTimeInForce) params.stopLimitTimeInForce = order.stopLimitTimeInForce;

    try {
      const data = await this.request<any>('POST', endpoint, params, true);

      const orders: Order[] = data.orderReports.map((report: any) => ({
        id: String(report.orderId),
        clientOrderId: report.clientOrderId,
        symbol: report.symbol,
        type: report.type.toLowerCase() as OrderType,
        side: report.side.toLowerCase() as OrderSide,
        status: this.convertOrderStatus(report.status),
        price: report.price ? parseFloat(report.price) : undefined,
        stopPrice: report.stopPrice ? parseFloat(report.stopPrice) : undefined,
        quantity: parseFloat(report.origQty),
        executedQuantity: parseFloat(report.executedQty || 0),
        remainingQuantity: parseFloat(report.origQty),
        createdAt: data.transactionTime,
        updatedAt: data.transactionTime,
      }));

      return this.createResult(true, orders);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.createResult(false, undefined, message);
    }
  }

  // =============================================================================
  // ACCOUNT
  // =============================================================================

  async getBalance(): Promise<Balance[]> {
    const endpoint =
      this.marketType === MarketType.FUTURES ? '/fapi/v2/balance' : '/api/v3/account';

    const data = await this.request<any>('GET', endpoint, {}, true);

    if (this.marketType === MarketType.FUTURES) {
      return data.map((balance: any) => ({
        asset: balance.asset,
        free: parseFloat(balance.availableBalance),
        locked: parseFloat(balance.balance) - parseFloat(balance.availableBalance),
        total: parseFloat(balance.balance),
      }));
    } else {
      return data.balances.map((balance: any) => ({
        asset: balance.asset,
        free: parseFloat(balance.free),
        locked: parseFloat(balance.locked),
        total: parseFloat(balance.free) + parseFloat(balance.locked),
      }));
    }
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

    const endpoint = '/fapi/v2/positionRisk';
    const params: Record<string, any> = {};
    if (symbol) params.symbol = symbol.toUpperCase();

    const data = await this.request<any[]>('GET', endpoint, params, true);

    return data
      .filter((pos: any) => parseFloat(pos.positionAmt) !== 0)
      .map((pos: any) => ({
        symbol: pos.symbol,
        side: parseFloat(pos.positionAmt) > 0 ? 'long' : 'short',
        size: Math.abs(parseFloat(pos.positionAmt)),
        entryPrice: parseFloat(pos.entryPrice),
        markPrice: parseFloat(pos.markPrice),
        liquidationPrice: parseFloat(pos.liquidationPrice),
        leverage: parseInt(pos.leverage),
        unrealizedPnl: parseFloat(pos.unRealizedProfit),
        marginType: pos.marginType === 'isolated' ? 'isolated' : 'cross',
        timestamp: Date.now(),
      }));
  }

  async setLeverage(symbol: string, leverage: number): Promise<OperationResult> {
    if (this.marketType !== MarketType.FUTURES) {
      return this.createResult(false, undefined, 'Leverage is only available on Futures market');
    }

    const endpoint = '/fapi/v1/leverage';
    const params = {
      symbol: symbol.toUpperCase(),
      leverage,
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
      const endpoint = this.marketType === MarketType.FUTURES ? '/fapi/v1/ping' : '/api/v3/ping';
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
