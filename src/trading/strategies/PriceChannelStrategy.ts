import { BaseStrategy } from './BaseStrategy.js';
import type { MarketData, Signal, TradeDecision, StrategyParams, TradeDirection } from './types.js';

/**
 * Параметры стратегии Price Channel
 */
export interface PriceChannelParams extends StrategyParams {
  channelPeriod?: number; // Период для расчета канала (по умолчанию 18)
  minChannelPercent?: number; // Минимальная ширина канала в % (по умолчанию 0.5%)
  maxChannelPercent?: number; // Максимальная ширина канала в % (по умолчанию 3%)
  breakoutThreshold?: number; // Порог для определения пробоя (по умолчанию 0.1%)
  requireSignalConfirmation?: boolean; // Требовать подтверждения сигналом
  useMultipleTimeframes?: boolean; // Использовать несколько таймфреймов (18, 54, 108)
}

/**
 * Данные ценового канала
 */
interface ChannelData {
  high: number;
  low: number;
  width: number;
  widthPercent: number;
}

/**
 * Стратегия торговли на основе ценовых каналов (Price Channel Breakout)
 *
 * Алгоритм основан на классической стратегии торговли в каналах:
 * - Определяет ценовые каналы на основе исторических максимумов и минимумов
 * - Входит в позицию при пробое границ канала
 * - Использует ширину канала для определения stop-loss и take-profit
 * - Может работать с несколькими таймфреймами одновременно
 *
 * Основные особенности:
 * - Breakout торговля (пробой уровней)
 * - Динамические stop-loss и take-profit на основе ширины канала
 * - Фильтрация по минимальной/максимальной ширине канала
 * - Опциональное подтверждение сигналами
 */
export class PriceChannelStrategy extends BaseStrategy {
  public name = 'Price Channel Breakout';
  public description =
    'Торговля на пробое ценовых каналов с динамическими уровнями stop-loss и take-profit';

  private priceHistory: Array<{ price: number; high: number; low: number; timestamp: Date }> = [];
  private readonly maxHistoryLength = 200;

  constructor(params: Partial<PriceChannelParams> = {}) {
    super({
      enabled: true,
      minImpact: 0.3, // Меньше требований к impact для технической стратегии
      minConfidence: 0.6,
      maxPositionSize: 6,
      stopLossPercent: 2, // Будет перезаписан динамическим расчетом
      takeProfitPercent: 4, // Будет перезаписан динамическим расчетом
      channelPeriod: 18,
      minChannelPercent: 0.5,
      maxChannelPercent: 3,
      breakoutThreshold: 0.1,
      requireSignalConfirmation: false,
      useMultipleTimeframes: false,
      ...params,
    });
  }

  /**
   * Анализ рынка и генерация торгового решения
   */
  public analyze(data: MarketData, signals: Signal[]): TradeDecision | null {
    // Проверка, включена ли стратегия
    if (!this.params.enabled) {
      return null;
    }

    // Добавляем текущие данные в историю
    this.addToHistory(data);

    // Требуется достаточно истории для построения канала
    const channelPeriod = (this.params.channelPeriod as number) || 18;
    if (this.priceHistory.length < channelPeriod) {
      return null;
    }

    // Фильтруем сигналы по impact
    const filteredSignals = this.filterSignalsByImpact(signals);

    // Если требуется подтверждение сигналом и его нет - выходим
    if ((this.params.requireSignalConfirmation as boolean) && filteredSignals.length === 0) {
      return null;
    }

    // Определяем каналы
    const channels: ChannelData[] = [];

    // Основной канал
    channels.push(this.calculateChannel(channelPeriod));

    // Дополнительные таймфреймы (как в MQL4: 18, 54, 108)
    if (this.params.useMultipleTimeframes as boolean) {
      channels.push(this.calculateChannel(channelPeriod * 3));
      channels.push(this.calculateChannel(channelPeriod * 6));
    }

    // Проверяем каждый канал на пробой
    for (const channel of channels) {
      // Проверка минимальной/максимальной ширины канала
      if (!this.isChannelValid(channel)) {
        continue;
      }

      const decision = this.checkBreakout(data, channel, filteredSignals);
      if (decision) {
        this.updateStats(signals, decision);
        return decision;
      }
    }

    this.updateStats(signals, null);
    return null;
  }

  /**
   * Добавить данные в историю цен
   */
  private addToHistory(data: MarketData): void {
    const high = data.ohlc?.high ?? data.price;
    const low = data.ohlc?.low ?? data.price;

    this.priceHistory.push({
      price: data.price,
      high,
      low,
      timestamp: data.timestamp,
    });

    // Ограничиваем размер истории
    if (this.priceHistory.length > this.maxHistoryLength) {
      this.priceHistory.shift();
    }
  }

