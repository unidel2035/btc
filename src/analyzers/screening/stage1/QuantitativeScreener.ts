/**
 * Stage 1: Quantitative Screening
 * Filters projects within sectors based on quantitative metrics
 */

import type {
  SectorInfo,
  ProjectCandidate,
  ScreeningConfig,
  CoinGeckoMarketData,
  CoinGeckoDetailedData,
} from '../types/index.js';
import CoinGeckoClient from '../utils/CoinGeckoClient.js';

export class QuantitativeScreener {
  private client: CoinGeckoClient;
  private config: ScreeningConfig;

  constructor(client: CoinGeckoClient, config: ScreeningConfig) {
    this.client = client;
    this.config = config;
  }

  /**
   * Screen projects within selected sectors
   */
  async screenProjects(sectors: SectorInfo[]): Promise<ProjectCandidate[]> {
    console.log('\n🔍 Stage 1: Quantitative screening of projects...');

    const allCandidates: ProjectCandidate[] = [];

    for (const sector of sectors) {
      console.log(`\n   Screening sector: ${sector.name}`);

      try {
        const candidates = await this.screenSector(sector);
        allCandidates.push(...candidates);

        console.log(`   ✅ Found ${candidates.length} candidates in ${sector.name}`);
      } catch (error) {
        console.error(`   ❌ Error screening ${sector.name}:`, error);
        continue;
      }
    }

    console.log(`\n✅ Total candidates found: ${allCandidates.length}`);

    return allCandidates;
  }

  /**
   * Screen a single sector for qualified projects
   */
  private async screenSector(sector: SectorInfo): Promise<ProjectCandidate[]> {
    // Get market data for coins in this category
    const marketData = await this.client.getCoinsByCategory(
      sector.category,
      this.config.projectsPerSector * 2, // Get more to account for filtering
    );

    // Apply quantitative filters
    const filtered = this.applyQuantitativeFilters(marketData, sector);

    // Take top N per sector
    const topProjects = filtered.slice(0, this.config.projectsPerSector);

    // Get detailed data for top projects
    const candidates: ProjectCandidate[] = [];

    for (const project of topProjects) {
      try {
        const details = await this.client.getCoinDetails(project.id);
        const candidate = this.convertToCandidate(project, details, sector.name);

        // Final exchange check
        if (this.hasRequiredExchanges(details)) {
          candidates.push(candidate);
        }
      } catch (error) {
        console.error(`     Error fetching details for ${project.name}:`, error);
        continue;
      }
    }

    return candidates;
  }

  /**
   * Apply quantitative filters to market data
   */
  private applyQuantitativeFilters(
    marketData: CoinGeckoMarketData[],
    _sector: SectorInfo, // Reserved for future sector-specific filters
  ): CoinGeckoMarketData[] {
    return marketData.filter((coin) => {
      // Market cap rank filter
      if (
        coin.market_cap_rank < this.config.minMarketCapRank ||
        coin.market_cap_rank > this.config.maxMarketCapRank
      ) {
        return false;
      }

      // Liquidity filter (24h volume)
      if (coin.total_volume < this.config.minVolume24h) {
        return false;
      }

      // Price change filter (30d)
      const priceChange30d = coin.price_change_percentage_30d_in_currency || 0;
      if (priceChange30d < this.config.minPriceChange30d) {
        return false;
      }

      return true;
    });
  }

  /**
   * Check if project has required exchange listings
   */
  private hasRequiredExchanges(details: CoinGeckoDetailedData): boolean {
    const exchanges = new Set(
      details.tickers.map((ticker) => ticker.market.identifier.toLowerCase()),
    );

    const matchCount = this.config.requiredExchanges.filter((exchange) =>
      exchanges.has(exchange.toLowerCase()),
    ).length;

    return matchCount >= this.config.minExchangeListings;
  }

  /**
   * Convert CoinGecko data to ProjectCandidate
   */
  private convertToCandidate(
    marketData: CoinGeckoMarketData,
    details: CoinGeckoDetailedData,
    sector: string,
  ): ProjectCandidate {
    // Extract exchanges from tickers
    const exchanges = Array.from(
      new Set(details.tickers.map((ticker) => ticker.market.name)),
    ).slice(0, 10); // Top 10 exchanges

    return {
      id: marketData.id,
      symbol: marketData.symbol.toUpperCase(),
      name: marketData.name,
      sector,
      marketCap: marketData.market_cap,
      marketCapRank: marketData.market_cap_rank,
      volume24h: marketData.total_volume,
      priceChange30d: marketData.price_change_percentage_30d_in_currency || 0,
      priceChange90d: marketData.price_change_percentage_90d_in_currency || 0,
      currentPrice: marketData.current_price,
      ath: marketData.ath,
      athDate: marketData.ath_date,
      atl: marketData.atl,
      atlDate: marketData.atl_date,
      circulatingSupply: marketData.circulating_supply,
      totalSupply: marketData.total_supply,
      maxSupply: marketData.max_supply,
      exchanges,
      links: {
        homepage: details.links.homepage.filter((h) => h),
        twitter: details.links.twitter_screen_name
          ? `https://twitter.com/${details.links.twitter_screen_name}`
          : undefined,
        reddit: details.links.subreddit_url || undefined,
        github: details.links.repos_url.github.filter((g) => g),
      },
    };
  }

  /**
   * Get summary statistics for screened projects
   */
  getSummaryStats(candidates: ProjectCandidate[]): {
    totalProjects: number;
    sectorBreakdown: Record<string, number>;
    avgMarketCap: number;
    avgVolume24h: number;
    avgPriceChange30d: number;
  } {
    const sectorBreakdown: Record<string, number> = {};

    let totalMarketCap = 0;
    let totalVolume = 0;
    let totalPriceChange = 0;

    for (const candidate of candidates) {
      sectorBreakdown[candidate.sector] = (sectorBreakdown[candidate.sector] || 0) + 1;
      totalMarketCap += candidate.marketCap;
      totalVolume += candidate.volume24h;
      totalPriceChange += candidate.priceChange30d;
    }

    const count = candidates.length;

    return {
      totalProjects: count,
      sectorBreakdown,
      avgMarketCap: count > 0 ? totalMarketCap / count : 0,
      avgVolume24h: count > 0 ? totalVolume / count : 0,
      avgPriceChange30d: count > 0 ? totalPriceChange / count : 0,
    };
  }
}

export default QuantitativeScreener;
