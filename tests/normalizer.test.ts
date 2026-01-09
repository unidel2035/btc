import { Normalizer } from '../src/utils/normalizer';
import { NewsItem } from '../src/types/news';

describe('Normalizer', () => {
  let normalizer: Normalizer;

  beforeEach(() => {
    normalizer = new Normalizer();
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

  describe('normalize', () => {
    it('should normalize title whitespace', () => {
      const item = createTestItem({ title: '  Multiple   spaces   here  ' });
      const normalized = normalizer.normalize(item);
      expect(normalized.title).toBe('Multiple spaces here');
    });

    it('should normalize URL and remove tracking parameters', () => {
      const item = createTestItem({
        url: 'https://example.com/article?utm_source=twitter&utm_campaign=test&id=123',
      });
      const normalized = normalizer.normalize(item);
      expect(normalized.url).toBe('https://example.com/article?id=123');
    });

    it('should normalize tags', () => {
      const item = createTestItem({ tags: ['BITCOIN', 'bitcoin', 'Bitcoin', 'ethereum'] });
      const normalized = normalizer.normalize(item);
      expect(normalized.tags).toEqual(['bitcoin', 'ethereum']);
    });

    it('should remove HTML tags from content', () => {
      const item = createTestItem({ content: '<p>Test <strong>content</strong> here</p>' });
      const normalized = normalizer.normalize(item);
      expect(normalized.content).toBe('Test content here');
    });

    it('should decode HTML entities', () => {
      const item = createTestItem({ title: 'Test &amp; Test &quot;Quote&quot;' });
      const normalized = normalizer.normalize(item);
      expect(normalized.title).toBe('Test & Test "Quote"');
    });
  });

  describe('validate', () => {
    it('should validate correct item', () => {
      const item = createTestItem({ title: 'Valid title with enough characters' });
      const result = normalizer.validate(item);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for short title', () => {
      const item = createTestItem({ title: 'Short' });
      const result = normalizer.validate(item);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title must be at least 10 characters');
    });

    it('should fail for invalid URL', () => {
      const item = createTestItem({ url: 'not-a-valid-url' });
      const result = normalizer.validate(item);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid URL format');
    });

    it('should fail for missing source', () => {
      const item = createTestItem({ source: '' });
      const result = normalizer.validate(item);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Source is required');
    });
  });

  describe('filterValid', () => {
    it('should filter out invalid items', () => {
      const items = [
        createTestItem({ id: '1', title: 'Valid title with enough characters' }),
        createTestItem({ id: '2', title: 'Short' }), // Invalid
        createTestItem({ id: '3', title: 'Another valid title here' }),
      ];

      const valid = normalizer.filterValid(items);
      expect(valid).toHaveLength(2);
      expect(valid[0].id).toBe('1');
      expect(valid[1].id).toBe('3');
    });
  });
});
