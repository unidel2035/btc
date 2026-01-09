import type { Strategy, MarketData, Signal, TradeDecision, TradeDirection } from './types.js';

/**
 * Режим комбинирования стратегий
 */
export enum CombinationMode {
  /**
   * Первая стратегия, которая дала сигнал
   */
  FIRST = 'first',

  /**
   * Все стратегии должны дать согласованный сигнал
   */
  CONSENSUS = 'consensus',

  /**
   * Выбрать решение с наибольшей уверенностью
   */
  BEST_CONFIDENCE = 'best_confidence',

  /**
   * Взвешенное комбинирование решений
   */
  WEIGHTED = 'weighted',
}

/**
 * Опции менеджера стратегий
 */
export interface StrategyManagerOptions {
  mode: CombinationMode;
  minConsensusPercentage?: number; // для CONSENSUS режима (0-1)
  weights?: Map<string, number>; // веса стратегий для WEIGHTED режима
}

/**
 * Менеджер торговых стратегий
 * Управляет несколькими стратегиями и комбинирует их решения
 */
export class StrategyManager {
  private strategies: Map<string, Strategy> = new Map();
  private options: StrategyManagerOptions;

  constructor(options: StrategyManagerOptions = { mode: CombinationMode.FIRST }) {
    this.options = options;
  }

