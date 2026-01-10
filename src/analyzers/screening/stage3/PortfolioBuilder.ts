/**
 * Stage 3: Portfolio Construction
 * Selects final 2-4 projects with diversification and risk balance
 */

import type { ScoredProject, PortfolioProject, ScreeningConfig } from '../types/index.js';

export class PortfolioBuilder {
  private config: ScreeningConfig;

  constructor(config: ScreeningConfig) {
    this.config = config;
  }

  /**
   * Build final portfolio from scored projects
   */
  buildPortfolio(scoredProjects: ScoredProject[]): PortfolioProject[] {
    console.log('\n🔍 Stage 3: Building final portfolio...');

    // Group projects by sector
    const projectsBySector = this.groupBySector(scoredProjects);

    // Select projects with diversification
    const selectedProjects = this.selectDiversifiedProjects(projectsBySector);

    // Convert to portfolio format
    const portfolio = this.convertToPortfolioProjects(selectedProjects);

    console.log(`\n✅ Final portfolio: ${portfolio.length} projects`);
    portfolio.forEach((project, idx) => {
      console.log(
        `   ${idx + 1}. ${project.ticker} - ${project.name} (${project.sector}) - ${project.rating}/100`,
      );
    });

    return portfolio;
  }

  /**
   * Group projects by sector
   */
  private groupBySector(projects: ScoredProject[]): Map<string, ScoredProject[]> {
    const grouped = new Map<string, ScoredProject[]>();

    for (const project of projects) {
      const existing = grouped.get(project.sector) || [];
      existing.push(project);
      grouped.set(project.sector, existing);
    }

    // Sort within each sector by score
    for (const [sector, projects] of grouped) {
      projects.sort((a, b) => b.scores.total - a.scores.total);
      grouped.set(sector, projects);
    }

    return grouped;
  }

  /**
   * Select projects ensuring diversification across sectors and risk levels
   */
  private selectDiversifiedProjects(
    projectsBySector: Map<string, ScoredProject[]>,
  ): ScoredProject[] {
    const selected: ScoredProject[] = [];
    const targetCount = this.config.finalProjectCount;

    // Calculate how many bluechips and gazzelles we need
    const bluechipCount = Math.ceil(targetCount * this.config.bluechipRatio);
    const gazzelleCount = targetCount - bluechipCount;

    console.log(`   Target: ${bluechipCount} bluechips, ${gazzelleCount} gazzelles`);

    // First, ensure we have at least one project from each sector
    const sectors = Array.from(projectsBySector.keys());

    for (const sector of sectors) {
      const projects = projectsBySector.get(sector);
      if (projects && projects.length > 0 && selected.length < targetCount) {
        selected.push(projects[0]);
      }
    }

    // Then, add more projects balancing between bluechips and gazzelles
    const bluechips: ScoredProject[] = [];
    const gazzelles: ScoredProject[] = [];

    for (const projects of projectsBySector.values()) {
      for (const project of projects) {
        if (selected.includes(project)) continue;

        // Classify as bluechip or gazzelle based on market cap rank
        if (project.marketCapRank <= 50) {
          bluechips.push(project);
        } else if (project.marketCapRank <= 200) {
          gazzelles.push(project);
        }
      }
    }

    // Sort by score
    bluechips.sort((a, b) => b.scores.total - a.scores.total);
    gazzelles.sort((a, b) => b.scores.total - a.scores.total);

    // Add bluechips up to the target
    let addedBluechips = selected.filter((p) => p.marketCapRank <= 50).length;
    for (const bluechip of bluechips) {
      if (selected.length >= targetCount) break;
      if (addedBluechips >= bluechipCount) break;

      selected.push(bluechip);
      addedBluechips++;
    }

    // Add gazzelles up to the target
    let addedGazzelles = selected.filter(
      (p) => p.marketCapRank > 50 && p.marketCapRank <= 200,
    ).length;
    for (const gazzelle of gazzelles) {
      if (selected.length >= targetCount) break;
      if (addedGazzelles >= gazzelleCount) break;

      selected.push(gazzelle);
      addedGazzelles++;
    }

    // Sort final selection by score
    selected.sort((a, b) => b.scores.total - a.scores.total);

    return selected.slice(0, targetCount);
  }

