/**
 * Report Generator
 *
 * Generates human-readable markdown reports from tactical maps
 */

import { TacticalMap, ChartPatternReport, BuyZone, ConfidenceLevel } from './types.js';

export class ReportGenerator {
  /**
   * Generate markdown report for a single tactical map
   */
  generateTacticalMapReport(map: TacticalMap): string {
    const lines: string[] = [];

    lines.push(`### Анализ ${map.pair} (Таймфрейм: ${map.timeframe})`);
    lines.push(`**Текущая фаза рынка:** ${this.translateMarketPhase(map.currentPhase)}`);
    lines.push(`**Ключевой вывод по истории:** ${map.historicalConclusion}`);
    lines.push('');

    // Buy Zones
    if (map.buyZones.length > 0) {
      lines.push(`#### 🎯 ЗОНЫ ДЛЯ ЛИМИТНЫХ ОРДЕРОВ НА ПОКУПКУ (BUY LIMIT):`);
      lines.push('');

      for (const zone of map.buyZones) {
        lines.push(
          `${zone.zoneNumber}. **Зона ${zone.zoneNumber} (${this.translateConfidence(zone.confidence)} доверие):** $${zone.priceRangeLow.toFixed(2)} - $${zone.priceRangeHigh.toFixed(2)}`,
        );
        lines.push(`   * **Обоснование:** ${zone.reasoning}`);
        lines.push(
          `   * **Рекомендуемый объем:** ${zone.suggestedAllocation}% от планируемой позиции.`,
        );
        lines.push(`   * **Цель (Take-Profit) 1:** $${zone.targetPrices[0]?.toFixed(2)}`);
        if (zone.targetPrices[1]) {
          lines.push(`   * **Цель (Take-Profit) 2:** $${zone.targetPrices[1].toFixed(2)}`);
        }
        lines.push(`   * **Stop-Loss:** $${zone.stopLoss.toFixed(2)}`);
        lines.push(`   * **Risk/Reward:** ${zone.riskRewardRatio.toFixed(2)}:1`);
        lines.push('');
      }
    }

    // Critical Levels
    if (map.criticalLevels.length > 0) {
      lines.push(`#### ⚠️ КРИТИЧЕСКИЕ УРОВНИ И РИСКИ:`);
      for (const level of map.criticalLevels) {
        lines.push(
          `* **${this.translateLevelType(level.type)}:** $${level.price.toFixed(2)} - ${level.description}`,
        );
      }
      lines.push('');
    }

    // Volume Analysis
    if (map.volumeAnalysis) {
      lines.push(`#### 📊 АНАЛИЗ ОБЪЕМА:`);
      lines.push(`* Средний объем: ${this.formatVolume(map.volumeAnalysis.avgVolume)}`);
      lines.push(
        `* Текущий объем: ${this.formatVolume(map.volumeAnalysis.currentVolume)} (${(map.volumeAnalysis.volumeRatio * 100).toFixed(0)}% от среднего)`,
      );

      if (map.volumeAnalysis.accumulationDetected) {
        lines.push(`* ✅ **Аккумуляция обнаружена** - низкая волатильность + высокий объем`);
      }
      if (map.volumeAnalysis.distributionDetected) {
        lines.push(`* ⚠️ **Распределение обнаружено** - высокий объем на максимумах`);
      }
      if (map.volumeAnalysis.divergenceDetected) {
        const divType = map.volumeAnalysis.divergenceType === 'bullish' ? 'Бычья' : 'Медвежья';
        lines.push(`* 📉 **${divType} дивергенция объема обнаружена**`);
      }
      lines.push('');
    }

    // Order Configuration
    lines.push(`#### 📊 РЕКОМЕНДУЕМАЯ КОНФИГУРАЦИЯ ОРДЕРА (BYBIT):`);
    lines.push('```json');
    lines.push(JSON.stringify(map.orderConfig, null, 2));
    lines.push('```');
    lines.push('');

    // Overall Assessment
    lines.push(`#### 📈 ОБЩАЯ ОЦЕНКА:`);
    lines.push(`* **Рейтинг:** ${map.overallScore}/100`);
    lines.push(`* **Рекомендация:** ${this.translateRecommendation(map.recommendation)}`);
    lines.push('');

    lines.push(`---`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate comprehensive markdown report for multiple pairs
   */
  generateComprehensiveReport(report: ChartPatternReport): string {
    const lines: string[] = [];

    // Header
    lines.push(`# 📊 ОТЧЕТ АНАЛИЗА ГРАФИЧЕСКИХ ПАТТЕРНОВ И SMC`);
    lines.push('');
    lines.push(`**Дата генерации:** ${report.generatedAt.toLocaleString('ru-RU')}`);
    lines.push(`**Анализированных пар:** ${report.summary.totalPairsAnalyzed}`);
    lines.push('');

    // Summary
    lines.push(`## 🎯 РЕЗЮМЕ`);
    lines.push('');
    lines.push(
      `**Рекомендованные пары для торговли:** ${report.summary.recommendedPairs.length > 0 ? report.summary.recommendedPairs.join(', ') : 'Нет'}`,
    );
    lines.push('');

    // Top Opportunities
    if (report.summary.topOpportunities.length > 0) {
      lines.push(`### 🏆 ТОП-${report.summary.topOpportunities.length} ВОЗМОЖНОСТЕЙ:`);
      lines.push('');

      for (let i = 0; i < report.summary.topOpportunities.length; i++) {
        const opp = report.summary.topOpportunities[i];
        lines.push(`${i + 1}. **${opp.pair}** - Рейтинг: ${opp.score}/100`);
        lines.push(`   * ${opp.reasoning}`);
        lines.push('');
      }
    }

    lines.push('');
    lines.push(`---`);
    lines.push('');

    // Detailed Analysis for Each Pair
    lines.push(`## 📈 ДЕТАЛЬНЫЙ АНАЛИЗ ПО КАЖДОЙ ПАРЕ`);
    lines.push('');

    for (const map of report.tacticalMaps) {
      lines.push(this.generateTacticalMapReport(map));
    }

    // Footer
    lines.push('');
    lines.push(`---`);
    lines.push('');
    lines.push(`🤖 Generated with [Claude Code](https://claude.com/claude-code)`);
    lines.push('');
    lines.push(`Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Export report as JSON
   */
  exportAsJSON(report: ChartPatternReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Helper: Translate market phase to Russian
   */
  private translateMarketPhase(phase: string): string {
    const translations: Record<string, string> = {
      accumulation: 'Аккумуляция',
      uptrend: 'Восходящий тренд',
      distribution: 'Распределение',
      downtrend: 'Нисходящий тренд',
      correction: 'Коррекция',
    };
    return translations[phase] || phase;
  }

  /**
   * Helper: Translate confidence level
   */
  private translateConfidence(confidence: ConfidenceLevel): string {
    const translations: Record<ConfidenceLevel, string> = {
      [ConfidenceLevel.HIGH]: 'Высокое',
      [ConfidenceLevel.MEDIUM]: 'Среднее',
      [ConfidenceLevel.LOW]: 'Низкое',
    };
    return translations[confidence];
  }

  /**
   * Helper: Translate level type
   */
  private translateLevelType(type: string): string {
    const translations: Record<string, string> = {
      invalidation: 'Уровень инвалидации сетапа',
      resistance: 'Ближайшая зона сопротивления',
      support: 'Ближайшая зона поддержки',
      unlock: 'Разблок токенов',
      liquidity: 'Зона ликвидности',
    };
    return translations[type] || type;
  }

  /**
   * Helper: Translate recommendation
   */
  private translateRecommendation(recommendation: string): string {
    const translations: Record<string, string> = {
      strong_buy: '🟢 СИЛЬНАЯ ПОКУПКА',
      buy: '🟡 ПОКУПКА',
      hold: '⚪ ДЕРЖАТЬ',
      avoid: '🔴 ИЗБЕГАТЬ',
    };
    return translations[recommendation] || recommendation;
  }

  /**
   * Helper: Format volume
   */
  private formatVolume(volume: number): string {
    if (volume >= 1_000_000) {
      return `${(volume / 1_000_000).toFixed(2)}M`;
    } else if (volume >= 1_000) {
      return `${(volume / 1_000).toFixed(2)}K`;
    }
    return volume.toFixed(2);
  }
}
