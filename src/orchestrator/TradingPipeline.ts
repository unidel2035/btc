/**
 * Trading Pipeline Orchestrator
 *
 * Orchestrates the complete automated trading pipeline:
 * 1. Screening (AI-powered project selection)
 * 2. Technical Analysis (indicator-based analysis)
 * 3. Signal Generation (strategy-based signals)
 * 4. Risk Evaluation (risk management checks)
 * 5. Execution (position management)
 */

import { randomUUID } from 'crypto';
import { ScreeningModule } from '../analyzers/screening/ScreeningModule.js';
import { TechnicalAnalyzer } from '../analyzers/technical/TechnicalAnalyzer.js';
import { StrategyManager, CombinationMode } from '../trading/strategies/StrategyManager.js';
import { RiskManager } from '../trading/risk/RiskManager.js';
import { PipelineNotificationManager } from './PipelineNotificationManager.js';
import { PortfolioRotationManager } from './PortfolioRotationManager.js';
import type {
  PipelineConfig,
  PipelineReport,
  PipelineExecutionOptions,
  AnalysisReport,
  PipelineStatus,
  PipelineStage,
  PipelineMode,
  PairAnalysis,
  PipelineError,
  PipelineState,
  RiskEvaluationResult,
} from './types.js';
import type { ProjectRecommendation, RiskLevel } from '../analyzers/screening/types.js';
import type { Signal, TradeDecision, MarketData } from '../trading/strategies/types.js';

/**
 * Trading Pipeline Orchestrator
 */
export class TradingPipeline {
  private config: PipelineConfig;
  private state: PipelineState;
  private screeningModule: ScreeningModule;
  private technicalAnalyzer: TechnicalAnalyzer;
  private strategyManager: StrategyManager;
  private riskManager: RiskManager;
  private notificationManager: PipelineNotificationManager;
  private rotationManager: PortfolioRotationManager;

  constructor(
    config: PipelineConfig,
    screeningModule: ScreeningModule,
    technicalAnalyzer: TechnicalAnalyzer,
    strategyManager: StrategyManager,
    riskManager: RiskManager,
  ) {
    this.config = config;
    this.screeningModule = screeningModule;
    this.technicalAnalyzer = technicalAnalyzer;
    this.strategyManager = strategyManager;
    this.riskManager = riskManager;
    this.notificationManager = new PipelineNotificationManager(config.notifications);
    this.rotationManager = new PortfolioRotationManager();

    // Initialize state
    this.state = {
      status: 'idle' as PipelineStatus,
      activePairs: [],
      emergencyStop: false,
      tradesExecutedToday: 0,
      dailyPnL: 0,
    };
  }

