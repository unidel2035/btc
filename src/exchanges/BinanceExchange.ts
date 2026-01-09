/**
 * Binance Exchange Implementation
 *
 * Реализация интеграции с Binance (Spot + Futures)
 */

import { BaseExchange } from './BaseExchange.js';
import { createHmacSignature } from './security.js';
import type {
  Candle,
  OrderBook,
  Trade,
  Ticker,
  Order,
  OrderRequest,
  Balance,
  CandleInterval,
  WebSocketCallback,
  WebSocketTradeUpdate,
  WebSocketTickerUpdate,
  WebSocketCandleUpdate,
  WebSocketOrderBookUpdate,
  MarketType,
  GetCandlesOptions,
  GetOrderBookOptions,
  GetTradesOptions,
  GetTickerOptions,
  OrderType,
  OrderSide,
  OrderStatus,
} from './types.js';
import WebSocket from 'ws';

/**
 * Binance API ответ для свечей
 */
interface BinanceKline {
  0: number; // Open time
  1: string; // Open
  2: string; // High
  3: string; // Low
  4: string; // Close
  5: string; // Volume
  6: number; // Close time
  7: string; // Quote asset volume
  8: number; // Number of trades
  9: string; // Taker buy base asset volume
  10: string; // Taker buy quote asset volume
  11: string; // Ignore
}

/**
 * Binance Exchange
 */
export class BinanceExchange extends BaseExchange {
  private wsConnections: Map<string, WebSocket> = new Map();

  constructor(config: { apiKey: string; apiSecret: string; testnet?: boolean }) {
    super({
      name: 'binance',
      ...config,
    });

    // Установить URL в зависимости от testnet
    if (config.testnet) {
      this.baseUrl = 'https://testnet.binance.vision';
      this.wsUrl = 'wss://testnet.binance.vision';
    } else {
      this.baseUrl = 'https://api.binance.com';
      this.wsUrl = 'wss://stream.binance.com:9443';
    }
  }

  /**
   * Получить свечи (OHLCV)
   */
  async getCandles(
    symbol: string,
    interval: CandleInterval,
    limit: number,
    options?: GetCandlesOptions,
  ): Promise<Candle[]> {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const normalizedInterval = this.normalizeInterval(interval);
    const marketType = options?.marketType ?? this.config.defaultMarketType ?? 'spot';

    const params: Record<string, string | number> = {
      symbol: normalizedSymbol,
      interval: normalizedInterval,
      limit,
    };

    if (options?.startTime) {
      params.startTime = options.startTime;
    }
    if (options?.endTime) {
      params.endTime = options.endTime;
    }

    const endpoint = marketType === 'futures' ? '/fapi/v1/klines' : '/api/v3/klines';
    const response = await this.request<BinanceKline[]>({
      method: 'GET',
      endpoint,
      params,
    });

    return response.map((kline) => ({
      timestamp: kline[0],
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
      isClosed: true,
    }));
  }

