# CI/CD Documentation

## Overview

This document describes the CI/CD pipeline implementation for the BTC Trading Bot project.

## GitHub Actions Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main` branch.

#### Jobs

**Lint & Type Check**
- Runs ESLint to check code quality
- Checks code formatting with Prettier
- Performs TypeScript type checking
- Fast feedback on code issues

**Unit Tests**
- Runs all unit tests in parallel
- Tests include:
  - Sentiment analyzer tests
  - Risk management tests
  - Trading strategy tests
  - Paper trading tests
- Uses in-memory mocks for speed

**Integration Tests**
- Spins up PostgreSQL and Redis services
- Runs integration tests:
  - Database connectivity and operations
  - Dashboard API endpoints
  - Backtest engine
  - Notifications system
- Uses GitHub Actions service containers

**Build**
- Compiles TypeScript to JavaScript
- Uploads build artifacts for deployment
- Validates that the project builds successfully

**Docker Build**
- Builds main application Docker image
- Builds sentiment analyzer Docker image
- Uses Docker layer caching for speed
- Validates Docker images build correctly

### 2. Staging Deployment (`.github/workflows/deploy-staging.yml`)

Triggers on push to `develop` or `staging` branches, or manual trigger.

#### Steps

1. **Build & Push Images**
   - Tags: `staging`, `staging-{sha}`
   - Pushes to Docker Hub

2. **Deploy to Staging Server**
   - SSH to staging server
   - Pull latest images
   - Zero-downtime restart
   - Wait for services to be healthy

3. **Health Check**
   - Waits 30 seconds for startup
   - Verifies `/health` endpoint

4. **Notification**
   - Sends Slack notification with deployment status

### 3. Production Deployment (`.github/workflows/deploy-production.yml`)

Triggers on push to `main` branch or version tags (`v*`).

#### Steps

1. **Build & Push Images**
   - Tags: `latest`, `{version}`, `prod-{sha}`
   - Pushes to Docker Hub

2. **Create Backup**
   - Backs up production database
   - Keeps last 7 backups only

3. **Blue-Green Deployment**
   - Starts new containers alongside old ones
   - Waits for health checks (30s)
   - Switches traffic to new containers
   - Removes old containers

4. **Health Check (with retries)**
   - 5 attempts with 10s intervals
   - Triggers rollback on failure

5. **Rollback on Failure**
   - Restores database from backup
   - Restarts with previous images
   - Preserves system stability

6. **Notification**
   - Sends Slack notification
   - Creates GitHub release for version tags

## Environment Configuration

### Development

Local development environment:
- Uses `docker-compose.yml`
- Hot reload enabled
- Debug logging
- Local PostgreSQL and Redis

### Staging

Testing environment:
- Uses `docker-compose.staging.yml`
- Paper trading mode
- Test money only
- Full monitoring stack
- Separate database

### Production

Live trading environment:
- Uses `docker-compose.production.yml`
- Live trading mode
- Real money
- Resource limits
- Enhanced monitoring
- Automated backups

## Docker Images

### Main Application

**Base**: `node:20-alpine`

**Build Steps**:
1. Copy package files
2. Install dependencies (`npm ci`)
3. Copy source code
4. Build TypeScript
5. Create data/logs directories

**Exposed Ports**: 3000, 8080

### Sentiment Analyzer

**Base**: Python 3.11

**Build Steps**:
1. Install system dependencies
2. Install Python packages
3. Download NLP models
4. Copy application code

**Exposed Port**: 8000

## Health Checks

### Application Endpoints

**`GET /health`**
```json
{
  "status": "ok",
  "timestamp": "2025-01-09T12:00:00.000Z",
  "uptime": 3600,
  "memory": {
    "rss": 123456789,
    "heapTotal": 98765432,
    "heapUsed": 87654321
  },
  "environment": "production"
}
```

**`GET /ready`**
```json
{
  "status": "ready",
  "timestamp": "2025-01-09T12:00:00.000Z"
}
```

**`GET /live`**
```json
{
  "status": "alive",
  "timestamp": "2025-01-09T12:00:00.000Z"
}
```

### Docker Health Checks

Services include health check configurations:
- **App**: `curl -f http://localhost:3000/health`
- **Sentiment Analyzer**: `curl -f http://localhost:8000/health`
- **PostgreSQL**: `pg_isready -U postgres`
- **Redis**: `redis-cli ping`

## Monitoring

### Prometheus Metrics

Scraped from:
- Application (`:3000/metrics`)
- Sentiment Analyzer (`:8000/metrics`)
- PostgreSQL Exporter
- Redis Exporter
- Node Exporter (system metrics)

Configuration: `config/prometheus.yml`

### Grafana Dashboards

Pre-configured dashboards for:
- Trading performance
- System resources
- Database metrics
- API performance
- Error rates

Configuration: `config/grafana/`

### Alertmanager

Alerts sent to:
- Slack channels (critical/warning)
- Application webhook

Configuration: `config/alertmanager.yml`

## Logging

### Structured Logging

Implementation: `src/utils/logger.ts`

Features:
- Multiple log levels (debug, info, warn, error)
- Structured JSON output in production
- Pretty printing in development
- Context-aware logging
- Trading-specific log methods

### Log Levels

Set via `LOG_LEVEL` environment variable:
- `debug` - Development, detailed debugging
- `info` - Production default, general information
- `warn` - Warnings and risk events
- `error` - Errors with stack traces

### Example Usage

