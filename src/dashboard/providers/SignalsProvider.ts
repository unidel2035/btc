/**
 * Signals Provider
 * Интеграция StrategyManager для генерации реальных торговых сигналов
 */

/* eslint-disable no-console */
import { StrategyManager, CombinationMode } from '../../trading/strategies/StrategyManager.js';
import { NewsMomentumStrategy } from '../../trading/strategies/NewsMomentumStrategy.js';
import { SentimentSwingStrategy } from '../../trading/strategies/SentimentSwingStrategy.js';
import type { ExchangeManager } from '../../exchanges/ExchangeManager.js';
import { storage } from '../storage.js';
import type { DashboardWebSocket } from '../websocket.js';
import type {
  Strategy,
  MarketData,
  Signal,
  TradeDecision,
  SignalType,
  SignalSentiment,
} from '../../trading/strategies/types.js';

/**
 * Конфигурация SignalsProvider
 */
export interface SignalsProviderConfig {
  exchangeManager: ExchangeManager;
  ws?: DashboardWebSocket;
  analysisInterval?: number;
  enabledStrategies?: string[];
}

/**
 * Провайдер торговых сигналов для дашборда
 * Использует StrategyManager для генерации реальных сигналов
 */
export class SignalsProvider {
  private strategyManager: StrategyManager;
  private exchangeManager: ExchangeManager;
  private ws: DashboardWebSocket | null;
  private analysisInterval: NodeJS.Timeout | null = null;
  private strategies: Map<string, Strategy> = new Map();
  private isRunning = false;

  constructor(config: SignalsProviderConfig) {
    this.exchangeManager = config.exchangeManager;
    this.ws = config.ws || null;

    // Создание стратегий
    this.createStrategies(config.enabledStrategies);

    // Инициализация Strategy Manager
    this.strategyManager = new StrategyManager({
      mode: CombinationMode.BEST_CONFIDENCE,
    });

    // Добавляем стратегии в менеджер
    for (const strategy of this.strategies.values()) {
      this.strategyManager.addStrategy(strategy);
    }
  }

  private createStrategies(enabledStrategies?: string[]): void {
    const shouldEnable = (name: string) => {
      if (!enabledStrategies || enabledStrategies.length === 0) {
        return true; // Если не указано, включаем все
      }
      return enabledStrategies.includes(name);
    };

    // News Momentum Strategy
    if (
      process.env.STRATEGY_NEWS_MOMENTUM_ENABLED !== 'false' &&
      shouldEnable('News Momentum')
    ) {
      const newsStrategy = new NewsMomentumStrategy({
        enabled: true,
        minImpact: parseFloat(process.env.NEWS_MIN_IMPACT || '0.7'),
        minConfidence: parseFloat(process.env.NEWS_MIN_CONFIDENCE || '0.65'),
        maxPositionSize: parseFloat(process.env.NEWS_MAX_POSITION_SIZE || '5'),
        stopLossPercent: parseFloat(process.env.NEWS_STOP_LOSS_PERCENT || '2'),
        takeProfitPercent: parseFloat(process.env.NEWS_TAKE_PROFIT_PERCENT || '4'),
        impactThreshold: parseFloat(process.env.NEWS_IMPACT_THRESHOLD || '0.7'),
        reactionTimeSeconds: parseInt(process.env.NEWS_REACTION_TIME || '60'),
        exitTimeSeconds: parseInt(process.env.NEWS_EXIT_TIME || '3600'),
        volatilityMultiplier: parseFloat(process.env.NEWS_VOLATILITY_MULTIPLIER || '0.8'),
        requireMultipleSignals: process.env.NEWS_REQUIRE_MULTIPLE === 'true',
        minSignalsCount: parseInt(process.env.NEWS_MIN_SIGNALS_COUNT || '2'),
      });

      this.strategies.set('News Momentum', newsStrategy);
    }

    // Sentiment Swing Strategy
    if (
      process.env.STRATEGY_SENTIMENT_SWING_ENABLED !== 'false' &&
      shouldEnable('Sentiment Swing')
    ) {
      const sentimentStrategy = new SentimentSwingStrategy({
        enabled: true,
        minImpact: parseFloat(process.env.SENTIMENT_MIN_IMPACT || '0.5'),
        minConfidence: parseFloat(process.env.SENTIMENT_MIN_CONFIDENCE || '0.6'),
        maxPositionSize: parseFloat(process.env.SENTIMENT_MAX_POSITION_SIZE || '8'),
        stopLossPercent: parseFloat(process.env.SENTIMENT_STOP_LOSS_PERCENT || '3'),
        takeProfitPercent: parseFloat(process.env.SENTIMENT_TAKE_PROFIT_PERCENT || '8'),
        aggregationPeriodHours: parseInt(process.env.SENTIMENT_AGGREGATION_PERIOD || '4'),
        trendThreshold: parseFloat(process.env.SENTIMENT_TREND_THRESHOLD || '0.6'),
        reversalDetection: process.env.SENTIMENT_REVERSAL_DETECTION !== 'false',
        continuationDetection: process.env.SENTIMENT_CONTINUATION_DETECTION !== 'false',
        minSentimentChange: parseFloat(process.env.SENTIMENT_MIN_CHANGE || '0.3'),
        holdingPeriodHours: parseInt(process.env.SENTIMENT_HOLDING_PERIOD || '24'),
      });

      this.strategies.set('Sentiment Swing', sentimentStrategy);
    }
  }