  /**
   * Run the full pipeline cycle
   */
  async runFullCycle(options?: PipelineExecutionOptions): Promise<PipelineReport> {
    const executionId = randomUUID();
    const startTime = new Date();

    // Initialize report
    const report: PipelineReport = {
      id: executionId,
      startTime,
      endTime: startTime,
      duration: 0,
      status: 'running' as PipelineStatus,
      stage: 'screening' as PipelineStage,
      mode: this.determineMode(options),
      pairAnalyses: [],
      totalSignals: 0,
      tradableSignals: 0,
      positionsOpened: 0,
      positionsRejected: 0,
      rejectionReasons: [],
      notificationsSent: 0,
      errors: [],
    };

    this.state.status = 'running' as PipelineStatus;
    this.state.lastExecutionId = executionId;

    try {
      // Check emergency stop
      if (this.state.emergencyStop) {
        throw new Error('Pipeline is in emergency stop mode');
      }

      // Check circuit breaker
      if (this.config.execution.circuitBreaker.enabled) {
        this.checkCircuitBreaker();
      }

      // Stage 1: Screening (if enabled)
      let tradingPairs: string[] = [];

      if (options?.runScreening !== false && this.config.screening.enabled) {
        console.info('🔍 Stage 1: Running screening...');
        report.stage = 'screening' as PipelineStage;

        const screeningReport = await this.screeningModule.runScreening();
        report.screeningReport = screeningReport;
        tradingPairs = screeningReport.tradingPairs.slice(0, this.config.screening.maxPairs);

        // Handle portfolio rotation
        if (this.state.activePairs.length > 0) {
          const rotationPlan = this.rotationManager.planRotation(
            this.state.activePairs,
            tradingPairs,
          );

          console.info(
            `📊 Portfolio rotation: Keep ${rotationPlan.toKeep.length}, Close ${rotationPlan.toClose.length}, Open ${rotationPlan.toOpen.length}`,
          );

          // Execute rotation (close old positions gradually)
          this.executeRotation(rotationPlan);
        }

        this.state.activePairs = tradingPairs;
        this.state.lastScreening = new Date();

        // Notify about screening completion
        await this.notificationManager.sendNotification({
          type: 'screening_complete',
          title: '🔍 Screening completed',
          message: `Selected ${tradingPairs.length} pairs: ${tradingPairs.join(', ')}`,
          priority: this.config.notifications.priorities.screening,
          timestamp: new Date(),
          data: { pairs: tradingPairs },
        });
        report.notificationsSent++;
      } else if (options?.specificPairs) {
        tradingPairs = options.specificPairs;
        this.state.activePairs = tradingPairs;
      } else {
        tradingPairs = this.state.activePairs;
      }

      if (tradingPairs.length === 0) {
        console.warn('⚠️  No trading pairs available');
        report.status = 'completed' as PipelineStatus;
        return this.finalizeReport(report);
      }

      // Stage 2: Technical Analysis
      console.info('📊 Stage 2: Running technical analysis...');
      report.stage = 'technical_analysis' as PipelineStage;

      const pairAnalyses: PairAnalysis[] = [];

      for (const pair of tradingPairs) {
        try {
          const analysis = await this.analyzePair(pair);
          pairAnalyses.push(analysis);
        } catch (error) {
          this.addError(report, 'technical_analysis' as PipelineStage, error as Error, {
            pair,
          });
        }
      }

      report.pairAnalyses = pairAnalyses;

      // Stage 3: Signal Generation
      console.info('🎯 Stage 3: Generating signals...');
      report.stage = 'signal_generation' as PipelineStage;

      const tradableAnalyses = pairAnalyses.filter(
        (a) =>
          a.tradeDecision &&
          a.tradeDecision.confidence >= this.config.signalGeneration.minConfidence,
      );

      report.totalSignals = pairAnalyses.filter((a) => a.tradeDecision !== null).length;
      report.tradableSignals = tradableAnalyses.length;

      // Notify about signals
      for (const analysis of tradableAnalyses) {
        if (analysis.tradeDecision) {
          await this.notificationManager.sendNotification({
            type: 'signal_detected',
            title: `📈 Signal: ${analysis.tradeDecision.direction.toUpperCase()} ${analysis.pair}`,
            message: `Confidence: ${(analysis.tradeDecision.confidence * 100).toFixed(0)}%, Entry: ${analysis.tradeDecision.entryPrice}`,
            priority: this.config.notifications.priorities.signal,
            timestamp: new Date(),
            data: {
              pair: analysis.pair,
              decision: analysis.tradeDecision,
            },
          });
          report.notificationsSent++;
        }
      }

      // Stage 4: Execution (if not in notify-only mode)
      if (report.mode !== ('notify_only' as PipelineMode) && tradableAnalyses.length > 0) {
        console.info('⚡ Stage 4: Executing trades...');
        report.stage = 'execution' as PipelineStage;

        for (const analysis of tradableAnalyses) {
          if (!analysis.tradeDecision) continue;

          try {
            const executed = await this.executeTrade(analysis, report.mode);

            if (executed) {
              report.positionsOpened++;

              await this.notificationManager.sendNotification({
                type: 'position_opened',
                title: `✅ Position opened: ${analysis.pair}`,
                message: `${analysis.tradeDecision.direction.toUpperCase()} at ${analysis.tradeDecision.entryPrice}`,
                priority: this.config.notifications.priorities.position,
                timestamp: new Date(),
                data: {
                  pair: analysis.pair,
                  decision: analysis.tradeDecision,
                } as Record<string, unknown>,
              });
              report.notificationsSent++;
            } else {
              report.positionsRejected++;
            }
          } catch (error) {
            report.positionsRejected++;
            this.addError(report, 'execution' as PipelineStage, error as Error, {
              pair: analysis.pair,
            });
          }
        }
      }

      report.status = 'completed' as PipelineStatus;
      console.info('✅ Pipeline cycle completed successfully');
    } catch (error) {
      report.status = 'failed' as PipelineStatus;
      this.addError(report, report.stage, error as Error);
      console.error('❌ Pipeline cycle failed:', error);

      await this.notificationManager.sendNotification({
        type: 'error',
        title: '❌ Pipeline failed',
        message: (error as Error).message,
        priority: this.config.notifications.priorities.error,
        timestamp: new Date(),
        data: { error: (error as Error).message },
      });
      report.notificationsSent++;
    } finally {
      this.state.status = 'idle' as PipelineStatus;
    }

    return this.finalizeReport(report);
  }

