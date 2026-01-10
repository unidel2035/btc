/**
 * Stage 2: Fundamental & On-Chain Scoring
 * Scores projects based on fundamental metrics, team, community, and tokenomics
 */

import type {
  ProjectCandidate,
  ScoredProject,
  ScreeningConfig,
  CoinGeckoDetailedData,
} from '../types/index.js';
import CoinGeckoClient from '../utils/CoinGeckoClient.js';

export class FundamentalScorer {
  private client: CoinGeckoClient;
  private config: ScreeningConfig;

  constructor(client: CoinGeckoClient, config: ScreeningConfig) {
    this.client = client;
    this.config = config;
  }

  /**
   * Score all candidate projects
   */
  async scoreProjects(candidates: ProjectCandidate[]): Promise<ScoredProject[]> {
    console.log('\n🔍 Stage 2: Scoring projects on fundamentals...');

    const scoredProjects: ScoredProject[] = [];

    for (const candidate of candidates) {
      try {
        const details = await this.client.getCoinDetails(candidate.id);
        const scored = await this.scoreProject(candidate, details);
        scoredProjects.push(scored);

        console.log(
          `   ✅ ${candidate.symbol}: ${scored.scores.total.toFixed(1)}/100`
        );
      } catch (error) {
        console.error(`   ❌ Error scoring ${candidate.symbol}:`, error);
        continue;
      }
    }

    // Sort by total score
    scoredProjects.sort((a, b) => b.scores.total - a.scores.total);

    console.log(`\n✅ Scored ${scoredProjects.length} projects`);

    return scoredProjects;
  }

  /**
   * Score a single project
   */
  private async scoreProject(
    candidate: ProjectCandidate,
    details: CoinGeckoDetailedData
  ): Promise<ScoredProject> {
    // Calculate individual scores
    const fundamentalScore = this.calculateFundamentalScore(candidate, details);
    const marketScore = this.calculateMarketScore(candidate, details);
    const communityScore = this.calculateCommunityScore(details);

    // Calculate weighted total
    const totalScore =
      fundamentalScore * this.config.weights.fundamental +
      marketScore * this.config.weights.market +
      communityScore * this.config.weights.community;

    // Calculate detailed metrics
    const metrics = this.calculateMetrics(candidate, details);

    // Generate reasoning
    const reasoning = this.generateReasoning(
      candidate,
      details,
      { fundamental: fundamentalScore, market: marketScore, community: communityScore },
      metrics
    );

    // Identify risks
    const risks = this.identifyRisks(candidate, details, metrics);

    return {
      ...candidate,
      scores: {
        fundamental: fundamentalScore,
        market: marketScore,
        community: communityScore,
        total: totalScore,
      },
      metrics,
      reasoning,
      risks,
    };
  }