  async start(): Promise<void> {
    console.log('🎯 Starting signals provider...');

    this.isRunning = true;

    // Периодический анализ
    const interval = parseInt(process.env.STRATEGY_ANALYSIS_INTERVAL || '30000');
    this.analysisInterval = setInterval(() => {
      if (this.isRunning) {
        void this.runAnalysis();
      }
    }, interval);

    console.log(`✅ Signals provider started (interval: ${interval / 1000}s)`);
  }

  private async runAnalysis(): Promise<void> {
    try {
      console.log('🔍 Running strategy analysis...');

      // Получаем рыночные данные
      const marketData = await this.getMarketData();
      if (!marketData) {
        console.warn('⚠️  No market data available');
        return;
      }

      // Получаем сигналы (например, из news collector, sentiment analyzer)
      const signals = await this.collectSignals();
      if (signals.length === 0) {
        console.log('📊 No signals available for analysis');
        return;
      }

      console.log(`📊 Analyzing ${signals.length} signals for ${marketData.symbol}`);

      // Запускаем анализ через StrategyManager
      const decision = this.strategyManager.analyze(marketData, signals);

      if (decision) {
        await this.handleDecision(decision, marketData);
      }
    } catch (error) {
      console.error('❌ Analysis failed:', error);
    }
  }

  private async getMarketData(): Promise<MarketData | null> {
    try {
      // Получаем данные для основной торговой пары
      const symbol = process.env.TRADING_SYMBOL || 'BTC/USDT';
      const exchanges = this.exchangeManager.listExchanges();
      const activeExchange = exchanges.find((ex) => ex.initialized);

      if (!activeExchange) {
        return null;
      }

      const exchange = this.exchangeManager.getExchange(
        activeExchange.name as 'binance' | 'bybit' | 'okx',
        activeExchange.marketType,
      );

      const ticker = await exchange.getTicker(symbol);

      return {
        symbol,
        price: ticker.lastPrice,
        volume: ticker.volume24h,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to get market data:', error);
      return null;
    }
  }

  private async collectSignals(): Promise<Signal[]> {
    const signals: Signal[] = [];

    // Получаем последние новости из storage
    const news = storage.getNews(10);

    for (const item of news) {
      // Преобразуем новости в сигналы
      signals.push({
        id: `news_${Date.now()}_${Math.random()}`,
        type: 'news' as SignalType,
        sentiment: this.mapSentiment(item.sentiment),
        impact: Math.abs(item.sentimentScore),
        source: item.source,
        timestamp: new Date(item.publishedAt),
        data: {
          title: item.title,
          url: item.url,
          sentimentScore: item.sentimentScore,
        },
      });
    }

    // TODO: Добавить социальные сигналы из sentiment analyzer
    // TODO: Добавить технические индикаторы

    return signals;
  }

  private mapSentiment(sentiment: string): SignalSentiment {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'bullish' as SignalSentiment;
      case 'negative':
        return 'bearish' as SignalSentiment;
      default:
        return 'neutral' as SignalSentiment;
    }
  }

