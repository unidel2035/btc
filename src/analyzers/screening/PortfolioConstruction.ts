import type {
  ProjectScore,
  ProjectRecommendation,
  PortfolioConfig,
  ScreeningReport,
  CryptoSector,
  SectorMetrics,
  RiskLevel,
} from './types.js';
import { macroRisks } from './config.js';

/**
 * Stage 3: Portfolio Construction
 *
 * Selects final portfolio of 2-4 projects with diversification
 */
export class PortfolioConstruction {
  constructor(private config: PortfolioConfig) {}

  /**
   * Construct final portfolio from ranked projects
   */
  constructPortfolio(
    rankedProjects: ProjectScore[],
    selectedSectors: SectorMetrics[]
  ): ScreeningReport {
    console.info('🎯 Stage 3: Portfolio Construction - Building final portfolio...\n');

    const recommendations: ProjectRecommendation[] = [];
    const selectedSectors_: Set<CryptoSector> = new Set();
    const selectedProjects = new Set<string>();

    // Step 1: Include at least one blue chip (if enabled)
    if (this.config.includeBlueChips) {
      const blueChip = this.selectBlueChip(rankedProjects, selectedProjects);
      if (blueChip) {
        recommendations.push(blueChip);
        selectedProjects.add(blueChip.ticker);
        if (blueChip.sector) {
          selectedSectors_.add(blueChip.sector);
        }
        console.info(`  ✓ Blue Chip: ${blueChip.name} (${blueChip.ticker})`);
      }
    }

    // Step 2: Include at least one gazer (if enabled)
    if (this.config.includeGazers) {
      const gazer = this.selectGazer(rankedProjects, selectedProjects);
      if (gazer) {
        recommendations.push(gazer);
        selectedProjects.add(gazer.ticker);
        if (gazer.sector) {
          selectedSectors_.add(gazer.sector);
        }
        console.info(`  ✓ Gazer: ${gazer.name} (${gazer.ticker})`);
      }
    }

    // Step 3: Fill remaining slots with highest-scoring projects
    for (const project of rankedProjects) {
      if (recommendations.length >= this.config.maxProjectsCount) {
        break;
      }

      if (selectedProjects.has(project.symbol)) {
        continue;
      }

      // If diversification required, ensure different sector
      if (this.config.diversificationRequired && project.sector) {
        if (selectedSectors_.has(project.sector) && selectedSectors_.size < 2) {
          continue;
        }
      }

      const recommendation = this.createRecommendation(
        project,
        recommendations.length + 1
      );
      recommendations.push(recommendation);
      selectedProjects.add(project.symbol);
      if (project.sector) {
        selectedSectors_.add(project.sector);
      }

      console.info(`  ✓ Selected: ${recommendation.name} (${recommendation.ticker})`);
    }

    // Ensure minimum projects
    if (recommendations.length < this.config.minProjectsCount) {
      console.warn(
        `  ⚠ Only ${recommendations.length} projects selected, minimum is ${this.config.minProjectsCount}`
      );
    }

    // Generate trading pairs
    const tradingPairs = recommendations.map((r) => `${r.ticker}/USDT`);

    // Generate next actions
    const nextActions = this.generateNextActions(recommendations);

    const report: ScreeningReport = {
      generatedAt: new Date(),
      analyzedSectors: selectedSectors.map((s) => s.sector),
      selectedSectors,
      totalProjectsAnalyzed: rankedProjects.length,
      recommendations,
      tradingPairs,
      macroRisks,
      nextActions,
    };

    console.info(`\n✅ Portfolio constructed: ${recommendations.length} projects\n`);

    return report;
  }

  /**
   * Select the best blue chip project
   */
  private selectBlueChip(
    projects: ProjectScore[],
    exclude: Set<string>
  ): ProjectRecommendation | null {
    const blueChips = projects.filter(
      (p) =>
        p.marketData.marketCapRank <= this.config.blueChipThreshold &&
        !exclude.has(p.symbol)
    );

    if (blueChips.length === 0 || !blueChips[0]) {
      return null;
    }

    return this.createRecommendation(blueChips[0], 1);
  }

