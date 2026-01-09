# News Collector Module

## Overview

The News Collector module is responsible for gathering cryptocurrency news from various sources, deduplicating, normalizing, and storing them in a PostgreSQL database.

## Features

- ✅ Collects news from 6 different sources
- ✅ RSS feed parsing (CoinDesk, CoinTelegraph, Bitcoin Magazine)
- ✅ Web scraping with Playwright (The Block, CryptoNews, Decrypt)
- ✅ Automatic deduplication (by URL, title, and content hash)
- ✅ Data normalization and validation
- ✅ PostgreSQL database storage
- ✅ Scheduled collection every 5 minutes (configurable)
- ✅ Statistics tracking
- ✅ Graceful error handling

## Architecture

```
src/
├── types/
│   └── news.ts                 # TypeScript interfaces
├── collectors/
│   └── news/
│       ├── base-collector.ts   # Abstract base class
│       ├── rss-collector.ts    # RSS feed collectors
│       ├── scraper-collector.ts # Web scrapers
│       ├── collector-service.ts # Main service
│       ├── scheduler.ts        # Cron scheduler
│       └── index.ts            # Entry point
├── utils/
│   ├── deduplicator.ts         # Deduplication logic
│   └── normalizer.ts           # Data normalization
└── database/
    ├── connection.ts           # Database connection
    ├── repository.ts           # Data access layer
    └── schema.sql              # Database schema
```

## Data Sources

### RSS Feeds
1. **CoinDesk** - https://www.coindesk.com/arc/outboundfeeds/rss/
2. **CoinTelegraph** - https://cointelegraph.com/rss
3. **Bitcoin Magazine** - https://bitcoinmagazine.com/.rss/full/

### Web Scrapers
4. **The Block** - https://www.theblock.co/latest
5. **CryptoNews** - https://cryptonews.com/
6. **Decrypt** - https://decrypt.co/news

## Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Build TypeScript
npm run build
```

## Database Setup

1. Create PostgreSQL database:
```sql
CREATE DATABASE btc_trading_bot;
```

2. Run migrations (automatic on first run):
```bash
npm run collect
```

The migrations will create:
- `news_items` table - stores collected news
- `collector_stats` table - tracks collection statistics
- Indexes for fast queries
- Triggers for automatic timestamps

## Usage

### Scheduled Collection

Run the collector with automatic scheduling (every 5 minutes):

```bash
npm run collect
```

To change the interval, edit `.env`:
```env
COLLECTION_INTERVAL=5  # minutes
```

### One-Time Collection

Run collection once and exit:

```bash
RUN_ONCE=true npm run collect
```

### Development Mode

Enable debug logging:

```bash
DEBUG=true npm run collect
```

## Examples

See the `examples/` directory for usage examples:

- `basic-collection.ts` - Collect from a single source
- `multi-source-collection.ts` - Collect from multiple sources
- `query-news.ts` - Query collected news

Run examples:
```bash
npx tsx examples/basic-collection.ts
npx tsx examples/multi-source-collection.ts
npx tsx examples/query-news.ts
```

## API Reference

### NewsItem Interface

```typescript
interface NewsItem {
  id: string;              // UUID
  source: string;          // Source name (e.g., "CoinDesk")
  title: string;           // Article title
  content: string;         // Article content/summary
  url: string;             // Article URL (unique)
  publishedAt: Date;       // Publication date
  collectedAt: Date;       // Collection timestamp
  tags: string[];          // Extracted tags
  sentiment?: number;      // Sentiment score (future)
}
```

### Collectors

#### RSS Collectors

```typescript
import { CoinDeskCollector } from './collectors/news/rss-collector';

const collector = new CoinDeskCollector(debug);
const items = await collector.collect();
```

#### Web Scrapers

```typescript
import { TheBlockCollector } from './collectors/news/scraper-collector';

const collector = new TheBlockCollector(debug);
const items = await collector.collect();
```

### NewsCollectorService

```typescript
import { NewsCollectorService } from './collectors/news/collector-service';

const service = new NewsCollectorService([
  new CoinDeskCollector(),
  new TheBlockCollector(),
]);

const result = await service.collectAll();
// {
//   total: 120,
//   stored: 95,
//   duplicates: 25,
//   stats: [...]
// }
```

### Deduplicator

```typescript
import { deduplicator } from './utils/deduplicator';

const unique = deduplicator.removeDuplicates(items);
deduplicator.clear(); // Clear cache
const stats = deduplicator.getStats(); // Get statistics
```

### Normalizer

```typescript
import { normalizer } from './utils/normalizer';

const normalized = normalizer.normalize(item);
const valid = normalizer.validate(item);
const validItems = normalizer.filterValid(items);
```

### Database Repository

```typescript
import { newsRepository } from './database/repository';

// Save items
await newsRepository.save(item);
await newsRepository.saveMany(items);

// Query items
const recent = await newsRepository.findRecent(100);
const bySource = await newsRepository.findBySource('CoinDesk');
const byTags = await newsRepository.findByTags(['bitcoin', 'btc']);
const byDate = await newsRepository.findByDateRange(startDate, endDate);

// Statistics
const count = await newsRepository.count();
const countBySource = await newsRepository.countBySource('CoinDesk');

// Cleanup
await newsRepository.deleteOlderThan(30); // days
```

## Testing

Run unit tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Deduplication Strategy

The module uses three-layer deduplication:

1. **URL matching** - Exact URL comparison (after removing tracking params)
2. **Title matching** - Normalized title comparison
3. **Content hashing** - MD5 hash of title + first 200 chars of content

This ensures high-quality deduplication while allowing legitimate duplicates from different sources.

## Data Normalization

All collected data is normalized:

- **Whitespace** - Normalized and trimmed
- **HTML entities** - Decoded (&amp; → &, etc.)
- **HTML tags** - Removed from content
- **URLs** - Tracking parameters removed
- **Tags** - Lowercased, deduplicated, sorted

## Performance

- RSS collectors: ~2-5 seconds per source
- Web scrapers: ~5-10 seconds per source
- Total collection time: ~30-60 seconds for all 6 sources
- Database writes: Bulk operations with error handling
- Memory usage: ~100-200MB during collection

## Error Handling

- Individual collector failures don't stop other collectors
- Database errors are logged but don't crash the service
- Web scraper timeouts are configurable
- Graceful shutdown on SIGINT/SIGTERM

## Future Enhancements

- [ ] Sentiment analysis integration
- [ ] Redis caching layer
- [ ] More data sources
- [ ] Content classification
- [ ] Real-time notifications
- [ ] GraphQL API
- [ ] Webhook support
- [ ] Advanced filtering

## Troubleshooting

### Database Connection Errors

Check your PostgreSQL connection:
```bash
psql -h localhost -U postgres -d btc_trading_bot
```

Verify `.env` settings match your database configuration.

### Web Scraper Failures

Web scrapers may fail if:
- Website structure changes
- Rate limiting occurs
- Network issues

Enable debug mode to see detailed logs:
```bash
DEBUG=true npm run collect
```

### No Items Collected

If no items are collected:
1. Check internet connection
2. Verify RSS feed URLs are accessible
3. Check for rate limiting
4. Review logs for specific errors

## License

MIT
