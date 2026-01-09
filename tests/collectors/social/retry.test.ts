import { retryWithBackoff, retryOnTransientError, isTransientError, RetryError } from '../../../src/collectors/social/utils/retry';

describe('Retry Logic', () => {
  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await retryWithBackoff(fn, { maxAttempts: 3 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValueOnce('success');

      const result = await retryWithBackoff(fn, {
        maxAttempts: 3,
        baseDelay: 10,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw RetryError after max attempts', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('always fails'));

      await expect(
        retryWithBackoff(fn, { maxAttempts: 3, baseDelay: 10 })
      ).rejects.toThrow(RetryError);

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValueOnce('success');

      const startTime = Date.now();
      await retryWithBackoff(fn, {
        maxAttempts: 3,
        baseDelay: 100,
        exponentialBackoff: true,
        backoffFactor: 2,
      });
      const elapsed = Date.now() - startTime;

      // Should have waited ~100ms + ~200ms = ~300ms
      expect(elapsed).toBeGreaterThanOrEqual(250);
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('isTransientError', () => {
    it('should identify network errors as transient', () => {
      expect(isTransientError(new Error('ECONNRESET'))).toBe(true);
      expect(isTransientError(new Error('ETIMEDOUT'))).toBe(true);
      expect(isTransientError(new Error('Network timeout'))).toBe(true);
    });

    it('should identify rate limit errors as transient', () => {
      expect(isTransientError(new Error('Rate limit exceeded'))).toBe(true);
      expect(isTransientError(new Error('HTTP 429'))).toBe(true);
    });

    it('should identify server errors as transient', () => {
      expect(isTransientError(new Error('HTTP 503 Service Unavailable'))).toBe(true);
      expect(isTransientError(new Error('502 Bad Gateway'))).toBe(true);
    });

    it('should not identify permanent errors as transient', () => {
      expect(isTransientError(new Error('Invalid API key'))).toBe(false);
      expect(isTransientError(new Error('Not found'))).toBe(false);
      expect(isTransientError(new Error('Bad request'))).toBe(false);
    });
  });

  describe('retryOnTransientError', () => {
    it('should retry on transient errors', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValueOnce('success');

      const result = await retryOnTransientError(fn, {
        maxAttempts: 3,
        baseDelay: 10,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on permanent errors', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Invalid API key'));

      await expect(
        retryOnTransientError(fn, { maxAttempts: 3, baseDelay: 10 })
      ).rejects.toThrow('Invalid API key');

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
