import { randomUUID } from 'crypto';
import { PositionSizing } from './PositionSizing.js';
import { StopLossManager, TakeProfitManager } from './StopLoss.js';
import { RiskLimits } from './RiskLimits.js';
import { CorrelationAnalysis } from './CorrelationAnalysis.js';
import { RiskEventLogger } from './RiskEventLogger.js';
import { NotificationManager } from './NotificationManager.js';
import type {
  RiskConfig,
  Position,
  PositionSizingParams,
  StopLossParams,
  TakeProfitParams,
  PositionSide,
  RiskStats,
  PositionUpdateParams,
  RiskEvent,
  OHLCVData,
  NotificationConfig,
} from './types.js';
import { PositionStatus, RiskEventType, NotificationChannel } from './types.js';

/**
 * Главный класс риск-менеджмента
 * Оркестрирует все компоненты управления рисками
 */
export class RiskManager {
  private config: RiskConfig;
  private limits: RiskLimits;
  private correlation: CorrelationAnalysis;
  private eventLogger: RiskEventLogger;
  private notifications: NotificationManager;
  private currentBalance: number;

  constructor(config: RiskConfig, initialBalance: number, notificationConfig?: NotificationConfig) {
    this.config = config;
    this.currentBalance = initialBalance;
    this.limits = new RiskLimits(config, initialBalance);
    this.correlation = new CorrelationAnalysis();
    this.eventLogger = new RiskEventLogger();
    this.notifications = new NotificationManager(
      notificationConfig || {
        enabled: true,
        channels: [NotificationChannel.CONSOLE],
        warningThreshold: 80,
      },
    );

    this.logEvent({
      type: RiskEventType.POSITION_OPENED,
      timestamp: new Date(),
      message: 'Risk Manager initialized',
      data: { balance: initialBalance },
    });
  }