  /**
   * Calculate fundamental score (team, development, tokenomics)
   */
  private calculateFundamentalScore(
    candidate: ProjectCandidate,
    details: CoinGeckoDetailedData
  ): number {
    let score = 0;

    // GitHub activity (if available)
    if (details.developer_data && details.developer_data.commit_count_4_weeks > 0) {
      const commits = details.developer_data.commit_count_4_weeks;
      const githubScore = Math.min((commits / 100) * 30, 30); // Max 30 points
      score += githubScore;
    } else {
      score += 10; // Baseline if no data
    }

    // Tokenomics clarity
    const hasMaxSupply = candidate.maxSupply !== null;
    const inflationRate = this.calculateInflationRate(candidate);

    if (hasMaxSupply && inflationRate < 5) {
      score += 20; // Good tokenomics
    } else if (hasMaxSupply || inflationRate < 10) {
      score += 10; // Acceptable
    }

    // GitHub stars and community (proxy for team quality)
    if (details.developer_data && details.developer_data.stars > 0) {
      const stars = details.developer_data.stars;
      const starsScore = Math.min((stars / 1000) * 20, 20); // Max 20 points
      score += starsScore;
    }

    // Active development (issues, PRs)
    if (details.developer_data) {
      const { total_issues, closed_issues } = details.developer_data;
      if (total_issues > 0) {
        const resolvedRatio = closed_issues / total_issues;
        score += resolvedRatio * 15; // Max 15 points
      }
    }

    // Links and transparency
    const hasHomepage = candidate.links.homepage && candidate.links.homepage.length > 0;
    const hasGithub = candidate.links.github && candidate.links.github.length > 0;
    const hasTwitter = !!candidate.links.twitter;

    if (hasHomepage && hasGithub && hasTwitter) {
      score += 15; // Transparent project
    } else if (hasHomepage && (hasGithub || hasTwitter)) {
      score += 8;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate market score (valuation, liquidity, price action)
   */
  private calculateMarketScore(
    candidate: ProjectCandidate,
    _details: CoinGeckoDetailedData // Reserved for future on-chain metrics
  ): number {
    let score = 0;

    // Price to ATH ratio (recovery potential)
    const priceToAth = candidate.currentPrice / candidate.ath;

    if (priceToAth >= 0.3 && priceToAth <= 0.6) {
      score += 25; // Sweet spot for recovery
    } else if (priceToAth >= 0.15 && priceToAth < 0.3) {
      score += 20; // High upside but riskier
    } else if (priceToAth > 0.6 && priceToAth < 0.9) {
      score += 15; // Already recovered significantly
    } else {
      score += 5;
    }

    // Liquidity (volume to market cap ratio)
    const volumeRatio = candidate.volume24h / candidate.marketCap;

    if (volumeRatio > 0.1) {
      score += 25; // Highly liquid
    } else if (volumeRatio > 0.05) {
      score += 20;
    } else if (volumeRatio > 0.02) {
      score += 15;
    } else {
      score += 5;
    }

    // Price momentum (30d change)
    if (candidate.priceChange30d > 30) {
      score += 20; // Strong momentum
    } else if (candidate.priceChange30d > 15) {
      score += 15;
    } else if (candidate.priceChange30d > 0) {
      score += 10;
    } else {
      score += 2; // Negative momentum
    }

    // Exchange listings (quality proxy)
    const exchangeCount = candidate.exchanges.length;
    if (exchangeCount >= 10) {
      score += 15;
    } else if (exchangeCount >= 5) {
      score += 10;
    } else {
      score += 5;
    }

    // Market cap rank (lower is better, but not too low)
    if (candidate.marketCapRank <= 50) {
      score += 15; // Blue chip
    } else if (candidate.marketCapRank <= 150) {
      score += 20; // Sweet spot for growth
    } else {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate community score (social metrics, engagement)
   */
  private calculateCommunityScore(details: CoinGeckoDetailedData): number {
    let score = 0;

    if (!details.community_data) {
      return 20; // Baseline if no data
    }

    const { twitter_followers, reddit_subscribers, telegram_channel_user_count } =
      details.community_data;

    // Twitter followers
    if (twitter_followers > 100000) {
      score += 30;
    } else if (twitter_followers > 50000) {
      score += 25;
    } else if (twitter_followers > 10000) {
      score += 20;
    } else {
      score += 10;
    }

    // Reddit community
    if (reddit_subscribers > 50000) {
      score += 25;
    } else if (reddit_subscribers > 10000) {
      score += 20;
    } else if (reddit_subscribers > 1000) {
      score += 15;
    } else {
      score += 5;
    }

    // Telegram
    if (telegram_channel_user_count > 50000) {
      score += 25;
    } else if (telegram_channel_user_count > 10000) {
      score += 20;
    } else if (telegram_channel_user_count > 1000) {
      score += 15;
    } else {
      score += 5;
    }

    // Activity (Reddit posts/comments)
    const { reddit_average_posts_48h, reddit_average_comments_48h } = details.community_data;
    const activity = reddit_average_posts_48h + reddit_average_comments_48h;

    if (activity > 100) {
      score += 20;
    } else if (activity > 50) {
      score += 15;
    } else if (activity > 10) {
      score += 10;
    } else {
      score += 5;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate detailed metrics
   */
  private calculateMetrics(
    candidate: ProjectCandidate,
    details: CoinGeckoDetailedData
  ): ScoredProject['metrics'] {
    return {
      priceToAth: candidate.currentPrice / candidate.ath,
      liquidityRatio: candidate.volume24h / candidate.marketCap,
      githubActivity: details.developer_data?.commit_count_4_weeks,
      twitterGrowth: undefined, // Would need historical data
      nextUnlockPercent: undefined, // Would need tokenomics API
      nextUnlockDays: undefined,
    };
  }

  /**
   * Generate reasoning for the score
   */
  private generateReasoning(
    candidate: ProjectCandidate,
    _details: CoinGeckoDetailedData, // Reserved for future detailed analysis
    scores: { fundamental: number; market: number; community: number },
    metrics: ScoredProject['metrics']
  ): string[] {
    const reasoning: string[] = [];

    // Fundamental reasoning
    if (scores.fundamental > 70) {
      reasoning.push('Strong fundamentals with active development');
    } else if (scores.fundamental > 50) {
      reasoning.push('Solid fundamentals with regular updates');
    }

    // Market reasoning
    if (metrics.priceToAth < 0.5) {
      reasoning.push(
        `Trading at ${(metrics.priceToAth * 100).toFixed(0)}% of ATH, significant recovery potential`
      );
    }

    if (metrics.liquidityRatio > 0.1) {
      reasoning.push('High liquidity enables easy entry/exit');
    }

    // Community reasoning
    if (scores.community > 70) {
      reasoning.push('Large and active community across platforms');
    }

    // Sector specific
    reasoning.push(`Leading project in ${candidate.sector} sector`);

    // Exchange listings
    if (candidate.exchanges.length >= 10) {
      reasoning.push(`Listed on ${candidate.exchanges.length}+ exchanges including major ones`);
    }

    return reasoning;
  }

  /**
   * Identify key risks
   */
  private identifyRisks(
    candidate: ProjectCandidate,
    _details: CoinGeckoDetailedData, // Reserved for future risk analysis
    metrics: ScoredProject['metrics']
  ): string[] {
    const risks: string[] = [];

    // Market cap risk
    if (candidate.marketCapRank > 200) {
      risks.push('Lower market cap - higher volatility and risk');
    }

    // Liquidity risk
    if (metrics.liquidityRatio < 0.02) {
      risks.push('Lower liquidity - potential slippage on large orders');
    }

    // Development risk
    if (metrics.githubActivity !== undefined && metrics.githubActivity < 10) {
      risks.push('Low recent development activity');
    }

    // Tokenomics risk
    const inflationRate = this.calculateInflationRate(candidate);
    if (inflationRate > 10) {
      risks.push(`High inflation rate (~${inflationRate.toFixed(1)}%)`);
    }

    // General market risk
    risks.push('Subject to overall crypto market volatility');

    return risks;
  }

  /**
   * Calculate inflation rate from supply data
   */
  private calculateInflationRate(candidate: ProjectCandidate): number {
    if (!candidate.maxSupply) {
      return 0; // Unknown
    }

    const remaining = candidate.maxSupply - candidate.circulatingSupply;
    const annualInflation = (remaining / candidate.circulatingSupply) * 10; // Rough estimate

    return Math.min(annualInflation, 100);
  }
}

export default FundamentalScorer;
