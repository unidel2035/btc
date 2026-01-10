import type { ScreeningConfig } from './types.js';

/**
 * Default screening configuration
 *
 * All parameters are adjustable to adapt to changing market conditions
 */
export const defaultScreeningConfig: ScreeningConfig = {
  // Stage 0: Macro Filter
  macroFilter: {
    minMarketCapGrowth30d: 5, // Minimum 5% growth over 30 days
    minMarketCapGrowth90d: 10, // Minimum 10% growth over 90 days
    topSectorsCount: 2, // Select top 2-3 sectors
  },

  // Stage 1: Quantitative Screening
  quantitativeScreening: {
    minMarketCapRank: 1, // Consider from rank 1
    maxMarketCapRank: 150, // Up to rank 150
    minVolume24h: 10_000_000, // Minimum $10M daily volume
    minPriceChange30d: 0, // Must be in uptrend or holding
    requiredExchanges: ['binance', 'bybit'], // Must be on at least these exchanges
    minExchangeCount: 2, // Minimum 2 major exchanges
    topProjectsPerSector: 7, // Top 5-7 projects per sector
  },

  // Stage 2: Fundamental & On-Chain Scoring
  scoring: {
    weights: {
      fundamental: 0.3, // 30% weight for fundamentals
      market: 0.4, // 40% weight for market metrics
      community: 0.3, // 30% weight for community
    },
    unlockPenalty: 10, // 10 point penalty for large unlocks
    unlockThreshold: 2, // Apply penalty if unlock > 2% of supply
  },

  // Stage 3: Portfolio Construction
  portfolio: {
    minProjectsCount: 2, // Select at least 2 projects
    maxProjectsCount: 4, // Select up to 4 projects
    diversificationRequired: true, // Must diversify across sectors
    includeBlueChips: true, // Include at least 1 blue chip
    blueChipThreshold: 50, // Blue chips are top 50 by market cap
    includeGazers: true, // Include at least 1 high-potential mid-cap
    gazerMinRank: 50, // Gazers start from rank 50
    gazerMaxRank: 150, // Gazers up to rank 150
  },
};

/**
 * Get screening config from environment variables or use defaults
 */
export function getScreeningConfig(): ScreeningConfig {
  return {
    macroFilter: {
      minMarketCapGrowth30d: Number(process.env.SCREENING_MIN_MCAP_GROWTH_30D) || 5,
      minMarketCapGrowth90d: Number(process.env.SCREENING_MIN_MCAP_GROWTH_90D) || 10,
      topSectorsCount: Number(process.env.SCREENING_TOP_SECTORS_COUNT) || 2,
    },
    quantitativeScreening: {
      minMarketCapRank: Number(process.env.SCREENING_MIN_MCAP_RANK) || 1,
      maxMarketCapRank: Number(process.env.SCREENING_MAX_MCAP_RANK) || 150,
      minVolume24h: Number(process.env.SCREENING_MIN_VOLUME_24H) || 10_000_000,
      minPriceChange30d: Number(process.env.SCREENING_MIN_PRICE_CHANGE_30D) || 0,
      requiredExchanges: (process.env.SCREENING_REQUIRED_EXCHANGES?.split(',') as Array<
        'binance' | 'bybit' | 'okx' | 'kucoin'
      >) || ['binance', 'bybit'],
      minExchangeCount: Number(process.env.SCREENING_MIN_EXCHANGE_COUNT) || 2,
      topProjectsPerSector: Number(process.env.SCREENING_TOP_PROJECTS_PER_SECTOR) || 7,
    },
    scoring: {
      weights: {
        fundamental: Number(process.env.SCREENING_WEIGHT_FUNDAMENTAL) || 0.3,
        market: Number(process.env.SCREENING_WEIGHT_MARKET) || 0.4,
        community: Number(process.env.SCREENING_WEIGHT_COMMUNITY) || 0.3,
      },
      unlockPenalty: Number(process.env.SCREENING_UNLOCK_PENALTY) || 10,
      unlockThreshold: Number(process.env.SCREENING_UNLOCK_THRESHOLD) || 2,
    },
    portfolio: {
      minProjectsCount: Number(process.env.SCREENING_MIN_PROJECTS) || 2,
      maxProjectsCount: Number(process.env.SCREENING_MAX_PROJECTS) || 4,
      diversificationRequired: process.env.SCREENING_REQUIRE_DIVERSIFICATION !== 'false',
      includeBlueChips: process.env.SCREENING_INCLUDE_BLUE_CHIPS !== 'false',
      blueChipThreshold: Number(process.env.SCREENING_BLUE_CHIP_THRESHOLD) || 50,
      includeGazers: process.env.SCREENING_INCLUDE_GAZERS !== 'false',
      gazerMinRank: Number(process.env.SCREENING_GAZER_MIN_RANK) || 50,
      gazerMaxRank: Number(process.env.SCREENING_GAZER_MAX_RANK) || 150,
    },
  };
}

/**
 * Sector narratives and descriptions
 */
export const sectorNarratives: Record<string, string> = {
  'ai-crypto': 'Decentralized AI infrastructure and data markets, benefiting from the AI boom',
  depin: 'Decentralized Physical Infrastructure Networks, tokenizing real-world infrastructure',
  rwa: 'Real World Assets, bridging traditional finance with blockchain technology',
  'modular-blockchain':
    'Modular blockchain architecture, enabling scalable and flexible blockchain solutions',
  'l2-solutions': 'Layer 2 scaling solutions, reducing costs and increasing throughput',
  dex: 'Decentralized exchanges with innovative trading mechanisms',
  'nft-fi': 'NFT financialization, unlocking liquidity for digital assets',
  defi: 'Decentralized Finance protocols and platforms',
  gaming: 'Blockchain gaming and play-to-earn ecosystems',
  metaverse: 'Virtual worlds and metaverse platforms',
  infrastructure: 'Core blockchain infrastructure and tooling',
  privacy: 'Privacy-focused cryptocurrencies and protocols',
  dao: 'Decentralized Autonomous Organizations and governance',
  stablecoin: 'Stablecoins and algorithmic stability mechanisms',
};

/**
 * Macro risk factors to monitor
 */
export const macroRisks = [
  'General cryptocurrency market correction',
  'Regulatory uncertainty and potential crackdowns',
  'Macroeconomic factors (interest rates, inflation)',
  'Competition from traditional finance entering crypto',
  'Security risks and smart contract vulnerabilities',
];
