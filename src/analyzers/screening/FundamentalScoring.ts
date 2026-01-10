import type {
  ProjectInfo,
  ProjectScore,
  ScoringConfig,
  FundamentalData,
  InvestorTier,
} from './types.js';
import { CoinGeckoClient } from './CoinGeckoClient.js';

/**
 * Stage 2: Fundamental & On-Chain Scoring
 *
 * Calculates composite scores for projects based on multiple criteria
 */
export class FundamentalScoring {
  constructor(
    private client: CoinGeckoClient,
    private config: ScoringConfig
  ) {}

  /**
   * Score all projects and return ranked list
   */
  async scoreProjects(projects: ProjectInfo[]): Promise<ProjectScore[]> {
    console.info('📊 Stage 2: Fundamental Scoring - Calculating scores...\n');

    const scores: ProjectScore[] = [];

    for (const project of projects) {
      console.info(`  Scoring: ${project.name} (${project.symbol})`);

      try {
        const fundamentalData = await this.getFundamentalData(project);
        const projectScore = this.calculateScore(project, fundamentalData);
        scores.push(projectScore);

        console.info(`    Total Score: ${projectScore.totalScore.toFixed(2)}`);
        console.info(`    - Fundamental: ${projectScore.scores.fundamental.toFixed(2)}`);
        console.info(`    - Market: ${projectScore.scores.market.toFixed(2)}`);
        console.info(`    - Community: ${projectScore.scores.community.toFixed(2)}\n`);
      } catch (error) {
        console.warn(`    Failed to score ${project.name}:`, error);
      }
    }

    // Rank projects by total score
    scores.sort((a, b) => b.totalScore - a.totalScore);
    scores.forEach((s, i) => {
      s.rank = i + 1;
    });

    console.info(`✅ Scored ${scores.length} projects\n`);

    return scores;
  }

  /**
   * Get fundamental data for a project
   */
  private async getFundamentalData(project: ProjectInfo): Promise<FundamentalData> {
    try {
      const detail = await this.client.getCoinDetail(project.id);

      // Extract GitHub activity
      const githubCommits90d = detail.developer_data?.commit_count_4_weeks * 3 || 0;

      // Extract Twitter data
      const twitterFollowers = detail.community_data?.twitter_followers || 0;
      const twitterGrowth30d = 0; // Would need historical data

      // Calculate community score
      const communityScore = this.calculateCommunityScore(
        twitterFollowers,
        detail.community_data?.telegram_channel_user_count || 0
      );

      // Estimate investor tier from description and market cap
      const investorTier = this.estimateInvestorTier(project, detail.description?.en || '');

      // Mock tokenomics data (would need external API for real data)
      const hasTokenomicsClarity = true;
      const nextUnlockPercent = 0;
      const nextUnlockDate = null;

      // Calculate TVL metrics if available (DeFi projects)
      const tvl = null; // Would need DefiLlama API
      const fdvToTvlRatio =
        tvl && project.fullyDilutedValuation
          ? project.fullyDilutedValuation / tvl
          : null;

      return {
        investorTier,
        githubCommits90d,
        hasTokenomicsClarity,
        nextUnlockPercent,
        nextUnlockDate,
        tvl,
        fdvToTvlRatio,
        twitterFollowers,
        twitterGrowth30d,
        communityScore,
      };
    } catch (error) {
      // Return default values if fetch fails
      return {
        investorTier: 'UNKNOWN',
        githubCommits90d: 0,
        hasTokenomicsClarity: false,
        nextUnlockPercent: 0,
        nextUnlockDate: null,
        tvl: null,
        fdvToTvlRatio: null,
        twitterFollowers: 0,
        twitterGrowth30d: 0,
        communityScore: 0,
      };
    }
  }

  /**
   * Calculate composite score for a project
   */
  private calculateScore(
    project: ProjectInfo,
    fundamentalData: FundamentalData
  ): ProjectScore {
    // A. Fundamental Score (0-100)
    const fundamentalScore = this.calculateFundamentalScore(project, fundamentalData);

    // B. Market Score (0-100)
    const marketScore = this.calculateMarketScore(project, fundamentalData);

    // C. Community Score (0-100)
    const communityScore = fundamentalData.communityScore;

    // Weighted total score
    const totalScore =
      fundamentalScore * this.config.weights.fundamental +
      marketScore * this.config.weights.market +
      communityScore * this.config.weights.community;

    return {
      projectId: project.id,
      symbol: project.symbol,
      name: project.name,
      sector: project.sector,
      totalScore,
      scores: {
        fundamental: fundamentalScore,
        market: marketScore,
        community: communityScore,
      },
      rank: 0, // Will be set later
      fundamentalData,
      marketData: project,
    };
  }

