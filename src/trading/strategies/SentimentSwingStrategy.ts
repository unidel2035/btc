import { BaseStrategy } from './BaseStrategy.js';
import type {
  MarketData,
  Signal,
  TradeDecision,
  StrategyParams,
  SignalSentiment,
  TradeDirection,
  SentimentAggregate,
} from './types.js';

/**
 * Параметры стратегии Sentiment Swing
 */
export interface SentimentSwingParams extends StrategyParams {
  aggregationPeriodHours: number; // период агрегации sentiment (1h, 4h, 24h)
  trendThreshold: number; // порог для определения тренда
  reversalDetection: boolean; // детекция разворотов
  continuationDetection: boolean; // детекция продолжений
  minSentimentChange: number; // минимальное изменение sentiment для входа
  holdingPeriodHours: number; // период удержания позиции
}

/**
 * Стратегия Sentiment Swing
 * Позиционная торговля на основе агрегированных настроений
 */
export class SentimentSwingStrategy extends BaseStrategy {
  public name = 'Sentiment Swing';
  public description =
    'Позиционная торговля по агрегированным настроениям. Более длинный горизонт (часы-дни).';

  declare protected params: SentimentSwingParams;
  private sentimentHistory: SentimentAggregate[] = [];

  constructor(params: Partial<SentimentSwingParams> = {}) {
    const defaultParams: SentimentSwingParams = {
      enabled: true,
      minImpact: 0.5,
      minConfidence: 0.6,
      maxPositionSize: 8,
      stopLossPercent: 3,
      takeProfitPercent: 8,
      aggregationPeriodHours: 4,
      trendThreshold: 0.6,
      reversalDetection: true,
      continuationDetection: true,
      minSentimentChange: 0.3,
      holdingPeriodHours: 24,
    };

    super({ ...defaultParams, ...params });
  }

  /**
   * Анализ сигналов и генерация торгового решения
   */
  public analyze(data: MarketData, signals: Signal[]): TradeDecision | null {
    if (!this.params.enabled) {
      return null;
    }

    // Фильтруем сигналы по impact
    const significantSignals = this.filterSignalsByImpact(signals);

    if (significantSignals.length === 0) {
      this.updateStats(signals, null);
      return null;
    }

    // Агрегируем sentiment за период
    const aggregate = this.aggregateSentiment(significantSignals);

    // Добавляем в историю
    this.addToHistory(aggregate);

    // Нужно минимум 2 точки для определения тренда
    if (this.sentimentHistory.length < 2) {
      this.updateStats(signals, null);
      return null;
    }

    // Определяем тренд настроений
    const trend = this.detectTrend();

    if (!trend) {
      this.updateStats(signals, null);
      return null;
    }

    // Генерируем торговое решение
    const decision = this.generateDecision(data, aggregate, trend, significantSignals);

    this.updateStats(signals, decision);

    // Emit signal event for real-time broadcasting
    if (decision) {
      this.emitSignal(decision, data);
    }

    return decision;
  }

  /**
   * Агрегация sentiment за период
   */
  private aggregateSentiment(signals: Signal[]): SentimentAggregate {
    const now = new Date();
    const periodMs = this.params.aggregationPeriodHours * 60 * 60 * 1000;
    const cutoff = new Date(now.getTime() - periodMs);

    // Фильтруем сигналы за период
    const periodSignals = signals.filter((s) => s.timestamp >= cutoff);

    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;
    let totalImpact = 0;

    for (const signal of periodSignals) {
      totalImpact += signal.impact;

      if (signal.sentiment === ('bullish' as SignalSentiment)) {
        bullishCount++;
      } else if (signal.sentiment === ('bearish' as SignalSentiment)) {
        bearishCount++;
      } else {
        neutralCount++;
      }
    }

    const total = periodSignals.length;
    const avgImpact = total > 0 ? totalImpact / total : 0;

    // Определяем тренд на основе изменения
    let trend: 'rising' | 'falling' | 'stable' = 'stable';
    if (this.sentimentHistory.length > 0) {
      const prev = this.sentimentHistory[this.sentimentHistory.length - 1];
      if (prev) {
        const currentRatio = total > 0 ? bullishCount / total : 0;
        const prevRatio =
          prev.bullishCount + prev.bearishCount + prev.neutralCount > 0
            ? prev.bullishCount / (prev.bullishCount + prev.bearishCount + prev.neutralCount)
            : 0;

        const change = currentRatio - prevRatio;
        if (Math.abs(change) >= this.params.minSentimentChange) {
          trend = change > 0 ? 'rising' : 'falling';
        }
      }
    }

    return {
      timeframe: `${this.params.aggregationPeriodHours}h`,
      bullishCount,
      bearishCount,
      neutralCount,
      avgImpact,
      trend,
      timestamp: now,
    };
  }

