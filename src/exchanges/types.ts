/**
 * Exchange Module Types
 *
 * Типы и интерфейсы для работы с криптовалютными биржами
 */

/**
 * Тип ордера
 */
export type OrderType =
  | 'MARKET'
  | 'LIMIT'
  | 'STOP_LOSS'
  | 'STOP_LOSS_LIMIT'
  | 'TAKE_PROFIT'
  | 'TAKE_PROFIT_LIMIT';

/**
 * Сторона ордера
 */
export type OrderSide = 'BUY' | 'SELL';

/**
 * Статус ордера
 */
export type OrderStatus =
  | 'NEW'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELED'
  | 'REJECTED'
  | 'EXPIRED';

/**
 * Тип времени действия ордера
 */
export type TimeInForce = 'GTC' | 'IOC' | 'FOK';

/**
 * Интервал свечей
 */
export type CandleInterval =
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '6h'
  | '8h'
  | '12h'
  | '1d'
  | '3d'
  | '1w'
  | '1M';

/**
 * Тип рынка
 */
export type MarketType = 'spot' | 'futures' | 'margin';

/**
 * OHLCV свеча
 */
export interface Candle {
  /** Временная метка открытия свечи */
  timestamp: number;
  /** Цена открытия */
  open: number;
  /** Максимальная цена */
  high: number;
  /** Минимальная цена */
  low: number;
  /** Цена закрытия */
  close: number;
  /** Объем торгов */
  volume: number;
  /** Закрыта ли свеча */
  isClosed?: boolean;
}

/**
 * Уровень в стакане заявок
 */
export interface OrderBookLevel {
  /** Цена */
  price: number;
  /** Количество */
  quantity: number;
}

/**
 * Стакан заявок (Order Book)
 */
export interface OrderBook {
  /** Торговая пара */
  symbol: string;
  /** Временная метка */
  timestamp: number;
  /** Заявки на покупку (отсортированы по убыванию цены) */
  bids: OrderBookLevel[];
  /** Заявки на продажу (отсортированы по возрастанию цены) */
  asks: OrderBookLevel[];
}

/**
 * Недавняя сделка
 */
export interface Trade {
  /** ID сделки */
  id: string;
  /** Торговая пара */
  symbol: string;
  /** Цена */
  price: number;
  /** Количество */
  quantity: number;
  /** Временная метка */
  timestamp: number;
  /** Сторона сделки */
  side: OrderSide;
  /** Была ли сделка инициатором покупатель */
  isBuyerMaker: boolean;
}

/**
 * Тикер (текущая цена)
 */
export interface Ticker {
  /** Торговая пара */
  symbol: string;
  /** Временная метка */
  timestamp: number;
  /** Последняя цена */
  lastPrice: number;
  /** Лучшая цена покупки */
  bidPrice: number;
  /** Лучшая цена продажи */
  askPrice: number;
  /** Объем торгов за 24 часа */
  volume24h: number;
  /** Изменение цены за 24 часа (%) */
  priceChange24h: number;
  /** Максимальная цена за 24 часа */
  high24h: number;
  /** Минимальная цена за 24 часа */
  low24h: number;
}

/**
 * Запрос на создание ордера
 */
export interface OrderRequest {
  /** Торговая пара */
  symbol: string;
  /** Сторона ордера */
  side: OrderSide;
  /** Тип ордера */
  type: OrderType;
  /** Количество */
  quantity: number;
  /** Цена (для лимитных ордеров) */
  price?: number;
  /** Стоп-цена (для стоп-ордеров) */
  stopPrice?: number;
  /** Время действия ордера */
  timeInForce?: TimeInForce;
  /** Тип рынка */
  marketType?: MarketType;
  /** Дополнительные параметры */
  params?: Record<string, unknown>;
}

/**
 * Ордер
 */
