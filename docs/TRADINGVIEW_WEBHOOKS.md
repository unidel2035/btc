# TradingView Webhook Integration

## Overview

The TradingView Webhook Integration allows you to use professional TradingView indicators and Pine Script strategies to generate automated trading signals for your bot.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    TRADINGVIEW                          │
│  - Pine Script Strategy                                 │
│  - Custom Indicators                                    │
│  - Built-in Alerts                                      │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ Webhook POST
                   ▼
┌─────────────────────────────────────────────────────────┐
│              BTC TRADING BOT API                        │
│  POST /api/webhooks/tradingview                         │
│    - Validate signature                                 │
│    - Parse alert message                                │
│    - Create trading signal                              │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│              WEBHOOK SERVICE                            │
│    - Signal validation                                  │
│    - Risk checks                                        │
│    - Position sizing                                    │
│    - Execute or queue trade                             │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Get Your Webhook URL

Your webhook URL is:
```
https://your-domain.com/api/webhooks/tradingview
```

For local development:
```
http://localhost:8080/api/webhooks/tradingview
```

### 2. Get Your Secret Key

The secret key is configured in your environment variables:
```bash
TRADINGVIEW_WEBHOOK_SECRET=your-secret-key-here
```

You can also generate a new secret via the API:
```bash
curl -X POST http://localhost:8080/api/webhooks/config/regenerate-secret
```

### 3. Create TradingView Alert

In TradingView:
1. Open your chart
2. Click on "Alert" (clock icon) or press Alt+A
3. Set your alert conditions
4. In "Notifications" tab, select "Webhook URL"
5. Enter your webhook URL
6. In "Message" field, enter the JSON payload (see below)

## Webhook Message Format

### Basic Example

```json
{
  "secret": "your-secret-key-here",
  "ticker": "{{ticker}}",
  "action": "buy",
  "price": {{close}}
}
```

### Complete Example with All Fields

```json
{
  "secret": "your-secret-key-here",
  "ticker": "{{ticker}}",
  "action": "{{strategy.order.action}}",
  "price": {{close}},
  "stop_loss": {{low}},
  "take_profit": {{high}},
  "position_size": 2.5,
  "strategy": "{{strategy.name}}",
  "alert_name": "BTC Breakout",
  "confidence": 0.85,
  "interval": "{{interval}}",
  "time": "{{timenow}}",
  "exchange": "{{exchange}}",
  "volume": {{volume}},
  "signal_type": "breakout"
}
```

### Field Descriptions

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `secret` | ✅ Yes | string | Your webhook secret key for authentication |
| `ticker` | ✅ Yes | string | Trading pair (e.g., "BTCUSDT") |
| `action` | ✅ Yes | string | Trading action: "buy", "sell", "long", "short", "close_long", "close_short", "close_all" |
| `price` | ✅ Yes | number | Current or entry price |
| `stop_loss` | ❌ No | number | Stop loss price (calculated automatically if not provided) |
| `take_profit` | ❌ No | number | Take profit price (calculated automatically if not provided) |
| `position_size` | ❌ No | number | Position size as % of portfolio (calculated automatically if not provided) |
| `strategy` | ❌ No | string | Strategy name for tracking |
| `alert_name` | ❌ No | string | Alert name for identification |
| `confidence` | ❌ No | number | Signal confidence (0-1), default 0.7 |
| `interval` | ❌ No | string | Timeframe (e.g., "1h", "4h") |
| `time` | ❌ No | string | Timestamp |
| `exchange` | ❌ No | string | Exchange name |
| `volume` | ❌ No | number | Trading volume |

### TradingView Placeholders

You can use TradingView's built-in placeholders in your alert message:

| Placeholder | Description | Example |
|------------|-------------|---------|
| `{{ticker}}` | Symbol | BTCUSDT |
| `{{close}}` | Close price | 45230.50 |
| `{{open}}` | Open price | 45100.00 |
| `{{high}}` | High price | 45500.00 |
| `{{low}}` | Low price | 45000.00 |
| `{{volume}}` | Volume | 12500.5 |
| `{{time}}` | Bar time | 2024-01-15 14:30:00 |
| `{{timenow}}` | Current time | 2024-01-15 14:35:22 |
| `{{interval}}` | Timeframe | 1H |
| `{{exchange}}` | Exchange | BINANCE |
| `{{strategy.order.action}}` | Order action | buy |
| `{{strategy.position_size}}` | Position size | 0.1 |

