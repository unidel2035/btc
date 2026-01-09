import { NewsItem } from '../types/news';
import crypto from 'crypto';

/**
 * Deduplication service for news items
 */
export class Deduplicator {
  private urlCache: Set<string> = new Set();
  private titleCache: Set<string> = new Set();
  private hashCache: Set<string> = new Set();

  /**
   * Check if a news item is duplicate
   */
  isDuplicate(item: NewsItem): boolean {
    // Check by exact URL
    if (this.urlCache.has(item.url)) {
      return true;
    }

    // Check by normalized title
    const normalizedTitle = this.normalizeTitle(item.title);
    if (this.titleCache.has(normalizedTitle)) {
      return true;
    }

    // Check by content hash (for similar content)
    const contentHash = this.hashContent(item.title, item.content);
    if (this.hashCache.has(contentHash)) {
      return true;
    }

    return false;
  }

  /**
   * Add item to cache
   */
  add(item: NewsItem): void {
    this.urlCache.add(item.url);
    this.titleCache.add(this.normalizeTitle(item.title));
    this.hashCache.add(this.hashContent(item.title, item.content));
  }

  /**
   * Remove duplicates from array
   */
  removeDuplicates(items: NewsItem[]): NewsItem[] {
    const unique: NewsItem[] = [];

    for (const item of items) {
      if (!this.isDuplicate(item)) {
        this.add(item);
        unique.push(item);
      }
    }

    return unique;
  }

  /**
   * Normalize title for comparison
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Create hash from title and content
   */
  private hashContent(title: string, content: string): string {
    const normalized = `${this.normalizeTitle(title)}:${content.substring(0, 200)}`;
    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.urlCache.clear();
    this.titleCache.clear();
    this.hashCache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { urls: number; titles: number; hashes: number } {
    return {
      urls: this.urlCache.size,
      titles: this.titleCache.size,
      hashes: this.hashCache.size,
    };
  }

  /**
   * Load existing items into cache (for persistence)
   */
  loadCache(items: NewsItem[]): void {
    for (const item of items) {
      this.add(item);
    }
  }
}

/**
 * Singleton instance
 */
export const deduplicator = new Deduplicator();