export interface Order {
  /** ID ордера */
  id: string;
  /** Биржа */
  exchange: string;
  /** Торговая пара */
  symbol: string;
  /** Сторона ордера */
  side: OrderSide;
  /** Тип ордера */
  type: OrderType;
  /** Статус ордера */
  status: OrderStatus;
  /** Цена */
  price: number;
  /** Средняя цена исполнения */
  avgPrice?: number;
  /** Количество */
  quantity: number;
  /** Исполненное количество */
  executedQuantity: number;
  /** Время создания */
  createdAt: number;
  /** Время обновления */
  updatedAt: number;
  /** Тип рынка */
  marketType: MarketType;
}

/**
 * Баланс актива
 */
export interface Balance {
  /** Актив (валюта) */
  asset: string;
  /** Свободный баланс */
  free: number;
  /** Заблокированный баланс */
  locked: number;
  /** Общий баланс */
  total: number;
}

/**
 * Конфигурация подключения к бирже
 */
export interface ExchangeConfig {
  /** Название биржи */
  name: string;
  /** API ключ */
  apiKey: string;
  /** Секретный ключ */
  apiSecret: string;
  /** Тип рынка по умолчанию */
  defaultMarketType?: MarketType;
  /** Включить testnet */
  testnet?: boolean;
  /** Таймаут запросов (мс) */
  timeout?: number;
  /** Максимальное количество попыток */
  maxRetries?: number;
  /** Задержка между попытками (мс) */
  retryDelay?: number;
  /** Включить логирование */
  enableLogging?: boolean;
}

/**
 * Опции для получения свечей
 */
export interface GetCandlesOptions {
  /** Временная метка начала */
  startTime?: number;
  /** Временная метка окончания */
  endTime?: number;
  /** Тип рынка */
  marketType?: MarketType;
}

/**
 * Опции для получения стакана заявок
 */
export interface GetOrderBookOptions {
  /** Тип рынка */
  marketType?: MarketType;
}

/**
 * Опции для получения недавних сделок
 */
export interface GetTradesOptions {
  /** Количество сделок */
  limit?: number;
  /** Тип рынка */
  marketType?: MarketType;
}

/**
 * Опции для получения тикера
 */
export interface GetTickerOptions {
  /** Тип рынка */
  marketType?: MarketType;
}

/**
 * Callback для WebSocket подписки
 */
export type WebSocketCallback<T = unknown> = (data: T) => void;

/**
 * WebSocket обновление трейда
 */
export interface WebSocketTradeUpdate {
  /** Торговая пара */
  symbol: string;
  /** Цена */
  price: number;
  /** Количество */
  quantity: number;
  /** Временная метка */
  timestamp: number;
  /** Сторона сделки */
  side: OrderSide;
}

/**
 * WebSocket обновление тикера
 */
export interface WebSocketTickerUpdate {
  /** Торговая пара */
  symbol: string;
  /** Последняя цена */
  lastPrice: number;
  /** Объем торгов */
  volume: number;
  /** Временная метка */
  timestamp: number;
}

/**
 * WebSocket обновление свечи
 */
export interface WebSocketCandleUpdate {
  /** Торговая пара */
  symbol: string;
  /** Интервал */
  interval: CandleInterval;
  /** Свеча */
  candle: Candle;
}

/**
 * WebSocket обновление стакана заявок
 */
export interface WebSocketOrderBookUpdate {
  /** Торговая пара */
  symbol: string;
  /** Обновленные биды */
  bids: OrderBookLevel[];
  /** Обновленные аски */
  asks: OrderBookLevel[];
  /** Временная метка */
  timestamp: number;
}

/**
 * Информация о лимитах биржи
 */
export interface ExchangeLimits {
  /** Название биржи */
  exchange: string;
  /** Лимит запросов в минуту */
  requestsPerMinute: number;
  /** Лимит ордеров в секунду */
  ordersPerSecond: number;
  /** Текущее количество запросов */
  currentRequests: number;
  /** Время до сброса лимита */
  resetTime: number;
}

/**
 * Интерфейс биржи
 */
export interface IExchange {
  /** Название биржи */
  readonly name: string;

