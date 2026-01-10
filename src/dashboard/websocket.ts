/**
 * Dashboard WebSocket Server
 * Real-time обновления для клиентов
 */

/* eslint-disable no-console */
import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { WebSocketMessage } from './types.js';
import { storage } from './storage.js';

interface ClientSubscription {
  ws: WebSocket;
  subscriptions: Set<string>; // Set of subscription keys like "chart:binance:BTC/USDT:1h"
}

interface DashboardServerInterface {
  getChartDataProvider(): any;
}

export class DashboardWebSocket {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private clientSubscriptions: Map<WebSocket, ClientSubscription> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private priceSimulationInterval: NodeJS.Timeout | null = null;
  private dashboardServer: DashboardServerInterface | null = null;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupWebSocket();
    this.startUpdateLoop();
    this.startPriceSimulation();
  }

  setDashboardServer(dashboardServer: DashboardServerInterface): void {
    this.dashboardServer = dashboardServer;
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('🔌 WebSocket client connected');
      this.clients.add(ws);
      this.clientSubscriptions.set(ws, { ws, subscriptions: new Set() });

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
        this.clientSubscriptions.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
        this.clientSubscriptions.delete(ws);
      });
    });
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

  private handleMessage(ws: WebSocket, message: { type?: string; channel?: string; exchange?: string; symbol?: string; timeframe?: string }): void {
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
        if (message.channel === 'chart' && message.exchange && message.symbol && message.timeframe) {
          const subscriptionKey = `chart:${message.exchange}:${message.symbol}:${message.timeframe}`;
          const clientSub = this.clientSubscriptions.get(ws);
          if (clientSub) {
            clientSub.subscriptions.add(subscriptionKey);
            console.log(`Client subscribed to ${subscriptionKey}`);

            // Trigger subscription on ChartDataProvider
            const chartDataProvider = this.dashboardServer?.getChartDataProvider();
            if (chartDataProvider) {
              chartDataProvider.subscribeToChart(message.exchange, message.symbol, message.timeframe);
            }

            this.sendToClient(ws, {
              type: 'subscribed',
              data: { channel: 'chart', exchange: message.exchange, symbol: message.symbol, timeframe: message.timeframe },
              timestamp: new Date().toISOString(),
            });
          }
        }
        break;

      case 'unsubscribe':
        if (message.channel === 'chart' && message.exchange && message.symbol && message.timeframe) {
          const subscriptionKey = `chart:${message.exchange}:${message.symbol}:${message.timeframe}`;
          const clientSub = this.clientSubscriptions.get(ws);
          if (clientSub) {
            clientSub.subscriptions.delete(subscriptionKey);
            console.log(`Client unsubscribed from ${subscriptionKey}`);
            this.sendToClient(ws, {
              type: 'unsubscribed',
              data: { channel: 'chart', exchange: message.exchange, symbol: message.symbol, timeframe: message.timeframe },
              timestamp: new Date().toISOString(),
            });
          }
        }
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
    this.broadcast({
      type: 'signal',
      data: signal,
      timestamp: new Date().toISOString(),
    });
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

  public broadcastChartCandle(candle: { exchange: string; symbol: string; timeframe: string; [key: string]: unknown }): void {
    const subscriptionKey = `chart:${candle.exchange}:${candle.symbol}:${candle.timeframe}`;
    const message = JSON.stringify({
      type: 'chart_candle',
      data: candle,
      timestamp: new Date().toISOString(),
    });

    // Send only to subscribed clients
    this.clientSubscriptions.forEach((clientSub) => {
      if (clientSub.subscriptions.has(subscriptionKey) && clientSub.ws.readyState === WebSocket.OPEN) {
        clientSub.ws.send(message);
      }
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
  }
}
