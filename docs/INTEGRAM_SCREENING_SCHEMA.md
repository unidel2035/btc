# Integram Screening Database Schema

This document describes the database schema for storing screening module data in Integram.

## Overview

The screening integration uses 6 main tables to store reports, recommendations, and historical data:

1. **Screening Reports** - Main table for screening reports
2. **Screening Recommendations** - Project recommendations (subordinate to reports)
3. **Cryptocurrencies** - Lookup table for cryptocurrency projects
4. **Sectors** - Lookup table for crypto sectors
5. **Sector Performance** - Historical sector metrics (subordinate to reports)
6. **Project Metrics History** - Time-series data for project metrics

Additionally, 2 lookup tables for status codes:

7. **Report Status** - Report status values (completed/failed/in_progress)
8. **Risk Levels** - Risk level values (low/medium/high)

## Table Definitions

### 1. Screening Reports (Отчеты скрининга)

Main table storing screening report metadata.

**Fields:**
- **value** (text): Report timestamp in ISO format
- **generatedAt** (datetime): Date and time the report was generated
- **analyzedSectors** (long text): JSON array of sector names analyzed
- **projectsCount** (number): Total number of projects analyzed
- **status** (reference → Report Status): Report status
- **duration** (number): Execution time in seconds
- **moduleVersion** (text): Screening module version
- **configParams** (long text): JSON configuration used

**Environment Variable:** `INTEGRAM_TYPE_SCREENING_REPORTS`

### 2. Screening Recommendations (Рекомендации)

Project recommendations from screening reports. **Subordinate to Screening Reports**.

**Fields:**
- **value** (text): Ticker symbol
- **up** (reference): Parent Screening Report ID
- **rank** (number): Recommendation rank (1-4)
- **ticker** (text): Cryptocurrency ticker
- **name** (text): Project name
- **sector** (reference → Sectors): Project sector
- **compositeScore** (number): Overall score (0-100)
- **fundamentalScore** (number): Fundamental analysis score
- **marketScore** (number): Market metrics score
- **communityScore** (number): Community/social score
- **rationale** (long text): Reason for recommendation
- **keyRisk** (long text): Main risk factor
- **riskLevel** (reference → Risk Levels): Risk classification
- **marketCap** (number): Market capitalization (USD)
- **priceToAth** (number): Price distance from ATH (%)
- **volume24h** (number): 24h trading volume (USD)
- **tradingPairs** (long text): JSON array of trading pairs

**Environment Variable:** `INTEGRAM_TYPE_SCREENING_RECOMMENDATIONS`

### 3. Cryptocurrencies (Справочник криптовалют)

Lookup table for cryptocurrency projects.

**Fields:**
- **value** (text): Ticker symbol (unique)
- **name** (text): Full project name
- **coinGeckoId** (text): CoinGecko API identifier
- **logoUrl** (text): Project logo URL
- **website** (text): Official website URL
- **description** (long text): Project description
- **lastUpdated** (datetime): Last data update timestamp

**Environment Variable:** `INTEGRAM_TYPE_CRYPTOCURRENCIES`

### 4. Sectors (Справочник секторов)

Lookup table for crypto sectors/categories.