  /**
   * Convert scored projects to portfolio format
   */
  private convertToPortfolioProjects(projects: ScoredProject[]): PortfolioProject[] {
    return projects.map((project, index) => ({
      rank: index + 1,
      ticker: project.symbol,
      name: project.name,
      sector: project.sector,
      rating: Math.round(project.scores.total),
      justification: this.generateJustification(project),
      keyRisk: this.selectKeyRisk(project),
      tradingPair: `${project.symbol}/USDT`,
    }));
  }

  /**
   * Generate brief justification for selection
   */
  private generateJustification(project: ScoredProject): string {
    const parts: string[] = [];

    // Add top reasoning point
    if (project.reasoning && project.reasoning.length > 0) {
      parts.push(project.reasoning[0]);
    }

    // Add market position
    if (project.marketCapRank <= 50) {
      parts.push('established market leader');
    } else if (project.marketCapRank <= 150) {
      parts.push('strong growth potential');
    }

    // Add strength indicator
    if (project.scores.fundamental > 70) {
      parts.push('solid fundamentals');
    }
    if (project.scores.community > 70) {
      parts.push('strong community');
    }

    return parts.join(', ');
  }

  /**
   * Select the most important risk to highlight
   */
  private selectKeyRisk(project: ScoredProject): string {
    if (!project.risks || project.risks.length === 0) {
      return 'General market volatility';
    }

    // Prioritize specific risks over general ones
    const specificRisks = project.risks.filter((risk) => !risk.includes('market volatility'));

    if (specificRisks.length > 0) {
      return specificRisks[0];
    }

    return project.risks[0];
  }

  /**
   * Validate portfolio diversification
   */
  validateDiversification(portfolio: PortfolioProject[]): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check sector diversity
    const sectors = new Set(portfolio.map((p) => p.sector));
    if (sectors.size < this.config.minProjectsPerSector && portfolio.length > 1) {
      issues.push(`Low sector diversity: only ${sectors.size} different sectors`);
    }

    // Check we don't have duplicate functionality
    const names = portfolio.map((p) => p.name.toLowerCase());
    const duplicates = names.filter((name, idx) => names.indexOf(name) !== idx);
    if (duplicates.length > 0) {
      issues.push('Potential duplicate projects detected');
    }

    // Check balance between bluechips and gazzelles
    const bluechips = portfolio.filter((p) => {
      // Infer from name or rating
      return p.rating >= 80;
    });

    const expectedBluechips = Math.ceil(portfolio.length * this.config.bluechipRatio);

    if (Math.abs(bluechips.length - expectedBluechips) > 1) {
      issues.push(
        `Imbalanced risk profile: ${bluechips.length} bluechips vs ${expectedBluechips} expected`,
      );
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Get portfolio summary statistics
   */
  getPortfolioStats(portfolio: PortfolioProject[]): {
    avgRating: number;
    sectorBreakdown: Record<string, number>;
    riskProfile: string;
  } {
    const avgRating = portfolio.reduce((sum, p) => sum + p.rating, 0) / portfolio.length;

    const sectorBreakdown: Record<string, number> = {};
    for (const project of portfolio) {
      sectorBreakdown[project.sector] = (sectorBreakdown[project.sector] || 0) + 1;
    }

    // Determine risk profile
    const avgRatingRounded = Math.round(avgRating);
    let riskProfile: string;

    if (avgRatingRounded >= 85) {
      riskProfile = 'Conservative (High quality, lower risk)';
    } else if (avgRatingRounded >= 70) {
      riskProfile = 'Balanced (Quality with growth potential)';
    } else {
      riskProfile = 'Aggressive (Higher risk, higher reward potential)';
    }

    return {
      avgRating,
      sectorBreakdown,
      riskProfile,
    };
  }
}

export default PortfolioBuilder;
