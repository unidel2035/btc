/**
 * Bybit Exchange Integration
 * Поддержка Spot и Futures рынков
 */

import { BaseExchange, BaseExchangeConfig } from '../BaseExchange';
import {
  Candle,
  CandleInterval,
  OrderBook,
  Trade,
  Ticker,
  OrderRequest,
  Order,
  Balance,
  Position,
  WebSocketEventType,
  ExchangeInfo,
  MarketType,
  OrderStatus,
  OrderType,
  OrderSide,
  ExchangeError,
  InvalidSymbolError,
} from '../types';
import { createHmacSignature } from '../utils/security';

interface BybitConfig extends Omit<BaseExchangeConfig, 'name'> {}

export class BybitExchange extends BaseExchange {
  private readonly baseUrl: string;
  // private readonly wsBaseUrl: string;

  constructor(config: BybitConfig) {
    super({
      ...config,
      name: 'Bybit',
    });

    // Bybit использует одинаковый URL для spot и futures
    this.baseUrl = config.testnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
    // this.wsBaseUrl = config.testnet ? 'wss://stream-testnet.bybit.com' : 'wss://stream.bybit.com';
  }

  async initialize(): Promise<void> {
    try {
      // Проверяем подключение
      const info = await this.getExchangeInfo();
      console.info(`[${this.name}] Initialized with ${info.symbols.length} symbols`);
      this.initialized = true;
    } catch (error) {
      console.error(`[${this.name}] Failed to initialize:`, error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.unsubscribeAll();
    this.initialized = false;
    console.info(`[${this.name}] Disconnected`);
  }

  protected async makeRequest<T>(
    method: string,
    endpoint: string,
    params?: Record<string, unknown>,
    signed = false,
  ): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);
    const timestamp = Date.now();

    let queryString = '';
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    if (signed) {
      this.requireApiKeys();
      queryParams.append('api_key', this.apiKey);
      queryParams.append('timestamp', String(timestamp));
    }

    queryString = queryParams.toString();

    if (signed) {
      const signature = createHmacSignature(this.apiSecret, queryString);
      queryParams.append('sign', signature);
    }

    url.search = queryParams.toString();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const response = await fetch(url.toString(), {
      method,
      headers,
      signal: AbortSignal.timeout(this.config.timeout ?? 10000),
    });

    const data = await response.json();

    const errorData = data as {
      ret_code?: number;
      code?: number;
      ret_msg?: string;
      message?: string;
      result?: unknown;
    };

    if (!response.ok || (errorData.ret_code !== undefined && errorData.ret_code !== 0)) {
      throw new ExchangeError(
        errorData.ret_msg || errorData.message || 'Unknown error',
        errorData.ret_code || errorData.code,
        response.status,
      );
    }

    return (errorData.result || data) as T;
  }

  // Market Data - Simplified implementations

  async getCandles(
    symbol: string,
    interval: CandleInterval,
    limit = 200,
    startTime?: number,
  ): Promise<Candle[]> {
    this.requireInitialized();

    const category = this.marketType === MarketType.SPOT ? 'spot' : 'linear';
    const params: Record<string, unknown> = {
      category,
      symbol,
      interval: this.mapIntervalToBybit(interval),
      limit: Math.min(limit, 1000),
    };

    if (startTime) params.start = startTime;

    const data = await this.request<{
      list: Array<[string, string, string, string, string, string, string]>;
    }>('GET', '/v5/market/kline', params);

    return data.list.map((candle) => ({
      timestamp: parseInt(candle[0]),
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
      symbol,
      interval,
    }));
  }