  /**
   * Рассчитать ценовой канал для заданного периода
   */
  private calculateChannel(period: number): ChannelData {
    const recentData = this.priceHistory.slice(-period);

    const high = Math.max(...recentData.map((d) => d.high));
    const low = Math.min(...recentData.map((d) => d.low));
    const width = high - low;
    const widthPercent = (width / low) * 100;

    return { high, low, width, widthPercent };
  }

  /**
   * Проверить, валиден ли канал (ширина в допустимых пределах)
   */
  private isChannelValid(channel: ChannelData): boolean {
    const minPercent = (this.params.minChannelPercent as number) || 0.5;
    const maxPercent = (this.params.maxChannelPercent as number) || 3;

    return channel.widthPercent >= minPercent && channel.widthPercent <= maxPercent;
  }

  /**
   * Проверить пробой канала и сгенерировать решение
   */
  private checkBreakout(
    data: MarketData,
    channel: ChannelData,
    signals: Signal[],
  ): TradeDecision | null {
    const currentPrice = data.price;
    const breakoutThreshold = (this.params.breakoutThreshold as number) || 0.1;
    const thresholdAmount = channel.width * (breakoutThreshold / 100);

    // Проверка пробоя верхней границы (LONG сигнал)
    if (currentPrice >= channel.high - thresholdAmount) {
      // Проверка подтверждения сигналом (bullish)
      if (this.params.requireSignalConfirmation as boolean) {
        const hasBullishSignal = signals.some((s) => s.sentiment === 'bullish');
        if (!hasBullishSignal) {
          return null;
        }
      }

      return this.createBreakoutDecision(data, channel, 'long' as TradeDirection, signals);
    }

    // Проверка пробоя нижней границы (SHORT сигнал)
    if (currentPrice <= channel.low + thresholdAmount) {
      // Проверка подтверждения сигналом (bearish)
      if (this.params.requireSignalConfirmation as boolean) {
        const hasBearishSignal = signals.some((s) => s.sentiment === 'bearish');
        if (!hasBearishSignal) {
          return null;
        }
      }

      return this.createBreakoutDecision(data, channel, 'short' as TradeDirection, signals);
    }

    return null;
  }

  /**
   * Создать торговое решение при пробое канала
   */
  private createBreakoutDecision(
    data: MarketData,
    channel: ChannelData,
    direction: TradeDirection,
    signals: Signal[],
  ): TradeDecision {
    const currentPrice = data.price;

    // Уверенность зависит от:
    // 1. Ширины канала (узкий канал = меньше уверенности)
    // 2. Наличия подтверждающих сигналов
    // 3. Волатильности
    let confidence = 0.65; // базовая уверенность

    // Корректировка по ширине канала
    const idealChannelPercent = 1.5;
    const channelFactor = Math.min(channel.widthPercent / idealChannelPercent, 1);
    confidence += channelFactor * 0.15;

    // Корректировка по сигналам
    const relevantSignals = signals.filter(
      (s) =>
        (direction === 'long' && s.sentiment === 'bullish') ||
        (direction === 'short' && s.sentiment === 'bearish'),
    );
    if (relevantSignals.length > 0) {
      const avgSignalImpact =
        relevantSignals.reduce((sum, s) => sum + s.impact, 0) / relevantSignals.length;
      confidence += avgSignalImpact * 0.2;
    }

    // Корректировка по волатильности
    if (data.volatility) {
      // Высокая волатильность = меньше уверенности
      const volatilityFactor = Math.max(1 - data.volatility / 100, 0);
      confidence *= 0.8 + volatilityFactor * 0.2;
    }

    confidence = Math.min(confidence, 0.95);

    // Stop-loss и take-profit на основе ширины канала
    const isLong = direction === 'long';
    const stopLoss = isLong ? currentPrice - channel.width : currentPrice + channel.width;
    const takeProfit = isLong ? currentPrice + channel.width : currentPrice - channel.width;

    // Размер позиции
    const positionSize = this.calculatePositionSize(confidence);

    const decision: TradeDecision = {
      direction,
      confidence,
      entryPrice: currentPrice,
      stopLoss,
      takeProfit,
      positionSize,
      timeframe: 3600, // 1 час по умолчанию
      reason: `Price channel breakout (${direction.toUpperCase()}): Channel width ${channel.widthPercent.toFixed(2)}%, price ${currentPrice.toFixed(2)}, channel [${channel.low.toFixed(2)}, ${channel.high.toFixed(2)}]`,
      signals: relevantSignals.length > 0 ? relevantSignals : signals.slice(0, 3),
    };

    return decision;
  }

  /**
   * Получить текущий канал для мониторинга
   */
  public getCurrentChannel(): ChannelData | null {
    const channelPeriod = (this.params.channelPeriod as number) || 18;
    if (this.priceHistory.length < channelPeriod) {
      return null;
    }
    return this.calculateChannel(channelPeriod);
  }

  /**
   * Очистить историю цен
   */
  public clearHistory(): void {
    this.priceHistory = [];
  }
}
