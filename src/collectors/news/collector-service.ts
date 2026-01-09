import { INewsCollector, NewsItem, CollectorStats } from '../../types/news';
import { deduplicator } from '../../utils/deduplicator';
import { normalizer } from '../../utils/normalizer';
import { newsRepository, statsRepository } from '../../database/repository';

/**
 * Main news collection service
 */
export class NewsCollectorService {
  private collectors: INewsCollector[] = [];
  private debug: boolean;

  constructor(collectors: INewsCollector[], debug = false) {
    this.collectors = collectors;
    this.debug = debug;
  }

  /**
   * Add a collector
   */
  addCollector(collector: INewsCollector): void {
    this.collectors.push(collector);
  }

  /**
   * Collect news from all sources
   */
  async collectAll(): Promise<{
    total: number;
    stored: number;
    duplicates: number;
    stats: CollectorStats[];
  }> {
    const allStats: CollectorStats[] = [];
    let totalCollected = 0;
    let totalStored = 0;
    let totalDuplicates = 0;

    // Load recent URLs into deduplication cache
    await this.loadDeduplicationCache();

    for (const collector of this.collectors) {
      const stats = await this.collectFromSource(collector);
      allStats.push(stats);
      totalCollected += stats.itemsCollected;
      totalStored += stats.itemsStored;
      totalDuplicates += stats.duplicatesSkipped;
    }

    return {
      total: totalCollected,
      stored: totalStored,
      duplicates: totalDuplicates,
      stats: allStats,
    };
  }

  /**
   * Collect news from a single source
   */
  async collectFromSource(collector: INewsCollector): Promise<CollectorStats> {
    const stats: CollectorStats = {
      source: collector.source,
      itemsCollected: 0,
      itemsStored: 0,
      duplicatesSkipped: 0,
      errors: 0,
      lastRun: new Date(),
    };

    try {
      this.log(`Collecting from ${collector.source}...`);

      // Collect raw items
      const rawItems = await collector.collect();
      stats.itemsCollected = rawItems.length;

      if (rawItems.length === 0) {
        this.log(`No items collected from ${collector.source}`);
        await statsRepository.save(stats);
        return stats;
      }

      // Normalize items
      const normalizedItems = normalizer.normalizeMany(rawItems);

      // Filter valid items
      const validItems = normalizer.filterValid(normalizedItems);

      // Remove duplicates
      const uniqueItems = deduplicator.removeDuplicates(validItems);
      stats.duplicatesSkipped = validItems.length - uniqueItems.length;

      // Save to database
      stats.itemsStored = await newsRepository.saveMany(uniqueItems);

      this.log(
        `${collector.source}: Collected ${stats.itemsCollected}, Stored ${stats.itemsStored}, Skipped ${stats.duplicatesSkipped} duplicates`
      );

      // Save statistics
      await statsRepository.save(stats);

      return stats;
    } catch (error) {
      this.error(`Error collecting from ${collector.source}`, error);
      stats.errors = 1;
      await statsRepository.save(stats);
      return stats;
    }
  }

  /**
   * Load recent URLs into deduplication cache
   */
  private async loadDeduplicationCache(): Promise<void> {
    try {
      const recentUrls = await newsRepository.getRecentUrls(24);
      const recentItems = await newsRepository.findRecent(1000);
      deduplicator.loadCache(recentItems);
      this.log(`Loaded ${recentUrls.length} recent URLs into deduplication cache`);
    } catch (error) {
      this.error('Failed to load deduplication cache', error);
    }
  }

  /**
   * Get collection statistics
   */
  async getStats(): Promise<CollectorStats[]> {
    return await statsRepository.getAllLatest();
  }

  /**
   * Log debug messages
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.debug) {
      console.log(`[CollectorService] ${message}`, ...args);
    }
  }

  /**
   * Log error messages
   */
  private error(message: string, error?: unknown): void {
    console.error(`[CollectorService] ERROR: ${message}`, error);
  }
}
