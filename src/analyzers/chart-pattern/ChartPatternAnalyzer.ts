/**
 * Chart Pattern Analyzer
 *
 * Main orchestrator for SMC (Smart Money Concepts) pattern analysis
 * Generates tactical trading maps with buy zones, stop losses, and targets
 */

import { BybitExchange } from '../../exchanges/bybit/BybitExchange.js';
import { CandleInterval, MarketType } from '../../exchanges/types.js';
import { OrderBlockDetector } from './patterns/OrderBlockDetector.js';
import { FVGDetector } from './patterns/FVGDetector.js';
import { LiquidityPoolDetector } from './patterns/LiquidityPoolDetector.js';
import { StructureAnalyzer } from './patterns/StructureAnalyzer.js';
import { VolumeAnalyzer } from './patterns/VolumeAnalyzer.js';
import {
  TacticalMap,
  ChartPatternAnalysisRequest,
  ChartPatternReport,
  PatternDetectionConfig,
  BuyZone,
  CriticalLevel,
  OrderConfig,
  ConfidenceLevel,
  MarketPhase,
  OrderBlockType,
  FVGType,
} from './types.js';

/**
 * Default configuration for pattern detection
 */
const DEFAULT_CONFIG: PatternDetectionConfig = {
  // Swing point detection
  swingLookback: 5,

  // Order Block detection
  minImpulseSize: 3.0, // 3% minimum move
  obEffectivenessThreshold: 0.6, // 60% effectiveness

  // FVG detection
  minGapSize: 0.5, // 0.5% minimum gap
  fvgEffectivenessThreshold: 0.65, // 65% effectiveness

  // Liquidity pool detection
  minWickRatio: 1.5, // Wick should be 1.5x body size
  liquidityStrengthThreshold: 0.5, // 50% minimum strength

  // Volume analysis
  volumeLookback: 50,
  volumeAccumulationThreshold: 1.3, // 30% above average
  volumeDivergenceThreshold: 20, // 20% volume decline

  // Backtest settings
  backtestMinTouches: 2,
};

export class ChartPatternAnalyzer {
  private exchange: BybitExchange;
  private config: PatternDetectionConfig;

  // Pattern detectors
  private orderBlockDetector: OrderBlockDetector;
  private fvgDetector: FVGDetector;
  private liquidityPoolDetector: LiquidityPoolDetector;
  private structureAnalyzer: StructureAnalyzer;
  private volumeAnalyzer: VolumeAnalyzer;

  constructor(config?: Partial<PatternDetectionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize pattern detectors
    this.orderBlockDetector = new OrderBlockDetector(this.config);
    this.fvgDetector = new FVGDetector(this.config);
    this.liquidityPoolDetector = new LiquidityPoolDetector(this.config);
    this.structureAnalyzer = new StructureAnalyzer(this.config);
    this.volumeAnalyzer = new VolumeAnalyzer(this.config);

    // Initialize Bybit exchange client
    this.exchange = new BybitExchange({
      marketType: MarketType.SPOT,
      testnet: false,
      apiKey: process.env.BYBIT_API_KEY,
      apiSecret: process.env.BYBIT_SECRET,
    });
  }

  /**
   * Initialize the analyzer
   */
  async initialize(): Promise<void> {
    await this.exchange.initialize();
    console.info('✅ Chart Pattern Analyzer initialized');
  }

  /**
   * Analyze multiple trading pairs and generate comprehensive report
   */
  async analyzeMultiplePairs(request: ChartPatternAnalysisRequest): Promise<ChartPatternReport> {
    console.info(`\n🔍 Starting analysis for ${request.pairs.length} trading pairs...`);

    const tacticalMaps: TacticalMap[] = [];

    for (const pair of request.pairs) {
      console.info(`\n📊 Analyzing ${pair}...`);

      try {
        const tacticalMap = await this.analyzeSinglePair(
          pair,
          request.timeframes || ['1d'],
          request.maxHistory,
        );
        tacticalMaps.push(tacticalMap);

        console.info(`✅ ${pair} analysis complete - Score: ${tacticalMap.overallScore}/100`);
      } catch (error) {
        console.error(`❌ Failed to analyze ${pair}:`, error);
      }
    }

    // Generate summary
    const recommendedPairs = tacticalMaps
      .filter((tm) => tm.recommendation === 'strong_buy' || tm.recommendation === 'buy')
      .map((tm) => tm.pair);

    const topOpportunities = tacticalMaps
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 3)
      .map((tm) => ({
        pair: tm.pair,
        score: tm.overallScore,
        reasoning: this.generateSummaryReasoning(tm),
      }));

