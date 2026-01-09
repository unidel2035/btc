import { config } from 'dotenv';
import express, { type Request, type Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { DashboardService } from './services/DashboardService.js';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Веб-интерфейс Dashboard
 *
 * Provides:
 * - REST API endpoints for bot data
 * - WebSocket server for real-time updates
 * - Static file serving for frontend
 */
class DashboardServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private wss: WebSocketServer;
  private dashboardService: DashboardService;
  private clients: Set<WebSocket> = new Set();

  constructor(
    private port: number = Number(process.env.DASHBOARD_PORT) || 8080,
    private host: string = process.env.DASHBOARD_HOST || '0.0.0.0',
  ) {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.dashboardService = new DashboardService();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.startRealtimeUpdates();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Enable CORS
    this.app.use(cors());

    // Parse JSON bodies
    this.app.use(express.json());

    // Serve static files from public directory
    this.app.use(express.static(join(__dirname, 'public')));

    // Request logging
    this.app.use((req: Request, _res: Response, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup REST API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/api/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Dashboard overview
    this.app.get('/api/dashboard', (_req: Request, res: Response) => {
      const data = this.dashboardService.getDashboardOverview();
      res.json(data);
    });

    // Signals
    this.app.get('/api/signals', (req: Request, res: Response) => {
      const limit = parseInt(req.query.limit as string) || 50;
      const type = req.query.type as string | undefined;
      const signals = this.dashboardService.getSignals(limit, type);
      res.json(signals);
    });

    // Positions
    this.app.get('/api/positions', (_req: Request, res: Response) => {
      const positions = this.dashboardService.getPositions();
      res.json(positions);
    });

    this.app.get('/api/positions/history', (req: Request, res: Response) => {
      const limit = parseInt(req.query.limit as string) || 100;
      const history = this.dashboardService.getPositionHistory(limit);
      res.json(history);
    });

    this.app.post('/api/positions/:id/close', (req: Request, res: Response) => {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, message: 'Position ID is required' });
        return;
      }
      const result = this.dashboardService.closePosition(id);

      if (result.success) {
        res.json(result);
        // Broadcast update to all WebSocket clients
        this.broadcast({ type: 'position_closed', data: { id } });
      } else {
        res.status(400).json(result);
      }
    });

    this.app.post('/api/positions/:id/update', (req: Request, res: Response) => {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, message: 'Position ID is required' });
        return;
      }
      const { stopLoss, takeProfit } = req.body;
      const result = this.dashboardService.updatePosition(id, { stopLoss, takeProfit });

      if (result.success) {
        res.json(result);
        this.broadcast({ type: 'position_updated', data: result.data });
      } else {
        res.status(400).json(result);
      }
    });

    // News Feed
    this.app.get('/api/news', (req: Request, res: Response) => {
      const limit = parseInt(req.query.limit as string) || 50;
      const sentiment = req.query.sentiment as string | undefined;
      const news = this.dashboardService.getNews(limit, sentiment);
      res.json(news);
    });

    // Settings
    this.app.get('/api/settings', (_req: Request, res: Response) => {
      const settings = this.dashboardService.getSettings();
      res.json(settings);
    });

    this.app.post('/api/settings', (req: Request, res: Response) => {
      const result = this.dashboardService.updateSettings(req.body);
      if (result.success) {
        res.json(result);
        this.broadcast({ type: 'settings_updated', data: result.data });
      } else {
        res.status(400).json(result);
      }
    });

    // Analytics
    this.app.get('/api/analytics/performance', (req: Request, res: Response) => {
      const period = (req.query.period as string) || '7d';
      const data = this.dashboardService.getPerformanceMetrics(period);
      res.json(data);
    });

    this.app.get('/api/analytics/strategies', (_req: Request, res: Response) => {
      const data = this.dashboardService.getStrategyStats();
      res.json(data);
    });

    this.app.get('/api/analytics/trades', (req: Request, res: Response) => {
      const limit = parseInt(req.query.limit as string) || 100;
      const data = this.dashboardService.getTradeJournal(limit);
      res.json(data);
    });

    // Serve index.html for all other routes (SPA support)
    this.app.get('*', (_req: Request, res: Response) => {
      res.sendFile(join(__dirname, 'public', 'index.html'));
    });
  }

  /**
   * Setup WebSocket server for real-time updates
   */
  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('🔌 New WebSocket client connected');
      this.clients.add(ws);

      // Send initial data
      ws.send(
        JSON.stringify({
          type: 'connected',
          data: { message: 'Connected to dashboard WebSocket' },
        }),
      );

      ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Handle ping/pong for connection health
      ws.on('pong', () => {
        // Client is alive
      });
    });

    // Ping clients periodically to keep connections alive
    setInterval(() => {
      this.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      });
    }, 30000); // Every 30 seconds
  }

  /**
   * Broadcast message to all connected WebSocket clients
   */
  private broadcast(message: { type: string; data: unknown }): void {
    const payload = JSON.stringify(message);
    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  /**
   * Start real-time updates broadcast
   */
  private startRealtimeUpdates(): void {
    // Broadcast updates every 5 seconds
    setInterval(() => {
      if (this.clients.size > 0) {
        // Price updates
        const priceUpdate = this.dashboardService.getCurrentPrices();
        this.broadcast({ type: 'price_update', data: priceUpdate });

        // New signals (if any)
        const newSignals = this.dashboardService.getRecentSignals(5);
        if (newSignals.length > 0) {
          this.broadcast({ type: 'new_signals', data: newSignals });
        }

        // Position updates
        const positions = this.dashboardService.getPositions();
        this.broadcast({ type: 'positions_update', data: positions });
      }
    }, 5000);

    // Broadcast news updates every 30 seconds
    setInterval(() => {
      if (this.clients.size > 0) {
        const newNews = this.dashboardService.getRecentNews(10);
        if (newNews.length > 0) {
          this.broadcast({ type: 'new_news', data: newNews });
        }
      }
    }, 30000);
  }

  /**
   * Start the dashboard server
   */
  public start(): void {
    this.server.listen(this.port, this.host, () => {
      console.info('📊 Dashboard server started');
      console.info(
        `🌐 Web interface: http://${this.host === '0.0.0.0' ? 'localhost' : this.host}:${this.port}`,
      );
      console.info(
        `🔌 WebSocket server running on ws://${this.host === '0.0.0.0' ? 'localhost' : this.host}:${this.port}`,
      );
      console.info(`✅ Dashboard is ready`);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.stop();
    });

    process.on('SIGTERM', () => {
      this.stop();
    });
  }

  /**
   * Stop the dashboard server
   */
  public stop(): void {
    console.info('\n🛑 Shutting down dashboard server...');

    // Close all WebSocket connections
    this.clients.forEach((ws) => {
      ws.close();
    });
    this.clients.clear();

    // Close WebSocket server
    this.wss.close(() => {
      console.info('🔌 WebSocket server closed');
    });

    // Close HTTP server
    this.server.close(() => {
      console.info('📊 Dashboard server stopped');
      process.exit(0);
    });
  }
}

/**
 * Start dashboard server
 */
function startDashboard(): void {
  try {
    const server = new DashboardServer();
    server.start();
  } catch (error) {
    console.error('Failed to start dashboard:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startDashboard();
}

export { DashboardServer };