  /**
   * Открытие новой позиции с полной валидацией рисков
   */
  async openPosition(params: {
    symbol: string;
    side: PositionSide;
    sizingParams: PositionSizingParams;
    stopLossParams: StopLossParams;
    takeProfitParams?: TakeProfitParams;
  }): Promise<{ success: boolean; position?: Position; error?: string }> {
    const { symbol, side, sizingParams, stopLossParams, takeProfitParams } = params;

    try {
      // 1. Валидация параметров
      const sizingValidation = PositionSizing.validateParams(sizingParams);
      if (!sizingValidation.valid) {
        return {
          success: false,
          error: `Invalid sizing params: ${sizingValidation.errors.join(', ')}`,
        };
      }

      const slValidation = StopLossManager.validateParams(stopLossParams);
      if (!slValidation.valid) {
        return {
          success: false,
          error: `Invalid stop loss params: ${slValidation.errors.join(', ')}`,
        };
      }

      if (takeProfitParams) {
        const tpValidation = TakeProfitManager.validateParams(takeProfitParams);
        if (!tpValidation.valid) {
          return {
            success: false,
            error: `Invalid take profit params: ${tpValidation.errors.join(', ')}`,
          };
        }
      }

      // 2. Расчет размера позиции
      const sizeResult = PositionSizing.calculateSize(sizingParams);

      // 3. Проверка всех лимитов
      const limitCheck = this.limits.canOpenPosition(symbol, sizeResult.size);
      if (!limitCheck.allowed) {
        this.logEvent({
          type: RiskEventType.LIMIT_REACHED,
          timestamp: new Date(),
          symbol,
          message: `Position rejected: ${limitCheck.reason}`,
        });

        await this.notifications.sendNotification({
          type: RiskEventType.LIMIT_REACHED,
          message: limitCheck.reason || 'Position limit reached',
          symbol,
        });

        return { success: false, error: limitCheck.reason };
      }

      // 4. Проверка корреляции
      const correlationCheck = this.correlation.checkCorrelatedPositions(
        this.limits.getAllPositions(),
        symbol,
        this.config.maxCorrelatedPositions,
        {
          period: 30,
          threshold: this.config.correlationThreshold,
        },
      );

      if (!correlationCheck.allowed) {
        this.logEvent({
          type: RiskEventType.CORRELATION_WARNING,
          timestamp: new Date(),
          symbol,
          message: `Position rejected: ${correlationCheck.reason}`,
        });

        await this.notifications.sendNotification({
          type: RiskEventType.CORRELATION_WARNING,
          message: correlationCheck.reason || 'Correlation limit exceeded',
          symbol,
        });

        return { success: false, error: correlationCheck.reason };
      }

      // 5. Расчет стоп-лосса и тейк-профита
      const stopLoss = StopLossManager.calculateStopLoss(stopLossParams);

      let takeProfit: number[] = [];
      let takeProfitLevels = undefined;

      if (takeProfitParams) {
        takeProfit = TakeProfitManager.calculateLevels(takeProfitParams);
        takeProfitLevels = takeProfitParams.levels;
      } else {
        // Используем дефолтный TP из конфига
        const defaultTP = sizingParams.entryPrice * (1 + this.config.defaultTakeProfit / 100);
        takeProfit = [defaultTP];
      }

      // 6. Создание позиции
      const position: Position = {
        id: randomUUID(),
        symbol,
        side,
        status: PositionStatus.OPEN,
        entryPrice: sizingParams.entryPrice,
        currentPrice: sizingParams.entryPrice,
        size: sizeResult.size,
        quantity: sizeResult.quantity,
        remainingQuantity: sizeResult.quantity,
        stopLoss,
        takeProfit,
        takeProfitLevels,
        trailingStopActive: this.config.trailingStop,
        highestPrice: side === 'long' ? sizingParams.entryPrice : undefined,
        lowestPrice: side === 'short' ? sizingParams.entryPrice : undefined,
        unrealizedPnL: 0,
        realizedPnL: 0,
        openedAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      // 7. Добавляем позицию в лимиты
      this.limits.addPosition(position);

      // 8. Логируем событие
      this.logEvent({
        type: RiskEventType.POSITION_OPENED,
        timestamp: new Date(),
        positionId: position.id,
        symbol,
        message: `Position opened: ${side} ${symbol} at ${sizingParams.entryPrice}, size: ${sizeResult.size.toFixed(2)}, SL: ${stopLoss.toFixed(2)}, TP: ${takeProfit.map((tp) => tp.toFixed(2)).join(', ')}`,
        data: {
          entryPrice: sizingParams.entryPrice,
          size: sizeResult.size,
          quantity: sizeResult.quantity,
          stopLoss,
          takeProfit,
        },
      });

      await this.notifications.sendNotification({
        type: RiskEventType.POSITION_OPENED,
        message: `${side.toUpperCase()} ${symbol} opened at ${sizingParams.entryPrice}`,
        symbol,
        data: position,
      });

      return { success: true, position };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logEvent({
        type: RiskEventType.POSITION_OPENED,
        timestamp: new Date(),
        symbol,
        message: `Failed to open position: ${errorMessage}`,
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Обновление позиции (проверка SL/TP, обновление трейлинг стопа)
   */
  async updatePosition(
    positionId: string,
    updateParams: PositionUpdateParams,
  ): Promise<{
    position: Position | undefined;
    actions: Array<{ type: string; message: string }>;
  }> {
    const position = this.limits.getPosition(positionId);
    if (!position) {
      return { position: undefined, actions: [] };
    }

    const actions: Array<{ type: string; message: string }> = [];
    const { currentPrice, timestamp = new Date() } = updateParams;

    // Обновляем текущую цену
    position.currentPrice = currentPrice;
    position.lastUpdatedAt = timestamp;

    // Расчет unrealized PnL
    if (position.side === 'long') {
      position.unrealizedPnL = (currentPrice - position.entryPrice) * position.remainingQuantity;
    } else {
      position.unrealizedPnL = (position.entryPrice - currentPrice) * position.remainingQuantity;
    }

    // Проверка стоп-лосса
    if (StopLossManager.isStopLossTriggered(position, currentPrice)) {
      await this.closePosition(positionId, currentPrice, RiskEventType.STOP_LOSS_TRIGGERED);
      actions.push({ type: 'stop_loss', message: 'Stop loss triggered' });
      return { position, actions };
    }

    // Обновление трейлинг стопа
    if (position.trailingStopActive) {
      // Проверяем активацию трейлинг стопа
      const profitPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

      if (profitPercent >= this.config.trailingStopActivation) {
        // Обновляем highest/lowest price
        if (position.side === 'long') {
          position.highestPrice = Math.max(position.highestPrice || 0, currentPrice);
        } else {
          position.lowestPrice = Math.min(position.lowestPrice || Number.MAX_VALUE, currentPrice);
        }

        // Обновляем трейлинг стоп
        const trailingUpdate = StopLossManager.updateTrailingStop(
          position,
          currentPrice,
          this.config.trailingStopDistance,
        );

        if (trailingUpdate.updated) {
          position.stopLoss = trailingUpdate.newStopLoss;

          this.logEvent({
            type: RiskEventType.TRAILING_STOP_UPDATED,
            timestamp,
            positionId: position.id,
            symbol: position.symbol,
            message: `Trailing stop updated to ${trailingUpdate.newStopLoss.toFixed(2)}`,
            data: { newStopLoss: trailingUpdate.newStopLoss, currentPrice },
          });

          actions.push({
            type: RiskEventType.TRAILING_STOP_UPDATED,
            message: `Trailing stop updated to ${trailingUpdate.newStopLoss.toFixed(2)}`,
          });
        }
      }
    }

    // Проверка тейк-профита
    const tpCheck = TakeProfitManager.checkTriggeredLevels(position, currentPrice);
    if (tpCheck.triggered && tpCheck.levelIndex !== null) {
      const closeQuantity = TakeProfitManager.calculateCloseQuantity(position, tpCheck.levelIndex);

      await this.partialClosePosition(
        positionId,
        currentPrice,
        closeQuantity,
        RiskEventType.TAKE_PROFIT_TRIGGERED,
      );

      actions.push({
        type: 'take_profit',
        message: `Take profit level ${tpCheck.levelIndex + 1} triggered`,
      });
    }

    // Обновляем позицию в хранилище
    this.limits.updatePosition(positionId, position);

    return { position, actions };
  }

  /**
   * Частичное закрытие позиции
   */
  async partialClosePosition(
    positionId: string,
    closePrice: number,
    closeQuantity: number,
    reason: RiskEventType = RiskEventType.POSITION_PARTIALLY_CLOSED,
  ): Promise<{ success: boolean; position?: Position; pnl?: number }> {
    const position = this.limits.getPosition(positionId);
    if (!position) {
      return { success: false };
    }

    if (closeQuantity > position.remainingQuantity) {
      closeQuantity = position.remainingQuantity;
    }

    // Расчет PnL для закрываемой части
    let pnl: number;
    if (position.side === 'long') {
      pnl = (closePrice - position.entryPrice) * closeQuantity;
    } else {
      pnl = (position.entryPrice - closePrice) * closeQuantity;
    }

    // Обновляем позицию
    position.remainingQuantity -= closeQuantity;
    position.realizedPnL += pnl;
    position.status =
      position.remainingQuantity === 0 ? PositionStatus.CLOSED : PositionStatus.PARTIALLY_CLOSED;

    if (position.remainingQuantity === 0) {
      position.closedAt = new Date();
    }

    // Обновляем баланс
    this.currentBalance += pnl;
    this.limits.updateBalance(this.currentBalance);

    // Логируем событие
    this.logEvent({
      type: reason,
      timestamp: new Date(),
      positionId: position.id,
      symbol: position.symbol,
      message: `Partial close: ${closeQuantity.toFixed(4)} at ${closePrice.toFixed(2)}, PnL: ${pnl.toFixed(2)}`,
      data: { closePrice, closeQuantity, pnl },
    });

    await this.notifications.sendNotification({
      type: reason,
      message: `${position.symbol} partially closed. PnL: ${pnl.toFixed(2)}`,
      symbol: position.symbol,
      data: { pnl, closePrice, closeQuantity },
    });

    this.limits.updatePosition(positionId, position);

    return { success: true, position, pnl };
  }

  /**
   * Полное закрытие позиции
   */
  async closePosition(
    positionId: string,
    closePrice: number,
    reason: RiskEventType = RiskEventType.POSITION_CLOSED,
  ): Promise<{ success: boolean; position?: Position; pnl?: number }> {
    const position = this.limits.getPosition(positionId);
    if (!position) {
      return { success: false };
    }

    return this.partialClosePosition(positionId, closePrice, position.remainingQuantity, reason);
  }

  /**
   * Добавление исторических данных для корреляционного анализа
   */
  addMarketData(symbol: string, ohlcvData: OHLCVData[]): void {
    this.correlation.addPriceData(symbol, ohlcvData);
  }

  /**
   * Обновление рыночных данных
   */
  updateMarketData(symbol: string, ohlcv: OHLCVData): void {
    this.correlation.updatePriceData(symbol, ohlcv);
  }

  /**
   * Получение статистики рисков
   */
  getStats(): RiskStats {
    const stats = this.limits.getStats();

    // Добавляем корреляционные данные
    const correlatedPairs: Array<{ pair1: string; pair2: string; correlation: number }> = [];

    try {
      const matrix = this.correlation.getCorrelationMatrix({
        period: 30,
        threshold: this.config.correlationThreshold,
      });

      const processed = new Set<string>();

      for (const [symbol1, row] of matrix.entries()) {
        for (const [symbol2, correlation] of row.entries()) {
          const pairKey = [symbol1, symbol2].sort().join('-');

          if (
            symbol1 !== symbol2 &&
            !processed.has(pairKey) &&
            Math.abs(correlation) >= this.config.correlationThreshold
          ) {
            correlatedPairs.push({ pair1: symbol1, pair2: symbol2, correlation });
            processed.add(pairKey);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to get correlation data:', error);
    }

    stats.correlatedPairs = correlatedPairs;
    return stats;
  }

  /**
   * Получение всех событий риска
   */
  getEvents(limit?: number): RiskEvent[] {
    return this.eventLogger.getEvents(limit);
  }

  /**
   * Получение событий по типу
   */
  getEventsByType(type: RiskEventType, limit?: number): RiskEvent[] {
    return this.eventLogger.getEventsByType(type, limit);
  }

  /**
   * Логирование события риска
   */
  private logEvent(event: RiskEvent): void {
    this.eventLogger.log(event);
  }

  /**
   * Проверка предупреждений о приближении к лимитам
   */
  async checkWarnings(): Promise<void> {
    const warnings = this.limits.checkWarningThresholds(
      this.notifications.getConfig().warningThreshold,
    );

    for (const warning of warnings.warnings) {
      await this.notifications.sendWarning(warning);

      this.logEvent({
        type: RiskEventType.LIMIT_WARNING,
        timestamp: new Date(),
        message: warning.message,
        data: { type: warning.type, percent: warning.percent },
      });
    }
  }

  /**
   * Обновление конфигурации
   */
  updateConfig(newConfig: Partial<RiskConfig>): void {
    Object.assign(this.config, newConfig);
    this.limits.updateConfig(newConfig);
    console.info('⚙️  Risk configuration updated');
  }

  /**
   * Получение конфигурации
   */
  getConfig(): RiskConfig {
    return { ...this.config };
  }

  /**
   * Получение всех позиций
   */
  getAllPositions(): Position[] {
    return this.limits.getAllPositions();
  }

  /**
   * Получение открытых позиций
   */
  getOpenPositions(): Position[] {
    return this.limits.getAllPositions().filter((pos) => pos.status === 'open');
  }

  /**
   * Получение позиции по ID
   */
  getPosition(positionId: string): Position | undefined {
    return this.limits.getPosition(positionId);
  }

  /**
   * Получение текущего баланса
   */
  getBalance(): number {
    return this.currentBalance;
  }
}