    return {
      generatedAt: new Date(),
      pairs: request.pairs,
      tacticalMaps,
      summary: {
        totalPairsAnalyzed: tacticalMaps.length,
        recommendedPairs,
        topOpportunities,
      },
    };
  }

  /**
   * Analyze a single trading pair
   */
  async analyzeSinglePair(
    pair: string,
    timeframes: string[],
    maxHistory?: number,
  ): Promise<TacticalMap> {
    // Fetch candle data for primary timeframe (use first timeframe, typically '1d')
    const primaryTimeframe = timeframes[0];
    const interval = this.mapTimeframeToInterval(primaryTimeframe);
    const limit = maxHistory || 1000; // Fetch maximum available history

    console.info(`  📥 Fetching ${limit} candles for ${pair} (${primaryTimeframe})...`);
    const candles = await this.exchange.getCandles(pair, interval, limit);

    if (candles.length < 50) {
      throw new Error(`Insufficient data for ${pair}: only ${candles.length} candles`);
    }

    console.info(`  ✅ Fetched ${candles.length} candles`);

    // Step 1: Identify market structure
    console.info(`  🔍 Identifying market structure...`);
    const swingPoints = this.structureAnalyzer.identifySwingPoints(candles);
    const marketPhase = this.structureAnalyzer.determineMarketPhase(candles, swingPoints);
    const { support, resistance } = this.structureAnalyzer.calculateSupportResistance(swingPoints);

    console.info(`  ✅ Found ${swingPoints.length} swing points, Phase: ${marketPhase}`);

    // Step 2: Detect SMC patterns
    console.info(`  🔍 Detecting SMC patterns...`);
    const orderBlocks = this.orderBlockDetector.detect(candles);
    const fairValueGaps = this.fvgDetector.detect(candles);
    const liquidityPools = this.liquidityPoolDetector.detect(candles, swingPoints);

    console.info(
      `  ✅ Patterns: ${orderBlocks.length} OBs, ${fairValueGaps.length} FVGs, ${liquidityPools.length} liquidity pools`,
    );

    // Step 3: Volume analysis
    console.info(`  🔍 Analyzing volume...`);
    const volumeAnalysis = this.volumeAnalyzer.analyze(candles);

    // Step 4: Generate buy zones and tactical recommendations
    console.info(`  🎯 Generating buy zones...`);
    const buyZones = this.generateBuyZones(
      candles,
      orderBlocks,
      fairValueGaps,
      support,
      marketPhase,
    );

    // Step 5: Identify critical levels
    const criticalLevels = this.identifyCriticalLevels(candles, support, resistance);

    // Step 6: Generate order configuration
    const orderConfig = this.generateOrderConfig(pair, buyZones);

    // Step 7: Calculate overall score and recommendation
    const { overallScore, recommendation } = this.calculateOverallScore(
      marketPhase,
      orderBlocks,
      fairValueGaps,
      volumeAnalysis,
      buyZones,
    );

    // Step 8: Generate historical conclusion
    const historicalConclusion = this.generateHistoricalConclusion(
      orderBlocks,
      fairValueGaps,
      primaryTimeframe,
    );

    return {
      pair,
      timestamp: new Date(),
      timeframe: primaryTimeframe,
      currentPhase: marketPhase,
      historicalConclusion,
      orderBlocks,
      fairValueGaps,
      liquidityPools,
      swingPoints,
      volumeAnalysis,
      buyZones,
      criticalLevels,
      orderConfig,
      overallScore,
      recommendation,
    };
  }

  /**
   * Generate buy zones based on pattern confluence
   */
  private generateBuyZones(
    candles: any[],
    orderBlocks: any[],
    fairValueGaps: any[],
    supportLevels: number[],
    marketPhase: MarketPhase,
  ): BuyZone[] {
    const buyZones: BuyZone[] = [];
    const currentPrice = candles[candles.length - 1].close;

    // Only generate buy zones for accumulation or uptrend phases
    if (marketPhase === MarketPhase.DISTRIBUTION || marketPhase === MarketPhase.DOWNTREND) {
      return buyZones;
    }

    // Find bullish Order Blocks below current price
    const bullishOBs = orderBlocks
      .filter((ob) => ob.type === OrderBlockType.BULLISH && ob.high < currentPrice)
      .sort((a, b) => b.high - a.high); // Sort by proximity to current price

    // Find bullish FVGs below current price
    const bullishFVGs = fairValueGaps
      .filter((fvg) => fvg.type === FVGType.BULLISH && fvg.gapHigh < currentPrice && !fvg.filled)
      .sort((a, b) => b.gapHigh - a.high);

    // Generate zones from Order Blocks
    let zoneNumber = 1;
    for (let i = 0; i < Math.min(bullishOBs.length, 2); i++) {
      const ob = bullishOBs[i];

      // Check for confluence with FVG or support
      const hasConfluence = this.checkConfluence(ob.high, ob.low, bullishFVGs, supportLevels);

      if (ob.confidence === ConfidenceLevel.HIGH || hasConfluence) {
        const zone = this.createBuyZoneFromOB(ob, currentPrice, zoneNumber, hasConfluence);
        buyZones.push(zone);
        zoneNumber++;
      }
    }

    // Add support level zones if we have less than 2 zones
    if (buyZones.length < 2 && supportLevels.length > 0) {
      for (const support of supportLevels) {
        if (support < currentPrice && buyZones.length < 2) {
          const zone = this.createBuyZoneFromSupport(support, currentPrice, zoneNumber);
          buyZones.push(zone);
          zoneNumber++;
        }
      }
    }

    return buyZones;
  }

  /**
   * Check for confluence between patterns and levels
   */
  private checkConfluence(
    obHigh: number,
    obLow: number,
    fvgs: any[],
    supportLevels: number[],
  ): boolean {
    // Check FVG confluence (within 2%)
    for (const fvg of fvgs) {
      if (
        Math.abs(fvg.gapHigh - obHigh) / obHigh < 0.02 ||
        Math.abs(fvg.gapLow - obLow) / obLow < 0.02
      ) {
        return true;
      }
    }

    // Check support level confluence
    for (const support of supportLevels) {
      if (support >= obLow && support <= obHigh) {
        return true;
      }
    }

    return false;
  }

  /**
   * Create buy zone from Order Block
   */
  private createBuyZoneFromOB(
    ob: any,
    currentPrice: number,
    zoneNumber: number,
    hasConfluence: boolean,
  ): BuyZone {
    const confidence = hasConfluence ? ConfidenceLevel.HIGH : ob.confidence;
    const midPrice = (ob.high + ob.low) / 2;

    // Calculate targets (Fibonacci extensions)
    const entryToCurrentMove = currentPrice - midPrice;
    const target1 = currentPrice + entryToCurrentMove * 0.618; // 61.8% extension
    const target2 = currentPrice + entryToCurrentMove * 1.0; // 100% extension

    // Stop loss below OB
    const stopLoss = ob.low * 0.985; // 1.5% below OB low

    // Calculate risk-reward
    const risk = midPrice - stopLoss;
    const reward = target1 - midPrice;
    const riskRewardRatio = reward / risk;

    // Allocation based on confidence
    const allocation = confidence === ConfidenceLevel.HIGH ? 40 : 30;

    const reasoning = this.generateBuyZoneReasoning(ob, hasConfluence);

    return {
      zoneNumber,
      confidence,
      priceRangeHigh: ob.high,
      priceRangeLow: ob.low,
      reasoning,
      suggestedAllocation: allocation,
      targetPrices: [target1, target2],
      stopLoss,
      riskRewardRatio,
    };
  }

  /**
   * Create buy zone from support level
   */
  private createBuyZoneFromSupport(
    support: number,
    currentPrice: number,
    zoneNumber: number,
  ): BuyZone {
    const rangeSize = support * 0.015; // 1.5% range
    const priceRangeHigh = support + rangeSize / 2;
    const priceRangeLow = support - rangeSize / 2;

    const target1 = currentPrice * 1.05;
    const target2 = currentPrice * 1.12;
    const stopLoss = priceRangeLow * 0.98;

    const risk = support - stopLoss;
    const reward = target1 - support;
    const riskRewardRatio = reward / risk;

    return {
      zoneNumber,
      confidence: ConfidenceLevel.MEDIUM,
      priceRangeHigh,
      priceRangeLow,
      reasoning: `Key support level identified from historical swing lows. Volume Profile POC.`,
      suggestedAllocation: 30,
      targetPrices: [target1, target2],
      stopLoss,
      riskRewardRatio,
    };
  }

  /**
   * Generate reasoning for buy zone
   */
  private generateBuyZoneReasoning(ob: any, hasConfluence: boolean): string {
    let reasoning = `Bullish Order Block with ${Math.round(ob.effectiveness * 100)}% effectiveness`;

    if (hasConfluence) {
      reasoning += `. Confluence with FVG and/or support level`;
    }

    reasoning += `. Historical reactions: ${ob.reactionCount}/${ob.touchCount} touches`;

    return reasoning;
  }

  /**
   * Identify critical levels
   */
  private identifyCriticalLevels(
    candles: any[],
    support: number[],
    resistance: number[],
  ): CriticalLevel[] {
    const levels: CriticalLevel[] = [];
    const currentPrice = candles[candles.length - 1].close;

    // Add invalidation level (below lowest support)
    if (support.length > 0) {
      const lowestSupport = Math.min(...support);
      levels.push({
        type: 'invalidation',
        price: lowestSupport * 0.95,
        description: `Invalidation level - below key support. Daily close below invalidates bullish setup`,
      });
    }

    // Add nearest resistance
    const nearestResistance = resistance.find((r) => r > currentPrice);
    if (nearestResistance) {
      levels.push({
        type: 'resistance',
        price: nearestResistance,
        description: `Key resistance from historical swing highs`,
      });
    }

    return levels;
  }

  /**
   * Generate order configuration for Bybit
   */
  private generateOrderConfig(pair: string, buyZones: BuyZone[]): OrderConfig {
    const orders: OrderConfig['orders'] = [];
    const takeProfits: OrderConfig['take_profit'] = [];

    let totalQty = 0;

    // Create limit buy orders for each zone
    for (const zone of buyZones) {
      const entryPrice = ((zone.priceRangeHigh + zone.priceRangeLow) / 2).toFixed(2);
      const qty = zone.suggestedAllocation.toString();

      orders.push({
        type: 'LIMIT',
        side: 'BUY',
        qty,
        price: entryPrice,
        reduce_only: false,
      });

      totalQty += zone.suggestedAllocation;
    }

    // Create take profit orders
    if (buyZones.length > 0 && buyZones[0].targetPrices.length > 0) {
      const firstZone = buyZones[0];
      const qtyPerTarget = Math.floor(totalQty / firstZone.targetPrices.length);

      for (const target of firstZone.targetPrices) {
        takeProfits.push({
          type: 'LIMIT',
          side: 'SELL',
          qty: qtyPerTarget.toString(),
          price: target.toFixed(2),
        });
      }
    }

    // Create stop loss
    const stopLoss =
      buyZones.length > 0
        ? {
            type: 'STOP_MARKET' as const,
            side: 'SELL' as const,
            qty: totalQty.toString(),
            trigger_price: buyZones[0].stopLoss.toFixed(2),
          }
        : undefined;

    return {
      pair,
      orders,
      stop_loss: stopLoss,
      take_profit: takeProfits,
    };
  }

  /**
   * Calculate overall score and recommendation
   */
  private calculateOverallScore(
    marketPhase: MarketPhase,
    orderBlocks: any[],
    fairValueGaps: any[],
    volumeAnalysis: any,
    buyZones: BuyZone[],
  ): { overallScore: number; recommendation: TacticalMap['recommendation'] } {
    let score = 50; // Base score

    // Market phase score (0-20 points)
    if (marketPhase === MarketPhase.ACCUMULATION) score += 15;
    else if (marketPhase === MarketPhase.UPTREND) score += 20;
    else if (marketPhase === MarketPhase.CORRECTION) score += 10;
    else if (marketPhase === MarketPhase.DISTRIBUTION) score -= 10;
    else if (marketPhase === MarketPhase.DOWNTREND) score -= 20;

    // Pattern quality score (0-30 points)
    const highConfidenceOBs = orderBlocks.filter((ob) => ob.confidence === ConfidenceLevel.HIGH)
      .length;
    const highConfidenceFVGs = fairValueGaps.filter((fvg) => fvg.confidence === ConfidenceLevel.HIGH)
      .length;

    score += Math.min(highConfidenceOBs * 10, 15);
    score += Math.min(highConfidenceFVGs * 5, 15);

    // Volume score (0-20 points)
    if (volumeAnalysis.accumulationDetected) score += 15;
    if (volumeAnalysis.distributionDetected) score -= 15;
    if (volumeAnalysis.divergenceDetected) {
      score += volumeAnalysis.divergenceType === 'bullish' ? 10 : -10;
    }

    // Buy zone score (0-10 points)
    score += Math.min(buyZones.length * 5, 10);

    // Clamp score to 0-100
    const overallScore = Math.max(0, Math.min(100, Math.round(score)));

    // Determine recommendation
    let recommendation: TacticalMap['recommendation'];
    if (overallScore >= 75) recommendation = 'strong_buy';
    else if (overallScore >= 60) recommendation = 'buy';
    else if (overallScore >= 40) recommendation = 'hold';
    else recommendation = 'avoid';

    return { overallScore, recommendation };
  }

  /**
   * Generate historical conclusion
   */
  private generateHistoricalConclusion(
    orderBlocks: any[],
    fairValueGaps: any[],
    timeframe: string,
  ): string {
    const obEffectiveness =
      orderBlocks.length > 0
        ? (orderBlocks.reduce((sum, ob) => sum + ob.effectiveness, 0) / orderBlocks.length) * 100
        : 0;

    const fvgEffectiveness =
      fairValueGaps.length > 0
        ? (fairValueGaps.reduce((sum, fvg) => sum + fvg.effectiveness, 0) / fairValueGaps.length) *
          100
        : 0;

    return `Order Block patterns on ${timeframe} timeframe show ${Math.round(obEffectiveness)}% effectiveness for bounces. ` +
      `Fair Value Gaps act as price magnets in ${Math.round(fvgEffectiveness)}% of cases.`;
  }

  /**
   * Generate summary reasoning for top opportunities
   */
  private generateSummaryReasoning(tm: TacticalMap): string {
    const reasons: string[] = [];

    if (tm.currentPhase === MarketPhase.ACCUMULATION) {
      reasons.push('Accumulation phase detected');
    } else if (tm.currentPhase === MarketPhase.UPTREND) {
      reasons.push('Strong uptrend');
    }

    const highConfOBs = tm.orderBlocks.filter((ob) => ob.confidence === ConfidenceLevel.HIGH)
      .length;
    if (highConfOBs > 0) {
      reasons.push(`${highConfOBs} high-confidence order blocks`);
    }

    if (tm.volumeAnalysis.accumulationDetected) {
      reasons.push('Volume accumulation');
    }

    if (tm.buyZones.length > 0) {
      reasons.push(`${tm.buyZones.length} buy zones identified`);
    }

    return reasons.join(', ');
  }

  /**
   * Map timeframe string to CandleInterval
   */
  private mapTimeframeToInterval(timeframe: string): CandleInterval {
    const map: Record<string, CandleInterval> = {
      '1m': CandleInterval.ONE_MINUTE,
      '5m': CandleInterval.FIVE_MINUTES,
      '15m': CandleInterval.FIFTEEN_MINUTES,
      '30m': CandleInterval.THIRTY_MINUTES,
      '1h': CandleInterval.ONE_HOUR,
      '4h': CandleInterval.FOUR_HOURS,
      '1d': CandleInterval.ONE_DAY,
      '1w': CandleInterval.ONE_WEEK,
    };

    return map[timeframe] || CandleInterval.ONE_DAY;
  }

  /**
   * Disconnect from exchange
   */
  async disconnect(): Promise<void> {
    await this.exchange.disconnect();
  }
}
