/**
 * Real Data Provider
 * Получение реальных данных с криптовалютных бирж через ExchangeManager
 */

/* eslint-disable no-console */
import { ExchangeManager } from '../../exchanges/ExchangeManager.js';
import { MarketType } from '../../exchanges/types.js';
import { storage } from '../storage.js';
import type { DashboardWebSocket } from '../websocket.js';
import type { Position as DashboardPosition } from '../types.js';
import type { Position as ExchangePosition } from '../../exchanges/types.js';

export class RealDataProvider {
  private exchangeManager: ExchangeManager;
  private ws: DashboardWebSocket | null;
  private positionsInterval: NodeJS.Timeout | null = null;
  private pricesInterval: NodeJS.Timeout | null = null;
  private balanceInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isRunning = false;

  constructor(exchangeManager: ExchangeManager, ws?: DashboardWebSocket) {
    this.exchangeManager = exchangeManager;
    this.ws = ws || null;
  }

  async start(): Promise<void> {
    console.log('🔗 Starting real data provider...');

    try {
      // Инициализация бирж
      await this.exchangeManager.initialize();

      // Загрузка начальных данных
      await this.loadInitialData();

      // Запуск периодических обновлений
      this.startPositionsUpdates();
      this.startPriceUpdates();
      this.startBalanceUpdates();

      this.isRunning = true;
      this.reconnectAttempts = 0; // Сброс счетчика при успешном старте

      console.log('✅ Real data provider started');
    } catch (error) {
      console.error('❌ Failed to start real data provider:', error);
      await this.handleStartupError(error);
    }
  }

  private async handleStartupError(error: unknown): Promise<void> {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `🔄 Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`,
      );

      await new Promise((resolve) => setTimeout(resolve, 5000 * this.reconnectAttempts)); // Exponential backoff