  /**
   * Select the best gazer project
   */
  private selectGazer(
    projects: ProjectScore[],
    exclude: Set<string>
  ): ProjectRecommendation | null {
    const gazers = projects.filter(
      (p) =>
        p.marketData.marketCapRank >= this.config.gazerMinRank &&
        p.marketData.marketCapRank <= this.config.gazerMaxRank &&
        !exclude.has(p.symbol)
    );

    if (gazers.length === 0 || !gazers[0]) {
      return null;
    }

    return this.createRecommendation(gazers[0], 2);
  }

  /**
   * Create a project recommendation from a scored project
   */
  private createRecommendation(
    project: ProjectScore,
    rank: number
  ): ProjectRecommendation {
    const rationale = this.generateRationale(project);
    const keyRisk = this.identifyKeyRisk(project);
    const riskLevel = this.assessRiskLevel(project);

    const priceToAth = (project.marketData.currentPrice / project.marketData.ath) * 100;

    return {
      rank,
      ticker: project.symbol,
      name: project.name,
      sector: project.sector,
      score: project.totalScore,
      rationale,
      keyRisk,
      riskLevel,
      marketCap: project.marketData.marketCap,
      priceToAth,
      volume24h: project.marketData.volume24h,
      tradingPairs: project.marketData.exchanges.map(
        (ex) => `${project.symbol}/USDT on ${ex}`
      ),
    };
  }

  /**
   * Generate rationale for recommending a project
   */
  private generateRationale(project: ProjectScore): string {
    const reasons: string[] = [];

    // Sector narrative
    if (project.sector) {
      reasons.push(
        `Leading project in ${project.sector} sector with strong fundamentals`
      );
    }

    // Market performance
    if (project.marketData.priceChange30d > 20) {
      reasons.push('Strong price momentum (+' + project.marketData.priceChange30d.toFixed(1) + '% in 30d)');
    } else if (project.marketData.priceChange30d > 0) {
      reasons.push('Positive trend with upward momentum');
    }

    // Fundamental strength
    if (project.scores.fundamental > 70) {
      reasons.push('Excellent fundamental metrics');
    } else if (project.scores.fundamental > 50) {
      reasons.push('Solid fundamental foundation');
    }

    // Community
    if (project.scores.community > 70) {
      reasons.push('Large and active community');
    }

    // Liquidity
    const liquidityRatio = project.marketData.volume24h / project.marketData.marketCap;
    if (liquidityRatio > 0.1) {
      reasons.push('High liquidity for easy entry/exit');
    }

    // Distance from ATH
    const priceToAth = (project.marketData.currentPrice / project.marketData.ath) * 100;
    if (priceToAth >= 30 && priceToAth <= 60) {
      reasons.push(`Recovered from lows but still ${(100 - priceToAth).toFixed(0)}% below ATH`);
    }

    return reasons.slice(0, 3).join('; ');
  }

  /**
   * Identify the key risk for a project
   */
  private identifyKeyRisk(project: ProjectScore): string {
    // Check for upcoming unlocks
    if (
      project.fundamentalData.nextUnlockPercent > 5 &&
      project.fundamentalData.nextUnlockDate
    ) {
      return `Major token unlock (${project.fundamentalData.nextUnlockPercent.toFixed(1)}%) scheduled`;
    }

    // Check market cap rank (higher rank = smaller cap = more risk)
    if (project.marketData.marketCapRank > 100) {
      return 'Lower market cap increases volatility risk';
    }

    // Check liquidity
    const liquidityRatio = project.marketData.volume24h / project.marketData.marketCap;
    if (liquidityRatio < 0.02) {
      return 'Limited liquidity may impact large trades';
    }

    // Check price position
    const priceToAth = (project.marketData.currentPrice / project.marketData.ath) * 100;
    if (priceToAth < 20) {
      return 'Far from ATH, may indicate underlying issues';
    } else if (priceToAth > 80) {
      return 'Near ATH, limited upside potential';
    }

    // General sector risk
    if (project.sector) {
      return `Sector-specific risks in ${project.sector} market`;
    }

    return 'General cryptocurrency market volatility';
  }

