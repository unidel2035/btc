/* eslint-disable no-console */
import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupRoutes } from './routes.js';
import { DashboardWebSocket } from './websocket.js';
import { DemoDataGenerator } from './demo.js';
import { IntegramClient } from '../database/integram/IntegramClient.js';
import { IntegramStorage } from './storage/IntegramStorage.js';
import { storage as memoryStorage } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config();

/**
 * Веб-интерфейс Dashboard
 * Express сервер + WebSocket для real-time обновлений
 */
class DashboardServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private ws: DashboardWebSocket | null = null;
  private demoGenerator: DemoDataGenerator | null = null;
  private port: number;
  private host: string;

  constructor() {
    this.port = parseInt(process.env.DASHBOARD_PORT || '8080');
    this.host = process.env.DASHBOARD_HOST || '0.0.0.0';
    this.app = express();
    this.server = createServer(this.app);
  }

  private setupMiddleware(): void {
    // CORS
    this.app.use(
      cors({
        origin: '*',
        credentials: true,
      }),
    );

    // Body parser
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Логирование запросов
    this.app.use((req, _res, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });

    // Статические файлы для фронтенда
    const publicPath = path.join(__dirname, 'public');
    this.app.use(express.static(publicPath));
  }

  private setupRoutes(): void {
    const router = express.Router();
    setupRoutes(router);
    this.app.use(router);

    // Fallback для SPA - middleware вместо route
    this.app.use((_req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
  }

  private setupWebSocket(): void {
    this.ws = new DashboardWebSocket(this.server);
  }

  private setupDemoData(): void {
    const enableDemo = process.env.DASHBOARD_DEMO !== 'false';
    if (enableDemo) {
      this.demoGenerator = new DemoDataGenerator(this.ws || undefined);
      this.demoGenerator.start();
    }
  }

  private async setupStorage(): Promise<void> {
    const storageType = process.env.DASHBOARD_STORAGE || 'memory';

    if (storageType === 'integram') {
      console.log('🗄️  Initializing Integram storage...');

      const integramClient = new IntegramClient({
        serverURL: process.env.INTEGRAM_URL || 'https://интеграм.рф',
        database: process.env.INTEGRAM_DATABASE || 'bts',
        login: process.env.INTEGRAM_LOGIN || 'd',
        password: process.env.INTEGRAM_PASSWORD || 'd',
      });

      const integramStorage = new IntegramStorage(integramClient);
      await integramStorage.initialize();

      // Заменяем глобальный storage (для совместимости с существующими роутами)
      // Примечание: это не идеальное решение, но работает для текущей архитектуры
      Object.assign(memoryStorage, integramStorage);

      console.log('✅ Integram storage initialized');
    } else {
      console.log('💾 Using in-memory storage');
    }
  }

  public async start(): Promise<void> {
    try {
      // Инициализация storage должна быть до setupRoutes
      await this.setupStorage();

      this.setupMiddleware();
      this.setupRoutes();
      this.setupWebSocket();

      this.server.listen(this.port, this.host, () => {
        console.log('');
        console.log('╔════════════════════════════════════════════════╗');
        console.log('║      📊 BTC Trading Bot Dashboard             ║');
        console.log('╚════════════════════════════════════════════════╝');
        console.log('');
        console.log(`🌐 Server:     http://${this.host}:${this.port}`);
        console.log(`🔌 WebSocket:  ws://${this.host}:${this.port}/ws`);
        console.log('');
        console.log('📡 API Endpoints:');
        console.log(`   GET  /api/metrics         - Dashboard metrics`);
        console.log(`   GET  /api/positions       - Open positions`);
        console.log(`   GET  /api/signals         - Trading signals`);
        console.log(`   GET  /api/news            - News feed`);
        console.log(`   GET  /api/equity          - Equity history`);
        console.log(`   GET  /api/history         - Trade history`);
        console.log(`   GET  /api/performance     - Performance stats`);
        console.log(`   GET  /api/strategies      - Strategy configs`);
        console.log(`   GET  /api/settings/risk   - Risk settings`);
        console.log('');

        // Запускаем demo data generator
        this.setupDemoData();

        console.log('✅ Dashboard server started successfully');
        console.log('');
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.stop());
      process.on('SIGINT', () => this.stop());
    } catch (error) {
      console.error('❌ Failed to start dashboard:', error);
      process.exit(1);
    }
  }

  public stop(): void {
    console.log('');
    console.log('🛑 Shutting down dashboard server...');

    if (this.demoGenerator) {
      this.demoGenerator.stop();
    }

    if (this.ws) {
      this.ws.stop();
    }

    this.server.close(() => {
      console.log('✅ Dashboard server stopped');
      process.exit(0);
    });
  }
}

// Запуск сервера
const dashboard = new DashboardServer();
void dashboard.start();
