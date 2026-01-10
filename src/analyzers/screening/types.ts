/**
 * Screening Module Types
 *
 * Types for cryptocurrency project screening and analysis
 */

/**
 * Crypto sector/category
 */
export type CryptoSector =
  | 'ai-crypto'
  | 'depin'
  | 'rwa'
  | 'modular-blockchain'
  | 'l2-solutions'
  | 'dex'
  | 'nft-fi'
  | 'defi'
  | 'gaming'
  | 'metaverse'
  | 'infrastructure'
  | 'privacy'
  | 'dao'
  | 'stablecoin';

/**
 * Exchange availability
 */
export type Exchange = 'binance' | 'bybit' | 'okx' | 'kucoin' | 'coinbase' | 'kraken';

/**
 * Project information from CoinGecko
 */
export interface ProjectInfo {
  id: string;
  symbol: string;
  name: string;
  marketCap: number;
  marketCapRank: number;
  volume24h: number;
  priceChange30d: number;
  priceChange90d: number;
  currentPrice: number;
  ath: number;
  athDate: string;
  athChangePercentage: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply: number | null;
  fullyDilutedValuation: number | null;
  sector: CryptoSector | null;
  exchanges: Exchange[];
  image: string;
}

/**
 * Sector metrics for macro analysis
 */
export interface SectorMetrics {
  sector: CryptoSector;
  totalMarketCap: number;
  marketCapChange30d: number;
  marketCapChange90d: number;
  averageVolume24h: number;
  projectCount: number;
  topProjects: string[];
  narrative: string;
  score: number;
}

/**
 * Stage 0: Macro Filter configuration
 */
export interface MacroFilterConfig {
  minMarketCapGrowth30d: number;  // Minimum 30-day market cap growth (%)
  minMarketCapGrowth90d: number;  // Minimum 90-day market cap growth (%)
  topSectorsCount: number;         // Number of top sectors to select
}

/**
 * Stage 1: Quantitative Screening configuration
 */
export interface QuantitativeScreeningConfig {
  minMarketCapRank: number;        // Minimum market cap rank (1-150)
  maxMarketCapRank: number;        // Maximum market cap rank (1-150)
  minVolume24h: number;            // Minimum 24h volume (USD)
  minPriceChange30d: number;       // Minimum 30d price change (%)
  requiredExchanges: Exchange[];   // Required exchanges
  minExchangeCount: number;        // Minimum number of exchanges
  topProjectsPerSector: number;    // Number of top projects per sector
}

/**
 * Investor tier classification
 */
export type InvestorTier = 'TIER1' | 'TIER2' | 'TIER3' | 'UNKNOWN';

/**
 * Fundamental analysis data
 */
export interface FundamentalData {
  investorTier: InvestorTier;
  githubCommits90d: number;
  hasTokenomicsClarity: boolean;
  nextUnlockPercent: number;
  nextUnlockDate: string | null;
  tvl: number | null;
  fdvToTvlRatio: number | null;
  twitterFollowers: number;
  twitterGrowth30d: number;
  communityScore: number;
}

/**
 * Stage 2: Fundamental & On-Chain Scoring configuration
 */
export interface ScoringConfig {
  weights: {
    fundamental: number;     // Weight for fundamental metrics (0-1)
    market: number;          // Weight for market metrics (0-1)
    community: number;       // Weight for community metrics (0-1)
  };
  unlockPenalty: number;      // Penalty for large upcoming unlocks
  unlockThreshold: number;    // Unlock threshold to apply penalty (%)
}

/**
 * Project score breakdown
 */
export interface ProjectScore {
  projectId: string;
  symbol: string;
  name: string;
  sector: CryptoSector | null;
  totalScore: number;
  scores: {
    fundamental: number;
    market: number;
    community: number;
  };
  rank: number;
  fundamentalData: FundamentalData;
  marketData: ProjectInfo;
}

/**
 * Risk level classification
 */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Final project recommendation
 */
export interface ProjectRecommendation {
  rank: number;
  ticker: string;
  name: string;
  sector: CryptoSector | null;
  score: number;
  rationale: string;
  keyRisk: string;
  riskLevel: RiskLevel;
  marketCap: number;
  priceToAth: number;
  volume24h: number;
  tradingPairs: string[];
}

/**
 * Stage 3: Portfolio Construction configuration
 */
export interface PortfolioConfig {
  minProjectsCount: number;        // Minimum projects to select
  maxProjectsCount: number;        // Maximum projects to select
  diversificationRequired: boolean; // Require sector diversification
  includeBlueChips: boolean;       // Include high-cap "blue chips"
  blueChipThreshold: number;       // Market cap rank threshold for blue chips
  includeGazers: boolean;          // Include mid-cap "gazers"
  gazerMinRank: number;            // Min rank for gazers
  gazerMaxRank: number;            // Max rank for gazers
}

/**
 * Complete screening report
 */
export interface ScreeningReport {
  generatedAt: Date;
  analyzedSectors: CryptoSector[];
  selectedSectors: SectorMetrics[];
  totalProjectsAnalyzed: number;
  recommendations: ProjectRecommendation[];
  tradingPairs: string[];
  macroRisks: string[];
  nextActions: string[];
}

/**
 * Complete screening configuration
 */
export interface ScreeningConfig {
  macroFilter: MacroFilterConfig;
  quantitativeScreening: QuantitativeScreeningConfig;
  scoring: ScoringConfig;
  portfolio: PortfolioConfig;
}

/**
 * CoinGecko API response types
 */
export interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency: number;
  price_change_percentage_30d_in_currency: number;
  price_change_percentage_90d_in_currency: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
}

export interface CoinGeckoCoinDetail {
  id: string;
  symbol: string;
  name: string;
  categories: string[];
  description: { en: string };
  links: {
    homepage: string[];
    twitter_screen_name: string;
    github: string[];
  };
  market_data: {
    current_price: { usd: number };
    market_cap: { usd: number };
    total_volume: { usd: number };
  };
  community_data: {
    twitter_followers: number;
    telegram_channel_user_count: number;
  };
  developer_data: {
    forks: number;
    stars: number;
    subscribers: number;
    total_issues: number;
    closed_issues: number;
    pull_requests_merged: number;
    pull_request_contributors: number;
    commit_count_4_weeks: number;
  };
  tickers: Array<{
    base: string;
    target: string;
    market: {
      name: string;
      identifier: string;
    };
    trust_score: string;
    volume: number;
  }>;
}