  /**
   * Добавить агрегат в историю (с ограничением размера)
   */
  private addToHistory(aggregate: SentimentAggregate): void {
    this.sentimentHistory.push(aggregate);

    // Храним максимум 10 последних агрегатов
    if (this.sentimentHistory.length > 10) {
      this.sentimentHistory.shift();
    }
  }

  /**
   * Определение тренда настроений
   */
  private detectTrend(): { type: 'reversal' | 'continuation'; direction: TradeDirection } | null {
    if (this.sentimentHistory.length < 2) {
      return null;
    }

    const current = this.sentimentHistory[this.sentimentHistory.length - 1];
    const previous = this.sentimentHistory[this.sentimentHistory.length - 2];

    if (!current || !previous) {
      return null;
    }

    // Детекция разворота
    if (this.params.reversalDetection) {
      if (previous.trend === 'falling' && current.trend === 'rising') {
        return { type: 'reversal', direction: 'long' as TradeDirection };
      }
      if (previous.trend === 'rising' && current.trend === 'falling') {
        return { type: 'reversal', direction: 'short' as TradeDirection };
      }
    }

    // Детекция продолжения
    if (this.params.continuationDetection) {
      if (previous.trend === 'rising' && current.trend === 'rising') {
        const total = current.bullishCount + current.bearishCount + current.neutralCount;
        if (total > 0 && current.bullishCount / total >= this.params.trendThreshold) {
          return { type: 'continuation', direction: 'long' as TradeDirection };
        }
      }
      if (previous.trend === 'falling' && current.trend === 'falling') {
        const total = current.bullishCount + current.bearishCount + current.neutralCount;
        if (total > 0 && current.bearishCount / total >= this.params.trendThreshold) {
          return { type: 'continuation', direction: 'short' as TradeDirection };
        }
      }
    }

    return null;
  }

  /**
   * Генерация торгового решения
   */
  private generateDecision(
    data: MarketData,
    aggregate: SentimentAggregate,
    trend: { type: 'reversal' | 'continuation'; direction: TradeDirection },
    signals: Signal[],
  ): TradeDecision | null {
    const { direction, type } = trend;

    // Рассчитываем уверенность на основе силы тренда и impact
    const total = aggregate.bullishCount + aggregate.bearishCount + aggregate.neutralCount;
    const dominantCount = direction === 'long' ? aggregate.bullishCount : aggregate.bearishCount;

    const trendStrength = total > 0 ? dominantCount / total : 0;
    const confidence = (trendStrength + aggregate.avgImpact) / 2;

    // Проверяем минимальную уверенность
    if (confidence < (this.params.minConfidence ?? 0.6)) {
      return null;
    }

    const isLong = direction === 'long';
    const entryPrice = data.price;
    const positionSize = this.calculatePositionSize(confidence);

    return {
      direction,
      confidence,
      entryPrice,
      stopLoss: this.calculateStopLoss(entryPrice, isLong),
      takeProfit: this.calculateTakeProfit(entryPrice, isLong),
      positionSize: Math.max(1, Math.min(positionSize, this.params.maxPositionSize ?? 8)),
      timeframe: this.params.holdingPeriodHours * 3600, // в секундах
      reason: `Sentiment ${type}: ${aggregate.trend} trend with ${trendStrength.toFixed(2)} strength`,
      signals,
    };
  }

  /**
   * Очистить историю sentiment
   */
  public clearHistory(): void {
    this.sentimentHistory = [];
  }

  /**
   * Получить историю sentiment
   */
  public getHistory(): SentimentAggregate[] {
    return [...this.sentimentHistory];
  }
}
