import type {
  Strategy,
  StrategyParams,
  StrategyStats,
  MarketData,
  Signal,
  TradeDecision,
} from './types.js';

/**
 * Базовый класс для торговых стратегий
 */
export abstract class BaseStrategy implements Strategy {
  public abstract name: string;
  public abstract description: string;

  protected params: StrategyParams;
  protected stats: StrategyStats;

  constructor(params: StrategyParams = { enabled: true }) {
    const { enabled = true, ...rest } = params;
    this.params = {
      minImpact: 0.5,
      minConfidence: 0.6,
      maxPositionSize: 5,
      stopLossPercent: 2,
      takeProfitPercent: 5,
      enabled,
      ...rest,
    };

    this.stats = {
      totalSignals: 0,
      totalTrades: 0,
      successRate: 0,
      avgProfit: 0,
      maxDrawdown: 0,
    };
  }

  /**
   * Абстрактный метод для анализа - должен быть реализован в наследниках
   */
  public abstract analyze(data: MarketData, signals: Signal[]): TradeDecision | null;

  /**
   * Получить параметры стратегии
   */
  public getParameters(): StrategyParams {
    return { ...this.params };
  }

  /**
   * Обновить параметры стратегии
   */
  public updateParameters(params: Partial<StrategyParams>): void {
    this.params = { ...this.params, ...params };
  }

  /**
   * Получить статистику
   */
  public getStats(): StrategyStats {
    return { ...this.stats };
  }

  /**
   * Сбросить статистику
   */
  public resetStats(): void {
    this.stats = {
      totalSignals: 0,
      totalTrades: 0,
      successRate: 0,
      avgProfit: 0,
      maxDrawdown: 0,
    };
  }

  /**
   * Фильтрация сигналов по минимальному impact
   */
  protected filterSignalsByImpact(signals: Signal[]): Signal[] {
    const minImpact = this.params.minImpact ?? 0;
    return signals.filter((signal) => signal.impact >= minImpact);
  }

  /**
   * Рассчитать размер позиции на основе уверенности
   */
  protected calculatePositionSize(confidence: number): number {
    const maxSize = this.params.maxPositionSize ?? 5;
    // Позиция увеличивается пропорционально уверенности
    return Math.min(maxSize * confidence, maxSize);
  }

  /**
   * Рассчитать стоп-лосс
   */
  protected calculateStopLoss(entryPrice: number, isLong: boolean): number {
    const stopLossPercent = this.params.stopLossPercent ?? 2;
    const multiplier = isLong ? 1 - stopLossPercent / 100 : 1 + stopLossPercent / 100;
    return entryPrice * multiplier;
  }

  /**
   * Рассчитать тейк-профит
   */
  protected calculateTakeProfit(entryPrice: number, isLong: boolean): number {
    const takeProfitPercent = this.params.takeProfitPercent ?? 5;
    const multiplier = isLong ? 1 + takeProfitPercent / 100 : 1 - takeProfitPercent / 100;
    return entryPrice * multiplier;
  }

  /**
   * Обновить статистику после анализа
   */
  protected updateStats(signals: Signal[], decision: TradeDecision | null): void {
    this.stats.totalSignals += signals.length;
    if (decision) {
      this.stats.totalTrades += 1;
    }
    this.stats.lastExecuted = new Date();
  }
}
