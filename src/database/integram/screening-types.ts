/**
 * Integram Screening Database Types
 * Types for storing screening reports, recommendations, and analytics in Integram
 */

import type {
  CryptoSector,
  ProjectRecommendation,
  SectorMetrics,
  ScreeningReport,
} from '../../analyzers/screening/types.js';

/**
 * Table Type IDs in Integram
 * These should be set in environment variables after creating tables in Integram web interface
 */
export const SCREENING_TYPES = {
  // Main tables
  SCREENING_REPORTS: parseInt(process.env.INTEGRAM_TYPE_SCREENING_REPORTS || '0'),
  SCREENING_RECOMMENDATIONS: parseInt(
    process.env.INTEGRAM_TYPE_SCREENING_RECOMMENDATIONS || '0',
  ),
  CRYPTOCURRENCIES: parseInt(process.env.INTEGRAM_TYPE_CRYPTOCURRENCIES || '0'),
  SECTORS: parseInt(process.env.INTEGRAM_TYPE_SECTORS || '0'),
  SECTOR_PERFORMANCE: parseInt(process.env.INTEGRAM_TYPE_SECTOR_PERFORMANCE || '0'),
  PROJECT_METRICS_HISTORY: parseInt(process.env.INTEGRAM_TYPE_PROJECT_METRICS_HISTORY || '0'),

  // Lookup tables
  REPORT_STATUS: parseInt(process.env.INTEGRAM_TYPE_REPORT_STATUS || '0'),
  RISK_LEVELS: parseInt(process.env.INTEGRAM_TYPE_RISK_LEVELS || '0'),
} as const;

/**
 * Screening Reports table schema
 */
export interface IntegramScreeningReport {
  id: number; // Integram object ID
  value: string; // Report ID or timestamp
  requisites: {
    generatedAt: string; // ISO datetime
    analyzedSectors: string; // JSON array of sector names
    projectsCount: number; // Total projects analyzed
    status: string; // Reference to ReportStatus
    duration: number; // Execution time in seconds
    moduleVersion: string; // Screening module version
    configParams: string; // JSON configuration
  };
}

/**
 * Screening Recommendations table schema (subordinate to Screening Reports)
 */
export interface IntegramScreeningRecommendation {
  id: number;
  value: string; // Ticker symbol
  up?: number; // Parent report ID
  requisites: {
    rank: number;
    ticker: string;
    name: string;
    sector: string; // Reference to Sectors
    compositeScore: number; // 0-100
    fundamentalScore: number;
    marketScore: number;
    communityScore: number;
    rationale: string; // Long text
    keyRisk: string; // Long text
    riskLevel: string; // Reference to RiskLevels
    marketCap: number;
    priceToAth: number;
    volume24h: number;
    tradingPairs: string; // JSON array
  };
}

/**
 * Cryptocurrencies lookup table schema
 */
export interface IntegramCryptocurrency {
  id: number;
  value: string; // Ticker (unique)
  requisites: {
    name: string;
    coinGeckoId: string;
    logoUrl: string;
    website: string;
    description: string; // Long text
    lastUpdated: string; // ISO datetime
  };
}

/**
 * Sectors lookup table schema
 */
export interface IntegramSector {
  id: number;
  value: string; // Sector name (unique)
  requisites: {
    description: string; // Long text
    narrative: string; // Long text
    color: string; // Hex color for UI
  };
}

/**
 * Sector Performance table schema (subordinate to Screening Reports)
 */
export interface IntegramSectorPerformance {
  id: number;
  value: string; // Sector name
  up?: number; // Parent report ID
  requisites: {
    sector: string; // Reference to Sectors
    marketCapGrowth30d: number; // Percentage
    marketCapGrowth90d: number; // Percentage
    sectorScore: number;
    selected: boolean; // Was selected for analysis
    rationale: string; // Long text
  };
}

/**
 * Project Metrics History table schema
 */
export interface IntegramProjectMetrics {
  id: number;
  value: string; // Timestamp
  requisites: {
    project: string; // Reference to Cryptocurrencies (ticker)
    date: string; // ISO datetime
    marketCap: number;
    tradingVolume24h: number;
    price: number;
    priceChange30d: number; // Percentage
    tvl: number | null;
    socialScore: number;
    compositeScore: number;
  };
}

/**
 * Helper types for analytics
 */
export interface ReportComparison {
  report1: {
    id: number;
    date: Date;
    recommendations: ProjectRecommendation[];
  };
  report2: {
    id: number;
    date: Date;
    recommendations: ProjectRecommendation[];
  };
  newAdditions: ProjectRecommendation[];
  removed: ProjectRecommendation[];
  stillActive: Array<{
    ticker: string;
    oldScore: number;
    newScore: number;
    scoreDelta: number;
  }>;
}

export interface ProjectMetricsHistory {
  ticker: string;
  metrics: Array<{
    date: Date;
    marketCap: number;
    price: number;
    compositeScore: number;
    tradingVolume24h: number;
  }>;
}

export interface ProjectRanking {
  ticker: string;
  name: string;
  averageScore: number;
  timesRecommended: number;
  lastRecommendedAt: Date;
}

export interface SectorTrend {
  sector: CryptoSector;
  metrics: Array<{
    date: Date;
    marketCapGrowth30d: number;
    marketCapGrowth90d: number;
    score: number;
  }>;
}

export interface PredictionAccuracy {
  reportId: number;
  daysAfter: number;
  avgPriceChange: number;
  winRate: number; // Percentage of positive returns
  bestPick: {
    ticker: string;
    priceChange: number;
  };
  worstPick: {
    ticker: string;
    priceChange: number;
  };
  recommendations: Array<{
    ticker: string;
    initialPrice: number;
    finalPrice: number;
    priceChange: number;
    predicted: boolean; // Was positive performance predicted?
  }>;
}

export interface SectorAnalysis {
  sector: CryptoSector;
  avgMarketCapGrowth: number;
  avgScore: number;
  projectsCount: number;
  performance: 'strong' | 'moderate' | 'weak';
}
