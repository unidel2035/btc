import { SocialCollectorOrchestrator } from '../../../src/collectors/social/SocialCollectorOrchestrator';
import { ICollector, SocialPost, CollectorStats } from '../../../src/collectors/social/types';

// Mock collector
class MockCollector implements ICollector {
  name = 'Mock';
  private _running = false;
  private mockPosts: SocialPost[];

  constructor(posts: SocialPost[] = []) {
    this.mockPosts = posts;
  }

  async initialize(): Promise<void> {
    // Mock initialization
  }

  async start(): Promise<void> {
    this._running = true;
  }

  async stop(): Promise<void> {
    this._running = false;
  }

  async collect(): Promise<SocialPost[]> {
    return this.mockPosts;
  }

  isRunning(): boolean {
    return this._running;
  }

  getStats(): CollectorStats {
    return {
      name: this.name,
      totalPosts: this.mockPosts.length,
      successfulRequests: 1,
      failedRequests: 0,
      status: this._running ? 'running' : 'stopped',
    };
  }
}

describe('SocialCollectorOrchestrator', () => {
  let orchestrator: SocialCollectorOrchestrator;

  beforeEach(() => {
    orchestrator = new SocialCollectorOrchestrator();
  });

  describe('registerCollector', () => {
    it('should register a collector', () => {
      const collector = new MockCollector();
      orchestrator.registerCollector('twitter', collector);

      const registered = orchestrator.getCollector('twitter');
      expect(registered).toBe(collector);
    });

    it('should replace existing collector', () => {
      const collector1 = new MockCollector();
      const collector2 = new MockCollector();

      orchestrator.registerCollector('twitter', collector1);
      orchestrator.registerCollector('twitter', collector2);

      const registered = orchestrator.getCollector('twitter');
      expect(registered).toBe(collector2);
    });
  });

  describe('initializeAll', () => {
    it('should initialize all registered collectors', async () => {
      const collector1 = new MockCollector();
      const collector2 = new MockCollector();

      const spy1 = jest.spyOn(collector1, 'initialize');
      const spy2 = jest.spyOn(collector2, 'initialize');

      orchestrator.registerCollector('twitter', collector1);
      orchestrator.registerCollector('reddit', collector2);

      await orchestrator.initializeAll();

      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
    });
  });

  describe('collectAll', () => {
    it('should collect from all collectors', async () => {
      const twitterPosts: SocialPost[] = [
        {
          id: '1',
          platform: 'twitter',
          author: 'user1',
          content: 'Test tweet',
          engagement: { likes: 10, comments: 5, shares: 2 },
          timestamp: new Date(),
          url: 'https://twitter.com/user1/status/1',
        },
      ];

      const redditPosts: SocialPost[] = [
        {
          id: '2',
          platform: 'reddit',
          author: 'user2',
          content: 'Test post',
          engagement: { likes: 20, comments: 10, shares: 0 },
          timestamp: new Date(),
          url: 'https://reddit.com/r/test/2',
        },
      ];

      const collector1 = new MockCollector(twitterPosts);
      const collector2 = new MockCollector(redditPosts);

      orchestrator.registerCollector('twitter', collector1);
      orchestrator.registerCollector('reddit', collector2);

      const results = await orchestrator.collectAll();

      expect(results).toHaveLength(2);
      expect(results[0].posts).toEqual(twitterPosts);
      expect(results[1].posts).toEqual(redditPosts);
    });

    it('should call onDataCollected callback', async () => {
      const callback = jest.fn();
      const posts: SocialPost[] = [
        {
          id: '1',
          platform: 'twitter',
          author: 'user1',
          content: 'Test',
          engagement: { likes: 0, comments: 0, shares: 0 },
          timestamp: new Date(),
          url: 'https://twitter.com/user1/status/1',
        },
      ];

      orchestrator = new SocialCollectorOrchestrator({
        onDataCollected: callback,
      });

      const collector = new MockCollector(posts);
      orchestrator.registerCollector('twitter', collector);

      await orchestrator.collectAll();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'twitter',
          posts,
          count: 1,
        })
      );
    });
  });

  describe('getStats', () => {
    it('should return stats for all collectors', () => {
      const collector1 = new MockCollector();
      const collector2 = new MockCollector();

      orchestrator.registerCollector('twitter', collector1);
      orchestrator.registerCollector('reddit', collector2);

      const stats = orchestrator.getStats();

      expect(stats.size).toBe(2);
      expect(stats.get('twitter')).toBeDefined();
      expect(stats.get('reddit')).toBeDefined();
    });
  });

  describe('getPostsByPlatform', () => {
    it('should filter posts by platform', async () => {
      const twitterPost: SocialPost = {
        id: '1',
        platform: 'twitter',
        author: 'user1',
        content: 'Tweet',
        engagement: { likes: 0, comments: 0, shares: 0 },
        timestamp: new Date(),
        url: 'https://twitter.com/user1/status/1',
      };

      const redditPost: SocialPost = {
        id: '2',
        platform: 'reddit',
        author: 'user2',
        content: 'Post',
        engagement: { likes: 0, comments: 0, shares: 0 },
        timestamp: new Date(),
        url: 'https://reddit.com/r/test/2',
      };

      orchestrator = new SocialCollectorOrchestrator({ persistData: true });

      const collector1 = new MockCollector([twitterPost]);
      const collector2 = new MockCollector([redditPost]);

      orchestrator.registerCollector('twitter', collector1);
      orchestrator.registerCollector('reddit', collector2);

      await orchestrator.collectAll();

      const twitterPosts = orchestrator.getPostsByPlatform('twitter');
      const redditPosts = orchestrator.getPostsByPlatform('reddit');

      expect(twitterPosts).toHaveLength(1);
      expect(twitterPosts[0].platform).toBe('twitter');
      expect(redditPosts).toHaveLength(1);
      expect(redditPosts[0].platform).toBe('reddit');
    });
  });

  describe('getActiveCollectorsCount', () => {
    it('should count active collectors', async () => {
      const collector1 = new MockCollector();
      const collector2 = new MockCollector();

      orchestrator.registerCollector('twitter', collector1);
      orchestrator.registerCollector('reddit', collector2);

      expect(orchestrator.getActiveCollectorsCount()).toBe(0);

      await collector1.start();
      expect(orchestrator.getActiveCollectorsCount()).toBe(1);

      await collector2.start();
      expect(orchestrator.getActiveCollectorsCount()).toBe(2);
    });
  });
});