  /** Конфигурация */
  readonly config: ExchangeConfig;

  /**
   * Получить свечи (OHLCV)
   * @param symbol Торговая пара (например, 'BTCUSDT')
   * @param interval Интервал свечей
   * @param limit Количество свечей
   * @param options Дополнительные опции
   */
  getCandles(
    symbol: string,
    interval: CandleInterval,
    limit: number,
    options?: GetCandlesOptions,
  ): Promise<Candle[]>;

  /**
   * Получить стакан заявок (Order Book)
   * @param symbol Торговая пара
   * @param depth Глубина стакана
   * @param options Дополнительные опции
   */
  getOrderBook(symbol: string, depth: number, options?: GetOrderBookOptions): Promise<OrderBook>;

  /**
   * Получить недавние сделки
   * @param symbol Торговая пара
   * @param options Дополнительные опции
   */
  getTrades(symbol: string, options?: GetTradesOptions): Promise<Trade[]>;

  /**
   * Получить тикер (текущая цена)
   * @param symbol Торговая пара
   * @param options Дополнительные опции
   */
  getTicker(symbol: string, options?: GetTickerOptions): Promise<Ticker>;

  /**
   * Создать ордер
   * @param order Параметры ордера
   */
  placeOrder(order: OrderRequest): Promise<Order>;

  /**
   * Отменить ордер
   * @param orderId ID ордера
   * @param symbol Торговая пара
   * @param marketType Тип рынка
   */
  cancelOrder(orderId: string, symbol: string, marketType?: MarketType): Promise<void>;

  /**
   * Получить информацию об ордере
   * @param orderId ID ордера
   * @param symbol Торговая пара
   * @param marketType Тип рынка
   */
  getOrder(orderId: string, symbol: string, marketType?: MarketType): Promise<Order>;

  /**
   * Получить открытые ордера
   * @param symbol Торговая пара (опционально)
   * @param marketType Тип рынка
   */
  getOpenOrders(symbol?: string, marketType?: MarketType): Promise<Order[]>;

  /**
   * Получить баланс
   * @param marketType Тип рынка
   */
  getBalance(marketType?: MarketType): Promise<Balance[]>;

  /**
   * Подписаться на обновления трейдов через WebSocket
   * @param symbol Торговая пара
   * @param callback Функция обратного вызова
   * @param marketType Тип рынка
   */
  subscribeToTrades(
    symbol: string,
    callback: WebSocketCallback<WebSocketTradeUpdate>,
    marketType?: MarketType,
  ): void;

  /**
   * Подписаться на обновления тикера через WebSocket
   * @param symbol Торговая пара
   * @param callback Функция обратного вызова
   * @param marketType Тип рынка
   */
  subscribeToTicker(
    symbol: string,
    callback: WebSocketCallback<WebSocketTickerUpdate>,
    marketType?: MarketType,
  ): void;

  /**
   * Подписаться на обновления свечей через WebSocket
   * @param symbol Торговая пара
   * @param interval Интервал свечей
   * @param callback Функция обратного вызова
   * @param marketType Тип рынка
   */
  subscribeToCandles(
    symbol: string,
    interval: CandleInterval,
    callback: WebSocketCallback<WebSocketCandleUpdate>,
    marketType?: MarketType,
  ): void;

  /**
   * Подписаться на обновления стакана заявок через WebSocket
   * @param symbol Торговая пара
   * @param callback Функция обратного вызова
   * @param marketType Тип рынка
   */
  subscribeToOrderBook(
    symbol: string,
    callback: WebSocketCallback<WebSocketOrderBookUpdate>,
    marketType?: MarketType,
  ): void;

  /**
   * Отписаться от всех WebSocket подписок
   */
  unsubscribeAll(): void;

  /**
   * Проверить соединение с биржей
   */
  ping(): Promise<boolean>;

  /**
   * Получить время сервера
   */
  getServerTime(): Promise<number>;

  /**
   * Получить информацию о лимитах
   */
  getLimits(): ExchangeLimits;
}