**Fields:**
- **value** (text): Sector name (unique)
- **description** (long text): Sector description
- **narrative** (long text): Current narrative/thesis
- **color** (text): Hex color code for UI (#RRGGBB)

**Environment Variable:** `INTEGRAM_TYPE_SECTORS`

**Predefined Values:**
- ai-crypto (#FF6B6B)
- depin (#4ECDC4)
- rwa (#45B7D1)
- modular-blockchain (#96CEB4)
- l2-solutions (#FFEAA7)
- dex (#DFE6E9)
- nft-fi (#A29BFE)
- defi (#FD79A8)
- gaming (#FDCB6E)
- metaverse (#6C5CE7)

### 5. Sector Performance (Производительность секторов)

Historical sector performance data. **Subordinate to Screening Reports**.

**Fields:**
- **value** (text): Sector name
- **up** (reference): Parent Screening Report ID
- **sector** (reference → Sectors): Sector reference
- **marketCapGrowth30d** (number): 30-day market cap growth (%)
- **marketCapGrowth90d** (number): 90-day market cap growth (%)
- **sectorScore** (number): Calculated sector score
- **selected** (boolean): Was selected for detailed analysis
- **rationale** (long text): Selection/rejection reasoning

**Environment Variable:** `INTEGRAM_TYPE_SECTOR_PERFORMANCE`

### 6. Project Metrics History (История метрик проектов)

Time-series historical data for project metrics.

**Fields:**
- **value** (text): Timestamp in ISO format
- **project** (reference → Cryptocurrencies): Project ticker
- **date** (datetime): Measurement date/time
- **marketCap** (number): Market capitalization (USD)
- **tradingVolume24h** (number): 24-hour trading volume (USD)
- **price** (number): Price in USD
- **priceChange30d** (number): 30-day price change (%)
- **tvl** (number, nullable): Total Value Locked (for DeFi)
- **socialScore** (number): Social/community score
- **compositeScore** (number): Overall screening score

**Environment Variable:** `INTEGRAM_TYPE_PROJECT_METRICS_HISTORY`

### 7. Report Status (Справочник статусов отчетов)

Lookup table for report status values.

**Values:**
- completed
- failed
- in_progress

**Environment Variable:** `INTEGRAM_TYPE_REPORT_STATUS`

### 8. Risk Levels (Справочник уровней риска)

Lookup table for risk classifications.

**Values:**
- low
- medium
- high

**Environment Variable:** `INTEGRAM_TYPE_RISK_LEVELS`

## Setup Instructions

### 1. Create Tables in Integram

Log in to the Integram web interface and create the tables according to the definitions above.

### 2. Configure Environment Variables

After creating the tables, note their Type IDs and add them to your `.env` file:

```bash
# Integram Connection
INTEGRAM_SERVER_URL=https://api.integram.ru
INTEGRAM_DATABASE=your_database_name
INTEGRAM_LOGIN=your_login
INTEGRAM_PASSWORD=your_password

# Screening Table Type IDs
INTEGRAM_TYPE_SCREENING_REPORTS=123
INTEGRAM_TYPE_SCREENING_RECOMMENDATIONS=124
INTEGRAM_TYPE_CRYPTOCURRENCIES=125
INTEGRAM_TYPE_SECTORS=126
INTEGRAM_TYPE_SECTOR_PERFORMANCE=127
INTEGRAM_TYPE_PROJECT_METRICS_HISTORY=128
INTEGRAM_TYPE_REPORT_STATUS=129
INTEGRAM_TYPE_RISK_LEVELS=130
```

### 3. Populate Lookup Tables

Use the Integram interface to populate the lookup tables:

#### Sectors
Create records for each sector with appropriate colors and descriptions.

#### Report Status
- completed
- failed
- in_progress

#### Risk Levels
- low
- medium
- high

## Usage Examples

### Save Screening Report

```typescript
import { ScreeningModule } from './src/analyzers/screening/ScreeningModule.js';
import { IntegramClient } from './src/database/integram/index.js';

const integramClient = new IntegramClient({
  serverURL: process.env.INTEGRAM_SERVER_URL!,
  database: process.env.INTEGRAM_DATABASE!,
  login: process.env.INTEGRAM_LOGIN!,
  password: process.env.INTEGRAM_PASSWORD!,
});

const screeningModule = new ScreeningModule(
  process.env.COINGECKO_API_KEY,
  undefined,
  integramClient // Auto-save enabled
);

const report = await screeningModule.runScreening();
// Report is automatically saved to Integram!
```

### Query Historical Data

```typescript
import { ScreeningRepository } from './src/database/integram/index.js';

const repository = new ScreeningRepository(integramClient);

// Get latest report
const latest = await repository.getLatestReport();

// Get report history
const history = await repository.getReportHistory(10);

// Get top projects
const topProjects = await repository.getTopProjects('month');

// Get sector trends
const trends = await repository.getSectorTrends(90);

// Get project history
const btcHistory = await repository.getProjectHistory('BTC', 90);
```

### Analytics and Backtesting

```typescript
import { ScreeningAnalytics } from './src/database/integram/index.js';

const analytics = new ScreeningAnalytics(integramClient, process.env.COINGECKO_API_KEY);

// Calculate prediction accuracy
const accuracy = await analytics.calculateAccuracy(reportId, 30);
console.log(`Win rate: ${accuracy.winRate}%`);
console.log(`Avg return: ${accuracy.avgPriceChange}%`);

// Analyze sector performance
const sectorAnalysis = await analytics.analyzeSectorPerformance('quarter');

// Get analytics summary
const summary = await analytics.getAnalyticsSummary(30);
```

### Background Synchronization

```typescript
import { ScreeningSync } from './src/database/integram/index.js';

const sync = new ScreeningSync(integramClient, process.env.COINGECKO_API_KEY);

// Start background jobs
sync.start(); // Daily metrics + weekly accuracy calculations

// Or run one-time sync
await sync.syncAll();
```

## Data Relationships

```
Screening Reports (parent)
├── Screening Recommendations (subordinate)
└── Sector Performance (subordinate)

Cryptocurrencies (lookup)
└── Referenced by: Recommendations, Project Metrics History

Sectors (lookup)
├── Referenced by: Recommendations
└── Referenced by: Sector Performance

Report Status (lookup)
└── Referenced by: Screening Reports

Risk Levels (lookup)
└── Referenced by: Screening Recommendations

Project Metrics History (independent)
└── References: Cryptocurrencies
```

## Performance Considerations

### Indexes
Consider creating indexes on:
- `Screening Reports.generatedAt` for time-based queries
- `Screening Recommendations.ticker` for project lookups
- `Project Metrics History.project` and `date` for time-series queries

### Pagination
Use the repository methods which handle pagination automatically:
- `getReportHistory(limit)` - limits number of reports
- `getTopProjects(period)` - filters by date range
- `getSectorTrends(days)` - filters by date range

### Batch Operations
For large datasets, the sync jobs batch operations and include rate limiting to avoid overwhelming the API.

## Migration Path

If you have existing screening data in local files:

1. Create all tables in Integram
2. Set up environment variables
3. Use `ScreeningRepository.saveReport()` to import historical reports
4. Start using `ScreeningModule` with Integram client for new reports

## Troubleshooting

### "Type ID is 0" Error
Make sure all `INTEGRAM_TYPE_*` environment variables are set correctly.

### Authentication Failures
Verify your Integram credentials and ensure the database name is correct.

### Missing Data
Check that:
1. Tables are created in Integram
2. Lookup tables are populated
3. Type IDs are correct in environment variables

## Next Steps

1. Set up Integram tables
2. Configure environment variables
3. Run example: `npm run example:screening-integram`
4. Start background sync for automated updates
5. Build custom analytics dashboards using the data
