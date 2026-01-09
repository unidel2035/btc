import { NewsItem } from '../types/news';

/**
 * Data normalization utilities for news items
 */
export class Normalizer {
  /**
   * Normalize a news item
   */
  normalize(item: NewsItem): NewsItem {
    return {
      ...item,
      title: this.normalizeTitle(item.title),
      content: this.normalizeContent(item.content),
      url: this.normalizeUrl(item.url),
      tags: this.normalizeTags(item.tags),
    };
  }

  /**
   * Normalize multiple items
   */
  normalizeMany(items: NewsItem[]): NewsItem[] {
    return items.map((item) => this.normalize(item));
  }

  /**
   * Normalize title
   */
  private normalizeTitle(title: string): string {
    return title
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[\r\n\t]/g, ' ') // Remove line breaks and tabs
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .substring(0, 500); // Limit length
  }

  /**
   * Normalize content
   */
  private normalizeContent(content: string): string {
    return content
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[\r\n\t]+/g, ' ') // Replace line breaks with space
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .substring(0, 5000); // Limit length
  }

  /**
   * Normalize URL
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove tracking parameters
      const trackingParams = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'ref',
        'fbclid',
        'gclid',
      ];
      trackingParams.forEach((param) => parsed.searchParams.delete(param));
      return parsed.toString();
    } catch {
      return url; // Return original if parsing fails
    }
  }

  /**
   * Normalize tags
   */
  private normalizeTags(tags: string[]): string[] {
    return [...new Set(tags)] // Remove duplicates
      .map((tag) => tag.toLowerCase().trim())
      .filter((tag) => tag.length > 0)
      .sort(); // Sort alphabetically
  }

  /**
   * Validate news item
   */
  validate(item: NewsItem): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!item.title || item.title.length < 10) {
      errors.push('Title must be at least 10 characters');
    }

    if (!item.url) {
      errors.push('URL is required');
    }

    try {
      new URL(item.url);
    } catch {
      errors.push('Invalid URL format');
    }

    if (!item.source || item.source.length === 0) {
      errors.push('Source is required');
    }

    if (!item.publishedAt || isNaN(item.publishedAt.getTime())) {
      errors.push('Valid publishedAt date is required');
    }

    if (!item.collectedAt || isNaN(item.collectedAt.getTime())) {
      errors.push('Valid collectedAt date is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Filter valid items
   */
  filterValid(items: NewsItem[]): NewsItem[] {
    return items.filter((item) => this.validate(item).valid);
  }
}

/**
 * Singleton instance
 */
export const normalizer = new Normalizer();