## Supported Actions

### Entry Signals

- **`buy`** or **`long`**: Open a long position
  ```json
  {
    "action": "buy",
    "ticker": "BTCUSDT",
    "price": 45000
  }
  ```

- **`sell`** or **`short`**: Open a short position
  ```json
  {
    "action": "sell",
    "ticker": "BTCUSDT",
    "price": 45000
  }
  ```

### Exit Signals

- **`close_long`**: Close long position
- **`close_short`**: Close short position
- **`close_all`**: Close all positions for the ticker

### Modify Signals

- **`update_sl`**: Update stop loss
- **`update_tp`**: Update take profit
- **`trailing_stop`**: Activate trailing stop

## Pine Script Examples

### Example 1: Simple Moving Average Crossover

```pine
//@version=5
strategy("SMA Crossover Webhook", overlay=true)

// Parameters
fast_length = input.int(20, "Fast SMA")
slow_length = input.int(50, "Slow SMA")

// Calculate SMAs
fast_sma = ta.sma(close, fast_length)
slow_sma = ta.sma(close, slow_length)

// Plot SMAs
plot(fast_sma, color=color.blue, title="Fast SMA")
plot(slow_sma, color=color.red, title="Slow SMA")

// Trading logic
longCondition = ta.crossover(fast_sma, slow_sma)
shortCondition = ta.crossunder(fast_sma, slow_sma)

if (longCondition)
    strategy.entry("Long", strategy.long)

if (shortCondition)
    strategy.entry("Short", strategy.short)

// Alert conditions
alertcondition(longCondition, "Long Signal", "Buy Signal")
alertcondition(shortCondition, "Short Signal", "Sell Signal")
```

**Alert Message for Long:**
```json
{
  "secret": "YOUR_SECRET",
  "ticker": "{{ticker}}",
  "action": "buy",
  "price": {{close}},
  "strategy": "SMA Crossover",
  "interval": "{{interval}}",
  "time": "{{timenow}}"
}
```

### Example 2: RSI Strategy with Stop Loss/Take Profit

```pine
//@version=5
strategy("RSI Webhook Strategy", overlay=false)

// Parameters
rsi_length = input.int(14, "RSI Length")
rsi_oversold = input.int(30, "Oversold Level")
rsi_overbought = input.int(70, "Overbought Level")
sl_percent = input.float(2.0, "Stop Loss %")
tp_percent = input.float(4.0, "Take Profit %")

// Calculate RSI
rsi = ta.rsi(close, rsi_length)

// Plot RSI
plot(rsi, color=color.blue, title="RSI")
hline(rsi_overbought, "Overbought", color=color.red)
hline(rsi_oversold, "Oversold", color=color.green)

// Trading logic
longCondition = ta.crossover(rsi, rsi_oversold)
shortCondition = ta.crossunder(rsi, rsi_overbought)

// Calculate SL/TP levels
long_sl = close * (1 - sl_percent/100)
long_tp = close * (1 + tp_percent/100)
short_sl = close * (1 + sl_percent/100)
short_tp = close * (1 - tp_percent/100)

if (longCondition)
    strategy.entry("Long", strategy.long)

if (shortCondition)
    strategy.entry("Short", strategy.short)

// Alert conditions
alertcondition(longCondition, "RSI Buy", "RSI Oversold - Buy")
alertcondition(shortCondition, "RSI Sell", "RSI Overbought - Sell")
```

**Alert Message for Long:**
```json
{
  "secret": "YOUR_SECRET",
  "ticker": "{{ticker}}",
  "action": "buy",
  "price": {{close}},
  "stop_loss": {{low}},
  "take_profit": {{high}},
  "confidence": 0.8,
  "strategy": "RSI Strategy",
  "signal_type": "momentum"
}
```

### Example 3: Breakout Strategy

