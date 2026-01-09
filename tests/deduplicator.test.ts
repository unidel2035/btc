import { Deduplicator } from '../src/utils/deduplicator';
import { NewsItem } from '../src/types/news';

describe('Deduplicator', () => {
  let deduplicator: Deduplicator;

  beforeEach(() => {
    deduplicator = new Deduplicator();
  });

  const createTestItem = (overrides?: Partial<NewsItem>): NewsItem => ({
    id: '123',
    source: 'Test',
    title: 'Test Title',
    content: 'Test content',
    url: 'https://example.com/test',
    publishedAt: new Date(),
    collectedAt: new Date(),
    tags: [],
    ...overrides,
  });

  describe('isDuplicate', () => {
    it('should return false for new item', () => {
      const item = createTestItem();
      expect(deduplicator.isDuplicate(item)).toBe(false);
    });

    it('should return true for duplicate URL', () => {
      const item = createTestItem();
      deduplicator.add(item);
      const duplicate = createTestItem({ id: '456' });
      expect(deduplicator.isDuplicate(duplicate)).toBe(true);
    });

    it('should return true for duplicate title', () => {
      const item = createTestItem();
      deduplicator.add(item);
      const duplicate = createTestItem({ id: '456', url: 'https://example.com/different' });
      expect(deduplicator.isDuplicate(duplicate)).toBe(true);
    });

    it('should handle title normalization', () => {
      const item = createTestItem({ title: 'Bitcoin Price Rises!' });
      deduplicator.add(item);
      const duplicate = createTestItem({
        id: '456',
        title: 'bitcoin   price  rises',
        url: 'https://example.com/different',
      });
      expect(deduplicator.isDuplicate(duplicate)).toBe(true);
    });
  });

  describe('removeDuplicates', () => {
    it('should remove duplicate items from array', () => {
      const items = [
        createTestItem({ id: '1', url: 'https://example.com/1' }),
        createTestItem({ id: '2', url: 'https://example.com/1' }), // Duplicate URL
        createTestItem({ id: '3', url: 'https://example.com/3' }),
      ];

      const unique = deduplicator.removeDuplicates(items);
      expect(unique).toHaveLength(2);
      expect(unique[0].id).toBe('1');
      expect(unique[1].id).toBe('3');
    });

    it('should return empty array for empty input', () => {
      const unique = deduplicator.removeDuplicates([]);
      expect(unique).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should clear all caches', () => {
      const item = createTestItem();
      deduplicator.add(item);
      expect(deduplicator.getStats().urls).toBe(1);

      deduplicator.clear();
      expect(deduplicator.getStats().urls).toBe(0);
      expect(deduplicator.isDuplicate(item)).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const items = [
        createTestItem({ id: '1', url: 'https://example.com/1' }),
        createTestItem({ id: '2', url: 'https://example.com/2' }),
      ];

      items.forEach((item) => deduplicator.add(item));
      const stats = deduplicator.getStats();

      expect(stats.urls).toBe(2);
      expect(stats.titles).toBe(2);
      expect(stats.hashes).toBe(2);
    });
  });
});