  /**
   * Получить стакан заявок
   */
  async getOrderBook(
    symbol: string,
    depth: number,
    options?: GetOrderBookOptions,
  ): Promise<OrderBook> {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const marketType = options?.marketType ?? this.config.defaultMarketType ?? 'spot';

    const endpoint = marketType === 'futures' ? '/fapi/v1/depth' : '/api/v3/depth';
    const response = await this.request<{
      lastUpdateId: number;
      bids: [string, string][];
      asks: [string, string][];
    }>({
      method: 'GET',
      endpoint,
      params: {
        symbol: normalizedSymbol,
        limit: depth,
      },
    });

    return {
      symbol,
      timestamp: Date.now(),
      bids: response.bids.map(([price, quantity]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity),
      })),
      asks: response.asks.map(([price, quantity]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity),
      })),
    };
  }

  /**
   * Получить недавние сделки
   */
  async getTrades(symbol: string, options?: GetTradesOptions): Promise<Trade[]> {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const marketType = options?.marketType ?? this.config.defaultMarketType ?? 'spot';

    const endpoint = marketType === 'futures' ? '/fapi/v1/trades' : '/api/v3/trades';
    const response = await this.request<
      {
        id: number;
        price: string;
        qty: string;
        quoteQty: string;
        time: number;
        isBuyerMaker: boolean;
      }[]
    >({
      method: 'GET',
      endpoint,
      params: {
        symbol: normalizedSymbol,
        limit: options?.limit ?? 100,
      },
    });

    return response.map((trade) => ({
      id: trade.id.toString(),
      symbol,
      price: parseFloat(trade.price),
      quantity: parseFloat(trade.qty),
      timestamp: trade.time,
      side: trade.isBuyerMaker ? 'SELL' : 'BUY',
      isBuyerMaker: trade.isBuyerMaker,
    }));
  }

  /**
   * Получить тикер
   */
  async getTicker(symbol: string, options?: GetTickerOptions): Promise<Ticker> {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const marketType = options?.marketType ?? this.config.defaultMarketType ?? 'spot';

    const endpoint = marketType === 'futures' ? '/fapi/v1/ticker/24hr' : '/api/v3/ticker/24hr';
    const response = await this.request<{
      symbol: string;
      lastPrice: string;
      bidPrice: string;
      askPrice: string;
      volume: string;
      priceChangePercent: string;
      highPrice: string;
      lowPrice: string;
    }>({
      method: 'GET',
      endpoint,
      params: {
        symbol: normalizedSymbol,
      },
    });

    return {
      symbol,
      timestamp: Date.now(),
      lastPrice: parseFloat(response.lastPrice),
      bidPrice: parseFloat(response.bidPrice),
      askPrice: parseFloat(response.askPrice),
      volume24h: parseFloat(response.volume),
      priceChange24h: parseFloat(response.priceChangePercent),
      high24h: parseFloat(response.highPrice),
      low24h: parseFloat(response.lowPrice),
    };
  }

  /**
   * Создать ордер
   */
  async placeOrder(order: OrderRequest): Promise<Order> {
    const normalizedSymbol = this.normalizeSymbol(order.symbol);
    const marketType = order.marketType ?? this.config.defaultMarketType ?? 'spot';

    const params: Record<string, string | number> = {
      symbol: normalizedSymbol,
      side: order.side,
      type: order.type,
      quantity: order.quantity,
      timestamp: Date.now(),
    };

    // Добавить цену для лимитных ордеров
    if (order.price) {
      params.price = order.price;
    }

    // Добавить стоп-цену для стоп-ордеров
    if (order.stopPrice) {
      params.stopPrice = order.stopPrice;
    }

    // Добавить timeInForce для лимитных ордеров
    if (order.timeInForce && order.type !== 'MARKET') {
      params.timeInForce = order.timeInForce;
    }

    const endpoint = marketType === 'futures' ? '/fapi/v1/order' : '/api/v3/order';
    const response = await this.request<{
      orderId: number;
      symbol: string;
      status: string;
      side: OrderSide;
      type: OrderType;
      price: string;
      origQty: string;
      executedQty: string;
      transactTime: number;
    }>({
      method: 'POST',
      endpoint,
      params,
      signed: true,
    });

    return {
      id: response.orderId.toString(),
      exchange: this.name,
      symbol: order.symbol,
      side: response.side,
      type: response.type,
      status: this.normalizeOrderStatus(response.status),
      price: parseFloat(response.price),
      quantity: parseFloat(response.origQty),
      executedQuantity: parseFloat(response.executedQty),
      createdAt: response.transactTime,
      updatedAt: response.transactTime,
      marketType,
    };
  }

  /**
   * Отменить ордер
   */
  async cancelOrder(orderId: string, symbol: string, marketType?: MarketType): Promise<void> {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const market = marketType ?? this.config.defaultMarketType ?? 'spot';

    const endpoint = market === 'futures' ? '/fapi/v1/order' : '/api/v3/order';
    await this.request({
      method: 'DELETE',
      endpoint,
      params: {
        symbol: normalizedSymbol,
        orderId: parseInt(orderId, 10),
        timestamp: Date.now(),
      },
      signed: true,
    });
  }

  /**
   * Получить информацию об ордере
   */
  async getOrder(orderId: string, symbol: string, marketType?: MarketType): Promise<Order> {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const market = marketType ?? this.config.defaultMarketType ?? 'spot';

    const endpoint = market === 'futures' ? '/fapi/v1/order' : '/api/v3/order';
    const response = await this.request<{
      orderId: number;
      symbol: string;
      status: string;
      side: OrderSide;
      type: OrderType;
      price: string;
      origQty: string;
      executedQty: string;
      time: number;
      updateTime: number;
    }>({
      method: 'GET',
      endpoint,
      params: {
        symbol: normalizedSymbol,
        orderId: parseInt(orderId, 10),
        timestamp: Date.now(),
      },
      signed: true,
    });

    return {
      id: response.orderId.toString(),
      exchange: this.name,
      symbol,
      side: response.side,
      type: response.type,
      status: this.normalizeOrderStatus(response.status),
      price: parseFloat(response.price),
      quantity: parseFloat(response.origQty),
      executedQuantity: parseFloat(response.executedQty),
      createdAt: response.time,
      updatedAt: response.updateTime,
      marketType: market,
    };
  }

  /**
   * Получить открытые ордера
   */
  async getOpenOrders(symbol?: string, marketType?: MarketType): Promise<Order[]> {
    const market = marketType ?? this.config.defaultMarketType ?? 'spot';
    const params: Record<string, string | number> = {
      timestamp: Date.now(),
    };

    if (symbol) {
      params.symbol = this.normalizeSymbol(symbol);
    }

    const endpoint = market === 'futures' ? '/fapi/v1/openOrders' : '/api/v3/openOrders';
    const response = await this.request<
      {
        orderId: number;
        symbol: string;
        status: string;
        side: OrderSide;
        type: OrderType;
        price: string;
        origQty: string;
        executedQty: string;
        time: number;
        updateTime: number;
      }[]
    >({
      method: 'GET',
      endpoint,
      params,
      signed: true,
    });

    return response.map((order) => ({
      id: order.orderId.toString(),
      exchange: this.name,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      status: this.normalizeOrderStatus(order.status),
      price: parseFloat(order.price),
      quantity: parseFloat(order.origQty),
      executedQuantity: parseFloat(order.executedQty),
      createdAt: order.time,
      updatedAt: order.updateTime,
      marketType: market,
    }));
  }

  /**
   * Получить баланс
   */
  async getBalance(marketType?: MarketType): Promise<Balance[]> {
    const market = marketType ?? this.config.defaultMarketType ?? 'spot';

    if (market === 'futures') {
      const endpoint = '/fapi/v2/balance';
      const response = await this.request<
        {
          asset: string;
          balance: string;
          availableBalance: string;
        }[]
      >({
        method: 'GET',
        endpoint,
        params: {
          timestamp: Date.now(),
        },
        signed: true,
      });

      return response.map((balance) => {
        const free = parseFloat(balance.availableBalance);
        const total = parseFloat(balance.balance);
        return {
          asset: balance.asset,
          free,
          locked: total - free,
          total,
        };
      });
    } else {
      const endpoint = '/api/v3/account';
      const response = await this.request<{
        balances: {
          asset: string;
          free: string;
          locked: string;
        }[];
      }>({
        method: 'GET',
        endpoint,
        params: {
          timestamp: Date.now(),
        },
        signed: true,
      });

      return response.balances
        .filter((b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
        .map((balance) => {
          const free = parseFloat(balance.free);
          const locked = parseFloat(balance.locked);
          return {
            asset: balance.asset,
            free,
            locked,
            total: free + locked,
          };
        });
    }
  }

  /**
   * Подписаться на обновления трейдов через WebSocket
   */
  subscribeToTrades(
    symbol: string,
    callback: WebSocketCallback<WebSocketTradeUpdate>,
    marketType?: MarketType,
  ): void {
    const normalizedSymbol = this.normalizeSymbol(symbol).toLowerCase();
    const market = marketType ?? this.config.defaultMarketType ?? 'spot';
    const stream = `${normalizedSymbol}@trade`;
    const wsUrl =
      market === 'futures' ? `${this.wsUrl}/ws/${stream}` : `${this.wsUrl}/ws/${stream}`;

    this.createWebSocket(stream, wsUrl, (data: unknown) => {
      const trade = data as {
        e: string;
        s: string;
        p: string;
        q: string;
        T: number;
        m: boolean;
      };

      callback({
        symbol,
        price: parseFloat(trade.p),
        quantity: parseFloat(trade.q),
        timestamp: trade.T,
        side: trade.m ? 'SELL' : 'BUY',
      });
    });
  }

  /**
   * Подписаться на обновления тикера через WebSocket
   */
  subscribeToTicker(
    symbol: string,
    callback: WebSocketCallback<WebSocketTickerUpdate>,
    marketType?: MarketType,
  ): void {
    const normalizedSymbol = this.normalizeSymbol(symbol).toLowerCase();
    const market = marketType ?? this.config.defaultMarketType ?? 'spot';
    const stream = `${normalizedSymbol}@ticker`;
    const wsUrl =
      market === 'futures' ? `${this.wsUrl}/ws/${stream}` : `${this.wsUrl}/ws/${stream}`;

    this.createWebSocket(stream, wsUrl, (data: unknown) => {
      const ticker = data as {
        e: string;
        s: string;
        c: string;
        v: string;
        E: number;
      };

      callback({
        symbol,
        lastPrice: parseFloat(ticker.c),
        volume: parseFloat(ticker.v),
        timestamp: ticker.E,
      });
    });
  }

  /**
   * Подписаться на обновления свечей через WebSocket
   */
  subscribeToCandles(
    symbol: string,
    interval: CandleInterval,
    callback: WebSocketCallback<WebSocketCandleUpdate>,
    marketType?: MarketType,
  ): void {
    const normalizedSymbol = this.normalizeSymbol(symbol).toLowerCase();
    const normalizedInterval = this.normalizeInterval(interval);
    const market = marketType ?? this.config.defaultMarketType ?? 'spot';
    const stream = `${normalizedSymbol}@kline_${normalizedInterval}`;
    const wsUrl =
      market === 'futures' ? `${this.wsUrl}/ws/${stream}` : `${this.wsUrl}/ws/${stream}`;

    this.createWebSocket(stream, wsUrl, (data: unknown) => {
      const klineData = data as {
        e: string;
        s: string;
        k: {
          t: number;
          o: string;
          h: string;
          l: string;
          c: string;
          v: string;
          x: boolean;
        };
      };

      callback({
        symbol,
        interval,
        candle: {
          timestamp: klineData.k.t,
          open: parseFloat(klineData.k.o),
          high: parseFloat(klineData.k.h),
          low: parseFloat(klineData.k.l),
          close: parseFloat(klineData.k.c),
          volume: parseFloat(klineData.k.v),
          isClosed: klineData.k.x,
        },
      });
    });
  }

  /**
   * Подписаться на обновления стакана заявок через WebSocket
   */
  subscribeToOrderBook(
    symbol: string,
    callback: WebSocketCallback<WebSocketOrderBookUpdate>,
    marketType?: MarketType,
  ): void {
    const normalizedSymbol = this.normalizeSymbol(symbol).toLowerCase();
    const market = marketType ?? this.config.defaultMarketType ?? 'spot';
    const stream = `${normalizedSymbol}@depth`;
    const wsUrl =
      market === 'futures' ? `${this.wsUrl}/ws/${stream}` : `${this.wsUrl}/ws/${stream}`;

    this.createWebSocket(stream, wsUrl, (data: unknown) => {
      const depth = data as {
        e: string;
        s: string;
        b: [string, string][];
        a: [string, string][];
        E: number;
      };

      callback({
        symbol,
        bids: depth.b.map(([price, quantity]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity),
        })),
        asks: depth.a.map(([price, quantity]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity),
        })),
        timestamp: depth.E,
      });
    });
  }

  /**
   * Отписаться от всех WebSocket подписок
   */
  unsubscribeAll(): void {
    for (const [stream, ws] of this.wsConnections) {
      ws.close();
      this.wsConnections.delete(stream);
    }
  }

  /**
   * Получить время сервера
   */
  async getServerTime(): Promise<number> {
    const response = await this.request<{ serverTime: number }>({
      method: 'GET',
      endpoint: '/api/v3/time',
    });
    return response.serverTime;
  }

  /**
   * Выполнить HTTP запрос
   */
  protected async executeRequest<T>(options: {
    method: 'GET' | 'POST' | 'DELETE' | 'PUT';
    endpoint: string;
    params?: Record<string, string | number | boolean | undefined>;
    body?: Record<string, unknown>;
    signed?: boolean;
  }): Promise<T> {
    let url = `${this.baseUrl}${options.endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-MBX-APIKEY': this.config.apiKey,
    };

    // Подготовить параметры
    let queryString = '';
    if (options.params) {
      const filteredParams = Object.fromEntries(
        Object.entries(options.params).filter(([, v]) => v !== undefined),
      ) as Record<string, string | number | boolean>;

      // Если нужна подпись, добавить signature
      if (options.signed) {
        const paramsArray: [string, string][] = Object.entries(filteredParams).map(([k, v]) => [
          k,
          String(v),
        ]);
        const paramsString = new URLSearchParams(paramsArray).toString();
        const signature = this.createSignature(filteredParams);
        queryString = `${paramsString}&signature=${signature}`;
      } else {
        const paramsArray: [string, string][] = Object.entries(filteredParams).map(([k, v]) => [
          k,
          String(v),
        ]);
        queryString = new URLSearchParams(paramsArray).toString();
      }
    }

    if (queryString) {
      url += `?${queryString}`;
    }

    // Выполнить запрос
    const response = await fetch(url, {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout ?? 30000),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ msg: response.statusText }));
      throw new Error(`Binance API error: ${(error as { msg: string }).msg}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Создать подпись HMAC SHA256
   */
  protected createSignature(params: Record<string, string | number | boolean>): string {
    const paramsArray: [string, string][] = Object.entries(params).map(([k, v]) => [k, String(v)]);
    const queryString = new URLSearchParams(paramsArray).toString();
    return createHmacSignature(queryString, this.config.apiSecret);
  }

  /**
   * Нормализовать символ торговой пары
   */
  protected normalizeSymbol(symbol: string): string {
    return symbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  /**
   * Нормализовать интервал свечей
   */
  protected normalizeInterval(interval: CandleInterval): string {
    return interval;
  }

  /**
   * Нормализовать статус ордера
   */
  private normalizeOrderStatus(status: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      NEW: 'NEW',
      PARTIALLY_FILLED: 'PARTIALLY_FILLED',
      FILLED: 'FILLED',
      CANCELED: 'CANCELED',
      REJECTED: 'REJECTED',
      EXPIRED: 'EXPIRED',
    };
    return statusMap[status] ?? 'NEW';
  }

  /**
   * Создать WebSocket соединение
   */
  private createWebSocket(stream: string, url: string, callback: WebSocketCallback<unknown>): void {
    // Если уже есть соединение для этого stream, не создавать новое
    if (this.wsConnections.has(stream)) {
      return;
    }

    const ws = new WebSocket(url);

    ws.on('open', () => {
      if (this.config.enableLogging) {
        this.log('WEBSOCKET', `Connected to ${stream}`);
      }
    });

    ws.on('message', (data: Buffer) => {
      try {
        const parsed = JSON.parse(data.toString()) as unknown;
        callback(parsed);
      } catch (error) {
        if (this.config.enableLogging) {
          this.log('WEBSOCKET_ERROR', `Failed to parse message from ${stream}`, error);
        }
      }
    });

    ws.on('error', (error: Error) => {
      if (this.config.enableLogging) {
        this.log('WEBSOCKET_ERROR', `Error on ${stream}`, error);
      }
    });

    ws.on('close', () => {
      if (this.config.enableLogging) {
        this.log('WEBSOCKET', `Disconnected from ${stream}`);
      }
      this.wsConnections.delete(stream);
    });

    this.wsConnections.set(stream, ws);
  }

  /**
   * Получить лимит запросов в минуту
   */
  protected override getRequestsPerMinute(): number {
    return 1200;
  }

  /**
   * Получить лимит ордеров в секунду
   */
  protected override getOrdersPerSecond(): number {
    return 10;
  }
}
