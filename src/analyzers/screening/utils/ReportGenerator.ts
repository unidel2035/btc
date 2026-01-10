/**
 * Report Generator for Screening Results
 * Generates markdown reports in the format specified in the requirements
 */

import type { ScreeningReport, PortfolioProject } from '../types/index.js';
import { writeFileSync } from 'fs';
// import { join } from 'path'; // Reserved for future path utilities

export class ReportGenerator {
  /**
   * Generate markdown report from screening results
   */
  generateReport(report: ScreeningReport, outputPath?: string): string {
    const markdown = this.buildMarkdown(report);

    if (outputPath) {
      writeFileSync(outputPath, markdown, 'utf-8');
      console.log(`\n📄 Report saved to: ${outputPath}`);
    }

    return markdown;
  }

  /**
   * Build markdown content
   */
  private buildMarkdown(report: ScreeningReport): string {
    const sections: string[] = [];

    // Header
    sections.push(this.buildHeader(report));

    // Summary
    sections.push(this.buildSummary(report));

    // Recommended projects table
    sections.push(this.buildProjectsTable(report.recommendedProjects));

    // Next actions
    sections.push(this.buildNextActions(report));

    // Macro risks
    sections.push(this.buildMacroRisks(report));

    return sections.join('\n\n');
  }

  /**
   * Build report header
   */
  private buildHeader(report: ScreeningReport): string {
    const date = new Date(report.generatedAt).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    return `# 📊 ОТЧЕТ ОТБОРА ПРОЕКТОВ ДЛЯ ТЕХНИЧЕСКОГО АНАЛИЗА

**Дата генерации:** ${date}
**Анализированные сектора:** ${report.analyzedSectors.join(', ')}`;
  }

  /**
   * Build summary section
   */
  private buildSummary(report: ScreeningReport): string {
    return `## 📈 СТАТИСТИКА АНАЛИЗА

- **Всего проанализировано проектов:** ${report.summary.totalProjectsAnalyzed}
- **Секторов исследовано:** ${report.summary.sectorsAnalyzed}
- **Финальный отбор:** ${report.summary.finalSelectionCount} проекта(ов)`;
  }

  /**
   * Build projects table
   */
  private buildProjectsTable(projects: PortfolioProject[]): string {
    const header = `## 🎯 РЕКОМЕНДУЕМЫЙ СПИСОК ПРОЕКТОВ (${projects.length})

| № | Тикер | Название | Сектор | Рейтинг (0-100) | Краткое обоснование | Ключевой риск |
|---|-------|----------|--------|----------------|-------------------|---------------|`;

    const rows = projects.map((p) => {
      return `| ${p.rank} | **${p.ticker}** | ${p.name} | ${p.sector} | ${p.rating} | ${p.justification} | ${p.keyRisk} |`;
    });

    return header + '\n' + rows.join('\n');
  }

  /**
   * Build next actions section
   */
  private buildNextActions(report: ScreeningReport): string {
    const tradingPairs = report.recommendedProjects.map((p) => `'${p.tradingPair}'`).join(', ');

    const actions = [
      `**Передать список** (\`[${tradingPairs}]\`) в модуль технического анализа (TradingView/индикаторы) для определения точек входа.`,
      `**Настроить мониторинг** фундаментальных триггеров для выбранных проектов (даты апгрейдов, разблокировки).`,
      ...report.nextActions,
    ];

    return `## 📈 ДАЛЬНЕЙШИЕ ДЕЙСТВИЯ

${actions.map((action, idx) => `${idx + 1}. ${action}`).join('\n')}`;
  }

  /**
   * Build macro risks section
   */
  private buildMacroRisks(report: ScreeningReport): string {
    const risks =
      report.macroRisks.length > 0
        ? report.macroRisks
        : [
            'Общая коррекция на рынке криптовалют',
            'Геополитические риски и регуляторные изменения',
            'Изменения в макроэкономической среде (процентные ставки, инфляция)',
          ];

    return `## ⚠️ КЛЮЧЕВЫЕ МАКРО-РИСКИ

${risks.map((risk) => `- ${risk}`).join('\n')}`;
  }

  /**
   * Generate console output summary
   */
  printSummary(report: ScreeningReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 SCREENING SUMMARY');
    console.log('='.repeat(80));

    console.log(`\n📅 Generated: ${new Date(report.generatedAt).toLocaleString()}`);
    console.log(
      `📊 Analyzed: ${report.summary.totalProjectsAnalyzed} projects across ${report.summary.sectorsAnalyzed} sectors`,
    );
    console.log(`✅ Selected: ${report.summary.finalSelectionCount} projects\n`);

    console.log('🎯 RECOMMENDED PROJECTS:\n');

    report.recommendedProjects.forEach((project) => {
      console.log(`${project.rank}. ${project.ticker} - ${project.name}`);
      console.log(`   Sector: ${project.sector}`);
      console.log(`   Rating: ${project.rating}/100`);
      console.log(`   Pair: ${project.tradingPair}`);
      console.log(`   ${project.justification}`);
      console.log('');
    });

    console.log('='.repeat(80));
  }

  /**
   * Generate JSON output
   */
  generateJSON(report: ScreeningReport, outputPath: string): void {
    const json = JSON.stringify(report, null, 2);
    writeFileSync(outputPath, json, 'utf-8');
    console.log(`\n💾 JSON report saved to: ${outputPath}`);
  }

  /**
   * Generate CSV output for easy import to spreadsheets
   */
  generateCSV(projects: PortfolioProject[], outputPath: string): void {
    const header = 'Rank,Ticker,Name,Sector,Rating,Justification,Key Risk,Trading Pair\n';
    const rows = projects.map((p) => {
      return `${p.rank},"${p.ticker}","${p.name}","${p.sector}",${p.rating},"${p.justification}","${p.keyRisk}","${p.tradingPair}"`;
    });

    const csv = header + rows.join('\n');
    writeFileSync(outputPath, csv, 'utf-8');
    console.log(`\n📊 CSV report saved to: ${outputPath}`);
  }
}

export default ReportGenerator;