  /**
   * Analyze market conditions without trading
   */
  async analyzeMarket(): Promise<AnalysisReport> {
    console.info('🔍 Running market analysis...');

    const pairs = this.state.activePairs;
    if (pairs.length === 0) {
      throw new Error('No active pairs to analyze. Run screening first.');
    }

    const analyses: PairAnalysis[] = [];

    for (const pair of pairs) {
      try {
        const analysis = await this.analyzePair(pair);
        analyses.push(analysis);
      } catch (error) {
        console.error(`Failed to analyze ${pair}:`, error);
      }
    }

    // Determine market conditions
    const bullishCount = analyses.filter(
      (a) => a.technicalAnalysis.trend === 'bullish',
    ).length;
    const bearishCount = analyses.filter(
      (a) => a.technicalAnalysis.trend === 'bearish',
    ).length;

    let overallTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (bullishCount > bearishCount * 1.5) overallTrend = 'bullish';
    else if (bearishCount > bullishCount * 1.5) overallTrend = 'bearish';

    const tradingOpportunities = analyses.filter(
      (a) =>
        a.tradeDecision && a.tradeDecision.confidence >= this.config.signalGeneration.minConfidence,
    ).length;

    const report: AnalysisReport = {
      timestamp: new Date(),
      pairs,
      analyses,
      marketConditions: {
        overallTrend,
        volatility: 'medium', // TODO: Calculate from data
        tradingOpportunities,
      },
      recommendations: analyses
        .filter((a) => a.tradeDecision)
        .map((a) => ({
          pair: a.pair,
          action: a.tradeDecision!.direction === 'long' ? ('buy' as const) : ('sell' as const),
          confidence: a.tradeDecision!.confidence,
          reason: a.tradeDecision!.reason,
        })),
    };

    return report;
  }

  /**
   * Apply strategies to specific pairs
   */
  async applyStrategies(pairs: string[]): Promise<Signal[]> {
    console.info(`🎯 Applying strategies to ${pairs.length} pairs...`);

    const allSignals: Signal[] = [];

    for (const pair of pairs) {
      try {
        const analysis = await this.analyzePair(pair);
        allSignals.push(...analysis.signals);
      } catch (error) {
        console.error(`Failed to apply strategies to ${pair}:`, error);
      }
    }

    return allSignals;
  }

  /**
   * Emergency stop - immediately stop all pipeline execution
   */
  emergencyStop(): void {
    console.warn('🚨 EMERGENCY STOP ACTIVATED');
    this.state.emergencyStop = true;
    this.state.status = 'stopped' as PipelineStatus;

    this.notificationManager.sendNotification({
      type: 'warning',
      title: '🚨 Emergency Stop Activated',
      message: 'Pipeline has been stopped. All automated operations are halted.',
      priority: 'critical',
      timestamp: new Date(),
    });
  }

  /**
   * Resume pipeline after emergency stop
   */
  resume(): void {
    console.info('✅ Resuming pipeline operations');
    this.state.emergencyStop = false;
    this.state.status = 'idle' as PipelineStatus;
  }

  /**
   * Get current pipeline state
   */
  getState(): PipelineState {
    return { ...this.state };
  }

  /**
   * Get current configuration
   */
  getConfig(): PipelineConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get active trading pairs
   */
  getActivePairs(): string[] {
    return [...this.state.activePairs];
  }

  /**
   * Private helper methods
   */

  /**
   * Analyze a single trading pair
   */
  private async analyzePair(pair: string): Promise<PairAnalysis> {
    // Get fundamental data from previous screening
    const fundamentalScore = 0.75; // TODO: Get from screening report
    const fundamentalRisk: RiskLevel = 'medium';

    // Run technical analysis
    const technicalAnalysis = await this.technicalAnalyzer.analyze(pair, {
      indicators: this.config.technicalAnalysis.indicators,
      timeframe: this.config.technicalAnalysis.timeframe,
      lookback: this.config.technicalAnalysis.lookback,
    });

    // Create technical signals
    const signals: Signal[] = this.technicalAnalyzer.generateSignals(technicalAnalysis);

    // Get market data
    const marketData: MarketData = {
      symbol: pair,
      price: technicalAnalysis.indicators.ema?.ema20 || 100, // TODO: Get real price
      volume: 1000000,
      timestamp: new Date(),
    };

    // Apply strategies
    const tradeDecision = this.strategyManager.analyze(marketData, signals);

    return {
      pair,
      fundamentalScore,
      fundamentalRisk,
      technicalAnalysis,
      signals,
      tradeDecision,
      timestamp: new Date(),
    };
  }

