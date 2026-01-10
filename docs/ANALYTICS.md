# Portfolio Analytics Module

Comprehensive portfolio analytics and performance reporting system for the trading bot.

## 📋 Overview

The Portfolio Analytics module provides deep insights into trading performance with:
- **Performance Metrics**: Returns, Sharpe/Sortino ratios, VaR, drawdowns
- **Trade Analysis**: Win rates, profit factors, trade distribution
- **Strategy & Asset Breakdown**: Performance by strategy and trading pair
- **Risk Analytics**: Correlation matrices, exposure analysis
- **Report Generation**: Daily, weekly, monthly, and yearly reports

## 🚀 Quick Start

```typescript
import { PortfolioAnalytics } from './src/analytics/PortfolioAnalytics.js';

// Create analytics instance
const analytics = new PortfolioAnalytics({
  riskFreeRate: 0.03, // 3% annual risk-free rate
  tradingDaysPerYear: 365, // Crypto markets trade 24/7
});

// Calculate performance metrics
const metrics = await analytics.calculatePerformanceMetrics(trades, equityCurve);

console.log(`Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}`);
console.log(`Max Drawdown: ${metrics.maxDrawdown.toFixed(2)}%`);
```

## 📊 Key Metrics

### Performance Metrics

#### Returns
- **Total Return**: Absolute and percentage returns
- **Annualized Return**: Yearly equivalent performance
- **CAGR**: Compound Annual Growth Rate
- **TWR**: Time-Weighted Return (independent of deposits/withdrawals)
- **MWR**: Money-Weighted Return (includes cash flow timing)

#### Risk-Adjusted Returns
- **Sharpe Ratio**: Return per unit of total risk
  ```
  Sharpe = (Return - RiskFreeRate) / Volatility
  ```
  - \> 2.0: Excellent
  - 1.0-2.0: Good
  - 0-1.0: Sub-optimal
  - \< 0: Poor

- **Sortino Ratio**: Return per unit of downside risk
  - Only considers negative volatility
  - Higher is better (focuses on harmful volatility)

- **Calmar Ratio**: Return per unit of maximum drawdown
  ```
  Calmar = AnnualizedReturn / MaxDrawdown
  ```

#### Risk Metrics
- **Value at Risk (VaR)**: Maximum expected loss at 95% and 99% confidence
- **Conditional VaR (CVaR)**: Expected loss beyond VaR threshold
- **Maximum Drawdown**: Largest peak-to-trough decline
- **Average Drawdown**: Mean of all drawdown periods
- **Volatility**: Standard deviation of returns
- **Downside Deviation**: Volatility of negative returns only

### Trade Statistics

```typescript
const stats = analytics.calculateTradeStatistics(trades);

console.log(`Win Rate: ${stats.winRate.toFixed(2)}%`);
console.log(`Profit Factor: ${stats.profitFactor.toFixed(2)}`);
console.log(`Average Win: ${stats.avgWin.toFixed(2)}%`);
console.log(`Average Loss: ${stats.avgLoss.toFixed(2)}%`);
```

#### Key Trade Metrics
- **Win Rate**: Percentage of profitable trades
- **Profit Factor**: Gross profit ÷ gross loss (>1.5 is good)
- **Win/Loss Ratio**: Average win ÷ average loss
- **Average Trade Duration**: Mean holding time
- **Consecutive Wins/Losses**: Maximum streaks
- **Turnover Rate**: Trading frequency

### Strategy Performance

```typescript
const strategies = analytics.getStrategyPerformance(trades);

strategies.forEach(strategy => {
  console.log(`${strategy.strategy}:`);
  console.log(`  Trades: ${strategy.trades}`);
  console.log(`  Win Rate: ${strategy.winRate.toFixed(2)}%`);
  console.log(`  PnL: $${strategy.pnl.toFixed(2)}`);
  console.log(`  Sharpe: ${strategy.sharpeRatio.toFixed(2)}`);
});
```

Breakdown by trading strategy:
- Total trades and win rate
- Profit & loss (absolute and percentage)
- Risk-adjusted metrics (Sharpe ratio)
- Average position size and duration
- Maximum drawdown

### Asset Performance