  /**
   * Calculate fundamental score (0-100)
   */
  private calculateFundamentalScore(
    _project: ProjectInfo,
    data: FundamentalData
  ): number {
    let score = 0;

    // Investor quality (0-30)
    const investorScores: Record<InvestorTier, number> = {
      TIER1: 30,
      TIER2: 20,
      TIER3: 10,
      UNKNOWN: 5,
    };
    score += investorScores[data.investorTier];

    // Development activity (0-30)
    const devScore = Math.min((data.githubCommits90d / 100) * 30, 30);
    score += devScore;

    // Tokenomics clarity (0-20)
    if (data.hasTokenomicsClarity) {
      score += 20;
    }

    // Unlock penalty (0 to -unlockPenalty)
    if (data.nextUnlockPercent > this.config.unlockThreshold) {
      score -= this.config.unlockPenalty;
    }

    // TVL efficiency for DeFi (0-20)
    if (data.fdvToTvlRatio !== null) {
      // Lower FDV/TVL is better (means undervalued relative to usage)
      if (data.fdvToTvlRatio < 2) {
        score += 20;
      } else if (data.fdvToTvlRatio < 5) {
        score += 10;
      } else if (data.fdvToTvlRatio < 10) {
        score += 5;
      }
    }

    return Math.max(Math.min(score, 100), 0);
  }

  /**
   * Calculate market score (0-100)
   */
  private calculateMarketScore(
    project: ProjectInfo,
    fundamentalData: FundamentalData
  ): number {
    let score = 0;

    // TVL/MarketCap ratio for DeFi (0-25)
    if (fundamentalData.tvl && fundamentalData.tvl > 0) {
      const tvlToMcap = fundamentalData.tvl / project.marketCap;
      if (tvlToMcap > 0.5) {
        score += 25;
      } else if (tvlToMcap > 0.2) {
        score += 15;
      } else if (tvlToMcap > 0.1) {
        score += 5;
      }
    } else {
      // If no TVL data, give neutral score
      score += 12.5;
    }

    // Price vs ATH (0-25)
    const priceToAth = (project.currentPrice / project.ath) * 100;
    if (priceToAth >= 30 && priceToAth <= 60) {
      // Sweet spot: recovered but still has room
      score += 25;
    } else if (priceToAth >= 20 && priceToAth <= 70) {
      score += 15;
    } else if (priceToAth >= 10 && priceToAth <= 80) {
      score += 10;
    } else {
      score += 5;
    }

    // Liquidity (Volume/MarketCap) (0-25)
    const liquidityRatio = project.volume24h / project.marketCap;
    if (liquidityRatio > 0.15) {
      score += 25;
    } else if (liquidityRatio > 0.1) {
      score += 20;
    } else if (liquidityRatio > 0.05) {
      score += 15;
    } else if (liquidityRatio > 0.02) {
      score += 10;
    } else {
      score += 5;
    }

    // Recent performance (0-25)
    const priceChange30d = project.priceChange30d;
    if (priceChange30d > 30) {
      score += 25;
    } else if (priceChange30d > 15) {
      score += 20;
    } else if (priceChange30d > 5) {
      score += 15;
    } else if (priceChange30d > 0) {
      score += 10;
    } else {
      score += 5;
    }

    return Math.max(Math.min(score, 100), 0);
  }

  /**
   * Calculate community score (0-100)
   */
  private calculateCommunityScore(
    twitterFollowers: number,
    telegramUsers: number
  ): number {
    let score = 0;

    // Twitter following (0-50)
    if (twitterFollowers > 1_000_000) {
      score += 50;
    } else if (twitterFollowers > 500_000) {
      score += 40;
    } else if (twitterFollowers > 100_000) {
      score += 30;
    } else if (twitterFollowers > 50_000) {
      score += 20;
    } else if (twitterFollowers > 10_000) {
      score += 10;
    }

    // Telegram community (0-30)
    if (telegramUsers > 100_000) {
      score += 30;
    } else if (telegramUsers > 50_000) {
      score += 25;
    } else if (telegramUsers > 10_000) {
      score += 20;
    } else if (telegramUsers > 5_000) {
      score += 15;
    } else if (telegramUsers > 1_000) {
      score += 10;
    }

    // Base score for having any community
    score += 20;

    return Math.max(Math.min(score, 100), 0);
  }

  /**
   * Estimate investor tier from project characteristics
   */
  private estimateInvestorTier(
    project: ProjectInfo,
    description: string
  ): InvestorTier {
    // TIER 1 indicators
    const tier1Investors = [
      'a16z',
      'andreessen horowitz',
      'paradigm',
      'sequoia',
      'coinbase ventures',
      'binance labs',
    ];

    // TIER 2 indicators
    const tier2Investors = [
      'pantera',
      'polychain',
      'multicoin',
      'digital currency group',
      'dragonfly',
    ];

    const descLower = description.toLowerCase();

    for (const investor of tier1Investors) {
      if (descLower.includes(investor.toLowerCase())) {
        return 'TIER1';
      }
    }

    for (const investor of tier2Investors) {
      if (descLower.includes(investor.toLowerCase())) {
        return 'TIER2';
      }
    }

    // Use market cap rank as proxy
    if (project.marketCapRank <= 20) {
      return 'TIER1';
    } else if (project.marketCapRank <= 50) {
      return 'TIER2';
    } else if (project.marketCapRank <= 100) {
      return 'TIER3';
    }

    return 'UNKNOWN';
  }
}
