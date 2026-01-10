import type {
  CryptoSector,
  SectorMetrics,
  MacroFilterConfig,
} from './types.js';
import { CoinGeckoClient } from './CoinGeckoClient.js';
import { sectorNarratives } from './config.js';

/**
 * Stage 0: Macro Filter
 *
 * Analyzes market sectors and selects the most promising ones
 */
export class MacroFilter {
  constructor(
    private client: CoinGeckoClient,
    private config: MacroFilterConfig
  ) {}

  /**
   * Analyze all sectors and select top performers
   */
  async selectTopSectors(
    availableSectors: CryptoSector[]
  ): Promise<SectorMetrics[]> {
    console.info('📊 Stage 0: Macro Filter - Analyzing sectors...\n');

    const sectorMetrics: SectorMetrics[] = [];

    for (const sector of availableSectors) {
      console.info(`  Analyzing sector: ${sector}`);

      try {
        const metrics = await this.analyzeSector(sector);
        sectorMetrics.push(metrics);

        console.info(`    Market Cap: $${(metrics.totalMarketCap / 1e9).toFixed(2)}B`);
        console.info(`    30d Change: ${metrics.marketCapChange30d.toFixed(2)}%`);
        console.info(`    90d Change: ${metrics.marketCapChange90d.toFixed(2)}%`);
        console.info(`    Score: ${metrics.score.toFixed(2)}\n`);
      } catch (error) {
        console.warn(`    Failed to analyze sector ${sector}:`, error);
      }
    }

    // Filter sectors by growth criteria
    const qualifyingSectors = sectorMetrics.filter(
      (s) =>
        s.marketCapChange30d >= this.config.minMarketCapGrowth30d ||
        s.marketCapChange90d >= this.config.minMarketCapGrowth90d
    );

    // Sort by score (descending)
    qualifyingSectors.sort((a, b) => b.score - a.score);

    // Take top N sectors
    const topSectors = qualifyingSectors.slice(0, this.config.topSectorsCount);

    console.info('✅ Top sectors selected:');
    topSectors.forEach((s, i) => {
      console.info(`  ${i + 1}. ${s.sector} (Score: ${s.score.toFixed(2)})`);
    });
    console.info('');

    return topSectors;
  }

  /**
   * Analyze a single sector
   */
  private async analyzeSector(sector: CryptoSector): Promise<SectorMetrics> {
    // Get market data for this sector
    // Note: CoinGecko uses different category names, we'll use a mapping
    const categoryMap: Record<CryptoSector, string> = {
      'ai-crypto': 'artificial-intelligence',
      depin: 'decentralized-physical-infrastructure-networks-depin',
      rwa: 'real-world-assets-rwa',
      'modular-blockchain': 'modular-blockchain',
      'l2-solutions': 'layer-2',
      dex: 'decentralized-exchange',
      'nft-fi': 'nft-fi',
      defi: 'decentralized-finance-defi',
      gaming: 'gaming',
      metaverse: 'metaverse',
      infrastructure: 'infrastructure',
      privacy: 'privacy-coins',
      dao: 'dao',
      stablecoin: 'stablecoins',
    };

    const cgCategory = categoryMap[sector];
    const projects = await this.client.getMarketData(1, 50, cgCategory);

    if (projects.length === 0) {
      return this.getEmptySectorMetrics(sector);
    }

    // Calculate sector aggregates
    const totalMarketCap = projects.reduce((sum, p) => sum + (p.market_cap || 0), 0);
    const averageVolume24h =
      projects.reduce((sum, p) => sum + (p.total_volume || 0), 0) / projects.length;

    // Calculate weighted average price changes
    const totalMCap = projects.reduce((sum, p) => sum + p.market_cap, 0);
    const marketCapChange30d =
      projects.reduce(
        (sum, p) =>
          sum + (p.price_change_percentage_30d_in_currency || 0) * (p.market_cap / totalMCap),
        0
      ) || 0;

    const marketCapChange90d =
      projects.reduce(
        (sum, p) =>
          sum + (p.price_change_percentage_90d_in_currency || 0) * (p.market_cap / totalMCap),
        0
      ) || 0;

    const topProjects = projects
      .slice(0, 10)
      .map((p) => `${p.name} (${p.symbol.toUpperCase()})`);

    // Calculate sector score
    const score = this.calculateSectorScore({
      marketCapChange30d,
      marketCapChange90d,
      totalMarketCap,
      averageVolume24h,
      projectCount: projects.length,
    });

    return {
      sector,
      totalMarketCap,
      marketCapChange30d,
      marketCapChange90d,
      averageVolume24h,
      projectCount: projects.length,
      topProjects,
      narrative: sectorNarratives[sector] || 'No description available',
      score,
    };
  }

  /**
   * Calculate sector score based on multiple factors
   */
  private calculateSectorScore(data: {
    marketCapChange30d: number;
    marketCapChange90d: number;
    totalMarketCap: number;
    averageVolume24h: number;
    projectCount: number;
  }): number {
    let score = 0;

    // Growth score (0-40 points)
    score += Math.min(data.marketCapChange30d * 0.5, 20); // 30d growth
    score += Math.min(data.marketCapChange90d * 0.2, 20); // 90d growth

    // Liquidity score (0-30 points)
    const liquidityRatio = data.averageVolume24h / (data.totalMarketCap || 1);
    score += Math.min(liquidityRatio * 10000, 30);

    // Size score (0-20 points) - prefer sectors with substantial market cap
    const sizeScore = Math.log10(data.totalMarketCap / 1e9) * 5;
    score += Math.min(Math.max(sizeScore, 0), 20);

    // Diversity score (0-10 points) - prefer sectors with more projects
    score += Math.min(data.projectCount * 0.2, 10);

    return Math.max(score, 0);
  }

  /**
   * Get empty sector metrics when no data is available
   */
  private getEmptySectorMetrics(sector: CryptoSector): SectorMetrics {
    return {
      sector,
      totalMarketCap: 0,
      marketCapChange30d: 0,
      marketCapChange90d: 0,
      averageVolume24h: 0,
      projectCount: 0,
      topProjects: [],
      narrative: sectorNarratives[sector] || 'No description available',
      score: 0,
    };
  }

  /**
   * Get recommended sectors based on current market conditions
   */
  static getRecommendedSectors(): CryptoSector[] {
    return [
      'ai-crypto',
      'depin',
      'rwa',
      'l2-solutions',
      'modular-blockchain',
      'dex',
      'defi',
    ];
  }
}
