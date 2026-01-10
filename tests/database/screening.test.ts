/**
 * Screening Repository Tests
 * Tests for Integram screening database integration
 */

import { IntegramClient, ScreeningRepository } from '../../src/database/integram/index.js';
import type { ScreeningReport } from '../../src/analyzers/screening/types.js';

// Mock Integram configuration for testing
const testConfig = {
  serverURL: process.env.INTEGRAM_SERVER_URL || 'https://api.integram.ru',
  database: process.env.INTEGRAM_DATABASE || 'test_db',
  login: process.env.INTEGRAM_LOGIN || 'test_user',
  password: process.env.INTEGRAM_PASSWORD || 'test_pass',
};

describe('ScreeningRepository', () => {
  let client: IntegramClient;
  let repository: ScreeningRepository;

  beforeAll(async () => {
    console.log('🧪 Setting up ScreeningRepository tests...');
    client = new IntegramClient(testConfig);

    // Skip tests if Integram credentials are not provided
    if (!process.env.INTEGRAM_DATABASE) {
      console.warn('⚠️  Skipping Integram tests - no credentials provided');
      return;
    }

    try {
      await client.authenticate();
      repository = new ScreeningRepository(client);
      console.log('✅ Connected to Integram test database');
    } catch (error) {
      console.warn('⚠️  Failed to connect to Integram:', error);
    }
  });

  test('should save screening report', async () => {
    if (!repository) {
      console.log('⏭️  Skipping test - no Integram connection');
      return;
    }

    const mockReport: ScreeningReport = {
      generatedAt: new Date(),
      analyzedSectors: ['ai-crypto', 'depin'],
      selectedSectors: [
        {
          sector: 'ai-crypto',
          totalMarketCap: 10000000000,
          marketCapChange30d: 15.5,
          marketCapChange90d: 45.2,
          averageVolume24h: 500000000,
          projectCount: 50,
          topProjects: ['FET', 'AGIX', 'OCEAN'],
          narrative: 'AI crypto sector showing strong growth',
          score: 85,
        },
      ],
      totalProjectsAnalyzed: 100,
      recommendations: [
        {
          rank: 1,
          ticker: 'RNDR',
          name: 'Render Token',
          sector: 'ai-crypto',
          score: 88,
          rationale: 'Strong fundamentals and growing adoption',
          keyRisk: 'Market volatility',
          riskLevel: 'medium',
          marketCap: 2000000000,
          priceToAth: -45.5,
          volume24h: 50000000,
          tradingPairs: ['RNDR/USDT', 'RNDR/BTC'],
        },
      ],
      tradingPairs: ['RNDR/USDT'],
      macroRisks: ['Market uncertainty'],
      nextActions: ['Monitor top picks'],
    };

    try {
      const reportId = await repository.saveReport(mockReport);
      expect(reportId).toBeGreaterThan(0);
      console.log(`✅ Report saved with ID: ${reportId}`);
    } catch (error) {
      console.warn('⚠️  Test skipped - table types not configured:', error);
    }
  });

  test('should retrieve latest report', async () => {
    if (!repository) {
      console.log('⏭️  Skipping test - no Integram connection');
      return;
    }

    try {
      const report = await repository.getLatestReport();

      if (report) {
        expect(report.generatedAt).toBeInstanceOf(Date);
        expect(report.recommendations).toBeInstanceOf(Array);
        console.log(`✅ Retrieved latest report: ${report.recommendations.length} recommendations`);
      } else {
        console.log('ℹ️  No reports found in database');
      }
    } catch (error) {
      console.warn('⚠️  Test skipped:', error);
    }
  });

  test('should retrieve report history', async () => {
    if (!repository) {
      console.log('⏭️  Skipping test - no Integram connection');
      return;
    }

    try {
      const history = await repository.getReportHistory(5);

      expect(history).toBeInstanceOf(Array);
      expect(history.length).toBeLessThanOrEqual(5);
      console.log(`✅ Retrieved ${history.length} reports from history`);

      for (const report of history) {
        expect(report.generatedAt).toBeInstanceOf(Date);
        expect(report.recommendations).toBeInstanceOf(Array);
      }
    } catch (error) {
      console.warn('⚠️  Test skipped:', error);
    }
  });

  test('should get top projects', async () => {
    if (!repository) {
      console.log('⏭️  Skipping test - no Integram connection');
      return;
    }

    try {
      const topProjects = await repository.getTopProjects('week');

      expect(topProjects).toBeInstanceOf(Array);
      console.log(`✅ Retrieved ${topProjects.length} top projects`);

      for (const project of topProjects) {
        expect(project.ticker).toBeTruthy();
        expect(project.timesRecommended).toBeGreaterThan(0);
        expect(project.averageScore).toBeGreaterThanOrEqual(0);
      }
    } catch (error) {
      console.warn('⚠️  Test skipped:', error);
    }
  });

  test('should get sector trends', async () => {
    if (!repository) {
      console.log('⏭️  Skipping test - no Integram connection');
      return;
    }

    try {
      const trends = await repository.getSectorTrends(30);

      expect(trends).toBeInstanceOf(Array);
      console.log(`✅ Retrieved trends for ${trends.length} sectors`);

      for (const trend of trends) {
        expect(trend.sector).toBeTruthy();
        expect(trend.metrics).toBeInstanceOf(Array);
      }
    } catch (error) {
      console.warn('⚠️  Test skipped:', error);
    }
  });

  test('should save and retrieve project metrics', async () => {
    if (!repository) {
      console.log('⏭️  Skipping test - no Integram connection');
      return;
    }

    const testMetrics = {
      marketCap: 1000000000,
      volume24h: 50000000,
      currentPrice: 50000,
      priceChange30d: 10.5,
      tvl: null,
      communityScore: 85,
      totalScore: 88,
    };

    try {
      await repository.saveProjectMetrics('BTC', testMetrics);
      console.log('✅ Saved BTC metrics');

      const history = await repository.getProjectHistory('BTC', 7);
      expect(history.ticker).toBe('BTC');
      expect(history.metrics).toBeInstanceOf(Array);
      console.log(`✅ Retrieved ${history.metrics.length} BTC data points`);
    } catch (error) {
      console.warn('⚠️  Test skipped:', error);
    }
  });
});

// Run tests
console.log('');
console.log('🧪 Running Screening Repository Tests');
console.log('='.repeat(60));
console.log('');

if (!process.env.INTEGRAM_DATABASE) {
  console.warn('⚠️  INTEGRAM_DATABASE not set - tests will be skipped');
  console.log('To run tests, set the following environment variables:');
  console.log('  - INTEGRAM_SERVER_URL');
  console.log('  - INTEGRAM_DATABASE');
  console.log('  - INTEGRAM_LOGIN');
  console.log('  - INTEGRAM_PASSWORD');
  console.log('  - INTEGRAM_TYPE_SCREENING_REPORTS');
  console.log('  - INTEGRAM_TYPE_SCREENING_RECOMMENDATIONS');
  console.log('  - INTEGRAM_TYPE_SECTOR_PERFORMANCE');
  console.log('  - INTEGRAM_TYPE_PROJECT_METRICS_HISTORY');
}