```typescript
const assets = analytics.getAssetPerformance(trades);

assets.forEach(asset => {
  console.log(`${asset.asset}:`);
  console.log(`  PnL: $${asset.pnl.toFixed(2)}`);
  console.log(`  Win Rate: ${asset.winRate.toFixed(2)}%`);
  console.log(`  Largest Win: ${asset.largestWin.toFixed(2)}%`);
});
```

Breakdown by trading pair:
- Performance metrics per asset
- Trade frequency and volume
- Best and worst trades
- Average holding time

### Drawdown Analysis

```typescript
const drawdown = analytics.calculateDrawdown(equityCurve);

console.log(`Max Drawdown: ${drawdown.maxDrawdown.toFixed(2)}%`);
console.log(`Days since ATH: ${drawdown.daysSinceATH}`);
console.log(`Drawdown Periods: ${drawdown.drawdownPeriods.length}`);
```

Tracks portfolio declines:
- Maximum drawdown (peak to trough)
- Current drawdown status
- Days since all-time high
- Historical drawdown periods with recovery times

### Correlation Matrix

```typescript
const correlation = analytics.calculateCorrelationMatrix(trades);

console.log('Asset Correlations:');
correlation.matrix.forEach((row, i) => {
  console.log(`${correlation.assets[i]}: ${row.join(', ')}`);
});
```

Shows how asset returns move together:
- 1.0: Perfect positive correlation
- 0.0: No correlation
- -1.0: Perfect negative correlation

Use to identify diversification opportunities.

### Risk Exposure

```typescript
const currentPositions = [
  { asset: 'BTC/USDT', size: 5000 },
  { asset: 'ETH/USDT', size: 3000 },
];

const exposure = analytics.calculateRiskExposure(
  currentPositions,
  totalEquity,
  trades
);

console.log(`Current Exposure: ${exposure.currentExposure.toFixed(2)}%`);
console.log(`Concentration Risk: ${exposure.concentrationRisk.toFixed(2)}%`);
```

Analyzes portfolio risk:
- Current market exposure percentage
- Position sizing metrics
- Concentration in top holdings
- Historical exposure levels

## 📈 Report Generation

### Generate Comprehensive Report

```typescript
const report = await analytics.generateReport(
  trades,
  equityCurve,
  {
    start: new Date('2025-01-01'),
    end: new Date('2025-01-31'),
    type: 'monthly',
  },
  currentPositions
);

console.log('Report Summary:');
console.log(`Total Return: ${report.summary.totalReturn.toFixed(2)}%`);
console.log(`Sharpe Ratio: ${report.summary.sharpeRatio.toFixed(2)}`);
console.log(`Win Rate: ${report.summary.winRate.toFixed(2)}%`);
```

Report includes:
- Performance metrics
- Trade statistics
- Strategy breakdown
- Asset breakdown
- Equity curve
- Drawdown analysis
- Risk exposure
- Correlation matrix

### Report Types
- **Daily**: Previous day's performance
- **Weekly**: Last 7 days
- **Monthly**: Calendar month
- **Yearly**: Annual performance
- **Custom**: Any date range

## 🗄️ Database Integration

### Integram Database Schema

The analytics module integrates with Integram cloud database:

#### Tables
1. **Trade Analytics**: Detailed trade records
2. **Daily Portfolio Snapshot**: Daily portfolio state
3. **Strategy Performance**: Performance by strategy
4. **Asset Performance**: Performance by asset
5. **Analytics Reports**: Generated reports
6. **Equity Curve Points**: Historical equity data
7. **Drawdown Periods**: Significant drawdown events

### Setup Integram Tables

Set environment variables for table type IDs:

```bash
INTEGRAM_TYPE_TRADE_ANALYTICS=100
INTEGRAM_TYPE_DAILY_PORTFOLIO_SNAPSHOT=101
INTEGRAM_TYPE_STRATEGY_PERFORMANCE=102
INTEGRAM_TYPE_ASSET_PERFORMANCE=103
INTEGRAM_TYPE_ANALYTICS_REPORTS=104
```

### Save Data to Integram

