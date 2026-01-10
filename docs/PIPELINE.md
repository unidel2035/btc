# Automated Trading Pipeline

## Overview

The Trading Pipeline orchestrates the complete automated trading workflow from cryptocurrency screening to trade execution. It integrates AI-powered screening, technical analysis, strategy management, risk control, and automated execution.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   AUTOMATED TRADING PIPELINE                 │
└─────────────────────────────────────────────────────────────┘

Stage 1: SCREENING (AI Agent)
   ↓
   • ScreeningModule.runScreening()
   • Selects 2-4 promising projects
   • Output: ['RNDR/USDT', 'TAO/USDT', 'HONEY/USDT']
   ↓
Stage 2: TECHNICAL ANALYSIS
   ↓
   • TradingView indicators for each pair
   • Determines entry/exit points
   • Assesses current trend
   ↓
Stage 3: SIGNAL GENERATION
   ↓
   • StrategyManager creates signals
   • Applies trading strategies
   • Filters by risk management
   ↓
Stage 4: EXECUTION
   ↓
   • Automated order placement
   • Position monitoring
   • SL/TP adjustment
```

## Components

### 1. TradingPipeline

Main orchestrator that coordinates all pipeline stages.

```typescript
import { TradingPipeline } from './src/orchestrator/TradingPipeline.js';

const pipeline = new TradingPipeline(
  config,
  screeningModule,
  technicalAnalyzer,
  strategyManager,
  riskManager
);

// Run full cycle
const report = await pipeline.runFullCycle({
  runScreening: true,
  autoTrade: false,
  notifyOnly: true
});

// Analyze market only
const analysis = await pipeline.analyzeMarket();

// Apply strategies to specific pairs
const signals = await pipeline.applyStrategies(['BTC/USDT', 'ETH/USDT']);
```

### 2. TechnicalAnalyzer

Performs technical analysis using various indicators.

```typescript
import { TechnicalAnalyzer } from './src/analyzers/technical/TechnicalAnalyzer.js';

const analyzer = new TechnicalAnalyzer();

const analysis = await analyzer.analyze('BTC/USDT', {
  indicators: ['RSI', 'MACD', 'EMA', 'BollingerBands'],
  timeframe: '4h',
  lookback: 100
});

const signals = analyzer.generateSignals(analysis);
```

### 3. PipelineScheduler

Manages automated execution using cron jobs.

```typescript
import { PipelineScheduler } from './src/orchestrator/PipelineScheduler.js';

const scheduler = new PipelineScheduler(pipeline, config);

// Initialize scheduled jobs
scheduler.initialize();

// Start automation
scheduler.start();

// Stop automation
scheduler.stop();

// Enable/disable specific jobs
scheduler.enableJob('screening');
scheduler.disableJob('signal_generation');
```

### 4. PortfolioRotationManager

Handles smooth transitions between trading pairs.

```typescript
import { PortfolioRotationManager } from './src/orchestrator/PortfolioRotationManager.js';

const rotationManager = new PortfolioRotationManager();

const plan = await rotationManager.planRotation(
  currentPairs,
  newPairs
);

