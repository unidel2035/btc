import { BaseStrategy } from './BaseStrategy.js';
import type {
  MarketData,
  Signal,
  TradeDecision,
  StrategyParams,
  SignalType,
  SignalSentiment,
  TradeDirection,
} from './types.js';

/**
 * Параметры стратегии News Momentum
 */
export interface NewsMomentumParams extends StrategyParams {
  impactThreshold: number; // минимальный impact для реакции
  reactionTimeSeconds: number; // время на вход после новости
  exitTimeSeconds: number; // время удержания позиции
  volatilityMultiplier: number; // множитель волатильности для размера позиции
  requireMultipleSignals: boolean; // требовать несколько сигналов
  minSignalsCount: number; // минимальное количество сигналов
}

/**
 * Стратегия News Momentum
 * Быстрая реакция на важные новости с высоким impact
 */
export class NewsMomentumStrategy extends BaseStrategy {
  public name = 'News Momentum';
  public description =
    'Быстрая реакция на важные новости. Открывает позицию в течение секунд после обнаружения значимой новости.';

  protected declare params: NewsMomentumParams;

  constructor(params: Partial<NewsMomentumParams> = {}) {
    const defaultParams: NewsMomentumParams = {
      enabled: true,
      minImpact: 0.7,
      minConfidence: 0.65,
      maxPositionSize: 5,
      stopLossPercent: 2,
      takeProfitPercent: 4,
      impactThreshold: 0.7,
      reactionTimeSeconds: 60,
      exitTimeSeconds: 3600, // 1 час
      volatilityMultiplier: 0.8,
      requireMultipleSignals: false,
      minSignalsCount: 2,
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

    // Фильтруем только новостные сигналы
    const newsSignals = signals.filter((s) => s.type === 'news' as SignalType);

    if (newsSignals.length === 0) {
      return null;
    }

    // Фильтруем по impact
    const significantSignals = this.filterSignalsByImpact(newsSignals);

    if (significantSignals.length === 0) {
      this.updateStats(newsSignals, null);
      return null;
    }

    // Проверяем требование множественных сигналов
    if (this.params.requireMultipleSignals && significantSignals.length < this.params.minSignalsCount) {
      this.updateStats(newsSignals, null);
      return null;
    }

    // Проверяем свежесть новостей (в пределах reaction time)
    const now = new Date();
    const recentSignals = significantSignals.filter((signal) => {
      const ageSeconds = (now.getTime() - signal.timestamp.getTime()) / 1000;
      return ageSeconds <= this.params.reactionTimeSeconds;
    });

    if (recentSignals.length === 0) {
      this.updateStats(newsSignals, null);
      return null;
    }

    // Определяем направление на основе sentiment
    const sentimentScore = this.calculateSentimentScore(recentSignals);
    const direction = sentimentScore > 0 ? ('long' as TradeDirection) : ('short' as TradeDirection);

    // Рассчитываем уверенность на основе impact и количества сигналов
    const avgImpact = recentSignals.reduce((sum, s) => sum + s.impact, 0) / recentSignals.length;
    const signalBonus = Math.min(recentSignals.length * 0.1, 0.3); // бонус за множественные сигналы
    const confidence = Math.min(avgImpact + signalBonus, 1);

    // Проверяем минимальную уверенность
    if (confidence < (this.params.minConfidence ?? 0.6)) {
      this.updateStats(newsSignals, null);
      return null;
    }

    // Рассчитываем размер позиции с учетом волатильности
    let positionSize = this.calculatePositionSize(confidence);
    if (data.volatility) {
      positionSize *= this.params.volatilityMultiplier * (1 - data.volatility);
    }

    const isLong = direction === 'long';
    const entryPrice = data.price;

    const decision: TradeDecision = {
      direction,
      confidence,
      entryPrice,
      stopLoss: this.calculateStopLoss(entryPrice, isLong),
      takeProfit: this.calculateTakeProfit(entryPrice, isLong),
      positionSize: Math.max(0.5, Math.min(positionSize, this.params.maxPositionSize ?? 5)),
      timeframe: this.params.exitTimeSeconds,
      reason: `News momentum: ${recentSignals.length} significant news with avg impact ${avgImpact.toFixed(2)}`,
      signals: recentSignals,
    };

    this.updateStats(newsSignals, decision);
    return decision;
  }

  /**
   * Рассчитать общий sentiment score из сигналов
   * Возвращает положительное число для bullish, отрицательное для bearish
   */
  private calculateSentimentScore(signals: Signal[]): number {
    let score = 0;

    for (const signal of signals) {
      const sentimentWeight = signal.impact;

      if (signal.sentiment === ('bullish' as SignalSentiment)) {
        score += sentimentWeight;
      } else if (signal.sentiment === ('bearish' as SignalSentiment)) {
        score -= sentimentWeight;
      }
      // neutral не влияет на score
    }

    return score;
  }
}