      try {
        await this.start();
      } catch (retryError) {
        console.error('Failed to reconnect:', retryError);
      }
    } else {
      console.error('❌ Max reconnect attempts reached. Real data provider failed to start.');
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to initialize real data provider after ${this.maxReconnectAttempts} attempts: ${message}`,
      );
    }
  }

  private async loadInitialData(): Promise<void> {
    console.log('📊 Loading initial data from exchanges...');

    try {
      // Загрузить открытые позиции
      const positions = await this.fetchAllPositions();
      storage.clearPositions();
      positions.forEach((pos) => storage.addPosition(pos));

      // Загрузить баланс
      const balance = await this.fetchTotalBalance();
      storage.setBalance(balance);

      // Добавить начальную точку equity
      storage.addEquityPoint();

      console.log(`✅ Loaded ${positions.length} positions, balance: $${balance.toFixed(2)}`);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      throw error;
    }
  }

  private async fetchAllPositions(): Promise<Omit<DashboardPosition, 'id' | 'openedAt' | 'updatedAt'>[]> {
    const allPositions: Omit<DashboardPosition, 'id' | 'openedAt' | 'updatedAt'>[] = [];

    // Получить список всех доступных бирж
    const exchanges = this.exchangeManager.listExchanges();

    for (const exchangeInfo of exchanges) {
      if (!exchangeInfo.initialized) {
        continue;
      }

      try {
        const exchange = this.exchangeManager.getExchange(
          exchangeInfo.name as 'binance' | 'bybit' | 'okx',
          exchangeInfo.marketType,
        );

        // Проверяем, поддерживает ли биржа фьючерсы и метод getPositions
        if (exchangeInfo.marketType === MarketType.FUTURES && exchange.getPositions) {
          const positions = await exchange.getPositions();

          for (const pos of positions) {
            allPositions.push(this.mapExchangePositionToDashboard(pos, exchangeInfo.name));
          }
        }
      } catch (error) {
        console.error(`Failed to fetch positions from ${exchangeInfo.name}:`, error);
        // Продолжаем работу с другими биржами
      }
    }

    return allPositions;
  }

  private mapExchangePositionToDashboard(
    pos: ExchangePosition,
    _exchangeName: string,
  ): Omit<DashboardPosition, 'id' | 'openedAt' | 'updatedAt'> {
    const positionValue = Math.abs(pos.quantity) * pos.entryPrice;
    const pnlPercent = positionValue > 0 ? (pos.unrealizedPnl / positionValue) * 100 : 0;

    return {
      symbol: pos.symbol,
      side: pos.side,
      size: Math.abs(pos.quantity),
      entryPrice: pos.entryPrice,
      currentPrice: pos.markPrice,
      stopLoss: 0, // Не все биржи предоставляют эту информацию
      takeProfit: 0, // Не все биржи предоставляют эту информацию
      pnl: pos.unrealizedPnl,
      pnlPercent,
    };
  }

  private async fetchTotalBalance(): Promise<number> {
    let totalBalance = 0;

    const exchanges = this.exchangeManager.listExchanges();

    for (const exchangeInfo of exchanges) {
      if (!exchangeInfo.initialized) {
        continue;
      }

      try {
        const exchange = this.exchangeManager.getExchange(
          exchangeInfo.name as 'binance' | 'bybit' | 'okx',
          exchangeInfo.marketType,
        );

        const balances = await exchange.getBalance();

        // Суммируем балансы USDT и BUSD (стейблкоины)
        for (const balance of balances) {
          if (balance.asset === 'USDT' || balance.asset === 'BUSD' || balance.asset === 'USDC') {
            totalBalance += balance.total;
          }
        }
      } catch (error) {
        console.error(`Failed to fetch balance from ${exchangeInfo.name}:`, error);
        // Продолжаем работу с другими биржами
      }
    }

    return totalBalance;
  }

  private startPositionsUpdates(): void {
    const interval = parseInt(process.env.POSITIONS_UPDATE_INTERVAL || '5000', 10);

    this.positionsInterval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        const positions = await this.fetchAllPositions();

        // Обновить storage
        storage.clearPositions();
        positions.forEach((pos) => storage.addPosition(pos));

        // Отправить через WebSocket
        if (this.ws && positions.length > 0) {
          this.ws.broadcastPosition({ positions: storage.getPositions() });
        }
      } catch (error) {
        console.error('Error updating positions:', error);
      }
    }, interval);

    console.log(`📊 Positions update interval: ${interval}ms`);
  }

  private startPriceUpdates(): void {
    const interval = parseInt(process.env.PRICE_UPDATE_INTERVAL || '1000', 10);

    this.pricesInterval = setInterval(async () => {
      if (!this.isRunning) return;

      const positions = storage.getPositions();

      for (const position of positions) {
        try {
          // Определяем биржу из ID позиции (если он содержит префикс биржи)
          // Пока используем дефолтную биржу или первую доступную
          const exchanges = this.exchangeManager.listExchanges();
          const futuresExchange = exchanges.find(
            (ex) => ex.initialized && ex.marketType === MarketType.FUTURES,
          );

          if (!futuresExchange) {
            continue;
          }

          const exchange = this.exchangeManager.getExchange(
            futuresExchange.name as 'binance' | 'bybit' | 'okx',
            MarketType.FUTURES,
          );

          const ticker = await exchange.getTicker(position.symbol);

          // Обновить текущую цену
          const newPrice = ticker.lastPrice;
          const pnl =
            position.side === 'LONG'
              ? (newPrice - position.entryPrice) * position.size
              : (position.entryPrice - newPrice) * position.size;

          const pnlPercent = (pnl / (position.entryPrice * position.size)) * 100;

          storage.updatePosition(position.id, {
            currentPrice: newPrice,
            pnl,
            pnlPercent,
          });

          if (this.ws) {
            this.ws.broadcast({
              type: 'price',
              data: {
                symbol: position.symbol,
                price: newPrice,
                positionId: position.id,
              },
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          // Игнорируем ошибки для отдельных позиций
          // console.error(`Failed to update price for ${position.symbol}:`, error);
        }
      }

      // Обновляем equity после изменения цен
      if (positions.length > 0) {
        storage.addEquityPoint();
      }
    }, interval);

    console.log(`💹 Price update interval: ${interval}ms`);
  }

  private startBalanceUpdates(): void {
    const interval = parseInt(process.env.BALANCE_UPDATE_INTERVAL || '30000', 10);

    this.balanceInterval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        const balance = await this.fetchTotalBalance();
        storage.setBalance(balance);

        if (this.ws) {
          this.ws.broadcast({
            type: 'metrics',
            data: storage.getMetrics(),
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Error updating balance:', error);
      }
    }, interval);

    console.log(`💰 Balance update interval: ${interval}ms`);
  }

  stop(): void {
    console.log('⏹️  Stopping real data provider...');

    this.isRunning = false;

    if (this.positionsInterval) {
      clearInterval(this.positionsInterval);
      this.positionsInterval = null;
    }

    if (this.pricesInterval) {
      clearInterval(this.pricesInterval);
      this.pricesInterval = null;
    }

    if (this.balanceInterval) {
      clearInterval(this.balanceInterval);
      this.balanceInterval = null;
    }

    // Отключаем биржи
    this.exchangeManager.disconnect().catch((error) => {
      console.error('Error disconnecting exchanges:', error);
    });

    console.log('✅ Real data provider stopped');
  }
}