  /**
   * Execute a trade (with risk checks)
   */
  private async executeTrade(analysis: PairAnalysis, mode: PipelineMode): Promise<boolean> {
    if (!analysis.tradeDecision) {
      return false;
    }

    // Dry run mode - just log
    if (mode === ('dry_run' as PipelineMode)) {
      console.info(`[DRY RUN] Would open position: ${analysis.pair} ${analysis.tradeDecision.direction}`);
      return true;
    }

    // Manual approval mode - would require user confirmation
    if (mode === ('manual_approval' as PipelineMode)) {
      console.info(`[MANUAL APPROVAL REQUIRED] Position: ${analysis.pair} ${analysis.tradeDecision.direction}`);
      return false; // Would need to implement approval mechanism
    }

    // Risk evaluation
    const riskEvaluation = await this.evaluateRisk(analysis);

    if (!riskEvaluation.approved) {
      console.warn(`Position rejected: ${riskEvaluation.reason}`);
      return false;
    }

    // Check daily trade limit
    if (this.state.tradesExecutedToday >= this.config.execution.dailyTradeLimit) {
      console.warn('Daily trade limit reached');
      return false;
    }

    // TODO: Execute actual trade via exchange
    console.info(`✅ Executing trade: ${analysis.pair} ${analysis.tradeDecision.direction}`);

    this.state.tradesExecutedToday++;

    return true;
  }

  /**
   * Evaluate risk for a trade
   */
  private async evaluateRisk(analysis: PairAnalysis): Promise<RiskEvaluationResult> {
    if (!analysis.tradeDecision) {
      return {
        approved: false,
        reason: 'No trade decision',
        warnings: [],
      };
    }

    // Check if risk management is enabled
    if (!this.config.riskManagement.enabled) {
      return { approved: true, warnings: [] };
    }

    // TODO: Integrate with actual RiskManager
    const warnings: string[] = [];

    // Check fundamental risk
    if (analysis.fundamentalRisk === 'high') {
      warnings.push('High fundamental risk');
    }

    // Check confidence
    if (analysis.tradeDecision.confidence < 0.7) {
      warnings.push('Low confidence signal');
    }

    return {
      approved: true,
      warnings,
    };
  }

  /**
   * Execute portfolio rotation
   */
  private executeRotation(rotationPlan: ReturnType<PortfolioRotationManager['planRotation']>): void {
    // TODO: Implement actual rotation logic
    console.info('📊 Executing portfolio rotation...');

    for (const closeAction of rotationPlan.closeActions) {
      console.info(`  Closing: ${closeAction.pair} (${closeAction.reason})`);
    }

    for (const openAction of rotationPlan.openActions) {
      console.info(
        `  Will open: ${openAction.pair} (priority: ${openAction.priority}, delay: ${openAction.delayHours}h)`,
      );
    }
  }

  /**
   * Check circuit breaker
   */
  private checkCircuitBreaker(): void {
    const maxDailyLoss = this.config.execution.circuitBreaker.maxDailyLoss;
    const currentLoss = (this.state.dailyPnL / 100) * -1; // Assuming negative PnL

    if (currentLoss >= maxDailyLoss) {
      this.emergencyStop();
      throw new Error(`Circuit breaker triggered: Daily loss ${currentLoss}% >= ${maxDailyLoss}%`);
    }
  }

  /**
   * Determine pipeline mode from options
   */
  private determineMode(options?: PipelineExecutionOptions): PipelineMode {
    if (options?.dryRun) return 'dry_run' as PipelineMode;
    if (options?.notifyOnly) return 'notify_only' as PipelineMode;
    if (options?.autoTrade) return 'auto_trade' as PipelineMode;
    return this.config.execution.mode;
  }

  /**
   * Add error to report
   */
  private addError(
    report: PipelineReport,
    stage: PipelineStage,
    error: Error,
    context?: Record<string, unknown>,
  ): void {
    const pipelineError: PipelineError = {
      stage,
      timestamp: new Date(),
      message: error.message,
      error,
      context,
    };
    report.errors.push(pipelineError);
    console.error(`[${stage}] Error:`, error.message, context);
  }

  /**
   * Finalize report with duration
   */
  private finalizeReport(report: PipelineReport): PipelineReport {
    report.endTime = new Date();
    report.duration = report.endTime.getTime() - report.startTime.getTime();
    return report;
  }
}
