/**
 * Dashboard WebSocket Server
 * Real-time обновления для клиентов
 */

/* eslint-disable no-console */
import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { WebSocketMessage } from './types.js';
import { storage } from './storage.js';

interface SignalFilter {
  strategy?: string[];
  action?: string[];
  symbol?: string[];
  minConfidence?: number;
}

export class DashboardWebSocket {
  private wss: WebSocketServer;
  private signalsWss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private signalsClients: Map<WebSocket, SignalFilter> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private priceSimulationInterval: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.signalsWss = new WebSocketServer({ server, path: '/ws/signals' });
    this.setupWebSocket();
    this.setupSignalsWebSocket();
    this.startUpdateLoop();
    this.startPriceSimulation();
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('🔌 WebSocket client connected');
      this.clients.add(ws);

      // Отправляем начальные данные при подключении
      this.sendInitialData(ws);

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as { type?: string };
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }

  private setupSignalsWebSocket(): void {
    this.signalsWss.on('connection', (ws: WebSocket) => {
      console.log('🔌 Signals WebSocket client connected');

      // Инициализируем с пустыми фильтрами
      this.signalsClients.set(ws, {});

      // Отправляем последние сигналы
      this.sendToClient(ws, {
        type: 'signal',
        data: { signals: storage.getSignals(20) },
        timestamp: new Date().toISOString(),
      });

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as {
            type?: string;
            filters?: SignalFilter;
          };
          this.handleSignalsMessage(ws, message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('🔌 Signals WebSocket client disconnected');
        this.signalsClients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('Signals WebSocket error:', error);
        this.signalsClients.delete(ws);
      });
    });
  }

  private handleSignalsMessage(
    ws: WebSocket,
    message: { type?: string; filters?: SignalFilter },
  ): void {
    console.log('📨 Received signals message:', message);

    switch (message.type) {
      case 'setFilters':
        if (message.filters) {
          this.signalsClients.set(ws, message.filters);
          console.log('🔧 Updated filters for client:', message.filters);

          // Отправляем подтверждение
          this.sendToClient(ws, {
            type: 'filtersUpdated',
            data: { filters: message.filters },
            timestamp: new Date().toISOString(),
          });
        }
        break;

      case 'ping':
        this.sendToClient(ws, {
          type: 'pong',
          data: {},
          timestamp: new Date().toISOString(),
        });
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private sendInitialData(ws: WebSocket): void {
    // Отправляем метрики
    this.sendToClient(ws, {
      type: 'metrics',
      data: storage.getMetrics(),
      timestamp: new Date().toISOString(),
    });

    // Отправляем позиции
    this.sendToClient(ws, {
      type: 'position',
      data: { positions: storage.getPositions() },
      timestamp: new Date().toISOString(),
    });

    // Отправляем последние сигналы
    this.sendToClient(ws, {
      type: 'signal',
      data: { signals: storage.getSignals(10) },
      timestamp: new Date().toISOString(),
    });
  }

  private handleMessage(ws: WebSocket, message: { type?: string }): void {
    console.log('📨 Received message:', message);

    switch (message.type) {
      case 'ping':
        this.sendToClient(ws, {
          type: 'pong',
          data: {},
          timestamp: new Date().toISOString(),
        });
        break;

      case 'subscribe':
        // В будущем можно добавить подписки на конкретные каналы
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private sendToClient(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  public broadcast(message: WebSocketMessage): void {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  private startUpdateLoop(): void {
    // Отправляем обновления метрик каждые 5 секунд
    this.updateInterval = setInterval(() => {
      if (this.clients.size > 0) {
        this.broadcast({
          type: 'metrics',
          data: storage.getMetrics(),
          timestamp: new Date().toISOString(),
        });
      }
    }, 5000);
  }

  private startPriceSimulation(): void {
    // Симуляция изменения цен для демо
    this.priceSimulationInterval = setInterval(() => {
      const positions = storage.getPositions();

      positions.forEach((position) => {
        // Случайное изменение цены ±0.5%
        const priceChange = 1 + (Math.random() - 0.5) * 0.01;
        const newPrice = position.currentPrice * priceChange;

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

        // Отправляем обновление цены
        if (this.clients.size > 0) {
          this.broadcast({
            type: 'price',
            data: {
              symbol: position.symbol,
              price: newPrice,
              positionId: position.id,
            },
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Обновляем equity после изменения цен
      if (positions.length > 0) {
        storage.addEquityPoint();
      }
    }, 3000);
  }

  // Публичные методы для отправки уведомлений
  public broadcastSignal(signal: unknown): void {
    const message: WebSocketMessage = {
      type: 'signal',
      data: signal,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to main WebSocket clients
    this.broadcast(message);

    // Broadcast to signals WebSocket clients with filtering
    this.broadcastToSignalsClients(message);
  }

  private broadcastToSignalsClients(message: WebSocketMessage): void {
    const signalData = (message.data as { type?: string; data?: unknown }).data || message.data;

    this.signalsClients.forEach((filter, client) => {
      if (client.readyState === WebSocket.OPEN) {
        // Применяем фильтры
        if (this.matchesFilter(signalData, filter)) {
          client.send(JSON.stringify(message));
        }
      }
    });
  }

  private matchesFilter(signal: unknown, filter: SignalFilter): boolean {
    const signalData = signal as {
      type?: string;
      action?: string;
      symbol?: string;
      confidence?: number;
      strength?: number;
    };

    // Если фильтры пусты, пропускаем все
    const hasFilters =
      (filter.strategy && filter.strategy.length > 0) ||
      (filter.action && filter.action.length > 0) ||
      (filter.symbol && filter.symbol.length > 0) ||
      filter.minConfidence !== undefined;

    if (!hasFilters) {
      return true;
    }

    // Проверяем каждый фильтр
    if (filter.strategy && filter.strategy.length > 0) {
      if (!signalData.type || !filter.strategy.includes(signalData.type)) {
        return false;
      }
    }

    if (filter.action && filter.action.length > 0) {
      if (!signalData.action || !filter.action.includes(signalData.action)) {
        return false;
      }
    }

    if (filter.symbol && filter.symbol.length > 0) {
      if (!signalData.symbol || !filter.symbol.includes(signalData.symbol)) {
        return false;
      }
    }

    if (filter.minConfidence !== undefined) {
      const confidence = signalData.confidence ?? signalData.strength ?? 0;
      if (confidence < filter.minConfidence) {
        return false;
      }
    }

    return true;
  }

  public broadcastPosition(position: unknown): void {
    this.broadcast({
      type: 'position',
      data: position,
      timestamp: new Date().toISOString(),
    });
  }

  public broadcastNews(news: unknown): void {
    this.broadcast({
      type: 'news',
      data: news,
      timestamp: new Date().toISOString(),
    });
  }

  public broadcastNotification(notification: unknown): void {
    this.broadcast({
      type: 'notification',
      data: notification,
      timestamp: new Date().toISOString(),
    });
  }

  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.priceSimulationInterval) {
      clearInterval(this.priceSimulationInterval);
    }
    this.wss.close();
    this.signalsWss.close();
  }
}
