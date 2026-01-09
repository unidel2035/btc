# Web Dashboard

Comprehensive web interface for monitoring and managing the BTC trading bot.

## Overview

The dashboard provides a real-time web interface for:
- Monitoring bot performance and metrics
- Viewing trading signals as they arrive
- Managing open positions
- Analyzing news with sentiment scoring
- Reviewing performance analytics
- Configuring bot settings

## Architecture

### Backend (Node.js + TypeScript)
- **Express** - REST API server
- **WebSocket** - Real-time updates
- **DashboardService** - Business logic and data management

### Frontend (Vanilla HTML/CSS/JS + Vue 3)
- **Vue 3** - Reactive UI framework (CDN-based)
- **Chart.js** - Data visualization
- **Vanilla CSS** - Custom styling (no build step needed)

### Key Features
- ✅ Responsive design (mobile-friendly)
- ✅ Real-time WebSocket updates
- ✅ RESTful API endpoints
- ✅ Mock data for demonstration
- ✅ No build step required
- ✅ Standalone deployment

## Quick Start

```bash
# Start the dashboard server
npm run dashboard

# The dashboard will be available at:
# http://localhost:8080

# Run the example
npm run example:dashboard
```

## Configuration

Environment variables:

```env
# Dashboard server
DASHBOARD_PORT=8080
DASHBOARD_HOST=0.0.0.0
```

## Pages

### 1. Dashboard (Main)
**URL:** `/` or `/#dashboard`

**Features:**
- Total balance and PnL overview
- Today's profit/loss
- Open positions count
- Win rate and performance metrics
- Equity curve chart (7 days)
- Recent signals table

**Data:**
- Updates every 5 seconds via WebSocket
- Automatic chart rendering
- Real-time position updates

### 2. Signals
**URL:** `/#signals`

**Features:**
- Real-time signal feed
- Signal type filtering
- Impact and sentiment indicators
- Source tracking
- Full signal history

**Data:**
- Broadcasts new signals via WebSocket
- Filterable by type (news, sentiment, technical, etc.)
- Sorted by timestamp (newest first)

### 3. Positions
**URL:** `/#positions`

**Features:**
- Current open positions table
- Real-time PnL tracking
- Manual position closing
- SL/TP modification (API ready)
- Position history
- Duration tracking

**Data:**
- Live price and PnL updates
- Position status monitoring
- Historical performance

### 4. News Feed
**URL:** `/#news`

**Features:**
- Latest cryptocurrency news
- Sentiment analysis labels
- Impact scoring
- Source attribution
- Symbol tagging
- Timestamp tracking

**Data:**
- Updates every 30 seconds via WebSocket
- Filterable by sentiment
- Integrated with sentiment analyzer

### 5. Analytics
**URL:** `/#analytics`

**Features:**
- Performance metrics overview
- Trade statistics (wins, losses, win rate)
- Profit/loss analysis
- Risk metrics (drawdown, Sharpe ratio)
- Strategy performance comparison
- Profit factor calculations

**Data:**
- Configurable time periods
- Strategy-level breakdowns
- Historical performance tracking

### 6. Settings
**URL:** `/#settings`

**Features:**
- Risk management configuration
- Strategy enable/disable toggles
- API settings
- Notification preferences
- Real-time settings updates

**Configuration:**
- Risk parameters (position size, stop loss, take profit)
- Strategy parameters
- Exchange selection
- Test mode toggle

## API Endpoints

### Dashboard

#### GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-09T10:00:00.000Z"
}
```

#### GET `/api/dashboard`
Get dashboard overview with key metrics.

**Response:**
```json
{
  "balance": {
    "total": 10000,
    "available": 9500,
    "inPositions": 500
  },
  "pnl": {
    "today": 245.67,
    "week": 892.34,
    "month": 1456.78,
    "total": 2341.56
  },
  "positions": {
    "count": 3,
    "long": 2,
    "short": 1
  },
  "signals": {
    "recent": [...],
    "count24h": 45
  },
  "metrics": {
    "winRate": 0.65,
    "avgProfit": 2.3,
    "maxDrawdown": 8.5,
    "sharpeRatio": 1.8
  }
}
```

### Signals

#### GET `/api/signals?limit=50&type=news`
Get signals with optional filtering.

**Query Parameters:**
- `limit` (optional) - Number of signals to return (default: 50)
- `type` (optional) - Filter by signal type (news, sentiment, technical, etc.)

**Response:**
```json
[
  {
    "id": "uuid",
    "type": "news",
    "sentiment": "bullish",
    "impact": 0.85,
    "source": "CoinDesk",
    "timestamp": "2024-01-09T10:00:00.000Z",
    "data": {}
  }
]
```

### Positions

#### GET `/api/positions`
Get all open positions.

**Response:**
```json
[
  {
    "id": "uuid",
    "symbol": "BTC/USDT",
    "side": "long",
    "size": 500,
    "entryPrice": 50000,
    "currentPrice": 51000,
    "pnl": 10,
    "pnlPercent": 2.0,
    "duration": 3600,
    "status": "open",
    "stopLoss": 49000,
    "takeProfit": 52500
  }
]
```

#### GET `/api/positions/history?limit=100`
Get closed position history.

**Query Parameters:**
- `limit` (optional) - Number of records (default: 100)

#### POST `/api/positions/:id/close`
Close a specific position.

**Response:**
```json
{
  "success": true,
  "message": "Position closed successfully",
  "data": {...}
}
```

#### POST `/api/positions/:id/update`
Update position stop loss and/or take profit.

**Request Body:**
```json
{
  "stopLoss": 49500,
  "takeProfit": 53000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Position updated successfully",
  "data": {...}
}
```

### News

#### GET `/api/news?limit=50&sentiment=bullish`
Get news feed with optional sentiment filtering.

**Query Parameters:**
- `limit` (optional) - Number of news items (default: 50)
- `sentiment` (optional) - Filter by sentiment (bullish, bearish, neutral)

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Bitcoin reaches new all-time high",
    "summary": "...",
    "source": "CoinDesk",
    "url": "https://...",
    "sentiment": "bullish",
    "sentimentScore": 0.85,
    "impact": 0.9,
    "timestamp": "2024-01-09T10:00:00.000Z",
    "symbols": ["BTC", "ETH"]
  }
]
```

### Settings

#### GET `/api/settings`
Get current bot settings.

**Response:**
```json
{
  "strategies": {
    "news-momentum": {
      "enabled": true,
      "params": {...}
    }
  },
  "risk": {
    "maxPositionSize": 10,
    "maxPositions": 5,
    "maxDailyLoss": 5,
    "defaultStopLoss": 2,
    "defaultTakeProfit": 5
  },
  "notifications": {...},
  "api": {
    "exchange": "binance",
    "testMode": true
  }
}
```

#### POST `/api/settings`
Update bot settings.

**Request Body:** Same structure as GET response

**Response:**
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": {...}
}
```

### Analytics

#### GET `/api/analytics/performance?period=7d`
Get performance metrics for a period.

**Query Parameters:**
- `period` (optional) - Time period (7d, 30d, 1m, 3m, 1y) (default: 7d)

**Response:**
```json
{
  "period": "7d",
  "equity": [
    { "timestamp": "2024-01-01", "value": 10000 },
    { "timestamp": "2024-01-02", "value": 10150 }
  ],
  "trades": {
    "total": 45,
    "wins": 29,
    "losses": 16,
    "winRate": 0.644
  },
  "profit": {
    "gross": 2841.56,
    "net": 2341.56,
    "avgWin": 145.32,
    "avgLoss": -62.18,
    "profitFactor": 2.34
  },
  "risk": {
    "maxDrawdown": 850,
    "maxDrawdownPercent": 8.5,
    "sharpeRatio": 1.8,
    "sortinoRatio": 2.3
  }
}
```

#### GET `/api/analytics/strategies`
Get strategy-level performance statistics.

**Response:**
```json
[
  {
    "name": "News Momentum",
    "enabled": true,
    "signals": 156,
    "trades": 28,
    "winRate": 0.68,
    "profit": 1245.32,
    "avgProfit": 44.48,
    "maxDrawdown": 5.2
  }
]
```

#### GET `/api/analytics/trades?limit=100`
Get trade journal entries.

**Query Parameters:**
- `limit` (optional) - Number of trades (default: 100)

**Response:**
```json
[
  {
    "id": "uuid",
    "symbol": "BTC/USDT",
    "side": "long",
    "entryTime": "2024-01-08T10:00:00.000Z",
    "exitTime": "2024-01-08T14:30:00.000Z",
    "entryPrice": 50000,
    "exitPrice": 51000,
    "quantity": 0.01,
    "pnl": 10,
    "pnlPercent": 2.0,
    "strategy": "News Momentum",
    "signals": ["news", "sentiment"],
    "duration": 16200,
    "fees": 0.01
  }
]
```

## WebSocket Events

The dashboard uses WebSocket for real-time updates. Connect to the same host/port as the HTTP server.

### Client → Server

No messages required from client (read-only connection).

### Server → Client

#### `connected`
Sent when client connects.
```json
{
  "type": "connected",
  "data": {
    "message": "Connected to dashboard WebSocket"
  }
}
```

#### `price_update`
Real-time price updates (every 5 seconds).
```json
{
  "type": "price_update",
  "data": {
    "BTC/USDT": 50000,
    "ETH/USDT": 3000
  }
}
```

#### `new_signals`
New signals broadcast.
```json
{
  "type": "new_signals",
  "data": [...]
}
```

#### `positions_update`
Position updates (every 5 seconds).
```json
{
  "type": "positions_update",
  "data": [...]
}
```

#### `new_news`
New news items (every 30 seconds).
```json
{
  "type": "new_news",
  "data": [...]
}
```

#### `position_closed`
Position closed event.
```json
{
  "type": "position_closed",
  "data": {
    "id": "uuid"
  }
}
```

#### `position_updated`
Position updated event (SL/TP changed).
```json
{
  "type": "position_updated",
  "data": {...}
}
```

#### `settings_updated`
Settings updated event.
```json
{
  "type": "settings_updated",
  "data": {...}
}
```

## Technology Stack

### Backend
- **Node.js** 20+ - Runtime
- **TypeScript** 5.3+ - Type safety
- **Express** 4.x - Web framework
- **ws** - WebSocket library
- **cors** - CORS middleware

### Frontend
- **Vue 3** - UI framework (CDN)
- **Chart.js** 4.x - Charting (CDN)
- **Vanilla CSS** - Styling
- **Native WebSocket API** - Real-time communication

## File Structure

```
src/dashboard/
├── server.ts                 # Main server (Express + WebSocket)
├── types/
│   └── index.ts             # TypeScript interfaces
├── services/
│   └── DashboardService.ts  # Business logic
└── public/
    └── index.html           # Frontend SPA

