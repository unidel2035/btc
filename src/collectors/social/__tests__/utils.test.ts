/**
 * Unit tests for social collector utilities
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  extractHashtags,
  extractMentions,
  isCryptoRelated,
  isValidUrl,
  generatePostId,
  sleep,
} from '../utils.js';

describe('Social Collector Utils', () => {
  describe('extractHashtags', () => {
    it('should extract hashtags from text', () => {
      const text = 'Check out #Bitcoin and #BTC prices today! #Crypto';
      const hashtags = extractHashtags(text);
      expect(hashtags).toEqual(['bitcoin', 'btc', 'crypto']);
    });

    it('should return empty array if no hashtags', () => {
      const text = 'This is a text without hashtags';
      const hashtags = extractHashtags(text);
      expect(hashtags).toEqual([]);
    });

    it('should handle duplicate hashtags', () => {
      const text = '#Bitcoin is great! #bitcoin rocks!';
      const hashtags = extractHashtags(text);
      expect(hashtags).toEqual(['bitcoin', 'bitcoin']);
    });
  });

  describe('extractMentions', () => {
    it('should extract mentions from text', () => {
      const text = 'Hey @elonmusk and @whale_alert, check this out!';
      const mentions = extractMentions(text);
      expect(mentions).toEqual(['elonmusk', 'whale_alert']);
    });

    it('should return empty array if no mentions', () => {
      const text = 'This is a text without mentions';
      const mentions = extractMentions(text);
      expect(mentions).toEqual([]);
    });
  });

  describe('isCryptoRelated', () => {
    it('should identify crypto-related text', () => {
      expect(isCryptoRelated('Bitcoin price is rising')).toBe(true);
      expect(isCryptoRelated('BTC to the moon!')).toBe(true);
      expect(isCryptoRelated('Ethereum DeFi project')).toBe(true);
      expect(isCryptoRelated('Cryptocurrency market analysis')).toBe(true);
    });

    it('should not identify non-crypto text', () => {
      expect(isCryptoRelated('The weather is nice today')).toBe(false);
      expect(isCryptoRelated('Stock market news')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isCryptoRelated('BITCOIN is great')).toBe(true);
      expect(isCryptoRelated('bitcoin is great')).toBe(true);
      expect(isCryptoRelated('BiTcOiN is great')).toBe(true);
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://twitter.com/elonmusk')).toBe(true);
      expect(isValidUrl('http://reddit.com/r/Bitcoin')).toBe(true);
      expect(isValidUrl('https://t.me/bitcoin')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('twitter.com')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('generatePostId', () => {
    it('should generate unique post IDs', () => {
      const id1 = generatePostId('twitter', '123');
      const id2 = generatePostId('twitter', '123');

      expect(id1).toContain('twitter_123');
      expect(id2).toContain('twitter_123');
      expect(id1).not.toEqual(id2); // Should be different due to timestamp
    });

    it('should include platform and original ID', () => {
      const id = generatePostId('reddit', 'abc123');
      expect(id).toContain('reddit_abc123');
    });
  });

  describe('sleep', () => {
    it('should delay execution', async () => {
      const start = Date.now();
      await sleep(100);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(90); // Allow some margin
      expect(end - start).toBeLessThan(150);
    });
  });
});
