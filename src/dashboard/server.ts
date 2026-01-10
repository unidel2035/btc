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
import { RealDataProvider } from './providers/RealDataProvider.js';
import { ExchangeManager } from '../exchanges/ExchangeManager.js';
import { MarketType } from '../exchanges/types.js';

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
  private realDataProvider: RealDataProvider | null = null;
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

  private async setupDataProvider(): Promise<void> {
    const enableDemo = process.env.DASHBOARD_DEMO !== 'false';

    if (enableDemo) {
      // Демо режим
      console.log('🎲 Demo mode enabled');
      this.demoGenerator = new DemoDataGenerator(this.ws || undefined);
      this.demoGenerator.start();
    } else {
      // Реальные данные
      console.log('🔗 Real data mode enabled');

      try {
        const exchangeConfig = {
          exchanges: {
            binance: {
              apiKey: process.env.BINANCE_API_KEY,
              apiSecret: process.env.BINANCE_SECRET,
              testnet: process.env.BINANCE_TESTNET === 'true',
              marketType: MarketType.FUTURES,
              enabled: !!(process.env.BINANCE_API_KEY && process.env.BINANCE_SECRET),
            },
            bybit: {
              apiKey: process.env.BYBIT_API_KEY,
              apiSecret: process.env.BYBIT_SECRET,
              testnet: process.env.BYBIT_TESTNET === 'true',
              marketType: MarketType.FUTURES,
              enabled: !!(process.env.BYBIT_API_KEY && process.env.BYBIT_SECRET),
            },
            okx: {
              apiKey: process.env.OKX_API_KEY,
              apiSecret: process.env.OKX_SECRET,
              passphrase: process.env.OKX_PASSPHRASE,
              testnet: process.env.OKX_TESTNET === 'true',
              marketType: MarketType.FUTURES,
              enabled: !!(
                process.env.OKX_API_KEY &&
                process.env.OKX_SECRET &&
                process.env.OKX_PASSPHRASE
              ),
            },
          },
        };

        const exchangeManager = new ExchangeManager(exchangeConfig);
        this.realDataProvider = new RealDataProvider(exchangeManager, this.ws || undefined);
        await this.realDataProvider.start();

        console.log('✅ Real data provider initialized');
      } catch (error) {
        console.error('❌ Failed to initialize real data provider:', error);
        console.log('⚠️  Falling back to demo mode');

        // Fallback to demo mode
        this.demoGenerator = new DemoDataGenerator(this.ws || undefined);
        this.demoGenerator.start();
      }
    }
  }

  public start(): void {
    try {
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

        // Запускаем провайдер данных (demo или real)
        void this.setupDataProvider();

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

    if (this.realDataProvider) {
      this.realDataProvider.stop();
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
dashboard.start();
