/**
 * Stage 0: Macro Sector Analysis and Selection
 * Identifies the most promising crypto sectors based on growth, trends, and narratives
 */

import type { SectorInfo, ScreeningConfig, CoinGeckoCategoryData } from '../types/index.js';
import CoinGeckoClient from '../utils/CoinGeckoClient.js';

export class SectorAnalyzer {
  private client: CoinGeckoClient;
  private config: ScreeningConfig;

  constructor(client: CoinGeckoClient, config: ScreeningConfig) {
    this.client = client;
    this.config = config;
  }

  /**
   * Analyze and select top sectors for deeper analysis
   */
  async selectTopSectors(): Promise<SectorInfo[]> {
    console.log('🔍 Stage 0: Analyzing crypto sectors...');

    // Get all categories from CoinGecko
    const categories = await this.client.getCategories();

    // Filter and score categories
    const scoredSectors = await this.scoreCategories(categories);

    // Sort by trend score
    scoredSectors.sort((a, b) => b.trendScore - a.trendScore);

    // Select top N sectors
    const topSectors = scoredSectors.slice(0, this.config.maxSectors);

    console.log(`✅ Selected ${topSectors.length} top sectors:`);
    topSectors.forEach((sector, idx) => {
      console.log(`   ${idx + 1}. ${sector.name} (Score: ${sector.trendScore.toFixed(2)})`);
    });

    return topSectors;
  }

  /**
   * Score categories based on growth, volume, and narrative strength
   */
  private async scoreCategories(categories: CoinGeckoCategoryData[]): Promise<SectorInfo[]> {
    const sectorInfos: SectorInfo[] = [];

    for (const category of categories) {
      // Skip if market cap too low
      if (category.market_cap < 100000000) continue; // $100M minimum

      // Calculate growth metrics
      const marketCapGrowth24h = category.market_cap_change_24h;

      // Estimate 30d and 90d growth (simplified - would need historical data)
      const marketCapGrowth30d = marketCapGrowth24h * 20; // Rough estimate
      const marketCapGrowth90d = marketCapGrowth24h * 60; // Rough estimate

      // Skip if growth is too low
      if (marketCapGrowth30d < this.config.minSectorGrowth30d) continue;

      // Calculate narrative strength based on volume and market cap
      const volumeToMcapRatio = category.volume_24h / category.market_cap;
      const narrativeStrength = Math.min(volumeToMcapRatio * 100, 1.0);

      // Skip if narrative strength too low
      if (narrativeStrength < this.config.minNarrativeStrength) continue;

      // Identify fundamental drivers based on sector name and description
      const fundamentalDrivers = this.identifyDrivers(category);

      // Calculate overall trend score
      const trendScore = this.calculateTrendScore(
        marketCapGrowth30d,
        marketCapGrowth90d,
        narrativeStrength,
        volumeToMcapRatio
      );

      sectorInfos.push({
        name: category.name,
        category: category.id,
        marketCapGrowth30d,
        marketCapGrowth90d,
        narrativeStrength,
        fundamentalDrivers,
        trendScore,
      });
    }

    return sectorInfos;
  }

  /**
   * Calculate overall trend score for a sector
   */
  private calculateTrendScore(
    growth30d: number,
    growth90d: number,
    narrativeStrength: number,
    volumeRatio: number
  ): number {
    // Weighted scoring
    const growthScore = (growth30d * 0.6 + growth90d * 0.4) / 100;
    const volumeScore = Math.min(volumeRatio * 10, 1.0);
    const narrativeScore = narrativeStrength;

    return (growthScore * 0.4 + volumeScore * 0.3 + narrativeScore * 0.3) * 100;
  }

  /**
   * Identify fundamental drivers for a sector
   */
  private identifyDrivers(category: CoinGeckoCategoryData): string[] {
    const drivers: string[] = [];
    const name = category.name.toLowerCase();
    const content = category.content?.toLowerCase() || '';

    // AI-related sectors
    if (name.includes('ai') || name.includes('artificial intelligence')) {
      drivers.push('AI/ML technology adoption');
      drivers.push('Decentralized compute demand');
    }

    // DeFi sectors
    if (name.includes('defi') || name.includes('decentralized finance')) {
      drivers.push('DeFi innovation');
      drivers.push('Yield opportunities');
    }

    // Infrastructure
    if (name.includes('layer') || name.includes('l2') || name.includes('infrastructure')) {
      drivers.push('Scalability solutions');
      drivers.push('Network upgrades');
    }

    // DePin
    if (name.includes('depin') || name.includes('physical infrastructure')) {
      drivers.push('Real-world utility');
      drivers.push('Hardware network growth');
    }

    // RWA
    if (name.includes('rwa') || name.includes('real world asset')) {
      drivers.push('Asset tokenization');
      drivers.push('Institutional adoption');
    }

    // Gaming/Metaverse
    if (name.includes('gaming') || name.includes('metaverse') || name.includes('nft')) {
      drivers.push('Gaming adoption');
      drivers.push('NFT utility');
    }

    // Default if no specific drivers identified
    if (drivers.length === 0) {
      drivers.push('Market momentum');
      drivers.push('Community growth');
    }

    return drivers;
  }

  /**
   * Get predefined high-potential sectors (fallback if API data insufficient)
   */
  getFallbackSectors(): SectorInfo[] {
    return [
      {
        name: 'AI + Crypto',
        category: 'artificial-intelligence',
        marketCapGrowth30d: 25.0,
        marketCapGrowth90d: 75.0,
        narrativeStrength: 0.8,
        fundamentalDrivers: [
          'AI/ML integration with blockchain',
          'Decentralized compute networks',
          'AI model marketplaces',
        ],
        trendScore: 85,
      },
      {
        name: 'DePin (Decentralized Physical Infrastructure)',
        category: 'depin',
        marketCapGrowth30d: 30.0,
        marketCapGrowth90d: 90.0,
        narrativeStrength: 0.75,
        fundamentalDrivers: [
          'Real-world infrastructure deployment',
          'Hardware miner network growth',
          'Enterprise partnerships',
        ],
        trendScore: 82,
      },
      {
        name: 'Real World Assets (RWA)',
        category: 'real-world-assets-rwa',
        marketCapGrowth30d: 20.0,
        marketCapGrowth90d: 65.0,
        narrativeStrength: 0.7,
        fundamentalDrivers: [
          'Asset tokenization initiatives',
          'Institutional adoption',
          'Regulatory clarity',
        ],
        trendScore: 78,
      },
    ];
  }
}

export default SectorAnalyzer;