```typescript
import { IntegramClient } from './src/database/integram/IntegramClient.js';
import { AnalyticsRepository } from './src/database/integram/AnalyticsRepository.js';
import { ANALYTICS_TYPES } from './src/database/integram/analytics-types.js';

// Initialize client
const client = new IntegramClient({
  serverURL: process.env.INTEGRAM_SERVER_URL!,
  database: process.env.INTEGRAM_DATABASE!,
  login: process.env.INTEGRAM_LOGIN!,
  password: process.env.INTEGRAM_PASSWORD!,
});

const repository = new AnalyticsRepository(client);

// Save trades
await repository.saveTrades(trades, ANALYTICS_TYPES.TRADE_ANALYTICS);

// Save daily snapshot
await repository.saveDailySnapshot(snapshot, ANALYTICS_TYPES.DAILY_PORTFOLIO_SNAPSHOT);

// Save report
await repository.saveReport(report, ANALYTICS_TYPES.ANALYTICS_REPORTS);
```

## 🌐 API Endpoints

### Performance Metrics
```
GET /api/analytics/performance?period=month&startDate=2025-01-01&endDate=2025-01-31
```

### Returns
```
GET /api/analytics/returns?period=all
```

### Trade Statistics
```
GET /api/analytics/trades/stats?startDate=2025-01-01&endDate=2025-01-31
```

### Strategy Performance
```
GET /api/analytics/strategies
```

### Asset Performance
```
GET /api/analytics/assets
```

### Drawdown Analysis
```
GET /api/analytics/drawdown
```

### Correlation Matrix
```
GET /api/analytics/correlation
```

### Risk Exposure
```
GET /api/analytics/risk-exposure
```

### Comprehensive Report
```
GET /api/analytics/report?periodType=monthly&startDate=2025-01-01&endDate=2025-01-31
```

## 📝 Example Usage

See `examples/analytics-example.ts` for a complete working example.

Run the example:
```bash
npm run example:analytics
```

## 🧪 Testing

Run analytics tests:
```bash
npm run test:analytics
```

## 📚 Best Practices

1. **Regular Snapshots**: Save daily portfolio snapshots for historical analysis
2. **Benchmark Comparison**: Compare against BTC/market returns
3. **Risk Monitoring**: Track drawdowns and exposure regularly
4. **Strategy Review**: Analyze strategy performance monthly
5. **Data Retention**: Keep at least 1 year of trade history
6. **Report Automation**: Generate and save reports automatically

## 🔧 Configuration

```typescript
const analytics = new PortfolioAnalytics({
  riskFreeRate: 0.03,        // 3% annual risk-free rate
  tradingDaysPerYear: 365,   // Crypto markets trade 24/7
  benchmark: 'BTC',          // Compare against BTC
  includeOpenPositions: true, // Include unrealized PnL
});
```

## 📊 Interpreting Results

### Sharpe Ratio Guidelines
- \> 3.0: Exceptional
- 2.0-3.0: Very Good
- 1.0-2.0: Good
- 0.5-1.0: Acceptable
- \< 0.5: Poor

### Win Rate Guidelines
- \> 60%: Excellent
- 50-60%: Good
- 40-50%: Acceptable (if profit factor > 1.5)
- \< 40%: Review strategy

### Profit Factor Guidelines
- \> 2.0: Excellent
- 1.5-2.0: Good
- 1.0-1.5: Acceptable
- \< 1.0: Unprofitable

### Drawdown Guidelines
- \< 10%: Excellent
- 10-20%: Good
- 20-30%: Acceptable
- \> 30%: High risk

## 🚧 Future Enhancements

- [ ] Monte Carlo simulation for forward projections
- [ ] Machine learning for performance prediction
- [ ] Portfolio optimization recommendations
- [ ] A/B testing framework for strategies
- [ ] Custom user-defined metrics
- [ ] Social comparison / leaderboards
- [ ] Advanced visualization charts
- [ ] PDF export for reports

## 📖 References

- [Sharpe Ratio (Investopedia)](https://www.investopedia.com/terms/s/sharperatio.asp)
- [Sortino Ratio (Investopedia)](https://www.investopedia.com/terms/s/sortinoratio.asp)
- [Maximum Drawdown (Investopedia)](https://www.investopedia.com/terms/m/maximum-drawdown-mdd.asp)
- [Value at Risk (VaR)](https://www.investopedia.com/terms/v/var.asp)

---

For implementation details, see:
- `src/analytics/PortfolioAnalytics.ts` - Core analytics engine
- `src/analytics/types.ts` - Type definitions
- `src/database/integram/AnalyticsRepository.ts` - Database integration
- `tests/analytics/portfolio-analytics.test.ts` - Test suite