```pine
//@version=5
strategy("Breakout Webhook", overlay=true)

// Parameters
length = input.int(20, "Channel Length")
breakout_confirm = input.int(2, "Breakout Confirmation Bars")

// Calculate Donchian Channel
upper = ta.highest(high, length)
lower = ta.lowest(low, length)
middle = (upper + lower) / 2

// Plot channel
plot(upper, color=color.green, title="Upper Channel")
plot(lower, color=color.red, title="Lower Channel")
plot(middle, color=color.gray, title="Middle")

// Breakout conditions
bullish_breakout = ta.crossover(close, upper[breakout_confirm])
bearish_breakout = ta.crossunder(close, lower[breakout_confirm])

if (bullish_breakout)
    strategy.entry("Breakout Long", strategy.long)

if (bearish_breakout)
    strategy.entry("Breakout Short", strategy.short)

alertcondition(bullish_breakout, "Bullish Breakout", "Price broke above channel")
alertcondition(bearish_breakout, "Bearish Breakout", "Price broke below channel")
```

**Alert Message:**
```json
{
  "secret": "YOUR_SECRET",
  "ticker": "{{ticker}}",
  "action": "buy",
  "price": {{close}},
  "stop_loss": {{low}},
  "position_size": 3.0,
  "confidence": 0.9,
  "strategy": "Donchian Breakout",
  "signal_type": "breakout",
  "interval": "{{interval}}"
}
```

## API Endpoints

### POST /api/webhooks/tradingview

Receive webhook signals from TradingView.

**Request Body:**
```json
{
  "secret": "your-secret-key",
  "ticker": "BTCUSDT",
  "action": "buy",
  "price": 45000
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "signal_id": "550e8400-e29b-41d4-a716-446655440000",
  "action": "queued_for_execution",
  "warnings": []
}
```

**Error Response (400):**
```json
{
  "status": "rejected",
  "signal_id": "550e8400-e29b-41d4-a716-446655440000",
  "errors": ["Price deviation too high: 5.2%"],
  "warnings": []
}
```

### GET /api/webhooks/signals

Get recent webhook signals.

**Query Parameters:**
- `limit` (number, default: 50): Number of signals to retrieve
- `status` (string, optional): Filter by status (`received`, `validated`, `queued`, `executed`, `rejected`)

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "signal": {
      "source": "tradingview",
      "strategy": "SMA Crossover",
      "ticker": "BTCUSDT",
      "action": "buy",
      "price": 45000,
      "confidence": 0.8
    },
    "receivedAt": "2024-01-15T14:30:00Z",
    "status": "executed",
    "executedAt": "2024-01-15T14:30:05Z"
  }
]
```

### GET /api/webhooks/stats

Get webhook statistics.

**Query Parameters:**
- `period` (string, default: "24h"): Time period (`1h`, `24h`, `7d`)

**Response:**
```json
{
  "period": "24h",
  "totalReceived": 45,
  "totalExecuted": 42,
  "totalRejected": 3,
  "executionRate": 93.33,
  "rejectionRate": 6.67,
  "byStrategy": {
    "SMA Crossover": 20,
    "RSI Strategy": 15,
    "Breakout": 10
  },
  "byAction": {
    "buy": 25,
    "sell": 17,
    "close_long": 3
  }
}
```

### GET /api/webhooks/config

Get webhook configuration (secret key is masked).

**Response:**
```json
{
  "secretKey": "12345678********",
  "autoExecute": true,
  "maxSignalsPerMinute": 60,
  "supportedTickers": ["BTCUSDT", "ETHUSDT", "BNBUSDT"]
}
```

### PATCH /api/webhooks/config

Update webhook configuration.

**Request Body:**
```json
{
  "autoExecute": false,
  "maxSignalsPerMinute": 30
}
```

### POST /api/webhooks/config/regenerate-secret

Generate a new webhook secret key.

**Response:**
```json
{
  "message": "Secret key regenerated successfully",
  "secretKey": "new-secret-key-here",
  "warning": "Update this secret in your TradingView alerts immediately"
}
```

## Security

### 1. Secret Key Authentication

Every webhook request must include the correct secret key:
```json
{
  "secret": "your-secret-key-here"
}
```

Requests with invalid or missing secret keys are rejected with `401 Unauthorized`.

### 2. Rate Limiting

Default limits:
- **60 requests per minute** per strategy
- **60 seconds cooldown** between duplicate signals (same ticker + action)
- **10 maximum concurrent** webhook positions

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642256400
```

