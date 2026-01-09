/**
 * Bybit Exchange Implementation
 *
 * Реализация интеграции с Bybit (Unified Trading Account)
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
  OrderStatus,
  OrderType,
} from './types.js';
import WebSocket from 'ws';

/**
 * Bybit Exchange
 */
export class BybitExchange extends BaseExchange {
  private wsConnections: Map<string, WebSocket> = new Map();
  private recvWindow: number = 5000;

  constructor(config: { apiKey: string; apiSecret: string; testnet?: boolean }) {
    super({
      name: 'bybit',
      ...config,
    });

    // Установить URL в зависимости от testnet
    if (config.testnet) {
      this.baseUrl = 'https://api-testnet.bybit.com';
      this.wsUrl = 'wss://stream-testnet.bybit.com';
    } else {
      this.baseUrl = 'https://api.bybit.com';
      this.wsUrl = 'wss://stream.bybit.com';
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
    const category = this.getCategory(options?.marketType);

    const params: Record<string, string | number> = {
      category,
      symbol: normalizedSymbol,
      interval: normalizedInterval,
      limit,
    };

    if (options?.startTime) {
      params.start = options.startTime;
    }
    if (options?.endTime) {
      params.end = options.endTime;
    }

    const response = await this.request<{
      result: {
        list: [string, string, string, string, string, string, string][];
      };
    }>({
      method: 'GET',
      endpoint: '/v5/market/kline',
      params,
    });

    // Bybit возвращает свечи в обратном порядке (новые первые)
    return response.result.list.reverse().map((kline) => ({
      timestamp: parseInt(kline[0]),
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
    const category = this.getCategory(options?.marketType);

    const response = await this.request<{
      result: {
        s: string;
        b: [string, string][];
        a: [string, string][];
        ts: number;
      };
    }>({
      method: 'GET',
      endpoint: '/v5/market/orderbook',
      params: {
        category,
        symbol: normalizedSymbol,
        limit: Math.min(depth, 500),
      },
    });

    return {
      symbol,
      timestamp: response.result.ts,
      bids: response.result.b.slice(0, depth).map(([price, quantity]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity),
      })),
      asks: response.result.a.slice(0, depth).map(([price, quantity]) => ({
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
    const category = this.getCategory(options?.marketType);

    const response = await this.request<{
      result: {
        list: {
          execId: string;
          symbol: string;
          price: string;
          size: string;
          side: string;
          time: string;
        }[];
      };
    }>({
      method: 'GET',
      endpoint: '/v5/market/recent-trade',
      params: {
        category,
        symbol: normalizedSymbol,
        limit: options?.limit ?? 100,
      },
    });

    return response.result.list.map((trade) => ({
      id: trade.execId,
      symbol,
      price: parseFloat(trade.price),
      quantity: parseFloat(trade.size),
      timestamp: parseInt(trade.time),
      side: trade.side === 'Buy' ? 'BUY' : 'SELL',
      isBuyerMaker: trade.side === 'Sell',
    }));
  }

  /**
   * Получить тикер
   */
  async getTicker(symbol: string, options?: GetTickerOptions): Promise<Ticker> {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const category = this.getCategory(options?.marketType);

    const response = await this.request<{
      result: {
        list: {
          symbol: string;
          lastPrice: string;
          bid1Price: string;
          ask1Price: string;
          volume24h: string;
          price24hPcnt: string;
          highPrice24h: string;
          lowPrice24h: string;
        }[];
      };
    }>({
      method: 'GET',
      endpoint: '/v5/market/tickers',
      params: {
        category,
        symbol: normalizedSymbol,
      },
    });

    const ticker = response.result.list[0];
    if (!ticker) {
      throw new Error(`Ticker not found for symbol ${symbol}`);
    }

    return {
      symbol,
      timestamp: Date.now(),
      lastPrice: parseFloat(ticker.lastPrice),
      bidPrice: parseFloat(ticker.bid1Price),
      askPrice: parseFloat(ticker.ask1Price),
      volume24h: parseFloat(ticker.volume24h),
      priceChange24h: parseFloat(ticker.price24hPcnt) * 100,
      high24h: parseFloat(ticker.highPrice24h),
      low24h: parseFloat(ticker.lowPrice24h),
    };
  }

  /**
   * Создать ордер
   */
  async placeOrder(order: OrderRequest): Promise<Order> {
    const normalizedSymbol = this.normalizeSymbol(order.symbol);
    const category = this.getCategory(order.marketType);

    const params: Record<string, string | number> = {
      category,
      symbol: normalizedSymbol,
      side: order.side === 'BUY' ? 'Buy' : 'Sell',
      orderType: this.normalizeOrderType(order.type),
      qty: order.quantity.toString(),
    };

    // Добавить цену для лимитных ордеров
    if (order.price) {
      params.price = order.price.toString();
    }

    // Добавить стоп-цену для стоп-ордеров
    if (order.stopPrice) {
      params.triggerPrice = order.stopPrice.toString();
    }

    // Добавить timeInForce
    if (order.timeInForce) {
      params.timeInForce = order.timeInForce;
    }

    const response = await this.request<{
      result: {
        orderId: string;
        orderLinkId: string;
      };
    }>({
      method: 'POST',
      endpoint: '/v5/order/create',
      body: params,
      signed: true,
    });

    // Получить информацию о созданном ордере
    return this.getOrder(response.result.orderId, order.symbol, order.marketType);
  }

  /**
   * Отменить ордер
   */
  async cancelOrder(orderId: string, symbol: string, marketType?: MarketType): Promise<void> {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const category = this.getCategory(marketType);

    await this.request({
      method: 'POST',
      endpoint: '/v5/order/cancel',
      body: {
        category,
        symbol: normalizedSymbol,
        orderId,
      },
      signed: true,
    });
  }

  /**
   * Получить информацию об ордере
   */
  async getOrder(orderId: string, symbol: string, marketType?: MarketType): Promise<Order> {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const category = this.getCategory(marketType);

    const response = await this.request<{
      result: {
        list: {
          orderId: string;
          symbol: string;
          side: string;
          orderType: string;
          orderStatus: string;
          price: string;
          avgPrice: string;
          qty: string;
          cumExecQty: string;
          createdTime: string;
          updatedTime: string;
        }[];
      };
    }>({
      method: 'GET',
      endpoint: '/v5/order/realtime',
      params: {
        category,
        symbol: normalizedSymbol,
        orderId,
      },
      signed: true,
    });

    const orderData = response.result.list[0];
    if (!orderData) {
      throw new Error(`Order not found: ${orderId}`);
    }

    return {
      id: orderData.orderId,
      exchange: this.name,
      symbol,
      side: orderData.side === 'Buy' ? 'BUY' : 'SELL',
      type: this.denormalizeOrderType(orderData.orderType) as OrderType,
      status: this.normalizeOrderStatus(orderData.orderStatus),
      price: parseFloat(orderData.price),
      avgPrice: parseFloat(orderData.avgPrice) || undefined,
      quantity: parseFloat(orderData.qty),
      executedQuantity: parseFloat(orderData.cumExecQty),
      createdAt: parseInt(orderData.createdTime),
      updatedAt: parseInt(orderData.updatedTime),
      marketType: marketType ?? this.config.defaultMarketType ?? 'spot',
    };
  }

  /**
   * Получить открытые ордера
   */
  async getOpenOrders(symbol?: string, marketType?: MarketType): Promise<Order[]> {
    const category = this.getCategory(marketType);
    const params: Record<string, string | number> = {
      category,
    };

    if (symbol) {
      params.symbol = this.normalizeSymbol(symbol);
    }

    const response = await this.request<{
      result: {
        list: {
          orderId: string;
          symbol: string;
          side: string;
          orderType: string;
          orderStatus: string;
          price: string;
          avgPrice: string;
          qty: string;
          cumExecQty: string;
          createdTime: string;
          updatedTime: string;
        }[];
      };
    }>({
      method: 'GET',
      endpoint: '/v5/order/realtime',
      params,
      signed: true,
    });

    return response.result.list.map((order) => ({
      id: order.orderId,
      exchange: this.name,
      symbol: order.symbol,
      side: order.side === 'Buy' ? 'BUY' : 'SELL',
      type: this.denormalizeOrderType(order.orderType) as OrderType,
      status: this.normalizeOrderStatus(order.orderStatus),
      price: parseFloat(order.price),
      avgPrice: parseFloat(order.avgPrice) || undefined,
      quantity: parseFloat(order.qty),
      executedQuantity: parseFloat(order.cumExecQty),
      createdAt: parseInt(order.createdTime),
      updatedAt: parseInt(order.updatedTime),
      marketType: marketType ?? this.config.defaultMarketType ?? 'spot',
    }));
  }

  /**
   * Получить баланс
   */
  async getBalance(marketType?: MarketType): Promise<Balance[]> {
    const accountType = marketType === 'futures' ? 'CONTRACT' : 'UNIFIED';

    const response = await this.request<{
      result: {
        list: {
          coin: {
            coin: string;
            walletBalance: string;
            availableToWithdraw: string;
          }[];
        }[];
      };
    }>({
      method: 'GET',
      endpoint: '/v5/account/wallet-balance',
      params: {
        accountType,
      },
      signed: true,
    });

    const coins = response.result.list[0]?.coin ?? [];

    return coins
      .filter((c) => parseFloat(c.walletBalance) > 0)
      .map((coin) => {
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

  /**
   * Подписаться на обновления трейдов через WebSocket
   */
  subscribeToTrades(
    symbol: string,
    callback: WebSocketCallback<WebSocketTradeUpdate>,
    marketType?: MarketType,
  ): void {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const category = this.getCategory(marketType);
    const channel = `publicTrade.${normalizedSymbol}`;
    const wsUrl = `${this.wsUrl}/v5/public/${category}`;

    this.createWebSocket(channel, wsUrl, channel, (data: unknown) => {
      const trade = data as {
        topic: string;
        type: string;
        data: {
          s: string;
          p: string;
          v: string;
          T: number;
          S: string;
        }[];
      };

      if (trade.data && trade.data.length > 0) {
        const t = trade.data[0] as {
          s: string;
          p: string;
          v: string;
          T: number;
          S: string;
        };
        callback({
          symbol,
          price: parseFloat(t.p),
          quantity: parseFloat(t.v),
          timestamp: t.T,
          side: t.S === 'Buy' ? 'BUY' : 'SELL',
        });
      }
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
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const category = this.getCategory(marketType);
    const channel = `tickers.${normalizedSymbol}`;
    const wsUrl = `${this.wsUrl}/v5/public/${category}`;

    this.createWebSocket(channel, wsUrl, channel, (data: unknown) => {
      const ticker = data as {
        topic: string;
        type: string;
        data: {
          symbol: string;
          lastPrice: string;
          volume24h: string;
          ts: string;
        };
      };

      callback({
        symbol,
        lastPrice: parseFloat(ticker.data.lastPrice),
        volume: parseFloat(ticker.data.volume24h),
        timestamp: parseInt(ticker.data.ts),
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
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const normalizedInterval = this.normalizeInterval(interval);
    const category = this.getCategory(marketType);
    const channel = `kline.${normalizedInterval}.${normalizedSymbol}`;
    const wsUrl = `${this.wsUrl}/v5/public/${category}`;

    this.createWebSocket(channel, wsUrl, channel, (data: unknown) => {
      const kline = data as {
        topic: string;
        type: string;
        data: {
          start: string;
          open: string;
          high: string;
          low: string;
          close: string;
          volume: string;
          confirm: boolean;
        }[];
      };

      if (kline.data && kline.data.length > 0) {
        const k = kline.data[0] as {
          start: string;
          open: string;
          high: string;
          low: string;
          close: string;
          volume: string;
          confirm: boolean;
        };
        callback({
          symbol,
          interval,
          candle: {
            timestamp: parseInt(k.start),
            open: parseFloat(k.open),
            high: parseFloat(k.high),
            low: parseFloat(k.low),
            close: parseFloat(k.close),
            volume: parseFloat(k.volume),
            isClosed: k.confirm,
          },
        });
      }
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
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const category = this.getCategory(marketType);
    const channel = `orderbook.50.${normalizedSymbol}`;
    const wsUrl = `${this.wsUrl}/v5/public/${category}`;

    this.createWebSocket(channel, wsUrl, channel, (data: unknown) => {
      const orderbook = data as {
        topic: string;
        type: string;
        data: {
          s: string;
          b: [string, string][];
          a: [string, string][];
          ts: number;
        };
      };

      callback({
        symbol,
        bids: orderbook.data.b.map(([price, quantity]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity),
        })),
        asks: orderbook.data.a.map(([price, quantity]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity),
        })),
        timestamp: orderbook.data.ts,
      });
    });
  }

  /**
   * Отписаться от всех WebSocket подписок
   */
  unsubscribeAll(): void {
    for (const [channel, ws] of this.wsConnections) {
      ws.close();
      this.wsConnections.delete(channel);
    }
  }

  /**
   * Получить время сервера
   */
  async getServerTime(): Promise<number> {
    const response = await this.request<{ result: { timeSecond: string } }>({
      method: 'GET',
      endpoint: '/v5/market/time',
    });
    return parseInt(response.result.timeSecond) * 1000;
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
    const timestamp = Date.now().toString();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-BAPI-API-KEY': this.config.apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': this.recvWindow.toString(),
    };

    let bodyString = '';
    let queryString = '';

    // Подготовить параметры
    if (options.method === 'GET' && options.params) {
      const filteredParams = Object.fromEntries(
        Object.entries(options.params).filter(([, v]) => v !== undefined),
      ) as Record<string, string | number | boolean>;
      const paramsArray: [string, string][] = Object.entries(filteredParams).map(([k, v]) => [
        k,
        String(v),
      ]);
      queryString = new URLSearchParams(paramsArray).toString();
    } else if (options.body) {
      bodyString = JSON.stringify(options.body);
    }

    // Если нужна подпись
    if (options.signed) {
      const paramStr =
        timestamp + this.config.apiKey + this.recvWindow + (queryString || bodyString);
      const signature = createHmacSignature(paramStr, this.config.apiSecret);
      headers['X-BAPI-SIGN'] = signature;
    }

    if (queryString) {
      url += `?${queryString}`;
    }

    // Выполнить запрос
    const response = await fetch(url, {
      method: options.method,
      headers,
      body: bodyString || undefined,
      signal: AbortSignal.timeout(this.config.timeout ?? 30000),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ retMsg: response.statusText }));
      throw new Error(`Bybit API error: ${(error as { retMsg: string }).retMsg}`);
    }

    const result = (await response.json()) as { retCode: number; retMsg: string } & T;

    if (result.retCode !== 0) {
      throw new Error(`Bybit API error: ${result.retMsg}`);
    }

    return result;
  }

  /**
   * Создать подпись (не используется напрямую, используется в executeRequest)
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
    // Bybit использует те же интервалы
    return interval;
  }

  /**
   * Получить категорию для Bybit API
   */
  private getCategory(marketType?: MarketType): string {
    const market = marketType ?? this.config.defaultMarketType ?? 'spot';
    return market === 'futures' ? 'linear' : 'spot';
  }

  /**
   * Нормализовать тип ордера для Bybit
   */
  private normalizeOrderType(type: string): string {
    const typeMap: Record<string, string> = {
      MARKET: 'Market',
      LIMIT: 'Limit',
      STOP_LOSS: 'Market',
      STOP_LOSS_LIMIT: 'Limit',
      TAKE_PROFIT: 'Market',
      TAKE_PROFIT_LIMIT: 'Limit',
    };
    return typeMap[type] ?? 'Market';
  }

  /**
   * Денормализовать тип ордера из Bybit
   */
  private denormalizeOrderType(type: string): string {
    const typeMap: Record<string, string> = {
      Market: 'MARKET',
      Limit: 'LIMIT',
    };
    return typeMap[type] ?? 'MARKET';
  }

  /**
   * Нормализовать статус ордера
   */
  private normalizeOrderStatus(status: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      New: 'NEW',
      PartiallyFilled: 'PARTIALLY_FILLED',
      Filled: 'FILLED',
      Cancelled: 'CANCELED',
      Rejected: 'REJECTED',
      Expired: 'EXPIRED',
    };
    return statusMap[status] ?? 'NEW';
  }

  /**
   * Создать WebSocket соединение
   */
  private createWebSocket(
    channel: string,
    url: string,
    topic: string,
    callback: WebSocketCallback<unknown>,
  ): void {
    // Если уже есть соединение для этого канала, не создавать новое
    if (this.wsConnections.has(channel)) {
      return;
    }

    const ws = new WebSocket(url);

    ws.on('open', () => {
      // Подписаться на канал
      ws.send(
        JSON.stringify({
          op: 'subscribe',
          args: [topic],
        }),
      );

      if (this.config.enableLogging) {
        this.log('WEBSOCKET', `Connected and subscribed to ${channel}`);
      }
    });

    ws.on('message', (data: Buffer) => {
      try {
        const parsed = JSON.parse(data.toString()) as unknown;
        const message = parsed as { op?: string; topic?: string };

        // Игнорировать служебные сообщения
        if (message.op === 'subscribe' || message.op === 'ping') {
          return;
        }

        // Обработать сообщение с данными
        if (message.topic) {
          callback(parsed);
        }
      } catch (error) {
        if (this.config.enableLogging) {
          this.log('WEBSOCKET_ERROR', `Failed to parse message from ${channel}`, error);
        }
      }
    });

    ws.on('error', (error: Error) => {
      if (this.config.enableLogging) {
        this.log('WEBSOCKET_ERROR', `Error on ${channel}`, error);
      }
    });

    ws.on('close', () => {
      if (this.config.enableLogging) {
        this.log('WEBSOCKET', `Disconnected from ${channel}`);
      }
      this.wsConnections.delete(channel);
    });

    this.wsConnections.set(channel, ws);
  }

  /**
   * Получить лимит запросов в минуту
   */
  protected override getRequestsPerMinute(): number {
    return 600;
  }

  /**
   * Получить лимит ордеров в секунду
   */
  protected override getOrdersPerSecond(): number {
    return 10;
  }
}
