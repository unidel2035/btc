import type { RiskConfig, Position, LimitCheckResult, RiskStats } from './types.js';

/**
 * Модуль проверки риск-лимитов
 */
export class RiskLimits {
  private config: RiskConfig;
  private positions: Map<string, Position>;
  private _initialBalance: number; // Stored for future use (e.g., total return calculation)
  private currentBalance: number;
  private dailyStartBalance: number;
  private peakBalance: number;
  private dailyResetTime: Date;

  constructor(config: RiskConfig, initialBalance: number) {
    this.config = config;
    this.positions = new Map();
    this._initialBalance = initialBalance;
    this.currentBalance = initialBalance;
    this.dailyStartBalance = initialBalance;
    this.peakBalance = initialBalance;
    this.dailyResetTime = this.getNextDayStart();
  }

  /**
   * Получение начального баланса
   */
  getInitialBalance(): number {
    return this._initialBalance;
  }

  /**
   * Проверка лимита на максимальный размер позиции
   */
  checkMaxPositionSize(positionSize: number): LimitCheckResult {
    const maxSize = (this.currentBalance * this.config.maxPositionSize) / 100;

    if (positionSize > maxSize) {
      return {
        allowed: false,
        reason: `Position size ${positionSize.toFixed(2)} exceeds maximum allowed ${maxSize.toFixed(2)} (${this.config.maxPositionSize}% of balance)`,
        currentValue: positionSize,
        limitValue: maxSize,
      };
    }

    return { allowed: true };
  }

  /**
   * Проверка лимита на максимальное количество позиций
   */
  checkMaxPositions(): LimitCheckResult {
    const openPositions = this.getOpenPositions().length;

    if (openPositions >= this.config.maxPositions) {
      return {
        allowed: false,
        reason: `Maximum number of positions reached: ${openPositions}/${this.config.maxPositions}`,
        currentValue: openPositions,
        limitValue: this.config.maxPositions,
      };
    }

    return { allowed: true };
  }

  /**
   * Проверка дневного лимита убытков
   */
  checkDailyLoss(): LimitCheckResult {
    // Проверяем, не нужно ли сбросить дневной счетчик
    this.checkDailyReset();

    const dailyPnL = this.currentBalance - this.dailyStartBalance;
    const dailyPnLPercent = (dailyPnL / this.dailyStartBalance) * 100;
    const maxLoss = -this.config.maxDailyLoss;

    if (dailyPnLPercent <= maxLoss) {
      return {
        allowed: false,
        reason: `Daily loss limit reached: ${dailyPnLPercent.toFixed(2)}% (limit: ${maxLoss}%)`,
        currentValue: dailyPnLPercent,
        limitValue: maxLoss,
      };
    }

    return { allowed: true };
  }

  /**
   * Проверка общего лимита просадки (drawdown)
   */
  checkMaxDrawdown(): LimitCheckResult {
    const drawdown = this.peakBalance - this.currentBalance;
    const drawdownPercent = (drawdown / this.peakBalance) * 100;

    if (drawdownPercent >= this.config.maxTotalDrawdown) {
      return {
        allowed: false,
        reason: `Maximum drawdown reached: ${drawdownPercent.toFixed(2)}% (limit: ${this.config.maxTotalDrawdown}%)`,
        currentValue: drawdownPercent,
        limitValue: this.config.maxTotalDrawdown,
      };
    }

    return { allowed: true };
  }

  /**
   * Проверка лимита экспозиции на актив
   */
  checkAssetExposure(symbol: string, newPositionSize: number): LimitCheckResult {
    const currentExposure = this.getAssetExposure(symbol);
    const totalExposure = currentExposure + newPositionSize;
    const exposurePercent = (totalExposure / this.currentBalance) * 100;

    if (exposurePercent > this.config.maxAssetExposure) {
      return {
        allowed: false,
        reason: `Asset exposure limit for ${symbol} would be exceeded: ${exposurePercent.toFixed(2)}% (limit: ${this.config.maxAssetExposure}%)`,
        currentValue: exposurePercent,
        limitValue: this.config.maxAssetExposure,
      };
    }

    return { allowed: true };
  }

  /**
   * Комплексная проверка всех лимитов перед открытием позиции
   */
  canOpenPosition(symbol: string, positionSize: number): LimitCheckResult {
    // Проверяем размер позиции
    const sizeCheck = this.checkMaxPositionSize(positionSize);
    if (!sizeCheck.allowed) {
      return sizeCheck;
    }

    // Проверяем количество позиций
    const countCheck = this.checkMaxPositions();
    if (!countCheck.allowed) {
      return countCheck;
    }

    // Проверяем дневные убытки
    const dailyLossCheck = this.checkDailyLoss();
    if (!dailyLossCheck.allowed) {
      return dailyLossCheck;
    }

    // Проверяем общую просадку
    const drawdownCheck = this.checkMaxDrawdown();
    if (!drawdownCheck.allowed) {
      return drawdownCheck;
    }

    // Проверяем экспозицию на актив
    const assetCheck = this.checkAssetExposure(symbol, positionSize);
    if (!assetCheck.allowed) {
      return assetCheck;
    }

    return { allowed: true };
  }

