import { EventEmitter } from 'events';
import type {
  Strategy,
  StrategyParams,
  StrategyStats,
  MarketData,
  Signal,
  TradeDecision,
  ParamSchema,
} from './types.js';

/**
 * Базовый класс для торговых стратегий
 */
export abstract class BaseStrategy extends EventEmitter implements Strategy {
  public abstract name: string;
  public abstract description: string;

  protected params: StrategyParams;
  protected stats: StrategyStats;

  constructor(params: StrategyParams = { enabled: true }) {
    super();
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

  /**
   * Emit a signal event for real-time broadcasting
   */
  protected emitSignal(decision: TradeDecision, marketData: MarketData): void {
    const signalData = {
      id: `${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      strategy: this.name,
      symbol: marketData.symbol,
      action: decision.direction === 'long' ? 'BUY' : decision.direction === 'short' ? 'SELL' : 'HOLD',
      reason: decision.reason,
      confidence: decision.confidence,
      strength: decision.confidence * 100,
      price: decision.entryPrice,
      timestamp: Date.now(),
      metadata: {
        stopLoss: decision.stopLoss,
        takeProfit: decision.takeProfit,
        positionSize: decision.positionSize,
        timeframe: decision.timeframe,
        signalsCount: decision.signals.length,
        signals: decision.signals.map(s => ({
          type: s.type,
          sentiment: s.sentiment,
          impact: s.impact,
        })),
      },
    };

    this.emit('signal', signalData);
  }

  /**
   * Получить схему параметров стратегии
   * Должен быть переопределен в наследниках для специфичных параметров
   */
  public getParameterSchema(): ParamSchema[] {
    return [
      {
        name: 'enabled',
        type: 'boolean',
        default: true,
        description: 'Включить стратегию',
        tooltip: 'Включить или отключить стратегию',
        group: 'general',
      },
      {
        name: 'minImpact',
        type: 'number',
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.1,
        description: 'Минимальный impact сигнала',
        tooltip: 'Минимальная значимость сигнала для учета',
        group: 'signal',
      },
      {
        name: 'minConfidence',
        type: 'number',
        default: 0.6,
        min: 0,
        max: 1,
        step: 0.05,
        description: 'Минимальная уверенность',
        tooltip: 'Минимальная уверенность для входа в сделку',
        group: 'signal',
      },
      {
        name: 'maxPositionSize',
        type: 'number',
        default: 5,
        min: 1,
        max: 100,
        step: 1,
        description: 'Макс. размер позиции (%)',
        tooltip: 'Максимальный размер позиции в процентах от капитала',
        group: 'risk',
      },
      {
        name: 'stopLossPercent',
        type: 'number',
        default: 2,
        min: 0.5,
        max: 10,
        step: 0.5,
        description: 'Стоп-лосс (%)',
        tooltip: 'Процент стоп-лосса от цены входа',
        group: 'risk',
      },
      {
        name: 'takeProfitPercent',
        type: 'number',
        default: 5,
        min: 1,
        max: 20,
        step: 0.5,
        description: 'Тейк-профит (%)',
        tooltip: 'Процент тейк-профита от цены входа',
        group: 'risk',
      },
    ];
  }

  /**
   * Валидация параметров стратегии
   */
  public validateParameters(params: Partial<StrategyParams>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const schema = this.getParameterSchema();

    for (const [key, value] of Object.entries(params)) {
      const paramSchema = schema.find(s => s.name === key);
      if (!paramSchema) {
        continue; // Неизвестный параметр - игнорируем
      }

      // Проверка типа
      if (paramSchema.type === 'number' && typeof value !== 'number') {
        errors.push(`${key}: должен быть числом`);
        continue;
      }
      if (paramSchema.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`${key}: должен быть булевым значением`);
        continue;
      }
      if (paramSchema.type === 'string' && typeof value !== 'string') {
        errors.push(`${key}: должен быть строкой`);
        continue;
      }

      // Проверка диапазона для чисел
      if (paramSchema.type === 'number' && typeof value === 'number') {
        if (paramSchema.min !== undefined && value < paramSchema.min) {
          errors.push(`${key}: минимальное значение ${paramSchema.min}`);
        }
        if (paramSchema.max !== undefined && value > paramSchema.max) {
          errors.push(`${key}: максимальное значение ${paramSchema.max}`);
        }
      }

      // Проверка допустимых значений для select
      if (paramSchema.type === 'select' && paramSchema.options) {
        const validValues = paramSchema.options.map(o => o.value);
        if (!validValues.includes(value)) {
          errors.push(`${key}: недопустимое значение`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
