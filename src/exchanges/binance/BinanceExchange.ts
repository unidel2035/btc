/**
 * Binance Exchange Integration
 * Поддержка Spot и Futures рынков
 */

// import crypto from 'crypto';
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
  AuthenticationError,
  RateLimitError,
  InsufficientBalanceError,
  InvalidSymbolError,
} from '../types';
import { createHmacSignature } from '../utils/security';

interface BinanceConfig extends Omit<BaseExchangeConfig, 'name'> {
  recvWindow?: number;
}

export class BinanceExchange extends BaseExchange {
  private readonly baseUrl: string;
  // private readonly wsBaseUrl: string;
  private readonly recvWindow: number;
  private wsConnections = new Map<string, WebSocket>();

  constructor(config: BinanceConfig) {
    super({
      ...config,
      name: 'Binance',
    });

    this.recvWindow = config.recvWindow ?? 5000;

    // URL зависит от типа рынка и testnet
    if (this.marketType === MarketType.SPOT) {
      this.baseUrl = config.testnet
        ? 'https://testnet.binance.vision/api/v3'
        : 'https://api.binance.com/api/v3';
      // wsBaseUrl for SPOT would be: config.testnet ? 'wss://testnet.binance.vision/ws' : 'wss://stream.binance.com:9443/ws';
    } else {
      // Futures
      this.baseUrl = config.testnet
        ? 'https://testnet.binancefuture.com/fapi/v1'
        : 'https://fapi.binance.com/fapi/v1';
      // wsBaseUrl for FUTURES would be: config.testnet ? 'wss://stream.binancefuture.com/ws' : 'wss://fstream.binance.com/ws';
    }
  }