examples/
└── dashboard-example.ts      # Usage example
```

## Development

### Adding New API Endpoints

1. Add route in `server.ts`:
```typescript
this.app.get('/api/my-endpoint', (req, res) => {
  const data = this.dashboardService.getMyData();
  res.json(data);
});
```

2. Add method in `DashboardService.ts`:
```typescript
public getMyData(): MyData {
  // Implementation
}
```

3. Add type in `types/index.ts`:
```typescript
export interface MyData {
  // Fields
}
```

### Adding WebSocket Events

In `server.ts`:
```typescript
// Broadcast to all clients
this.broadcast({
  type: 'my_event',
  data: { ... }
});
```

In `public/index.html`:
```javascript
handleWebSocketMessage(message) {
  if (message.type === 'my_event') {
    // Handle event
  }
}
```

### Styling

All styles are in `public/index.html` `<style>` section. Key CSS variables:

```css
:root {
  --primary: #3b82f6;
  --success: #10b981;
  --danger: #ef4444;
  --dark: #1f2937;
  --light: #f9fafb;
}
```

## Production Deployment

### 1. Build TypeScript
```bash
npm run build
```

### 2. Environment Variables
```env
DASHBOARD_PORT=8080
DASHBOARD_HOST=0.0.0.0
NODE_ENV=production
```

### 3. Run
```bash
node dist/dashboard/server.js
```

### 4. Reverse Proxy (Nginx)
```nginx
server {
  listen 80;
  server_name dashboard.example.com;

  location / {
    proxy_pass http://localhost:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

## Security Considerations

Currently the dashboard has **no authentication**. For production use:

### Recommended: Add Authentication

1. **Basic Auth** (simple):
```typescript
app.use((req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !validateAuth(auth)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
});
```

2. **JWT Tokens** (recommended):
- Add login endpoint
- Issue JWT tokens
- Verify tokens on protected routes

3. **OAuth 2.0** (enterprise):
- Integrate with identity provider
- Use proper session management

### HTTPS
Always use HTTPS in production:
- Use reverse proxy (Nginx, Caddy)
- Let's Encrypt SSL certificates
- Enforce HTTPS redirects

### Rate Limiting
Add rate limiting to prevent abuse:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## Troubleshooting

### Dashboard won't start
- Check if port 8080 is available
- Verify all dependencies are installed: `npm install`
- Check logs for error messages

### WebSocket not connecting
- Ensure WebSocket port matches HTTP port
- Check firewall rules
- Verify no proxy blocking WebSocket upgrade

### Data not updating
- Check WebSocket connection status in UI
- Verify DashboardService is returning data
- Check browser console for errors

### Chart not rendering
- Ensure Chart.js is loaded (check CDN)
- Verify data format matches Chart.js expectations
- Check browser console for errors

## Future Enhancements

Potential improvements:

- [ ] User authentication and authorization
- [ ] Multi-user support with role-based access
- [ ] Database integration for persistent data
- [ ] Advanced charting (candlesticks, indicators)
- [ ] Trade execution from dashboard
- [ ] Portfolio management tools
- [ ] Alert and notification system
- [ ] Mobile app (React Native)
- [ ] Dark mode theme
- [ ] Customizable dashboard layouts
- [ ] Export data (CSV, PDF reports)
- [ ] Backtesting visualization
- [ ] Strategy parameter optimization UI

## License

MIT

## Support

For issues or questions about the dashboard:
1. Check this documentation
2. Review the example: `npm run example:dashboard`
3. Check logs for error messages
4. Review the codebase in `src/dashboard/`