```typescript
import { createLogger } from './utils/logger';

const logger = createLogger('trading');

logger.info('Position opened', {
  symbol: 'BTCUSDT',
  side: 'LONG',
  size: 0.1,
  price: 50000
});

logger.trade('Trade executed', {
  orderId: '12345',
  pnl: 150
});

logger.error('Order failed', error, {
  orderId: '12345'
});
```

## Secrets Management

### GitHub Secrets

Required secrets in repository settings:

**Docker Hub**
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`

**Staging**
- `STAGING_HOST`
- `STAGING_USER`
- `STAGING_SSH_KEY`
- `STAGING_URL`

**Production**
- `PROD_HOST`
- `PROD_USER`
- `PROD_SSH_KEY`
- `PROD_URL`

**Notifications**
- `SLACK_WEBHOOK`

### Environment Files

Never commit these files:
- `.env`
- `.env.staging`
- `.env.production`

Use example files as templates:
- `.env.example`
- `.env.staging.example`
- `.env.production.example`

## Backup Strategy

### Automated Backups

Production deployments create backups automatically:
- Before every deployment
- Stored on production server
- Named: `backup_YYYYMMDD_HHMMSS.sql`
- Retention: 7 most recent backups

### Manual Backup

```bash
# Create backup
npm run db:backup create

# Restore from backup
npm run db:backup restore ./backups/backup_file.sql
```

### Backup Location

- Server: `/opt/btc-trading-bot/backup_*.sql`
- Local: `./backups/`

## Rollback Procedures

### Automatic Rollback

Triggered on:
- Failed health checks (5 attempts)
- Container startup failures
- Deployment errors

Process:
1. Restore database from latest backup
2. Restart with previous Docker images
3. Verify health checks
4. Send notifications

### Manual Rollback

```bash
# SSH to server
ssh user@production-server

# Navigate to app directory
cd /opt/btc-trading-bot

# View available backups
ls -lt backup_*.sql | head -5

# Restore specific backup
docker-compose -f docker-compose.production.yml exec -T postgres \
  psql -U postgres -d btc_trading_bot < backup_20250109_120000.sql

# Restart services
docker-compose -f docker-compose.production.yml restart
```

## Zero-Downtime Deployment

### Strategy

Blue-green deployment pattern:

1. **Prepare** - Pull latest Docker images
2. **Start** - Launch new containers alongside old
3. **Wait** - Health checks pass (30s minimum)
4. **Switch** - Route traffic to new containers
5. **Cleanup** - Remove old containers

### Implementation

```yaml
# Scale up to 2 instances
docker-compose up -d --no-deps --scale app=2 app

# Wait for health checks
sleep 30

# Scale down to 1 instance (keeps newest)
docker-compose up -d --no-deps --scale app=1 app
```

## Performance Optimization

### Docker Layer Caching

GitHub Actions caches Docker layers:
- `cache-from: type=gha`
- `cache-to: type=gha,mode=max`

Benefits:
- Faster builds (5-10x speedup)
- Lower CI costs
- Reduced build times

### Parallel Execution

CI jobs run in parallel:
- Lint & Type Check
- Unit Tests
- Integration Tests
- Build
- Docker Build

Reduces total CI time significantly.

## Troubleshooting

### CI Failures

**Lint Errors**
```bash
# Run locally
npm run lint
npm run format:check

# Auto-fix
npm run lint:fix
npm run format
```

**Type Errors**
```bash
# Check types
npm run type-check

# Build to see full errors
npm run build
```

**Test Failures**
```bash
# Run specific test
npm run test:paper

# Run all tests
npm test
```

### Deployment Failures

**Health Check Failed**
- Check application logs: `docker-compose logs app`
- Verify environment variables
- Check database connectivity
- Review resource usage

**SSH Connection Failed**
- Verify SSH key in GitHub secrets
- Check server firewall rules
- Verify user permissions

**Image Push Failed**
- Check Docker Hub credentials
- Verify repository exists
- Check network connectivity

### Monitoring Issues

**Prometheus Not Scraping**
- Verify target endpoints are accessible
- Check prometheus.yml configuration
- Review Prometheus logs

**Alerts Not Firing**
- Check Alertmanager configuration
- Verify Slack webhook URL
- Review alert rules

## Best Practices

### Development

1. Run lint and type check before committing
2. Write tests for new features
3. Use feature branches
4. Keep commits atomic and meaningful

### Deployment

1. Test changes in staging first
2. Monitor deployments closely
3. Review logs after deployment
4. Keep rollback plan ready

### Monitoring

1. Set up alerts for critical metrics
2. Review dashboards regularly
3. Investigate anomalies promptly
4. Keep historical data for analysis

### Security

1. Never commit secrets
2. Use SSH keys, not passwords
3. Rotate credentials regularly
4. Keep dependencies updated
5. Review security advisories

## Maintenance

### Regular Tasks

**Daily**
- Check monitoring dashboards
- Review error logs
- Verify backups completed

**Weekly**
- Review performance metrics
- Check disk space
- Update dependencies

**Monthly**
- Security audit
- Backup verification
- Disaster recovery drill
- Documentation review

### Dependency Updates

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Test after updates
npm run build
npm test
```

## Support

For issues or questions:
- Check logs first
- Review this documentation
- Check GitHub Issues
- Contact team lead

## References

- [Deployment Guide](./DEPLOYMENT.md)
- [Docker Documentation](https://docs.docker.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