  async initialize(): Promise<void> {
    try {
      // Проверяем подключение
      await this.testConnectivity();

      // Получаем информацию о бирже
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

  /**
   * Проверка подключения
   */
  private async testConnectivity(): Promise<void> {
    const endpoint = this.marketType === MarketType.SPOT ? '/ping' : '/ping';
    await this.request('GET', endpoint);
  }

  /**
   * Выполнение HTTP запроса
   */
  protected async makeRequest<T>(
    method: string,
    endpoint: string,
    params?: Record<string, unknown>,
    signed = false,
  ): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);
    const queryParams = new URLSearchParams();

    // Добавляем параметры
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    // Подпись для приватных endpoints
    if (signed) {
      this.requireApiKeys();

      const timestamp = Date.now();
      queryParams.append('timestamp', String(timestamp));
      queryParams.append('recvWindow', String(this.recvWindow));

      const signature = createHmacSignature(this.apiSecret, queryParams.toString());
      queryParams.append('signature', signature);
    }

    url.search = queryParams.toString();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['X-MBX-APIKEY'] = this.apiKey;
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      signal: AbortSignal.timeout(this.config.timeout ?? 10000),
    });

    const data = await response.json();

    if (!response.ok) {
      this.handleBinanceError(data as { code: number; msg: string }, response.status);
    }

    return data as T;
  }

  /**
   * Обработка ошибок Binance API
   */
  private handleBinanceError(error: { code?: number; msg?: string }, status: number): never {
    const code = error.code || 0;
    const msg = error.msg || 'Unknown error';

    if (code === -2015 || code === -1022) {
      throw new AuthenticationError(msg);
    }

    if (code === -1003 || code === -1015) {
      throw new RateLimitError(msg);
    }

    if (code === -2010 || code === -1013) {
      throw new InsufficientBalanceError(msg);
    }

    if (code === -1121) {
      throw new InvalidSymbolError(msg);
    }

    throw new ExchangeError(msg, code, status);
  }

  // Market Data Methods

  async getCandles(
    symbol: string,
    interval: CandleInterval,
    limit = 500,
    startTime?: number,
    endTime?: number,
  ): Promise<Candle[]> {
    this.requireInitialized();

    const params: Record<string, unknown> = {
      symbol,
      interval: this.mapIntervalToBinance(interval),
      limit: Math.min(limit, 1000),
    };

    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;

    const endpoint = this.marketType === MarketType.SPOT ? '/klines' : '/klines';
    const data = await this.request<
      Array<[number, string, string, string, string, string, number, string, number, string, string, string]>
    >('GET', endpoint, params);

    return data.map((candle) => ({
      timestamp: candle[0],
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
      symbol,
      interval,
    }));
  }

  async getOrderBook(symbol: string, depth = 100): Promise<OrderBook> {
    this.requireInitialized();

    const endpoint = this.marketType === MarketType.SPOT ? '/depth' : '/depth';
    const data = await this.request<{
      lastUpdateId: number;
      bids: Array<[string, string]>;
      asks: Array<[string, string]>;
    }>('GET', endpoint, { symbol, limit: depth });

    return {
      symbol,
      timestamp: Date.now(),
      bids: data.bids.map(([price, quantity]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity),
      })),
      asks: data.asks.map(([price, quantity]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity),
      })),
    };
  }

  async getTrades(symbol: string, limit = 500): Promise<Trade[]> {
    this.requireInitialized();

    const endpoint = this.marketType === MarketType.SPOT ? '/trades' : '/trades';
    const data = await this.request<
      Array<{
        id: number;
        price: string;
        qty: string;
        time: number;
        isBuyerMaker: boolean;
      }>
    >('GET', endpoint, { symbol, limit: Math.min(limit, 1000) });

    return data.map((trade) => ({
      id: String(trade.id),
      timestamp: trade.time,
      symbol,
      price: parseFloat(trade.price),
      quantity: parseFloat(trade.qty),
      side: trade.isBuyerMaker ? 'sell' : 'buy',
      isBuyerMaker: trade.isBuyerMaker,
    }));
  }

  async getTicker(symbol: string): Promise<Ticker> {
    this.requireInitialized();

    const endpoint = this.marketType === MarketType.SPOT ? '/ticker/24hr' : '/ticker/24hr';
    const data = await this.request<{
      symbol: string;
      lastPrice: string;
      bidPrice: string;
      askPrice: string;
      highPrice: string;
      lowPrice: string;
      volume: string;
      priceChange: string;
      priceChangePercent: string;
    }>('GET', endpoint, { symbol });

    return {
      symbol: data.symbol,
      timestamp: Date.now(),
      lastPrice: parseFloat(data.lastPrice),
      bidPrice: parseFloat(data.bidPrice),
      askPrice: parseFloat(data.askPrice),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      volume24h: parseFloat(data.volume),
      priceChange24h: parseFloat(data.priceChange),
      priceChangePercent24h: parseFloat(data.priceChangePercent),
    };
  }

  async getAllTickers(): Promise<Ticker[]> {
    this.requireInitialized();

    const endpoint = this.marketType === MarketType.SPOT ? '/ticker/24hr' : '/ticker/24hr';
    const data = await this.request<
      Array<{
        symbol: string;
        lastPrice: string;
        bidPrice: string;
        askPrice: string;
        highPrice: string;
        lowPrice: string;
        volume: string;
        priceChange: string;
        priceChangePercent: string;
      }>
    >('GET', endpoint);

    return data.map((ticker) => ({
      symbol: ticker.symbol,
      timestamp: Date.now(),
      lastPrice: parseFloat(ticker.lastPrice),
      bidPrice: parseFloat(ticker.bidPrice),
      askPrice: parseFloat(ticker.askPrice),
      high24h: parseFloat(ticker.highPrice),
      low24h: parseFloat(ticker.lowPrice),
      volume24h: parseFloat(ticker.volume),
      priceChange24h: parseFloat(ticker.priceChange),
      priceChangePercent24h: parseFloat(ticker.priceChangePercent),
    }));
  }

  // Trading Methods

  async placeOrder(orderReq: OrderRequest): Promise<Order> {
    this.requireInitialized();
    this.requireApiKeys();

    const params: Record<string, unknown> = {
      symbol: orderReq.symbol,
      side: orderReq.side,
      type: orderReq.type,
      quantity: orderReq.quantity,
    };

    if (orderReq.price) params.price = orderReq.price;
    if (orderReq.stopPrice) params.stopPrice = orderReq.stopPrice;
    if (orderReq.timeInForce) params.timeInForce = orderReq.timeInForce;
    if (orderReq.clientOrderId) params.newClientOrderId = orderReq.clientOrderId;

    const endpoint = this.marketType === MarketType.SPOT ? '/order' : '/order';
    const data = await this.request<{
      orderId: number;
      clientOrderId: string;
      symbol: string;
      side: string;
      type: string;
      status: string;
      origQty: string;
      executedQty: string;
      price?: string;
      stopPrice?: string;
      timeInForce?: string;
      transactTime: number;
      fills?: Array<{ price: string; qty: string; commission: string; commissionAsset: string }>;
    }>('POST', endpoint, params, true);

    let averagePrice: number | undefined;
    let commission = 0;
    let commissionAsset: string | undefined;

    if (data.fills && data.fills.length > 0) {
      const totalCost = data.fills.reduce((sum, fill) => sum + parseFloat(fill.price) * parseFloat(fill.qty), 0);
      const totalQty = data.fills.reduce((sum, fill) => sum + parseFloat(fill.qty), 0);
      averagePrice = totalCost / totalQty;

      commission = data.fills.reduce((sum, fill) => sum + parseFloat(fill.commission), 0);
      commissionAsset = data.fills[0]?.commissionAsset;
    }

    const executedQty = parseFloat(data.executedQty);
    const origQty = parseFloat(data.origQty);

    return {
      orderId: String(data.orderId),
      clientOrderId: data.clientOrderId,
      symbol: data.symbol,
      side: data.side as OrderSide,
      type: data.type as OrderType,
      quantity: origQty,
      price: data.price ? parseFloat(data.price) : undefined,
      stopPrice: data.stopPrice ? parseFloat(data.stopPrice) : undefined,
      status: this.mapBinanceOrderStatus(data.status),
      filled: executedQty,
      remaining: origQty - executedQty,
      averagePrice,
      createdAt: data.transactTime,
      updatedAt: data.transactTime,
      timeInForce: data.timeInForce as never,
      commission,
      commissionAsset,
    };
  }

  async cancelOrder(symbol: string, orderId: string): Promise<void> {
    this.requireInitialized();
    this.requireApiKeys();

    const endpoint = this.marketType === MarketType.SPOT ? '/order' : '/order';
    await this.request('DELETE', endpoint, { symbol, orderId }, true);
  }

  async cancelAllOrders(symbol: string): Promise<void> {
    this.requireInitialized();
    this.requireApiKeys();

    const endpoint = this.marketType === MarketType.SPOT ? '/openOrders' : '/allOpenOrders';
    await this.request('DELETE', endpoint, { symbol }, true);
  }

  async getOrder(symbol: string, orderId: string): Promise<Order> {
    this.requireInitialized();
    this.requireApiKeys();

    const endpoint = this.marketType === MarketType.SPOT ? '/order' : '/order';
    const data = await this.request<{
      orderId: number;
      clientOrderId: string;
      symbol: string;
      side: string;
      type: string;
      status: string;
      origQty: string;
      executedQty: string;
      price: string;
      stopPrice?: string;
      timeInForce?: string;
      time: number;
      updateTime: number;
    }>('GET', endpoint, { symbol, orderId }, true);

    const executedQty = parseFloat(data.executedQty);
    const origQty = parseFloat(data.origQty);

    return {
      orderId: String(data.orderId),
      clientOrderId: data.clientOrderId,
      symbol: data.symbol,
      side: data.side as OrderSide,
      type: data.type as OrderType,
      quantity: origQty,
      price: parseFloat(data.price),
      stopPrice: data.stopPrice ? parseFloat(data.stopPrice) : undefined,
      status: this.mapBinanceOrderStatus(data.status),
      filled: executedQty,
      remaining: origQty - executedQty,
      createdAt: data.time,
      updatedAt: data.updateTime,
      timeInForce: data.timeInForce as never,
    };
  }

  async getOpenOrders(symbol?: string): Promise<Order[]> {
    this.requireInitialized();
    this.requireApiKeys();

    const params = symbol ? { symbol } : undefined;
    const endpoint = this.marketType === MarketType.SPOT ? '/openOrders' : '/openOrders';
    const data = await this.request<
      Array<{
        orderId: number;
        clientOrderId: string;
        symbol: string;
        side: string;
        type: string;
        status: string;
        origQty: string;
        executedQty: string;
        price: string;
        stopPrice?: string;
        timeInForce?: string;
        time: number;
        updateTime: number;
      }>
    >('GET', endpoint, params, true);

    return data.map((order) => {
      const executedQty = parseFloat(order.executedQty);
      const origQty = parseFloat(order.origQty);

      return {
        orderId: String(order.orderId),
        clientOrderId: order.clientOrderId,
        symbol: order.symbol,
        side: order.side as OrderSide,
        type: order.type as OrderType,
        quantity: origQty,
        price: parseFloat(order.price),
        stopPrice: order.stopPrice ? parseFloat(order.stopPrice) : undefined,
        status: this.mapBinanceOrderStatus(order.status),
        filled: executedQty,
        remaining: origQty - executedQty,
        createdAt: order.time,
        updatedAt: order.updateTime,
        timeInForce: order.timeInForce as never,
      };
    });
  }

  async getOrderHistory(
    symbol?: string,
    limit = 500,
    startTime?: number,
    endTime?: number,
  ): Promise<Order[]> {
    this.requireInitialized();
    this.requireApiKeys();

    const params: Record<string, unknown> = {
      limit: Math.min(limit, 1000),
    };

    if (symbol) params.symbol = symbol;
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;

    const endpoint = this.marketType === MarketType.SPOT ? '/allOrders' : '/allOrders';
    const data = await this.request<
      Array<{
        orderId: number;
        clientOrderId: string;
        symbol: string;
        side: string;
        type: string;
        status: string;
        origQty: string;
        executedQty: string;
        price: string;
        stopPrice?: string;
        timeInForce?: string;
        time: number;
        updateTime: number;
      }>
    >('GET', endpoint, params, true);

    return data.map((order) => {
      const executedQty = parseFloat(order.executedQty);
      const origQty = parseFloat(order.origQty);

      return {
        orderId: String(order.orderId),
        clientOrderId: order.clientOrderId,
        symbol: order.symbol,
        side: order.side as OrderSide,
        type: order.type as OrderType,
        quantity: origQty,
        price: parseFloat(order.price),
        stopPrice: order.stopPrice ? parseFloat(order.stopPrice) : undefined,
        status: this.mapBinanceOrderStatus(order.status),
        filled: executedQty,
        remaining: origQty - executedQty,
        createdAt: order.time,
        updatedAt: order.updateTime,
        timeInForce: order.timeInForce as never,
      };
    });
  }

  // Account Methods

  async getBalance(): Promise<Balance[]> {
    this.requireInitialized();
    this.requireApiKeys();

    const endpoint = this.marketType === MarketType.SPOT ? '/account' : '/account';
    const data = await this.request<{
      balances?: Array<{ asset: string; free: string; locked: string }>;
      assets?: Array<{ asset: string; availableBalance: string; walletBalance: string }>;
    }>('GET', endpoint, undefined, true);

    const balances = data.balances || data.assets || [];

    return balances.map((balance) => {
      const free = parseFloat('free' in balance ? balance.free : balance.availableBalance);
      const locked =
        'locked' in balance ? parseFloat(balance.locked) : parseFloat(balance.walletBalance) - free;

      return {
        asset: balance.asset,
        free,
        locked,
        total: free + locked,
      };
    });
  }

  async getBalanceForAsset(asset: string): Promise<Balance> {
    const balances = await this.getBalance();
    const balance = balances.find((b) => b.asset === asset);

    if (!balance) {
      return {
        asset,
        free: 0,
        locked: 0,
        total: 0,
      };
    }

    return balance;
  }

  // Futures specific methods

  async getPositions(symbol?: string): Promise<Position[]> {
    if (this.marketType !== MarketType.FUTURES) {
      throw new ExchangeError('Positions are only available for futures market');
    }

    this.requireInitialized();
    this.requireApiKeys();

    const data = await this.request<
      Array<{
        symbol: string;
        positionAmt: string;
        entryPrice: string;
        markPrice: string;
        unRealizedProfit: string;
        liquidationPrice: string;
        leverage: string;
        marginType: string;
        positionSide: string;
      }>
    >('GET', '/positionRisk', symbol ? { symbol } : undefined, true);

    return data
      .filter((pos) => parseFloat(pos.positionAmt) !== 0)
      .map((pos) => ({
        symbol: pos.symbol,
        side: parseFloat(pos.positionAmt) > 0 ? 'LONG' : 'SHORT',
        quantity: Math.abs(parseFloat(pos.positionAmt)),
        entryPrice: parseFloat(pos.entryPrice),
        markPrice: parseFloat(pos.markPrice),
        liquidationPrice: parseFloat(pos.liquidationPrice),
        leverage: parseFloat(pos.leverage),
        unrealizedPnl: parseFloat(pos.unRealizedProfit),
        margin: 0, // Вычисляется отдельно
        marginType: pos.marginType.toLowerCase() as 'isolated' | 'cross',
      }));
  }

  async setLeverage(symbol: string, leverage: number): Promise<void> {
    if (this.marketType !== MarketType.FUTURES) {
      throw new ExchangeError('Leverage is only available for futures market');
    }

    this.requireInitialized();
    this.requireApiKeys();

    await this.request('POST', '/leverage', { symbol, leverage }, true);
  }

  async setMarginType(symbol: string, marginType: 'isolated' | 'cross'): Promise<void> {
    if (this.marketType !== MarketType.FUTURES) {
      throw new ExchangeError('Margin type is only available for futures market');
    }

    this.requireInitialized();
    this.requireApiKeys();

    await this.request('POST', '/marginType', { symbol, marginType: marginType.toUpperCase() }, true);
  }

  // WebSocket Methods (simplified implementation)

  subscribeToTrades(_symbol: string, _callback: (trade: Trade) => void): void {
    console.warn(`[${this.name}] WebSocket subscriptions not fully implemented yet`);
    // TODO: Implement WebSocket for trades
  }

  subscribeToTicker(_symbol: string, _callback: (ticker: Ticker) => void): void {
    console.warn(`[${this.name}] WebSocket subscriptions not fully implemented yet`);
    // TODO: Implement WebSocket for ticker
  }

  subscribeToOrderBook(_symbol: string, _callback: (orderBook: OrderBook) => void): void {
    console.warn(`[${this.name}] WebSocket subscriptions not fully implemented yet`);
    // TODO: Implement WebSocket for order book
  }

  subscribeToCandles(_symbol: string, _interval: CandleInterval, _callback: (candle: Candle) => void): void {
    console.warn(`[${this.name}] WebSocket subscriptions not fully implemented yet`);
    // TODO: Implement WebSocket for candles
  }

  unsubscribe(_symbol: string, _event: WebSocketEventType): void {
    // TODO: Implement unsubscribe
  }

  unsubscribeAll(): void {
    this.wsConnections.forEach((ws) => {
      if (typeof ws === 'object' && 'close' in ws && typeof ws.close === 'function') {
        ws.close();
      }
    });
    this.wsConnections.clear();
  }

  // Utility Methods

  async getExchangeInfo(): Promise<ExchangeInfo> {
    this.requireInitialized();

    const endpoint = this.marketType === MarketType.SPOT ? '/exchangeInfo' : '/exchangeInfo';
    const data = await this.request<{
      symbols: Array<{
        symbol: string;
        status: string;
      }>;
    }>('GET', endpoint);

    const activeSymbols = data.symbols.filter((s) => s.status === 'TRADING').map((s) => s.symbol);

    return {
      name: this.name,
      marketTypes: [this.marketType],
      symbols: activeSymbols,
      fees: {
        maker: 0.1,
        taker: 0.1,
      },
      limits: {
        withdrawal: {},
        deposit: {},
        order: {
          minQuantity: 0,
          maxQuantity: Infinity,
          minPrice: 0,
          maxPrice: Infinity,
        },
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

  // Helper Methods

  private mapIntervalToBinance(interval: CandleInterval): string {
    return interval; // Binance использует те же обозначения
  }

  private mapBinanceOrderStatus(status: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      NEW: OrderStatus.NEW,
      PARTIALLY_FILLED: OrderStatus.PARTIALLY_FILLED,
      FILLED: OrderStatus.FILLED,
      CANCELED: OrderStatus.CANCELED,
      PENDING_CANCEL: OrderStatus.PENDING_CANCEL,
      REJECTED: OrderStatus.REJECTED,
      EXPIRED: OrderStatus.EXPIRED,
    };

    return statusMap[status] || OrderStatus.NEW;
  }
}