  /**
   * Assess overall risk level
   */
  private assessRiskLevel(project: ProjectScore): RiskLevel {
    let riskScore = 0;

    // Market cap rank (higher = more risk)
    if (project.marketData.marketCapRank <= 50) {
      riskScore += 1;
    } else if (project.marketData.marketCapRank <= 100) {
      riskScore += 2;
    } else {
      riskScore += 3;
    }

    // Liquidity
    const liquidityRatio = project.marketData.volume24h / project.marketData.marketCap;
    if (liquidityRatio >= 0.1) {
      riskScore += 1;
    } else if (liquidityRatio >= 0.05) {
      riskScore += 2;
    } else {
      riskScore += 3;
    }

    // Volatility proxy (price change)
    const absChange = Math.abs(project.marketData.priceChange30d);
    if (absChange <= 20) {
      riskScore += 1;
    } else if (absChange <= 50) {
      riskScore += 2;
    } else {
      riskScore += 3;
    }

    // Map risk score to risk level
    if (riskScore <= 4) {
      return 'low';
    } else if (riskScore <= 6) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * Generate next actions for the trader
   */
  private generateNextActions(recommendations: ProjectRecommendation[]): string[] {
    const pairs = recommendations.map((r) => `${r.ticker}/USDT`).join(', ');

    return [
      `Transfer trading pairs [${pairs}] to technical analysis module`,
      `Configure TradingView charts for selected symbols`,
      `Set up price alerts for key levels on each asset`,
      `Monitor fundamental triggers (upgrades, unlocks, partnerships)`,
      `Review and adjust position sizing based on risk levels`,
    ];
  }

  /**
   * Format report as markdown
   */
  formatReport(report: ScreeningReport): string {
    const lines: string[] = [];

    lines.push('# 📊 CRYPTOCURRENCY SCREENING REPORT');
    lines.push('');
    lines.push(`**Generated:** ${report.generatedAt.toISOString()}`);
    lines.push(`**Analyzed Sectors:** ${report.analyzedSectors.join(', ')}`);
    lines.push(`**Total Projects Analyzed:** ${report.totalProjectsAnalyzed}`);
    lines.push('');

    lines.push('## 🎯 RECOMMENDED PROJECTS');
    lines.push('');
    lines.push(
      '| Rank | Ticker | Name | Sector | Score | Market Cap | Price/ATH | Risk |'
    );
    lines.push('|------|--------|------|--------|-------|------------|-----------|------|');

    for (const rec of report.recommendations) {
      const mcap = `$${(rec.marketCap / 1e9).toFixed(2)}B`;
      const sector = rec.sector || 'N/A';
      lines.push(
        `| ${rec.rank} | **${rec.ticker}** | ${rec.name} | ${sector} | ${rec.score.toFixed(1)} | ${mcap} | ${rec.priceToAth.toFixed(1)}% | ${rec.riskLevel} |`
      );
    }

    lines.push('');
    lines.push('## 📋 DETAILED ANALYSIS');
    lines.push('');

    for (const rec of report.recommendations) {
      lines.push(`### ${rec.rank}. ${rec.name} (${rec.ticker})`);
      lines.push('');
      lines.push(`**Sector:** ${rec.sector || 'Unknown'}`);
      lines.push(`**Score:** ${rec.score.toFixed(2)}/100`);
      lines.push(`**Risk Level:** ${rec.riskLevel.toUpperCase()}`);
      lines.push('');
      lines.push(`**Rationale:** ${rec.rationale}`);
      lines.push('');
      lines.push(`**Key Risk:** ${rec.keyRisk}`);
      lines.push('');
      lines.push(`**Market Metrics:**`);
      lines.push(`- Market Cap: $${(rec.marketCap / 1e9).toFixed(2)}B`);
      lines.push(`- 24h Volume: $${(rec.volume24h / 1e6).toFixed(2)}M`);
      lines.push(`- Price to ATH: ${rec.priceToAth.toFixed(1)}%`);
      lines.push('');
    }

    lines.push('## 📈 NEXT ACTIONS');
    lines.push('');
    for (let i = 0; i < report.nextActions.length; i++) {
      lines.push(`${i + 1}. ${report.nextActions[i]}`);
    }
    lines.push('');

    lines.push('## ⚠️ MACRO RISKS');
    lines.push('');
    for (const risk of report.macroRisks) {
      lines.push(`- ${risk}`);
    }
    lines.push('');

    lines.push('## 🔗 TRADING PAIRS');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(report.tradingPairs, null, 2));
    lines.push('```');
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('🤖 Generated by Screening Module');

    return lines.join('\n');
  }
}
