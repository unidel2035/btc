/**
 * Types and interfaces for the AI Screening Module
 */

export interface SectorInfo {
  name: string;
  category: string;
  marketCapGrowth30d: number;
  marketCapGrowth90d: number;
  narrativeStrength: number;
  fundamentalDrivers: string[];
  trendScore: number;
}

export interface ProjectCandidate {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  marketCap: number;
  marketCapRank: number;
  volume24h: number;
  priceChange30d: number;
  priceChange90d: number;
  currentPrice: number;
  ath: number;
  athDate: string;
  atl: number;
  atlDate: string;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply: number | null;
  exchanges: string[];
  links: {
    homepage?: string[];
    twitter?: string;
    reddit?: string;
    github?: string[];
  };
}

export interface ScoredProject extends ProjectCandidate {
  scores: {
    fundamental: number;
    market: number;
    community: number;
    total: number;
  };
  metrics: {
    tvlRatio?: number;
    priceToAth: number;
    liquidityRatio: number;
    githubActivity?: number;
    twitterGrowth?: number;
    nextUnlockPercent?: number;
    nextUnlockDays?: number;
  };
  reasoning: string[];
  risks: string[];
}

export interface PortfolioProject {
  rank: number;
  ticker: string;
  name: string;
  sector: string;
  rating: number;
  justification: string;
  keyRisk: string;
  tradingPair: string;
}

export interface ScreeningReport {
  generatedAt: string;
  analyzedSectors: string[];
  recommendedProjects: PortfolioProject[];
  nextActions: string[];
  macroRisks: string[];
  summary: {
    totalProjectsAnalyzed: number;
    sectorsAnalyzed: number;
    finalSelectionCount: number;
  };
}

export interface ScreeningConfig {
  // Stage 0: Sector Selection
  maxSectors: number;
  minSectorGrowth30d: number;
  minNarrativeStrength: number;

  // Stage 1: Quantitative Screening
  minMarketCapRank: number;
  maxMarketCapRank: number;
  minVolume24h: number;
  minPriceChange30d: number;
  requiredExchanges: string[];
  minExchangeListings: number;
  projectsPerSector: number;

  // Stage 2: Scoring Weights
  weights: {
    fundamental: number;
    market: number;
    community: number;
  };

  // Stage 2: Scoring Thresholds
  minGithubCommits90d?: number;
  maxUnlockPercent30d: number;
  minTvlMarketCapRatio?: number;
  penaltyPerUnlockPercent: number;

  // Stage 3: Portfolio Construction
  finalProjectCount: number;
  minProjectsPerSector: number;
  bluechipRatio: number; // Ratio of high-cap "blue chip" projects
  gazzelleRatio: number; // Ratio of mid-cap "high growth" projects
}

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

export interface CoinGeckoDetailedData {
  id: string;
  symbol: string;
  name: string;
  categories: string[];
  description: { en: string };
  links: {
    homepage: string[];
    blockchain_site: string[];
    official_forum_url: string[];
    chat_url: string[];
    announcement_url: string[];
    twitter_screen_name: string;
    facebook_username: string;
    bitcointalk_thread_identifier: string | null;
    telegram_channel_identifier: string;
    subreddit_url: string;
    repos_url: {
      github: string[];
      bitbucket: string[];
    };
  };
  market_data: {
    current_price: { usd: number };
    market_cap: { usd: number };
    total_volume: { usd: number };
    price_change_percentage_30d: number;
    price_change_percentage_90d: number;
  };
  community_data: {
    twitter_followers: number;
    reddit_average_posts_48h: number;
    reddit_average_comments_48h: number;
    reddit_subscribers: number;
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

export interface CoinGeckoCategoryData {
  id: string;
  name: string;
  market_cap: number;
  market_cap_change_24h: number;
  content: string;
  top_3_coins: string[];
  volume_24h: number;
  updated_at: string;
}