  private async handleDecision(decision: TradeDecision, marketData: MarketData): Promise<void> {
    console.log(
      `📊 Trading decision: ${decision.direction} ${marketData.symbol} (confidence: ${decision.confidence.toFixed(2)})`,
    );

    // Проверяем через risk manager (симуляция)
    // В реальной системе мы бы открывали позицию через openPosition
    // Здесь мы только генерируем сигнал для дашборда

    // Создаем сигнал для дашборда
    const dashboardSignal = {
      type: this.getStrategyName(decision.signals),
      source: 'Strategy Manager',
      symbol: marketData.symbol,
      action: this.mapDirectionToAction(decision.direction),
      strength: decision.confidence * 100,
      confidence: decision.confidence,
      price: decision.entryPrice,
      reason: decision.reason,
      metadata: {
        stopLoss: decision.stopLoss,
        takeProfit: decision.takeProfit,
        positionSize: decision.positionSize,
        timeframe: decision.timeframe,
        signalsCount: decision.signals.length,
      },
    };

    // Добавляем в storage
    const signal = storage.addSignal(dashboardSignal);

    // Отправляем через WebSocket
    if (this.ws) {
      this.ws.broadcastSignal(signal);
    }

    // Уведомление для важных сигналов
    if (decision.confidence > 0.8) {
      console.log(
        `🔔 High confidence signal: ${marketData.symbol} ${decision.direction.toUpperCase()} (${(decision.confidence * 100).toFixed(0)}%)`,
      );
    }
  }

  private getStrategyName(signals: Signal[]): string {
    // Определяем стратегию по типу сигналов
    const hasNews = signals.some((s) => s.type === ('news' as SignalType));
    const hasSentiment = signals.some((s) => s.type === ('sentiment' as SignalType));

    if (hasNews) return 'NEWS_MOMENTUM';
    if (hasSentiment) return 'SENTIMENT_SWING';
    return 'TECHNICAL';
  }

  private mapDirectionToAction(direction: string): 'BUY' | 'SELL' | 'HOLD' {
    if (direction === 'long') return 'BUY';
    if (direction === 'short') return 'SELL';
    return 'HOLD';
  }

  stop(): void {
    console.log('⏹️  Stopping signals provider...');

    this.isRunning = false;

    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }

    console.log('✅ Signals provider stopped');
  }

  // API для управления стратегиями

  enableStrategy(strategyName: string): void {
    const strategy = this.strategyManager.getStrategy(strategyName);
    if (strategy) {
      strategy.updateParameters({ enabled: true });
      console.log(`✅ Strategy enabled: ${strategyName}`);
    }
  }

  disableStrategy(strategyName: string): void {
    const strategy = this.strategyManager.getStrategy(strategyName);
    if (strategy) {
      strategy.updateParameters({ enabled: false });
      console.log(`⏹️  Strategy disabled: ${strategyName}`);
    }
  }

  getStrategiesStatus(): Array<{
    name: string;
    enabled: boolean;
    params: unknown;
    stats: unknown;
  }> {
    return this.strategyManager.getAllStrategies().map((strategy) => ({
      name: strategy.name,
      enabled: strategy.getParameters().enabled,
      params: strategy.getParameters(),
      stats: strategy.getStats(),
    }));
  }

  getStrategy(name: string): Strategy | undefined {
    return this.strategyManager.getStrategy(name);
  }

  updateStrategyParams(name: string, params: Record<string, unknown>): void {
    const strategy = this.strategyManager.getStrategy(name);
    if (strategy) {
      strategy.updateParameters(params);
      console.log(`⚙️  Strategy params updated: ${name}`);
    }
  }
}