console.info(`Keep: ${plan.toKeep.length}`);
console.info(`Close: ${plan.toClose.length}`);
console.info(`Open: ${plan.toOpen.length}`);
```

## Configuration

### Pipeline Config

```typescript
const config: PipelineConfig = {
  screening: {
    enabled: true,
    frequency: 'weekly',  // 'weekly' | 'biweekly' | 'monthly'
    maxPairs: 3           // 2-4 recommended
  },

  technicalAnalysis: {
    enabled: true,
    frequency: '4hours',  // 'hourly' | '4hours' | 'daily'
    indicators: ['RSI', 'MACD', 'EMA', 'BollingerBands', 'PriceChannel'],
    timeframe: '4h',      // '1h' | '4h' | '1d'
    lookback: 100
  },

  signalGeneration: {
    enabled: true,
    frequency: 'hourly',  // 'hourly' | '30min' | '15min'
    minConfidence: 0.65
  },

  riskManagement: {
    enabled: true,
    maxPositions: 4,
    maxExposure: 0.4,     // 40% max portfolio exposure
    requireApproval: false
  },

  execution: {
    mode: 'notify_only',  // 'notify_only' | 'manual_approval' | 'auto_trade' | 'dry_run'
    dailyTradeLimit: 10,
    circuitBreaker: {
      enabled: true,
      maxDailyLoss: 5     // 5%
    }
  },

  notifications: {
    enabled: true,
    channels: ['dashboard', 'telegram', 'email'],
    priorities: {
      screening: 'low',
      signal: 'high',
      position: 'high',
      error: 'high'
    }
  }
};
```

## Execution Modes

### 1. Notify Only (Recommended for Testing)

```typescript
const report = await pipeline.runFullCycle({
  notifyOnly: true
});
```

- No actual trades executed
- All signals sent as notifications
- Safe for production monitoring

### 2. Dry Run

```typescript
const report = await pipeline.runFullCycle({
  dryRun: true
});
```

- Simulates trade execution
- Logs what would be executed
- No real orders placed

### 3. Manual Approval

```typescript
const report = await pipeline.runFullCycle({
  autoTrade: true
});
// With config.execution.mode = 'manual_approval'
```

- Generates signals
- Requires manual confirmation
- User approves each trade

### 4. Auto Trade

```typescript
const report = await pipeline.runFullCycle({
  autoTrade: true
});
// With config.execution.mode = 'auto_trade'
```

- Fully automated execution
- Requires thorough testing first
- Use with caution

## Scheduled Execution

### Default Schedule

```
- Screening:          Every Sunday 00:00 UTC
- Technical Analysis: Every 4 hours
- Signal Generation:  Every hour
- Daily Reset:        Every day 00:00 UTC
```

### Custom Schedule

Modify `PipelineScheduler` to customize cron schedules:

```typescript
// Weekly screening
'0 0 * * 0'        // Sunday midnight UTC

// Bi-weekly screening
'0 0 1,15 * *'     // 1st and 15th of month

// Every 4 hours
'0 */4 * * *'

// Every hour
'0 * * * *'
```

## Safety Features

### 1. Emergency Stop

```typescript
// Immediately stop all pipeline operations
pipeline.emergencyStop();

// Resume operations
pipeline.resume();
```

### 2. Circuit Breaker

Automatically stops trading if daily loss exceeds threshold:

```typescript
circuitBreaker: {
  enabled: true,
  maxDailyLoss: 5  // Stop if loss >= 5%
}
```

### 3. Daily Trade Limit

Limits number of trades per day:

```typescript
execution: {
  dailyTradeLimit: 10
}
```

### 4. Risk Management

All trades go through risk evaluation:

```typescript
riskManagement: {
  enabled: true,
  maxPositions: 4,
  maxExposure: 0.4,
  requireApproval: false
}
```

## Portfolio Rotation

The pipeline automatically handles portfolio rotation when new screening results arrive:

1. **Identify changes**: Compare current pairs with new screening results
2. **Plan rotation**: Determine which positions to close/open
3. **Gradual execution**: Close old positions and open new ones over time
4. **Smooth transition**: Avoid sudden portfolio changes

## Notifications

### Notification Types

- **screening_complete**: Weekly screening finished
- **signal_detected**: New trading signal found
- **position_opened**: Position opened
- **position_closed**: Position closed
- **error**: Pipeline error occurred
- **warning**: Warning condition detected

### Channels

- **dashboard**: Console/Dashboard display
- **telegram**: Telegram bot (requires setup)
- **email**: Email notifications (requires setup)
- **sms**: SMS alerts (requires setup)

## Examples

See `examples/pipeline-example.ts` for complete usage examples.

## Testing

Run pipeline tests:

```bash
npm run test:pipeline
```

Or manually:

```bash
tsx tests/orchestrator/pipeline.test.ts
```

## Best Practices

1. **Start with notify-only mode**: Monitor signals before enabling trading
2. **Test thoroughly**: Use dry-run mode with real data
3. **Start small**: Begin with low position sizes and limits
4. **Monitor actively**: Check notifications and reports regularly
5. **Use circuit breaker**: Protect against unexpected losses
6. **Regular screening**: Run weekly screening to find new opportunities
7. **Review performance**: Analyze pipeline reports and adjust configuration

## Troubleshooting

### Pipeline not generating signals

- Check if screening has run and found pairs
- Verify technical analysis indicators are enabled
- Ensure minimum confidence threshold is not too high

### Emergency stop activated

- Check circuit breaker settings
- Review daily P&L
- Verify no manual emergency stop was triggered

### Scheduler not running

- Ensure `scheduler.start()` was called
- Check cron schedule syntax
- Verify jobs are enabled

## Future Enhancements

- Dashboard UI for pipeline monitoring
- Advanced risk models
- Machine learning for signal optimization
- Multi-exchange support
- Backtesting integration
- Performance analytics