When rate limit is exceeded, you'll receive `429 Too Many Requests`.

### 3. Signal Validation

All signals are validated for:
- ✅ Required fields (ticker, action, price)
- ✅ Supported ticker
- ✅ Valid action type
- ✅ Reasonable price (max 5% deviation from current market price)
- ✅ Valid stop loss/take profit levels
- ✅ Position size within limits
- ✅ No duplicate signals within cooldown period

### 4. IP Whitelist (Optional)

You can enable IP whitelisting to only accept requests from specific IPs:
```json
{
  "enableIpWhitelist": true,
  "allowedIps": ["52.89.214.238", "34.212.75.30"]
}
```

### 5. HMAC Signature (Optional)

For additional security, enable HMAC signature validation:
```json
{
  "enableSignatureValidation": true
}
```

Include signature in request header:
```
X-TradingView-Signature: <hmac-sha256-signature>
```

## Configuration

### Environment Variables

```bash
# Webhook secret key
TRADINGVIEW_WEBHOOK_SECRET=your-secret-key-here

# Auto-execute signals (true/false)
WEBHOOK_AUTO_EXECUTE=true

# Maximum position size from webhooks (%)
WEBHOOK_MAX_POSITION_SIZE=5

# Supported tickers (comma-separated)
WEBHOOK_SUPPORTED_TICKERS=BTCUSDT,ETHUSDT,BNBUSDT
```

### Runtime Configuration

Update configuration via API:
```bash
curl -X PATCH http://localhost:8080/api/webhooks/config \
  -H "Content-Type: application/json" \
  -d '{
    "autoExecute": false,
    "maxPositionSizePercent": 3,
    "supportedTickers": ["BTCUSDT", "ETHUSDT"]
  }'
```

## Troubleshooting

### Signal Rejected: "Invalid secret key"

**Cause:** The secret key in your alert message doesn't match the configured secret.

**Solution:**
1. Get your current secret: `GET /api/webhooks/config`
2. Update the `secret` field in your TradingView alert

### Signal Rejected: "Price deviation too high"

**Cause:** The price in your alert is more than 5% different from current market price.

**Solution:**
- Use `{{close}}` placeholder for price instead of hardcoded values
- Check that your alert is firing in a timely manner
- Review TradingView alert conditions

### Signal Rejected: "Duplicate signal detected"

**Cause:** Same ticker + action within the cooldown period (default 60 seconds).

**Solution:**
- Wait for cooldown period to expire
- Adjust cooldown in configuration if needed
- Ensure your strategy isn't generating duplicate signals

### Rate Limit Exceeded (429)

**Cause:** Too many signals in a short time period.

**Solution:**
- Reduce alert frequency in TradingView
- Increase `maxSignalsPerMinute` in configuration
- Use different strategy names for different alerts

## Best Practices

1. **Test with Paper Trading First**
   - Set `autoExecute: false`
   - Manually review queued signals
   - Verify signal quality before enabling auto-execution

2. **Use Descriptive Strategy Names**
   ```json
   {
     "strategy": "BTC_RSI_4H",
     "alert_name": "BTC RSI Oversold 4H Chart"
   }
   ```

3. **Always Include Stop Loss**
   - Set reasonable SL levels
   - Use ATR-based stops for volatility adjustment
   ```json
   {
     "stop_loss": {{low}},
     "take_profit": {{high}}
   }
   ```

4. **Monitor Webhook Statistics**
   - Check rejection rate regularly
   - Review execution rate
   - Identify problematic strategies

5. **Rotate Secret Keys Periodically**
   - Generate new secrets every 90 days
   - Update all TradingView alerts after rotation

6. **Use Confidence Scores**
   - Higher confidence = larger position size
   - Filter low-confidence signals
   ```json
   {
     "confidence": 0.85
   }
   ```

## Support

For issues or questions:
- Check the [GitHub Issues](https://github.com/your-repo/issues)
- Review API documentation
- Test with webhook debugging tools (e.g., webhook.site)