  async getOrderBook(symbol: string, depth = 50): Promise<OrderBook> {
    this.requireInitialized();

    const category = this.marketType === MarketType.SPOT ? 'spot' : 'linear';
    const data = await this.request<{
      b: Array<[string, string]>;
      a: Array<[string, string]>;
      ts: string;
    }>('GET', '/v5/market/orderbook', { category, symbol, limit: depth });

    return {
      symbol,
      timestamp: parseInt(data.ts),
      bids: data.b.map(([price, quantity]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity),
      })),
      asks: data.a.map(([price, quantity]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity),
      })),
    };
  }

  async getTrades(symbol: string, limit = 100): Promise<Trade[]> {
    this.requireInitialized();

    const category = this.marketType === MarketType.SPOT ? 'spot' : 'linear';
    const data = await this.request<{
      list: Array<{
        execId: string;
        price: string;
        size: string;
        time: string;
        side: string;
      }>;
    }>('GET', '/v5/market/recent-trade', { category, symbol, limit });

    return data.list.map((trade) => ({
      id: trade.execId,
      timestamp: parseInt(trade.time),
      symbol,
      price: parseFloat(trade.price),
      quantity: parseFloat(trade.size),
      side: trade.side.toLowerCase() as 'buy' | 'sell',
      isBuyerMaker: trade.side === 'Sell',
    }));
  }

  async getTicker(symbol: string): Promise<Ticker> {
    this.requireInitialized();

    const category = this.marketType === MarketType.SPOT ? 'spot' : 'linear';
    const data = await this.request<{
      list: Array<{
        symbol: string;
        lastPrice: string;
        bid1Price: string;
        ask1Price: string;
        highPrice24h: string;
        lowPrice24h: string;
        volume24h: string;
        price24hPcnt: string;
      }>;
    }>('GET', '/v5/market/tickers', { category, symbol });

    const ticker = data.list[0];
    if (!ticker) {
      throw new InvalidSymbolError(`Symbol ${symbol} not found`);
    }

    const priceChange24h = parseFloat(ticker.lastPrice) * parseFloat(ticker.price24hPcnt);

    return {
      symbol: ticker.symbol,
      timestamp: Date.now(),
      lastPrice: parseFloat(ticker.lastPrice),
      bidPrice: parseFloat(ticker.bid1Price),
      askPrice: parseFloat(ticker.ask1Price),
      high24h: parseFloat(ticker.highPrice24h),
      low24h: parseFloat(ticker.lowPrice24h),
      volume24h: parseFloat(ticker.volume24h),
      priceChange24h,
      priceChangePercent24h: parseFloat(ticker.price24hPcnt) * 100,
    };
  }

  async getAllTickers(): Promise<Ticker[]> {
    this.requireInitialized();

    const category = this.marketType === MarketType.SPOT ? 'spot' : 'linear';
    const data = await this.request<{
      list: Array<{
        symbol: string;
        lastPrice: string;
        bid1Price: string;
        ask1Price: string;
        highPrice24h: string;
        lowPrice24h: string;
        volume24h: string;
        price24hPcnt: string;
      }>;
    }>('GET', '/v5/market/tickers', { category });

    return data.list.map((ticker) => {
      const priceChange24h = parseFloat(ticker.lastPrice) * parseFloat(ticker.price24hPcnt);

      return {
        symbol: ticker.symbol,
        timestamp: Date.now(),
        lastPrice: parseFloat(ticker.lastPrice),
        bidPrice: parseFloat(ticker.bid1Price),
        askPrice: parseFloat(ticker.ask1Price),
        high24h: parseFloat(ticker.highPrice24h),
        low24h: parseFloat(ticker.lowPrice24h),
        volume24h: parseFloat(ticker.volume24h),
        priceChange24h,
        priceChangePercent24h: parseFloat(ticker.price24hPcnt) * 100,
      };
    });
  }

  // Trading - Simplified implementations

  async placeOrder(orderReq: OrderRequest): Promise<Order> {
    this.requireInitialized();
    this.requireApiKeys();

    const category = this.marketType === MarketType.SPOT ? 'spot' : 'linear';
    const params: Record<string, unknown> = {
      category,
      symbol: orderReq.symbol,
      side: orderReq.side === OrderSide.BUY ? 'Buy' : 'Sell',
      orderType: orderReq.type,
      qty: String(orderReq.quantity),
    };

    if (orderReq.price) params.price = String(orderReq.price);
    if (orderReq.timeInForce) params.timeInForce = orderReq.timeInForce;
    if (orderReq.clientOrderId) params.orderLinkId = orderReq.clientOrderId;

    const data = await this.request<{
      orderId: string;
      orderLinkId: string;
    }>('POST', '/v5/order/create', params, true);

    // Получаем детали ордера
    return this.getOrder(orderReq.symbol, data.orderId);
  }

  async cancelOrder(symbol: string, orderId: string): Promise<void> {
    this.requireInitialized();
    this.requireApiKeys();

    const category = this.marketType === MarketType.SPOT ? 'spot' : 'linear';
    await this.request('POST', '/v5/order/cancel', { category, symbol, orderId }, true);
  }

  async cancelAllOrders(symbol: string): Promise<void> {
    this.requireInitialized();
    this.requireApiKeys();

    const category = this.marketType === MarketType.SPOT ? 'spot' : 'linear';
    await this.request('POST', '/v5/order/cancel-all', { category, symbol }, true);
  }

  async getOrder(symbol: string, orderId: string): Promise<Order> {
    this.requireInitialized();
    this.requireApiKeys();

    const category = this.marketType === MarketType.SPOT ? 'spot' : 'linear';
    const data = await this.request<{
      list: Array<{
        orderId: string;
        orderLinkId: string;
        symbol: string;
        side: string;
        orderType: string;
        orderStatus: string;
        qty: string;
        price: string;
        cumExecQty: string;
        avgPrice: string;
        createdTime: string;
        updatedTime: string;
      }>;
    }>('GET', '/v5/order/realtime', { category, symbol, orderId }, true);

    const order = data.list[0];
    if (!order) {
      throw new ExchangeError(`Order ${orderId} not found`);
    }

    return this.mapBybitOrder(order);
  }

  async getOpenOrders(symbol?: string): Promise<Order[]> {
    this.requireInitialized();
    this.requireApiKeys();

    const category = this.marketType === MarketType.SPOT ? 'spot' : 'linear';
    const params: Record<string, unknown> = { category };
    if (symbol) params.symbol = symbol;

    const data = await this.request<{
      list: Array<{
        orderId: string;
        orderLinkId: string;
        symbol: string;
        side: string;
        orderType: string;
        orderStatus: string;
        qty: string;
        price: string;
        cumExecQty: string;
        avgPrice: string;
        createdTime: string;
        updatedTime: string;
      }>;
    }>('GET', '/v5/order/realtime', params, true);

    return data.list.map((order) => this.mapBybitOrder(order));
  }

  async getOrderHistory(symbol?: string, limit = 50): Promise<Order[]> {
    this.requireInitialized();
    this.requireApiKeys();

    const category = this.marketType === MarketType.SPOT ? 'spot' : 'linear';
    const params: Record<string, unknown> = { category, limit };
    if (symbol) params.symbol = symbol;

    const data = await this.request<{
      list: Array<{
        orderId: string;
        orderLinkId: string;
        symbol: string;
        side: string;
        orderType: string;
        orderStatus: string;
        qty: string;
        price: string;
        cumExecQty: string;
        avgPrice: string;
        createdTime: string;
        updatedTime: string;
      }>;
    }>('GET', '/v5/order/history', params, true);

    return data.list.map((order) => this.mapBybitOrder(order));
  }

  // Account

  async getBalance(): Promise<Balance[]> {
    this.requireInitialized();
    this.requireApiKeys();

    const accountType = this.marketType === MarketType.SPOT ? 'SPOT' : 'UNIFIED';
    const data = await this.request<{
      list: Array<{
        coin: Array<{
          coin: string;
          walletBalance: string;
          availableToWithdraw: string;
        }>;
      }>;
    }>('GET', '/v5/account/wallet-balance', { accountType }, true);

    const coins = data.list[0]?.coin || [];

    return coins.map((coin) => {
      const total = parseFloat(coin.walletBalance);
      const free = parseFloat(coin.availableToWithdraw);
      return {
        asset: coin.coin,
        free,
        locked: total - free,
        total,
      };
    });
  }

  async getBalanceForAsset(asset: string): Promise<Balance> {
    const balances = await this.getBalance();
    const balance = balances.find((b) => b.asset === asset);

    if (!balance) {
      return { asset, free: 0, locked: 0, total: 0 };
    }

    return balance;
  }

  async getPositions(symbol?: string): Promise<Position[]> {
    if (this.marketType !== MarketType.FUTURES) {
      throw new ExchangeError('Positions are only available for futures market');
    }

    this.requireInitialized();
    this.requireApiKeys();

    const params: Record<string, unknown> = { category: 'linear' };
    if (symbol) params.symbol = symbol;

    const data = await this.request<{
      list: Array<{
        symbol: string;
        side: string;
        size: string;
        avgPrice: string;
        markPrice: string;
        liqPrice: string;
        leverage: string;
        unrealisedPnl: string;
        positionIM: string;
        tradeMode: string;
      }>;
    }>('GET', '/v5/position/list', params, true);

    return data.list
      .filter((pos) => parseFloat(pos.size) !== 0)
      .map((pos) => ({
        symbol: pos.symbol,
        side: pos.side === 'Buy' ? ('LONG' as const) : ('SHORT' as const),
        quantity: parseFloat(pos.size),
        entryPrice: parseFloat(pos.avgPrice),
        markPrice: parseFloat(pos.markPrice),
        liquidationPrice: parseFloat(pos.liqPrice),
        leverage: parseFloat(pos.leverage),
        unrealizedPnl: parseFloat(pos.unrealisedPnl),
        margin: parseFloat(pos.positionIM),
        marginType: pos.tradeMode === '0' ? ('cross' as const) : ('isolated' as const),
      }));
  }

  async setLeverage(symbol: string, leverage: number): Promise<void> {
    if (this.marketType !== MarketType.FUTURES) {
      throw new ExchangeError('Leverage is only available for futures market');
    }

    this.requireInitialized();
    this.requireApiKeys();

    await this.request(
      'POST',
      '/v5/position/set-leverage',
      {
        category: 'linear',
        symbol,
        buyLeverage: String(leverage),
        sellLeverage: String(leverage),
      },
      true,
    );
  }

  async setMarginType(symbol: string, marginType: 'isolated' | 'cross'): Promise<void> {
    if (this.marketType !== MarketType.FUTURES) {
      throw new ExchangeError('Margin type is only available for futures market');
    }

    this.requireInitialized();
    this.requireApiKeys();

    await this.request(
      'POST',
      '/v5/position/switch-isolated',
      {
        category: 'linear',
        symbol,
        tradeMode: marginType === 'isolated' ? 1 : 0,
        buyLeverage: '10',
        sellLeverage: '10',
      },
      true,
    );
  }

  // WebSocket - Stub implementations

  subscribeToTrades(_symbol: string, _callback: (trade: Trade) => void): void {
    console.warn(`[${this.name}] WebSocket not implemented`);
  }

  subscribeToTicker(_symbol: string, _callback: (ticker: Ticker) => void): void {
    console.warn(`[${this.name}] WebSocket not implemented`);
  }

  subscribeToOrderBook(_symbol: string, _callback: (orderBook: OrderBook) => void): void {
    console.warn(`[${this.name}] WebSocket not implemented`);
  }

  subscribeToCandles(
    _symbol: string,
    _interval: CandleInterval,
    _callback: (candle: Candle) => void,
  ): void {
    console.warn(`[${this.name}] WebSocket not implemented`);
  }

  unsubscribe(_symbol: string, _event: WebSocketEventType): void {}

  unsubscribeAll(): void {}

  // Utility

  async getExchangeInfo(): Promise<ExchangeInfo> {
    const category = this.marketType === MarketType.SPOT ? 'spot' : 'linear';
    const data = await this.request<{
      list: Array<{ symbol: string; status: string }>;
    }>('GET', '/v5/market/instruments-info', { category });

    const symbols = data.list.filter((s) => s.status === 'Trading').map((s) => s.symbol);

    return {
      name: this.name,
      marketTypes: [this.marketType],
      symbols,
      fees: { maker: 0.1, taker: 0.1 },
      limits: {
        withdrawal: {},
        deposit: {},
        order: { minQuantity: 0, maxQuantity: Infinity, minPrice: 0, maxPrice: Infinity },
      },
    };
  }

  async getSymbols(): Promise<string[]> {
    const info = await this.getExchangeInfo();
    return info.symbols;
  }

  async validateSymbol(symbol: string): Promise<boolean> {
    const symbols = await this.getSymbols();
    return symbols.includes(symbol);
  }

  formatSymbol(base: string, quote: string): string {
    return `${base.toUpperCase()}${quote.toUpperCase()}`;
  }

  // Helper methods

  private mapIntervalToBybit(interval: CandleInterval): string {
    const mapping: Record<string, string> = {
      '1m': '1',
      '3m': '3',
      '5m': '5',
      '15m': '15',
      '30m': '30',
      '1h': '60',
      '2h': '120',
      '4h': '240',
      '6h': '360',
      '12h': '720',
      '1d': 'D',
      '1w': 'W',
      '1M': 'M',
    };
    return mapping[interval] || '1';
  }

  private mapBybitOrder(order: {
    orderId: string;
    orderLinkId: string;
    symbol: string;
    side: string;
    orderType: string;
    orderStatus: string;
    qty: string;
    price: string;
    cumExecQty: string;
    avgPrice: string;
    createdTime: string;
    updatedTime: string;
  }): Order {
    const qty = parseFloat(order.qty);
    const filled = parseFloat(order.cumExecQty);

    return {
      orderId: order.orderId,
      clientOrderId: order.orderLinkId,
      symbol: order.symbol,
      side: order.side === 'Buy' ? OrderSide.BUY : OrderSide.SELL,
      type: order.orderType as OrderType,
      quantity: qty,
      price: parseFloat(order.price) || undefined,
      status: this.mapBybitOrderStatus(order.orderStatus),
      filled,
      remaining: qty - filled,
      averagePrice: parseFloat(order.avgPrice) || undefined,
      createdAt: parseInt(order.createdTime),
      updatedAt: parseInt(order.updatedTime),
    };
  }

  private mapBybitOrderStatus(status: string): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
      New: OrderStatus.NEW,
      PartiallyFilled: OrderStatus.PARTIALLY_FILLED,
      Filled: OrderStatus.FILLED,
      Cancelled: OrderStatus.CANCELED,
      Rejected: OrderStatus.REJECTED,
    };
    return mapping[status] || OrderStatus.NEW;
  }
}
