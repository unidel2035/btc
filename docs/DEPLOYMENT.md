# CI/CD и деплой

Полное руководство по настройке и использованию CI/CD пайплайна для BTC Trading Bot.

## Содержание

- [Обзор](#обзор)
- [GitHub Actions](#github-actions)
- [Docker и окружения](#docker-и-окружения)
- [Мониторинг](#мониторинг)
- [Логирование](#логирование)
- [Деплой](#деплой)
- [Rollback](#rollback)

## Обзор

Проект использует GitHub Actions для автоматизации CI/CD процессов:

- **CI Pipeline**: Lint, Type Check, Tests, Build
- **Staging Deployment**: Автоматический деплой при push в `develop`
- **Production Deployment**: Автоматический деплой при push в `main`
- **Rollback**: Ручной откат через workflow dispatch

## GitHub Actions

### CI Workflow (`.github/workflows/ci.yml`)

Запускается при каждом push и PR:

1. **Lint & Type Check**
   - ESLint проверка кода
   - Prettier форматирование
   - TypeScript type checking

2. **Unit Tests**
   - Запуск всех unit тестов
   - Быстрые тесты без внешних зависимостей

3. **Integration Tests**
   - Тесты с PostgreSQL и Redis
   - Sentiment analyzer тесты
   - Risk management тесты
   - Strategy тесты
   - Backtest тесты
   - Database тесты

4. **Build**
   - Компиляция TypeScript
   - Создание production build
   - Сохранение артефактов

5. **Docker Build**
   - Сборка Docker образа
   - Проверка корректности сборки

### Deployment Workflows

#### Staging (`.github/workflows/deploy-staging.yml`)

- **Триггер**: Push в ветку `develop`
- **Окружение**: `staging`
- **Особенности**:
  - Paper trading режим
  - Тестовые данные
  - Автоматический деплой
  - Health checks после деплоя

#### Production (`.github/workflows/deploy-production.yml`)

- **Триггер**: Push в ветку `main` или manual dispatch
- **Окружение**: `production`
- **Особенности**:
  - Live trading режим
  - Реальные данные
  - Zero-downtime deployment
  - Database backup перед деплоем
  - Автоматический rollback при ошибках
  - Production smoke tests

#### Rollback (`.github/workflows/rollback.yml`)

- **Триггер**: Manual dispatch
- **Параметры**:
  - `environment`: staging или production
  - `version`: версия для отката (опционально)
- **Процесс**:
  - Остановка текущих сервисов
  - Восстановление предыдущей версии
  - Health checks
  - Уведомления

## Docker и окружения

### Development (локально)

```bash
# Запуск всех сервисов
docker-compose up -d

# Запуск только базовых сервисов
docker-compose up -d postgres redis

# Запуск с мониторингом
docker-compose --profile monitoring up -d
```

### Staging

```bash
# Запуск staging окружения
docker-compose -f docker-compose.staging.yml up -d

# Просмотр логов
docker-compose -f docker-compose.staging.yml logs -f app

# Остановка
docker-compose -f docker-compose.staging.yml down
```

**Переменные окружения** (`.env.staging`):
```env
NODE_ENV=staging
TRADING_MODE=paper
API_PORT=3000
DASHBOARD_PORT=8080

# Database
POSTGRES_DB=btc_trading_bot_staging
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<staging-password>

# Redis
REDIS_PASSWORD=<staging-redis-password>

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
GRAFANA_PASSWORD=<staging-grafana-password>
```

### Production

```bash
# Запуск production окружения
docker-compose -f docker-compose.production.yml up -d

# Проверка health check
curl http://localhost:3000/health

# Просмотр метрик
curl http://localhost:3000/metrics

# Остановка (graceful shutdown)
docker-compose -f docker-compose.production.yml down
```

**Переменные окружения** (`.env.production`):
```env
NODE_ENV=production
TRADING_MODE=live
API_PORT=3000
DASHBOARD_PORT=8080

# Database
POSTGRES_DB=btc_trading_bot_production
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<secure-password>

# Redis
REDIS_PASSWORD=<secure-redis-password>

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
GRAFANA_PASSWORD=<secure-grafana-password>
ALERTMANAGER_PORT=9093

# Trading
BINANCE_API_KEY=<key>
BINANCE_SECRET=<secret>
```

### Отличия окружений

| Параметр | Development | Staging | Production |
|----------|-------------|---------|------------|
| Trading Mode | Paper | Paper | Live |
| Auto Restart | unless-stopped | unless-stopped | always |
| Resource Limits | Нет | Нет | Да |
| Log Retention | 1 день | 7 дней | 30 дней |
| Backup | Нет | Да | Да (автоматический) |
| Monitoring | Опционально | Да | Да + Alerting |

## Мониторинг

### Health Checks

**Endpoints**:
- `/health` - общее здоровье системы
- `/ready` - готовность к приему запросов (Kubernetes)
- `/live` - живость приложения (Kubernetes)
- `/metrics` - метрики для Prometheus

**Health Check Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-09T10:00:00.000Z",
  "uptime": 3600,
  "services": {
    "database": "up",
    "redis": "up",
    "sentiment": "up"
  },
  "version": "0.1.0"
}
```

### Prometheus

**Конфигурация**: `config/prometheus.yml`

**Метрики**:
- `btc_bot_uptime_seconds` - время работы бота
- `btc_bot_memory_usage_bytes` - использование памяти
- `nodejs_version_info` - версия Node.js
- Будущие: метрики торговли, сигналов, позиций

**Доступ**: `http://localhost:9090`

**Алерты** (`config/prometheus/alerts.yml`):
- Bot Down (критичный)
- High Memory Usage (предупреждение)
- Sentiment Analyzer Down (предупреждение)
- PostgreSQL Down (критичный)
- Redis Down (предупреждение)

### Grafana

**Конфигурация**:
- Datasources: `config/grafana/datasources/`
- Dashboards: `config/grafana/dashboards/`

**Доступ**: `http://localhost:3001`
- Username: `admin`
- Password: из `GRAFANA_PASSWORD`

**Dashboards**:
- BTC Trading Bot Overview
  - Bot Uptime
  - Memory Usage
  - Service Status
  - (Будущие: торговые метрики, P&L, позиции)

### Alertmanager

**Конфигурация**: `config/alertmanager.yml`

**Получатели уведомлений**:
- Telegram (через webhook)
- Slack (опционально)
- Email (опционально)

**Группировка алертов**:
- По severity (critical, warning)
- По alertname
- Repeat interval: 12 часов

## Логирование

### Structured Logging

**Утилита**: `src/utils/logger.ts`

**Уровни логирования**:
- `DEBUG` - детальная отладочная информация
- `INFO` - общая информация о работе
- `WARN` - предупреждения
- `ERROR` - ошибки

**Использование**:

```typescript
import { log } from './utils/logger.js';

// Простое логирование
log.info('Bot started');

// С контекстом
log.info('Order placed', { symbol: 'BTCUSDT', price: 50000 });

// Ошибки
log.error('Failed to place order', error, { symbol: 'BTCUSDT' });

// Создание child logger с контекстом
import { Logger } from './utils/logger.js';
const logger = new Logger({ module: 'trading' });
logger.info('Processing signal');
```

**Форматы**:
- **Development**: Human-readable с emoji
  ```
  📘 [10:00:00] [INFO] Bot started
  ```
- **Production**: JSON для машинной обработки
  ```json
  {"timestamp":"2024-01-09T10:00:00.000Z","level":"info","message":"Bot started","context":{"service":"btc-trading-bot"}}
  ```

**Настройка**:
```env
LOG_LEVEL=info  # debug, info, warn, error
```

### Log Aggregation

В production логи автоматически собираются через:
- Docker logging driver (json-file)
- Ограничение размера: 10MB на файл
- Ротация: максимум 3 файла

**Просмотр логов**:
```bash
# Все сервисы
docker-compose -f docker-compose.production.yml logs -f

# Конкретный сервис
docker-compose -f docker-compose.production.yml logs -f app

# Последние 100 строк
docker-compose -f docker-compose.production.yml logs --tail=100 app

# С timestamps
docker-compose -f docker-compose.production.yml logs -f -t app
```

## Деплой

### Предварительные требования

1. **Настройка GitHub Secrets**:
   ```
   REGISTRY_URL              # Docker registry URL
   REGISTRY_USERNAME         # Registry username
   REGISTRY_PASSWORD         # Registry password

   STAGING_HOST             # Staging server IP/hostname
   STAGING_USERNAME         # SSH username
   STAGING_SSH_KEY          # SSH private key

   PRODUCTION_HOST          # Production server IP/hostname
   PRODUCTION_USERNAME      # SSH username
   PRODUCTION_SSH_KEY       # SSH private key

   SLACK_WEBHOOK           # Slack webhook URL (optional)
   ```

2. **Подготовка сервера**:
   ```bash
   # Установка Docker
   curl -fsSL https://get.docker.com | sh

   # Установка Docker Compose
   sudo apt-get install docker-compose-plugin

   # Создание директорий
   sudo mkdir -p /opt/btc-trading-bot/{data,logs,config,backups}
   sudo chown -R $USER:$USER /opt/btc-trading-bot

   # Клонирование репозитория
   cd /opt/btc-trading-bot
   git clone <repo-url> .

   # Создание .env файлов
   cp .env.example .env.staging  # или .env.production
   # Отредактировать переменные окружения
   ```

### Процесс деплоя

#### Staging

1. Создайте PR в ветку `develop`
2. Дождитесь прохождения CI checks
3. Merge PR → автоматический деплой
4. Проверьте staging: `https://staging.example.com/health`

#### Production

1. Создайте PR в ветку `main`
2. Дождитесь прохождения CI checks
3. Code review и approval
4. Merge PR → автоматический деплой
5. Проверьте production: `https://bot.example.com/health`

**Или manual deploy**:
```
GitHub → Actions → Deploy to Production → Run workflow
```

### Zero-Downtime Deployment

Production использует rolling update strategy:

1. Запуск 2 инстансов приложения
2. Проверка health check нового инстанса
3. Остановка старого инстанса
4. Финальная проверка

При ошибке — автоматический rollback.

## Rollback

### Автоматический Rollback

Production deployment автоматически откатывается при:
- Неудачном health check
- Ошибке при деплое
- Неудачных smoke tests

### Ручной Rollback

```
GitHub → Actions → Rollback Deployment → Run workflow

Параметры:
- Environment: staging / production
- Version: (опционально) конкретная версия
```

**Через SSH**:
```bash
cd /opt/btc-trading-bot

# Откат к предыдущей версии
docker tag btc-trading-bot:production-backup btc-trading-bot:production
docker-compose -f docker-compose.production.yml up -d

# Откат к конкретной версии
docker pull <registry>/btc-trading-bot:<version>
docker tag <registry>/btc-trading-bot:<version> btc-trading-bot:production
docker-compose -f docker-compose.production.yml up -d
```

### Восстановление базы данных

```bash
# Список бекапов
ls -lh backups/

# Восстановление
docker-compose -f docker-compose.production.yml exec -T postgres \
  psql -U postgres btc_trading_bot_production < backups/backup_20240109_100000.sql
```

## Troubleshooting

### CI не проходит

1. Проверьте логи workflow в GitHub Actions
2. Запустите тесты локально:
   ```bash
   npm run lint
   npm run type-check
   npm run test
   npm run build
   ```

### Деплой не работает

1. Проверьте GitHub Secrets
2. Проверьте доступность сервера:
   ```bash
   ssh user@server-ip
   ```
3. Проверьте логи на сервере:
   ```bash
   docker-compose logs -f
   ```

### Health check не проходит

1. Проверьте порты:
   ```bash
   netstat -tlnp | grep 3000
   ```
2. Проверьте логи приложения:
   ```bash
   docker-compose logs app
   ```
3. Проверьте статус сервисов:
   ```bash
   docker-compose ps
   ```

### High memory usage

1. Проверьте метрики в Grafana
2. Перезапустите сервис:
   ```bash
   docker-compose restart app
   ```
3. Если проблема постоянна — увеличьте resource limits

## Best Practices

1. **Всегда тестируйте на staging** перед production
2. **Создавайте бекапы** перед критическими изменениями
3. **Мониторьте метрики** после каждого деплоя
4. **Используйте feature flags** для больших изменений
5. **Делайте small, incremental deployments**
6. **Документируйте изменения** в CHANGELOG
7. **Настройте уведомления** в Slack/Telegram
8. **Регулярно проверяйте алерты** в Prometheus/Grafana
9. **Тестируйте rollback процедуру** на staging
10. **Храните логи** минимум 30 дней для production

## Security

- Никогда не коммитьте `.env` файлы
- Используйте GitHub Secrets для credentials
- Регулярно обновляйте пароли
- Используйте SSH keys для доступа к серверам
- Ограничьте доступ к production серверам
- Включите firewall и fail2ban
- Регулярно обновляйте Docker images
- Используйте HTTPS для всех endpoints
- Настройте VPN для доступа к админ панелям

## Maintenance

### Обновление зависимостей

```bash
npm update
npm audit fix
docker-compose pull
```

### Очистка старых образов

```bash
docker system prune -a
```

### Ротация логов

Настроена автоматически через Docker logging driver.

### Database maintenance

```bash
# Vacuum
docker-compose exec postgres vacuumdb -U postgres -d btc_trading_bot_production

# Reindex
docker-compose exec postgres reindexdb -U postgres -d btc_trading_bot_production
```

## Support

Для вопросов и проблем:
- GitHub Issues: https://github.com/unidel2035/btc/issues
- Документация: https://github.com/unidel2035/btc/docs
