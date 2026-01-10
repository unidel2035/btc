import type {
  ProjectInfo,
  QuantitativeScreeningConfig,
  CryptoSector,
  Exchange,
} from './types.js';
import { CoinGeckoClient } from './CoinGeckoClient.js';

/**
 * Stage 1: Quantitative Screening
 *
 * Filters projects within selected sectors based on quantitative metrics
 */
export class QuantitativeScreening {
  constructor(
    private client: CoinGeckoClient,
    private config: QuantitativeScreeningConfig
  ) {}

  /**
   * Screen projects within selected sectors
   */
  async screenProjects(sectors: CryptoSector[]): Promise<ProjectInfo[]> {
    console.info('🔍 Stage 1: Quantitative Screening - Filtering projects...\n');

    const allCandidates: ProjectInfo[] = [];

    for (const sector of sectors) {
      console.info(`  Screening sector: ${sector}`);

      try {
        const candidates = await this.screenSector(sector);
        allCandidates.push(...candidates);

        console.info(`    Found ${candidates.length} qualifying projects\n`);
      } catch (error) {
        console.warn(`    Failed to screen sector ${sector}:`, error);
      }
    }

    console.info(`✅ Total candidates: ${allCandidates.length}\n`);

    return allCandidates;
  }

  /**
   * Screen projects in a single sector
   */
  private async screenSector(sector: CryptoSector): Promise<ProjectInfo[]> {
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

    // Fetch projects from the category
    const marketData = await this.client.getMarketData(1, 250, cgCategory);

    // Convert to ProjectInfo and apply filters
    const candidates: ProjectInfo[] = [];

    for (const data of marketData) {
      // Early filtering before detailed fetch
      if (!this.passesBasicFilters(data)) {
        continue;
      }

      // Fetch detailed info (includes exchanges)
      try {
        const project = await this.client.convertToProjectInfo(data, true);
        project.sector = sector; // Set the sector explicitly

        if (this.passesDetailedFilters(project)) {
          candidates.push(project);

          // Stop when we have enough candidates
          if (candidates.length >= this.config.topProjectsPerSector) {
            break;
          }
        }
      } catch (error) {
        console.warn(`      Failed to fetch details for ${data.id}:`, error);
      }
    }

    return candidates;
  }

  /**
   * Basic filters that can be applied to market data
   */
  private passesBasicFilters(data: {
    market_cap_rank: number;
    total_volume: number;
    price_change_percentage_30d_in_currency?: number;
  }): boolean {
    // Market cap rank filter
    if (
      data.market_cap_rank < this.config.minMarketCapRank ||
      data.market_cap_rank > this.config.maxMarketCapRank
    ) {
      return false;
    }

    // Volume filter
    if (data.total_volume < this.config.minVolume24h) {
      return false;
    }

    // Price change filter
    const priceChange30d = data.price_change_percentage_30d_in_currency || 0;
    if (priceChange30d < this.config.minPriceChange30d) {
      return false;
    }

    return true;
  }

  /**
   * Detailed filters that require full project info
   */
  private passesDetailedFilters(project: ProjectInfo): boolean {
    // Exchange availability filter
    if (!this.hasRequiredExchanges(project.exchanges)) {
      return false;
    }

    if (project.exchanges.length < this.config.minExchangeCount) {
      return false;
    }

    return true;
  }

  /**
   * Check if project is listed on required exchanges
   */
  private hasRequiredExchanges(projectExchanges: Exchange[]): boolean {
    return this.config.requiredExchanges.every((required) =>
      projectExchanges.includes(required)
    );
  }

  /**
   * Get summary statistics for screened projects
   */
  getSummaryStats(projects: ProjectInfo[]): {
    totalProjects: number;
    avgMarketCap: number;
    avgVolume24h: number;
    avgPriceChange30d: number;
    sectorDistribution: Record<string, number>;
  } {
    if (projects.length === 0) {
      return {
        totalProjects: 0,
        avgMarketCap: 0,
        avgVolume24h: 0,
        avgPriceChange30d: 0,
        sectorDistribution: {},
      };
    }

    const sectorDistribution: Record<string, number> = {};

    const totals = projects.reduce(
      (acc, p) => {
        // Track sector distribution
        const sector = p.sector || 'unknown';
        sectorDistribution[sector] = (sectorDistribution[sector] || 0) + 1;

        return {
          marketCap: acc.marketCap + p.marketCap,
          volume24h: acc.volume24h + p.volume24h,
          priceChange30d: acc.priceChange30d + p.priceChange30d,
        };
      },
      { marketCap: 0, volume24h: 0, priceChange30d: 0 }
    );

    return {
      totalProjects: projects.length,
      avgMarketCap: totals.marketCap / projects.length,
      avgVolume24h: totals.volume24h / projects.length,
      avgPriceChange30d: totals.priceChange30d / projects.length,
      sectorDistribution,
    };
  }
}
