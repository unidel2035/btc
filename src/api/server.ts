import http from 'http';
import { config } from 'dotenv';

config();

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database?: 'up' | 'down';
    redis?: 'up' | 'down';
    sentiment?: 'up' | 'down';
  };
  version: string;
}

export interface MetricsResponse {
  trading: {
    activePositions: number;
    totalTrades: number;
    profitLoss: number;
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    uptime: number;
  };
}

/**
 * Проверка здоровья системы
 */
export function checkHealth(): HealthCheckResponse {
  const services: HealthCheckResponse['services'] = {};

  // TODO: Добавить реальные проверки подключений
  // services.database = await checkDatabaseConnection();
  // services.redis = await checkRedisConnection();
  // services.sentiment = await checkSentimentApiConnection();

  const isHealthy = Object.values(services).every(
    (status) => status === 'up' || status === undefined,
  );

  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services,
    version: process.env.npm_package_version || '0.1.0',
  };
}

/**
 * Получение метрик для Prometheus
 */
export function getMetrics(): string {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();

  // Формат метрик Prometheus
  const metrics = [
    '# HELP btc_bot_uptime_seconds Bot uptime in seconds',
    '# TYPE btc_bot_uptime_seconds gauge',
    `btc_bot_uptime_seconds ${uptime}`,
    '',
    '# HELP btc_bot_memory_usage_bytes Memory usage in bytes',
    '# TYPE btc_bot_memory_usage_bytes gauge',
    `btc_bot_memory_usage_bytes{type="rss"} ${memUsage.rss}`,
    `btc_bot_memory_usage_bytes{type="heapTotal"} ${memUsage.heapTotal}`,
    `btc_bot_memory_usage_bytes{type="heapUsed"} ${memUsage.heapUsed}`,
    `btc_bot_memory_usage_bytes{type="external"} ${memUsage.external}`,
    '',
    '# HELP nodejs_version_info Node.js version',
    '# TYPE nodejs_version_info gauge',
    `nodejs_version_info{version="${process.version}"} 1`,
    '',
  ];

  // TODO: Добавить метрики торговли
  // - Количество активных позиций
  // - Общее количество сделок
  // - P&L
  // - Количество сигналов

  return metrics.join('\n');
}

/**
 * HTTP сервер для health checks и метрик
 */
export function createApiServer(): http.Server {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      // Health check endpoint
      if (url.pathname === '/health' || url.pathname === '/api/health') {
        const health = checkHealth();
        res.writeHead(health.status === 'healthy' ? 200 : 503, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify(health, null, 2));
        return;
      }

      // Metrics endpoint for Prometheus
      if (url.pathname === '/metrics') {
        const metrics = getMetrics();
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(metrics);
        return;
      }

      // Ready endpoint (для Kubernetes)
      if (url.pathname === '/ready') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ready: true }));
        return;
      }

      // Live endpoint (для Kubernetes)
      if (url.pathname === '/live') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ alive: true }));
        return;
      }

      // Default response
      if (url.pathname === '/' || url.pathname === '/api') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            name: 'BTC Trading Bot API',
            version: process.env.npm_package_version || '0.1.0',
            endpoints: {
              health: '/health',
              metrics: '/metrics',
              ready: '/ready',
              live: '/live',
            },
          }),
        );
        return;
      }

      // 404 Not Found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    } catch (error) {
      console.error('API Server Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  });

  server.on('error', (error) => {
    console.error('Server error:', error);
  });

  return server;
}

/**
 * Запуск API сервера
 */
export function startApiServer(port: number = 3000): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = createApiServer();

    server.listen(port, () => {
      console.info(`🚀 API server listening on port ${port}`);
      console.info(`   Health check: http://localhost:${port}/health`);
      console.info(`   Metrics: http://localhost:${port}/metrics`);
      resolve(server);
    });

    server.on('error', reject);
  });
}
