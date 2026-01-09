import type { Candle, DataLoader } from './types.js';
import { readFile } from 'fs/promises';

/**
 * CSV Data Loader
 * Loads historical candles from CSV files
 */
export class CSVDataLoader implements DataLoader {
  constructor(private dataDir: string = './data') {}

  /**
   * Load candles from CSV file
   * Expected CSV format: timestamp,open,high,low,close,volume
   */
  async loadCandles(
    symbol: string,
    startDate: Date,
    endDate: Date,
    timeframe: string = '1h',
  ): Promise<Candle[]> {
    const filename = `${this.dataDir}/${symbol.replace('/', '_')}_${timeframe}.csv`;

    try {
      const content = await readFile(filename, 'utf-8');
      const lines = content.trim().split('\n');

      // Skip header if present
      const dataLines = lines[0]?.includes('timestamp') ? lines.slice(1) : lines;

      const candles: Candle[] = [];

      for (const line of dataLines) {
        const [timestampStr, openStr, highStr, lowStr, closeStr, volumeStr] = line.split(',');

        if (!timestampStr || !openStr || !highStr || !lowStr || !closeStr || !volumeStr) {
          continue;
        }

        // Parse timestamp (supports both Unix timestamp and ISO string)
        const timestamp = this.parseTimestamp(timestampStr);
        if (timestamp < startDate || timestamp > endDate) {
          continue;
        }

        candles.push({
          timestamp,
          open: parseFloat(openStr),
          high: parseFloat(highStr),
          low: parseFloat(lowStr),
          close: parseFloat(closeStr),
          volume: parseFloat(volumeStr),
        });
      }

      return candles.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (error) {
      throw new Error(
        `Failed to load CSV data for ${symbol} from ${filename}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Parse timestamp from string (Unix or ISO format)
   */
  private parseTimestamp(timestampStr: string): Date {
    // Try parsing as Unix timestamp (milliseconds or seconds)
    const numTimestamp = parseFloat(timestampStr);
    if (!isNaN(numTimestamp)) {
      // If number is less than year 2100 in seconds, it's in seconds
      return numTimestamp < 4102444800
        ? new Date(numTimestamp * 1000)
        : new Date(numTimestamp);
    }

    // Try parsing as ISO string
    return new Date(timestampStr);
  }
}

/**
 * Mock Data Loader for testing
 * Generates synthetic candle data
 */
export class MockDataLoader implements DataLoader {
  constructor(
    private basePrice: number = 50000,
    private volatility: number = 0.02,
  ) {}

  /**
   * Generate synthetic candles with random walk
   */
  async loadCandles(
    _symbol: string,
    startDate: Date,
    endDate: Date,
    timeframe: string = '1h',
  ): Promise<Candle[]> {
    const candles: Candle[] = [];
    const intervalMs = this.parseTimeframeToMs(timeframe);

    let currentTime = new Date(startDate);
    let currentPrice = this.basePrice;

    while (currentTime <= endDate) {
      // Random walk with volatility
      const change = (Math.random() - 0.5) * 2 * this.volatility * currentPrice;
      currentPrice = Math.max(currentPrice + change, currentPrice * 0.5); // prevent negative prices

      // Generate realistic OHLC within the period
      const open = currentPrice;
      const volatilityRange = currentPrice * this.volatility;
      const high = open + Math.random() * volatilityRange;
      const low = open - Math.random() * volatilityRange;
      const close = low + Math.random() * (high - low);

      // Random volume
      const volume = 1000000 + Math.random() * 5000000;

      candles.push({
        timestamp: new Date(currentTime),
        open,
        high,
        low,
        close,
        volume,
      });

      currentTime = new Date(currentTime.getTime() + intervalMs);
      currentPrice = close; // next candle starts from previous close
    }

    return candles;
  }

  /**
   * Parse timeframe string to milliseconds
   */
  private parseTimeframeToMs(timeframe: string): number {
    const match = timeframe.match(/^(\d+)([mhd])$/);
    if (!match) {
      throw new Error(`Invalid timeframe format: ${timeframe}`);
    }

    const value = parseInt(match[1] ?? '1', 10);
    const unit = match[2];

    switch (unit) {
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Unknown timeframe unit: ${unit}`);
    }
  }
}

/**
 * Parquet Data Loader (placeholder for future implementation)
 */
export class ParquetDataLoader implements DataLoader {
  constructor(_dataDir: string = './data') {
    // dataDir parameter reserved for future parquet implementation
  }

  async loadCandles(
    _symbol: string,
    _startDate: Date,
    _endDate: Date,
    _timeframe: string = '1h',
  ): Promise<Candle[]> {
    // TODO: Implement Parquet loading when parquet library is added
    throw new Error('Parquet data loader not yet implemented. Use CSV or Mock loader instead.');
  }
}