  /**
   * Добавить стратегию
   */
  public addStrategy(strategy: Strategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Удалить стратегию
   */
  public removeStrategy(name: string): boolean {
    return this.strategies.delete(name);
  }

  /**
   * Получить стратегию по имени
   */
  public getStrategy(name: string): Strategy | undefined {
    return this.strategies.get(name);
  }

  /**
   * Получить все стратегии
   */
  public getAllStrategies(): Strategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Анализ с комбинированием стратегий
   */
  public analyze(data: MarketData, signals: Signal[]): TradeDecision | null {
    const decisions: Array<{ strategy: string; decision: TradeDecision }> = [];

    // Собираем решения от всех активных стратегий
    for (const [name, strategy] of this.strategies) {
      const decision = strategy.analyze(data, signals);
      if (decision) {
        decisions.push({ strategy: name, decision });
      }
    }

    if (decisions.length === 0) {
      return null;
    }

    // Комбинируем решения в зависимости от режима
    return this.combineDecisions(decisions, data);
  }

  /**
   * Комбинирование решений
   */
  private combineDecisions(
    decisions: Array<{ strategy: string; decision: TradeDecision }>,
    data: MarketData,
  ): TradeDecision | null {
    switch (this.options.mode) {
      case CombinationMode.FIRST:
        return this.combineFirst(decisions);

      case CombinationMode.CONSENSUS:
        return this.combineConsensus(decisions);

      case CombinationMode.BEST_CONFIDENCE:
        return this.combineBestConfidence(decisions);

      case CombinationMode.WEIGHTED:
        return this.combineWeighted(decisions, data);

      default:
        return decisions[0]?.decision ?? null;
    }
  }

  /**
   * Режим FIRST: возвращает первое решение
   */
  private combineFirst(
    decisions: Array<{ strategy: string; decision: TradeDecision }>,
  ): TradeDecision | null {
    return decisions[0]?.decision ?? null;
  }

  /**
   * Режим CONSENSUS: требует согласия большинства стратегий
   */
  private combineConsensus(
    decisions: Array<{ strategy: string; decision: TradeDecision }>,
  ): TradeDecision | null {
    const threshold = this.options.minConsensusPercentage ?? 0.66;
    const totalStrategies = this.strategies.size;

    // Подсчитываем голоса за каждое направление
    const longVotes = decisions.filter((d) => d.decision.direction === 'long').length;
    const shortVotes = decisions.filter((d) => d.decision.direction === 'short').length;

    const longPercentage = longVotes / totalStrategies;
    const shortPercentage = shortVotes / totalStrategies;

    // Проверяем консенсус
    if (longPercentage >= threshold) {
      // Берем решение с наибольшей уверенностью среди long
      const longDecisions = decisions.filter((d) => d.decision.direction === 'long');
      return this.combineBestConfidence(longDecisions);
    }

    if (shortPercentage >= threshold) {
      // Берем решение с наибольшей уверенностью среди short
      const shortDecisions = decisions.filter((d) => d.decision.direction === 'short');
      return this.combineBestConfidence(shortDecisions);
    }

    // Консенсус не достигнут
    return null;
  }

  /**
   * Режим BEST_CONFIDENCE: выбирает решение с наивысшей уверенностью
   */
  private combineBestConfidence(
    decisions: Array<{ strategy: string; decision: TradeDecision }>,
  ): TradeDecision | null {
    if (decisions.length === 0) {
      return null;
    }

    let best = decisions[0];

    for (const current of decisions) {
      if (best && current.decision.confidence > best.decision.confidence) {
        best = current;
      }
    }

    return best?.decision ?? null;
  }

  /**
   * Режим WEIGHTED: взвешенное комбинирование
   */
  private combineWeighted(
    decisions: Array<{ strategy: string; decision: TradeDecision }>,
    data: MarketData,
  ): TradeDecision | null {
    const weights = this.options.weights ?? new Map();

    // Подсчитываем взвешенные голоса
    let longWeight = 0;
    let shortWeight = 0;
    let totalWeight = 0;

    for (const { strategy, decision } of decisions) {
      const weight = weights.get(strategy) ?? 1;
      totalWeight += weight;

      if (decision.direction === 'long') {
        longWeight += weight * decision.confidence;
      } else {
        shortWeight += weight * decision.confidence;
      }
    }

    if (totalWeight === 0) {
      return null;
    }

    // Определяем направление
    const direction: TradeDirection =
      (longWeight > shortWeight ? 'long' : 'short') as TradeDirection;
    const dominantWeight = Math.max(longWeight, shortWeight);
    const confidence = dominantWeight / totalWeight;

    // Усредняем параметры решений с тем же направлением
    const sameDirectionDecisions = decisions.filter((d) => d.decision.direction === direction);

    if (sameDirectionDecisions.length === 0) {
      return null;
    }

    const avgPositionSize =
      sameDirectionDecisions.reduce((sum, d) => sum + d.decision.positionSize, 0) /
      sameDirectionDecisions.length;

    const avgStopLoss =
      sameDirectionDecisions.filter((d) => d.decision.stopLoss).length > 0
        ? sameDirectionDecisions
            .filter((d) => d.decision.stopLoss)
            .reduce((sum, d) => sum + (d.decision.stopLoss ?? 0), 0) /
          sameDirectionDecisions.filter((d) => d.decision.stopLoss).length
        : undefined;

    const avgTakeProfit =
      sameDirectionDecisions.filter((d) => d.decision.takeProfit).length > 0
        ? sameDirectionDecisions
            .filter((d) => d.decision.takeProfit)
            .reduce((sum, d) => sum + (d.decision.takeProfit ?? 0), 0) /
          sameDirectionDecisions.filter((d) => d.decision.takeProfit).length
        : undefined;

    // Собираем все сигналы
    const allSignals = sameDirectionDecisions.flatMap((d) => d.decision.signals);

    const firstDecision = sameDirectionDecisions[0]?.decision;

    return {
      direction,
      confidence,
      entryPrice: data.price,
      stopLoss: avgStopLoss,
      takeProfit: avgTakeProfit,
      positionSize: avgPositionSize,
      timeframe: firstDecision?.timeframe,
      reason: `Weighted combination of ${sameDirectionDecisions.length} strategies`,
      signals: allSignals,
    };
  }

  /**
   * Получить статистику по всем стратегиям
   */
  public getStats(): Map<string, ReturnType<Strategy['getStats']>> {
    const stats = new Map();

    for (const [name, strategy] of this.strategies) {
      stats.set(name, strategy.getStats());
    }

    return stats;
  }

  /**
   * Обновить опции
   */
  public updateOptions(options: Partial<StrategyManagerOptions>): void {
    this.options = { ...this.options, ...options };
  }
}