  /**
   * Получение текущей экспозиции по активу
   */
  private getAssetExposure(symbol: string): number {
    let exposure = 0;

    for (const position of this.positions.values()) {
      if (position.symbol === symbol && position.status === 'open') {
        exposure += position.size;
      }
    }

    return exposure;
  }

  /**
   * Получение открытых позиций
   */
  private getOpenPositions(): Position[] {
    return Array.from(this.positions.values()).filter((pos) => pos.status === 'open');
  }

  /**
   * Проверка необходимости сброса дневного счетчика
   */
  private checkDailyReset(): void {
    const now = new Date();

    if (now >= this.dailyResetTime) {
      this.dailyStartBalance = this.currentBalance;
      this.dailyResetTime = this.getNextDayStart();
      console.info('📅 Daily risk counters reset');
    }
  }

  /**
   * Получение времени начала следующего дня (UTC)
   */
  private getNextDayStart(): Date {
    const tomorrow = new Date();
    tomorrow.setUTCHours(0, 0, 0, 0);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return tomorrow;
  }

  /**
   * Добавление позиции
   */
  addPosition(position: Position): void {
    this.positions.set(position.id, position);
  }

  /**
   * Обновление позиции
   */
  updatePosition(positionId: string, updates: Partial<Position>): void {
    const position = this.positions.get(positionId);
    if (position) {
      Object.assign(position, updates);
    }
  }

  /**
   * Удаление позиции
   */
  removePosition(positionId: string): void {
    this.positions.delete(positionId);
  }

  /**
   * Обновление баланса
   */
  updateBalance(newBalance: number): void {
    this.currentBalance = newBalance;

    // Обновляем пиковый баланс
    if (newBalance > this.peakBalance) {
      this.peakBalance = newBalance;
    }
  }

  /**
   * Получение статистики рисков
   */
  getStats(): RiskStats {
    const openPositions = this.getOpenPositions();

    // Общая экспозиция
    const totalExposure = openPositions.reduce((sum, pos) => sum + pos.size, 0);

    // Экспозиция по активам
    const assetExposure: Record<string, number> = {};
    for (const position of openPositions) {
      assetExposure[position.symbol] = (assetExposure[position.symbol] || 0) + position.size;
    }

    // Дневной PnL
    const dailyPnL = this.currentBalance - this.dailyStartBalance;
    const dailyPnLPercent = (dailyPnL / this.dailyStartBalance) * 100;

    // Общая просадка
    const totalDrawdown = this.peakBalance - this.currentBalance;
    const totalDrawdownPercent = (totalDrawdown / this.peakBalance) * 100;

    return {
      openPositions: openPositions.length,
      totalPositions: this.positions.size,
      dailyPnL,
      dailyPnLPercent,
      totalDrawdown,
      totalDrawdownPercent,
      totalExposure,
      totalExposurePercent: (totalExposure / this.currentBalance) * 100,
      assetExposure,
      correlatedPairs: [], // Будет заполнено модулем корреляции
      updatedAt: new Date(),
    };
  }

  /**
   * Проверка приближения к лимитам (для предупреждений)
   */
  checkWarningThresholds(warningPercent: number = 80): {
    warnings: Array<{ type: string; message: string; percent: number }>;
  } {
    const warnings: Array<{ type: string; message: string; percent: number }> = [];
    const warningThreshold = warningPercent / 100;

    // Проверка количества позиций
    const openPositions = this.getOpenPositions().length;
    const positionPercent = (openPositions / this.config.maxPositions) * 100;
    if (positionPercent >= warningPercent) {
      warnings.push({
        type: 'max_positions',
        message: `Approaching max positions limit: ${openPositions}/${this.config.maxPositions}`,
        percent: positionPercent,
      });
    }

    // Проверка дневных убытков
    const dailyPnL = this.currentBalance - this.dailyStartBalance;
    const dailyPnLPercent = (dailyPnL / this.dailyStartBalance) * 100;
    const dailyLossUsed = Math.abs(dailyPnLPercent) / this.config.maxDailyLoss;
    if (dailyLossUsed >= warningThreshold && dailyPnL < 0) {
      warnings.push({
        type: 'daily_loss',
        message: `Approaching daily loss limit: ${dailyPnLPercent.toFixed(2)}% of ${this.config.maxDailyLoss}%`,
        percent: dailyLossUsed * 100,
      });
    }

    // Проверка общей просадки
    const drawdown = this.peakBalance - this.currentBalance;
    const drawdownPercent = (drawdown / this.peakBalance) * 100;
    const drawdownUsed = drawdownPercent / this.config.maxTotalDrawdown;
    if (drawdownUsed >= warningThreshold) {
      warnings.push({
        type: 'max_drawdown',
        message: `Approaching max drawdown: ${drawdownPercent.toFixed(2)}% of ${this.config.maxTotalDrawdown}%`,
        percent: drawdownUsed * 100,
      });
    }

    return { warnings };
  }

  /**
   * Обновление конфигурации
   */
  updateConfig(newConfig: Partial<RiskConfig>): void {
    Object.assign(this.config, newConfig);
    console.info('⚙️  Risk configuration updated');
  }

  /**
   * Получение текущей конфигурации
   */
  getConfig(): RiskConfig {
    return { ...this.config };
  }

  /**
   * Получение всех позиций
   */
  getAllPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  /**
   * Получение позиции по ID
   */
  getPosition(positionId: string): Position | undefined {
    return this.positions.get(positionId);
  }
}
