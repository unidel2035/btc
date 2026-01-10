/**
 * Pipeline Scheduler
 *
 * Manages automated execution of pipeline stages using cron
 */

import * as cron from 'node-cron';
import { TradingPipeline } from './TradingPipeline.js';
import type { PipelineConfig } from './types.js';

/**
 * Scheduled job
 */
interface ScheduledJob {
  name: string;
  schedule: string;
  task: cron.ScheduledTask;
  enabled: boolean;
}

/**
 * Pipeline Scheduler
 */
export class PipelineScheduler {
  private pipeline: TradingPipeline;
  private config: PipelineConfig;
  private jobs: Map<string, ScheduledJob> = new Map();

  constructor(pipeline: TradingPipeline, config: PipelineConfig) {
    this.pipeline = pipeline;
    this.config = config;
  }

  /**
   * Initialize all scheduled jobs
   */
  initialize(): void {
    console.info('📅 Initializing pipeline scheduler...');

    // Screening job: Weekly (Sunday 00:00 UTC)
    if (this.config.screening.enabled) {
      const screeningSchedule = this.getScreeningSchedule(this.config.screening.frequency);
      this.scheduleJob('screening', screeningSchedule, async () => {
        console.info('🔍 [SCHEDULED] Running weekly screening...');
        try {
          await this.pipeline.runFullCycle({
            runScreening: true,
            autoTrade: false,
            notifyOnly: true,
          });
        } catch (error) {
          console.error('❌ Scheduled screening failed:', error);
        }
      });
    }

    // Technical analysis job: Every 4 hours
    if (this.config.technicalAnalysis.enabled) {
      const analysisSchedule = this.getAnalysisSchedule(this.config.technicalAnalysis.frequency);
      this.scheduleJob('technical_analysis', analysisSchedule, async () => {
        console.info('📊 [SCHEDULED] Running technical analysis...');
        try {
          await this.pipeline.analyzeMarket();
        } catch (error) {
          console.error('❌ Scheduled analysis failed:', error);
        }
      });
    }

    // Signal generation job: Every hour
    if (this.config.signalGeneration.enabled) {
      const signalSchedule = this.getSignalSchedule(this.config.signalGeneration.frequency);
      this.scheduleJob('signal_generation', signalSchedule, async () => {
        console.info('🎯 [SCHEDULED] Generating signals...');
        try {
          const activePairs = this.pipeline.getActivePairs();
          if (activePairs.length > 0) {
            await this.pipeline.applyStrategies(activePairs);
          }
        } catch (error) {
          console.error('❌ Scheduled signal generation failed:', error);
        }
      });
    }

    // Daily reset job: Reset daily counters at midnight UTC
    this.scheduleJob('daily_reset', '0 0 * * *', () => {
      console.info('🔄 [SCHEDULED] Resetting daily counters...');
      this.resetDailyCounters();
    });

    console.info(`✅ Scheduler initialized with ${this.jobs.size} jobs`);
    this.printSchedule();
  }

  /**
   * Schedule a new job
   */
  private scheduleJob(name: string, schedule: string, task: () => void | Promise<void>): void {
    const cronTask = cron.schedule(schedule, task, {
      timezone: 'UTC',
    });

    this.jobs.set(name, {
      name,
      schedule,
      task: cronTask,
      enabled: true,
    });

    console.info(`  ✓ Scheduled "${name}" with cron "${schedule}"`);
  }

  /**
   * Start all jobs
   */
  start(): void {
    console.info('▶️  Starting all scheduled jobs...');
    for (const [name, job] of Array.from(this.jobs.entries())) {
      if (job.enabled) {
        job.task.start();
        console.info(`  ✓ Started: ${name}`);
      }
    }
  }

  /**
   * Stop all jobs
   */
  stop(): void {
    console.info('⏹️  Stopping all scheduled jobs...');
    for (const [name, job] of Array.from(this.jobs.entries())) {
      job.task.stop();
      console.info(`  ✓ Stopped: ${name}`);
    }
  }

  /**
   * Enable a specific job
   */
  enableJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.enabled = true;
      job.task.start();
      console.info(`✅ Enabled job: ${name}`);
    }
  }

  /**
   * Disable a specific job
   */
  disableJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.enabled = false;
      job.task.stop();
      console.info(`⏸️  Disabled job: ${name}`);
    }
  }

  /**
   * Get all jobs
   */
  getJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Print current schedule
   */
  printSchedule(): void {
    console.info('\n📋 Current Schedule:');
    console.info('─'.repeat(60));

    for (const [name, job] of Array.from(this.jobs.entries())) {
      const status = job.enabled ? '✓' : '✗';
      console.info(`${status} ${name.padEnd(25)} ${job.schedule}`);
    }

    console.info('─'.repeat(60));
    console.info('');
  }

  /**
   * Helper methods
   */

  /**
   * Get screening cron schedule
   */
  private getScreeningSchedule(frequency: 'weekly' | 'biweekly' | 'monthly'): string {
    switch (frequency) {
      case 'weekly':
        return '0 0 * * 0'; // Sunday at midnight UTC
      case 'biweekly':
        return '0 0 1,15 * *'; // 1st and 15th of month at midnight UTC
      case 'monthly':
        return '0 0 1 * *'; // 1st of month at midnight UTC
      default:
        return '0 0 * * 0';
    }
  }

  /**
   * Get technical analysis cron schedule
   */
  private getAnalysisSchedule(frequency: 'hourly' | '4hours' | 'daily'): string {
    switch (frequency) {
      case 'hourly':
        return '0 * * * *'; // Every hour
      case '4hours':
        return '0 */4 * * *'; // Every 4 hours
      case 'daily':
        return '0 0 * * *'; // Daily at midnight UTC
      default:
        return '0 */4 * * *';
    }
  }

  /**
   * Get signal generation cron schedule
   */
  private getSignalSchedule(frequency: 'hourly' | '30min' | '15min'): string {
    switch (frequency) {
      case 'hourly':
        return '0 * * * *'; // Every hour
      case '30min':
        return '*/30 * * * *'; // Every 30 minutes
      case '15min':
        return '*/15 * * * *'; // Every 15 minutes
      default:
        return '0 * * * *';
    }
  }

  /**
   * Reset daily counters
   */
  private resetDailyCounters(): void {
    const state = this.pipeline.getState();
    state.tradesExecutedToday = 0;
    state.dailyPnL = 0;
    console.info('✅ Daily counters reset');
  }
}
