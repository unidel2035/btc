# Deployment Guide

## Overview

This guide covers the CI/CD pipeline and deployment process for the BTC Trading Bot.

## Environments

The project supports three environments:

- **Development** - Local development with hot reload
- **Staging** - Testing environment with paper trading
- **Production** - Live trading environment

## CI/CD Pipeline

### Continuous Integration

All pull requests and pushes trigger the CI workflow:

1. **Lint & Type Check** - ESLint, Prettier, TypeScript
2. **Unit Tests** - Strategy, risk management, and trading logic tests
3. **Integration Tests** - Database, dashboard, and API tests
4. **Build** - TypeScript compilation
5. **Docker Build** - Build and cache Docker images

### Continuous Deployment

#### Staging Deployment

- **Trigger**: Push to `develop` or `staging` branch
- **Environment**: Staging server with paper trading
- **Process**:
  1. Build and push Docker images (tagged as `staging`)
  2. SSH to staging server
  3. Pull latest images
  4. Zero-downtime deployment
  5. Health check
  6. Slack notification

#### Production Deployment

- **Trigger**: Push to `main` branch or version tag (`v*`)
- **Environment**: Production server with live trading
- **Process**:
  1. Build and push Docker images (tagged as `latest` and version)
  2. Create database backup
  3. Blue-green deployment with zero downtime
  4. Health check (with retries)
  5. Automatic rollback on failure
  6. Slack notification
  7. GitHub release (for version tags)

## Infrastructure Setup

### Prerequisites

- Docker & Docker Compose
- SSH access to servers
- Docker Hub account

### Server Requirements

**Minimum Requirements (Staging):**
- 2 CPU cores
- 4GB RAM
- 50GB storage

**Recommended Requirements (Production):**
- 4 CPU cores
- 8GB RAM
- 100GB storage (SSD)

### Initial Setup

1. **Clone the repository on your server:**
```bash
git clone https://github.com/unidel2035/btc.git /opt/btc-trading-bot
cd /opt/btc-trading-bot
```

2. **Create environment files:**
```bash
# Staging
cp .env.staging.example .env.staging

# Production
cp .env.production.example .env.production
```

3. **Configure environment variables:**
Edit the `.env.staging` or `.env.production` files with your credentials.

4. **Start services:**
```bash
# Staging
docker-compose -f docker-compose.staging.yml up -d

# Production
docker-compose -f docker-compose.production.yml up -d
```

## GitHub Secrets

Configure these secrets in your GitHub repository settings:

### Docker Hub
- `DOCKER_USERNAME` - Docker Hub username
- `DOCKER_PASSWORD` - Docker Hub password/token

### Staging Server
- `STAGING_HOST` - Staging server hostname/IP
- `STAGING_USER` - SSH username
- `STAGING_SSH_KEY` - SSH private key
- `STAGING_URL` - Staging server URL for health checks

### Production Server
- `PROD_HOST` - Production server hostname/IP
- `PROD_USER` - SSH username
- `PROD_SSH_KEY` - SSH private key
- `PROD_URL` - Production server URL for health checks

### Notifications
- `SLACK_WEBHOOK` - Slack webhook URL for deployment notifications

## Health Checks

The application exposes several health check endpoints:

- `GET /health` - General health status with system metrics
- `GET /ready` - Readiness check (for load balancers)
- `GET /live` - Liveness check (for orchestrators)

## Monitoring

### Prometheus

Prometheus scrapes metrics from:
- Main application (`app:3000/metrics`)
- Sentiment analyzer (`sentiment-analyzer:8000/metrics`)
- PostgreSQL
- Redis
- Node exporter (system metrics)

Access Prometheus at: `http://your-server:9090`

### Grafana

Pre-configured dashboards for:
- Trading performance
- System metrics
- Database performance
- API performance

Access Grafana at: `http://your-server:3000`

Default credentials:
- Username: `admin`
- Password: Set in `GRAFANA_PASSWORD` environment variable

### Alertmanager

Alertmanager sends notifications to:
- Slack (critical and warning channels)
- Application webhook endpoint

Access Alertmanager at: `http://your-server:9093`

## Logging

### Structured Logging

All logs are output in structured JSON format in production:

```json
{
  "timestamp": "2025-01-09T12:00:00.000Z",
  "level": "info",
  "context": "trading",
  "message": "Position opened",
  "type": "trade",
  "symbol": "BTCUSDT",
  "side": "LONG",
  "size": 0.1
}
```

### Log Levels

- `debug` - Detailed debugging information
- `info` - General informational messages
- `warn` - Warning messages (risk events, etc.)
- `error` - Error messages with stack traces

Set log level via `LOG_LEVEL` environment variable.

### Log Aggregation

Logs are stored in:
- Container stdout/stderr (captured by Docker)
- Volume-mounted directory: `./logs/{environment}/`

Recommended log aggregation solutions:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Loki + Grafana
- CloudWatch Logs (AWS)
- Stackdriver (GCP)

## Backup & Recovery

### Automated Backups

Production deployments automatically create database backups before deployment:

```bash
# Backups are stored in
/opt/btc-trading-bot/backup_YYYYMMDD_HHMMSS.sql

# Only last 7 backups are kept
```

### Manual Backup

```bash
# Create backup
docker-compose -f docker-compose.production.yml exec postgres \
  pg_dump -U postgres btc_trading_bot > backup.sql

# Restore backup
docker-compose -f docker-compose.production.yml exec -T postgres \
  psql -U postgres -d btc_trading_bot < backup.sql
```

### Disaster Recovery

1. Stop the application
2. Restore database from backup
3. Restart services
4. Verify with health checks

## Rollback

### Automatic Rollback

Production deployments automatically rollback on:
- Failed health checks (5 attempts with 10s intervals)
- Container startup failures

### Manual Rollback

```bash
# View available image tags
docker images | grep btc-trading-bot

# Rollback to specific version
docker-compose -f docker-compose.production.yml down
# Edit docker-compose.production.yml to use specific tag
docker-compose -f docker-compose.production.yml up -d
```

## Zero-Downtime Deployment

Production uses blue-green deployment strategy:

1. Start new containers alongside old ones
2. Wait for health checks to pass
3. Switch traffic to new containers
4. Remove old containers

This ensures no downtime during deployments.

## Scaling

### Horizontal Scaling

Scale specific services:

```bash
# Scale application instances
docker-compose -f docker-compose.production.yml up -d --scale app=3

# Scale sentiment analyzer
docker-compose -f docker-compose.production.yml up -d --scale sentiment-analyzer=2
```

### Resource Limits

Production compose file includes resource limits:
- CPU limits prevent runaway processes
- Memory limits prevent OOM situations

Adjust in `docker-compose.production.yml` as needed.

## Troubleshooting

### Check Logs

```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f app

# Last 100 lines
docker-compose -f docker-compose.production.yml logs --tail=100 app
```

### Check Service Health

```bash
# Container status
docker-compose -f docker-compose.production.yml ps

# Health check
curl http://localhost:3000/health

# Detailed metrics
curl http://localhost:3000/api/metrics
```

### Common Issues

**Services not starting:**
- Check environment variables
- Verify network connectivity
- Check disk space
- Review logs for specific errors

**Database connection issues:**
- Verify PostgreSQL is running
- Check credentials in environment file
- Verify network connectivity

**High memory usage:**
- Check for memory leaks in logs
- Adjust resource limits
- Consider horizontal scaling

## Security Best Practices

1. **Use secrets management** - Never commit secrets to git
2. **SSH key authentication** - Use SSH keys instead of passwords
3. **Firewall rules** - Restrict access to necessary ports only
4. **Regular updates** - Keep Docker images and dependencies updated
5. **Monitoring** - Set up alerts for suspicious activity
6. **Backup encryption** - Encrypt database backups
7. **HTTPS** - Use reverse proxy with SSL/TLS certificates

## Production Checklist

Before going live:

- [ ] All secrets configured in GitHub
- [ ] Server resources adequate
- [ ] Monitoring and alerting set up
- [ ] Backup strategy implemented
- [ ] Health checks passing
- [ ] SSL/TLS certificates installed
- [ ] Firewall rules configured
- [ ] Trading API keys tested
- [ ] Risk limits configured appropriately
- [ ] Team trained on deployment process
- [ ] Rollback procedure tested
- [ ] Documentation reviewed and updated
